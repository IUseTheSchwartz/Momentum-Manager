import { createClient } from "@supabase/supabase-js";
import Papa from "papaparse";

/* ---------- utils ---------- */
function json(statusCode, obj) {
  return { statusCode, headers: { "Content-Type": "application/json" }, body: JSON.stringify(obj) };
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
function* chunked(arr, size) {
  for (let i = 0; i < arr.length; i += size) yield arr.slice(i, i + size);
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
    const { bucket, file_path, original_filename, user_id } = payload;
    if (!bucket || !file_path) return json(400, { error: "Missing bucket or file_path" });

    // download file from Storage (private bucket ok w/ service key)
    const dl = await supa.storage.from(bucket).download(file_path);
    if (dl.error) return json(400, { error: `Download error: ${dl.error.message}` });
    const text = await dl.data.text();

    // parse CSV
    const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });
    const parseWarnings = (parsed.errors || []).map(e => e.message).slice(0, 3);

    // register file row
    const fileInsert = await supa
      .from("lead_files")
      .insert({
        uploaded_by: user_id || null,
        file_path: `${bucket}/${file_path}`,
        original_filename: original_filename || file_path.split("/").pop(),
        row_count: (parsed.data || []).length,
        status: "received",
      })
      .select("id")
      .single();
    if (fileInsert.error) return json(500, { error: `lead_files insert: ${fileInsert.error.message}` });
    const fileId = fileInsert.data.id;

    // map rows
    const staged = [];
    let skipped = 0;
    for (const row of parsed.data || []) {
      const mapped = {};
      for (const [hdr, val] of Object.entries(row)) {
        const k = canonKey(hdr);
        if (k) mapped[k] = val;
        else if (String(val).trim()) {
          mapped.notes = `${mapped.notes ? mapped.notes + " | " : ""}${hdr}: ${val}`;
        }
      }
      const phone_e164 = toE164(mapped.phone);
      const email = (mapped.email || "").toLowerCase().trim();
      if (!phone_e164 && !email) { skipped++; continue; }

      const age = mapped.age ? Number(mapped.age) : null;
      staged.push({
        source_file_id: fileId,
        first_name: mapped.first_name || null,
        last_name: mapped.last_name || null,
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
        // handle unique phone conflicts by filtering ones that already exist
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

    return json(200, { ok: true, file_id: fileId, inserted, skipped, warnings: parseWarnings });
  } catch (e) {
    console.error("import-csv fatal:", e);
    return json(500, { error: String(e?.message || e) });
  }
};
