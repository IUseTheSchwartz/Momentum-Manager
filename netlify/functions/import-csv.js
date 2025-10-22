import { createClient } from "@supabase/supabase-js";

/* ---------- tiny CSV parser (no deps) ---------- */
function parseCSV(text) {
  const rows = [];
  let row = [], field = "", i = 0, q = false;
  while (i < text.length) {
    const c = text[i];
    if (q) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i += 2; continue; }
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
  row.push(field);
  rows.push(row);
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
  age:        ["age","Age"],
  dob:        ["dob","DOB","Date of Birth","Birthdate","Birth Date"],
  military_branch: ["Military Branch","Military","Branch","Service Branch","Military Status"],
  beneficiary_name: ["beneficiary","Beneficiary","beneficiary_name","Beneficiary Name"],
  lead_type: ["lead_type","Lead Type","Type","Product"],
  notes:      ["notes","Notes"]
};
function aliasToCanon(h) {
  const key = String(h || "").trim().toLowerCase();
  for (const [canon, aliases] of Object.entries(MAP)) {
    if (aliases.map(a => a.toLowerCase()).includes(key)) return canon;
  }
  return null;
}
function* chunked(arr, size) { for (let i=0;i<arr.length;i+=size) yield arr.slice(i,i+size); }

function toDateISO(s) {
  if (!s) return null;
  const t = String(s).trim();
  // Try YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t;
  // Try MM/DD/YYYY
  const mdy = t.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (mdy) {
    const [_, m, d, y] = mdy;
    const mm = String(m).padStart(2,"0");
    const dd = String(d).padStart(2,"0");
    return `${y}-${mm}-${dd}`;
  }
  // Fallback Date parse
  const d = new Date(t);
  if (isNaN(d)) return null;
  return d.toISOString().slice(0,10);
}

function ageFromDOB(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d)) return null;
  const now = new Date();
  let a = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) a--;
  return (a >= 0 && a < 130) ? a : null;
}

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

    // header map
    const headerMap = headers.map(h => aliasToCanon(h));

    // stage
    const staged = [];
    let skipped = 0;

    for (const r of rows) {
      const m = {};
      for (let i=0; i<headers.length; i++) {
        const canon = headerMap[i];
        const val = r[i] ?? "";
        if (canon) {
          m[canon] = (m[canon] ?? "").toString() + (m[canon] ? " " : "") + String(val ?? "").trim();
        } else if (String(val).trim()) {
          m.notes = `${m.notes ? m.notes + " | " : ""}${headers[i]}: ${val}`;
        }
      }

      const phone_e164 = toE164(m.phone);
      const email = (m.email || "").toLowerCase().trim();
      if (!phone_e164 && !email) { skipped++; continue; }

      const dobISO = toDateISO(m.dob);
      const numericAge = m.age ? Number(m.age) : ageFromDOB(dobISO);

      staged.push({
        source_file_id: fileId,
        first_name: m.first_name || null,
        last_name: m.last_name || null,
        phone_e164,
        email: email || null,
        state: m.state || null,
        city: m.city || null,
        zip: m.zip || null,
        dob: dobISO || null,
        age: Number.isFinite(numericAge) ? numericAge : null,
        military_branch: m.military_branch || null,
        notes: m.notes || null,
        status: "new",
      });
    }

    // insert in chunks; skip duplicates by phone
    let inserted = 0;
    for (const chunk of chunked(staged, 500)) {
      const ins = await supa.from("leads").insert(chunk).select("id");
      if (ins.error) {
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

    // finalize
    const upd = await supa.from("lead_files").update({
      processed_count: inserted,
      skipped_count: skipped,
      status: "processed",
    }).eq("id", fileId);
    if (upd.error) return json(500, { error: `lead_files update: ${upd.error.message}` });

    return json(200, { ok: true, file_id: fileId, inserted, skipped });
  } catch (e) {
    console.error("import-csv fatal:", e);
    return json(500, { error: String(e?.message || e) });
  }
};
