import { createClient } from "@supabase/supabase-js";

/* ---------- tiny CSV parser (no deps) ---------- */
// Returns { headers: string[], rows: string[][] }
function parseCSV(text) {
  const rows = [];
  let row = [], field = "", i = 0, q = false;
  while (i < text.length) {
    const c = text[i];
    if (q) { // in quotes
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i += 2; continue; } // escaped quote
        q = false; i++; continue;
      }
      field += c; i++; continue;
    } else {
      if (c === '"') { q = true; i++; continue; }
      if (c === ',') { row.push(field); field = ""; i++; continue; }
      if (c === '\r') { i++; continue; }
      if (c === '\n') { row.push(field); rows.push(row); row = []; field = ""; i++; continue; }
      field += c; i++; continue;
    }
  }
  // last field
  row.push(field);
  rows.push(row);

  // trim trailing blank rows
  while (rows.length && rows[rows.length - 1].every(v => v === "")) rows.pop();

  const headers = (rows.shift() || []).map(h => (h || "").trim());
  return { headers, rows };
}

function json(status, obj) {
  return { statusCode: status, headers: { "Content-Type": "application/json" }, body: JSON.stringify(obj) };
}
function toE164(usPhone) {
  const digits = String(usPhone || "").replace(/\D+/g, "");
  if (!digits) return null;
  if (digits.length === 11 && digits.startsWith("1")) return "+" + digits;
  if (digits.length === 10) return "+1" + digits;
  return null;
}
const MAP = {
  first_name: ["first_name","First Name","first","fname"],
  last_name:  ["last_name","Last Name","last","lname"],
  phone:      ["phone","Phone","phone_number","Phone Number","mobile","Mobile","Phone #"],
  email:      ["email","Email","e-mail"],
  state:      ["state","State","RR State"],
  city:       ["city","City"],
  zip:        ["zip","Zip","zipcode","Zip Code","postal","Postal Code"],
  age:        ["age","Age","DOB","dob","Date of Birth"],
  notes:      ["notes","Notes","beneficiary","beneficiary_name","lead_quality","favorite_hobby","Military Branch","Military Status"]
};
function canonKey(h) {
  const key = String(h || "").trim().toLowerCase();
  for (const [canon, aliases] of Object.entries(MAP)) {
    if (aliases.map(a => a.toLowerCase()).includes(key)) return canon;
  }
  return null;
}
function* chunked(arr, size) { for (let i=0;i<arr.length;i+=size) yield arr.slice(i,i+size); }

/* ---------- handler ---------- */
export const handler = async (event) => {
  try {
    if (event.httpMethod !== "POST") return json(405, { error: "Method Not Allowed" });

    const { VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE } = process.env;
    if (!VITE_SUPABASE_URL || !SUPABASE_SERVICE_ROLE) {
      return json(500, { error: "Missing env: VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE" });
    }
    const supa = createClient(VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE);

    let payload = {};
    try { payload = JSON.parse(event.body || "{}"); } catch { return json(400, { error: "Invalid JSON body" }); }
    const { csv_text, original_filename, user_id } = payload;
    if (!csv_text) return json(400, { error: "csv_text is required" });

    // parse CSV (no external deps)
    const parsed = parseCSV(csv_text);
    const headers = parsed.headers;
    const rows = parsed.rows;

    // create a file history row
    const fileInsert = await supa
      .from("lead_files")
      .insert({
        uploaded_by: user_id || null,
        file_path: null,
        original_filename: original_filename || "inline.csv",
        row_count: rows.length,
        status: "received",
      })
      .select("id")
      .single();
    if (fileInsert.error) return json(500, { error: `lead_files insert: ${fileInsert.error.message}` });
    const fileId = fileInsert.data.id;

    // map rows -> canonical
    const staged = [];
    let skipped = 0;

    // Build header mapping once
    const headerMap = headers.map(h => canonKey(h));

    for (const r of rows) {
      const mapped = {};
      for (let i=0; i<headers.length; i++) {
        const canon = headerMap[i];
        const val = r[i] ?? "";
        if (canon) {
          mapped[canon] = (mapped[canon] ?? "").toString() + (mapped[canon] ? " " : "") + String(val ?? "").trim();
        } else if (String(val).trim()) {
          mapped.notes = `${mapped.notes ? mapped.notes + " | " : ""}${headers[i]}: ${val}`;
        }
      }

      const phone_e164 = toE164(mapped.phone);
      const email = (mapped.email || "").toLowerCase().trim();
      if (!phone_e164 && !email) { skipped++; continue; }

      const age = mapped.age ? Number(mapped.age) : null;
      staged.push({
        source_file_id: fileId,
        first_name: mapped.first_name || null,
        last_name: mapped_last(mapped) || null,
        phone_e164,
        email: email || null,
        state: mapped.state || null,
        city: mapped.city || null,
        zip: mapped.zip || null,
        age: Number.isFinite(age) ? age : null,
        notes: mapped.notes || null,
        status: "new",
      });
    }

    // insert in chunks; skip duplicates by phone
    let inserted = 0;
    for (const chunk of chunked(staged, 500)) {
      const ins = await supa.from("leads").insert(chunk).select("id");
      if (ins.error) {
        // Handle unique phone conflicts by filtering ones that already exist
        const filtered = [];
        for (const rec of chunk) {
          if (!rec.phone_e164) { filtered.push(rec); continue; }
          const exists = await supa.from("leads").select("id").eq("phone_e164", rec.phone_e164).maybeSingle();
          if (!exists.data) filtered.push(rec);
          else skipped++;
        }
        if (filtered.length) {
          const ins2 = await supa.from("leads").insert(filtered).select("id");
          if (ins2.error) return json(500, { error: `Insert error: ${ins2.error.message}` });
          inserted += ins2.data?.length || 0;
        }
      } else {
        inserted += ins.data?.length || 0;
      }
    }

    // finalize file row
    const upd = await supa.from("lead_files").update({
      processed_count: inserted,
      skipped_count: skipped,
      status: "processed",
    }).eq("id", fileId);
    if (upd.error) return json(500, { error: `lead_files update: ${upd.error.message}` });

    return json(200, { ok: true, file_id: fileId, inserted, skipped, headers });
  } catch (e) {
    console.error("import-csv fatal:", e);
    return json(500, { error: String(e?.message || e) });
  }
};

// helper: try to infer last name spill if someone put full name in last_name/first_name etc.
function mapped_last(m) {
  if (m.last_name) return m.last_name;
  if (m.first_name && m.first_name.includes(" ")) {
    const parts = m.first_name.trim().split(/\s+/);
    m.first_name = parts[0];
    return parts.slice(1).join(" ") || null;
  }
  return null;
}
