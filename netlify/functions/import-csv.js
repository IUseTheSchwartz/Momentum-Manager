import { createClient } from "@supabase/supabase-js";
import Papa from "papaparse";

// very light phone normalization to E.164 +1
function toE164(usPhone) {
  const digits = String(usPhone || "").replace(/\D+/g, "");
  if (!digits) return null;
  if (digits.length === 11 && digits.startsWith("1")) return "+" + digits;
  if (digits.length === 10) return "+1" + digits;
  return null;
}

// header resolver → canonical
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

export const handler = async (event) => {
  try {
    if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };
    const { VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE } = process.env;
    const supa = createClient(VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE);

    const { bucket, file_path, original_filename } = JSON.parse(event.body || "{}");
    if (!bucket || !file_path) return { statusCode: 400, body: "Missing bucket or file_path" };

    // fetch the file from Supabase Storage
    const { data: fileData, error: dlErr } = await supa.storage.from(bucket).download(file_path);
    if (dlErr) return { statusCode: 400, body: `Download error: ${dlErr.message}` };

    // parse CSV
    const text = await fileData.text();
    const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });
    if (parsed.errors?.length) {
      // not fatal—continue but include message
      console.warn("CSV parse warnings:", parsed.errors.slice(0, 3));
    }

    // register file
    const { data: fileRow, error: insErr } = await supa
      .from("lead_files")
      .insert({
        file_path: `${bucket}/${file_path}`,
        original_filename: original_filename || file_path.split("/").pop(),
        row_count: (parsed.data || []).length,
        status: "received",
      })
      .select("id")
      .single();
    if (insErr) throw insErr;

    let inserted = 0, skipped = 0;

    // map and insert leads
    const leads = [];
    for (const row of parsed.data || []) {
      const mapped = {};
      for (const [hdr, val] of Object.entries(row)) {
        const k = canonKey(hdr);
        if (k) mapped[k] = val;
        else {
          // fold extras into notes
          mapped.notes = `${mapped.notes ? mapped.notes + " | " : ""}${hdr}: ${val}`;
        }
      }
      const phone_e164 = toE164(mapped.phone);
      const email = (mapped.email || "").toLowerCase().trim();
      if (!phone_e164 && !email) { skipped++; continue; }

      // compute age from DOB if needed (very light)
      if (!mapped.age && (mapped.dob || mapped.DOB || mapped["Date of Birth"])) {
        try {
          const d = new Date(mapped.dob || mapped.DOB || mapped["Date of Birth"]);
          const now = new Date();
          let a = now.getFullYear() - d.getFullYear();
          const m = now.getMonth() - d.getMonth();
          if (m < 0 || (m === 0 && now.getDate() < d.getDate())) a--;
          if (a > 0 && a < 120) mapped.age = a;
        } catch {}
      }

      leads.push({
        source_file_id: fileRow.id,
        first_name: mapped.first_name || null,
        last_name: mapped.last_name || null,
        phone_e164,
        email: email || null,
        state: mapped.state || null,
        city: mapped.city || null,
        zip: mapped.zip || null,
        age: mapped.age ? Number(mapped.age) : null,
        notes: mapped.notes || null,
        status: "new",
      });
    }

    // upsert with phone dedupe, else email dedupe
    for (const chunk of chunked(leads, 500)) {
      // Try phone dedupe first
      const { data: ins, error: err } = await supa.from("leads").insert(chunk, { count: "exact" });
      if (err) {
        // Handle unique violation by filtering duplicates
        const cleaned = [];
        for (const rec of chunk) {
          if (!rec.phone_e164) { cleaned.push(rec); continue; }
          const { data: exists } = await supa.from("leads").select("id").eq("phone_e164", rec.phone_e164).maybeSingle();
          if (!exists) cleaned.push(rec); else skipped++;
        }
        if (cleaned.length) {
          const { data: ins2, error: err2 } = await supa.from("leads").insert(cleaned, { count: "exact" });
          if (err2) throw err2;
          inserted += ins2?.length || 0;
        }
      } else {
        inserted += ins?.length || 0;
      }
    }

    await supa.from("lead_files").update({
      processed_count: inserted,
      skipped_count: skipped,
      status: "processed"
    }).eq("id", fileRow.id);

    // event trail
    if (inserted) {
      const { data: mgr } = await supa.from("user_profiles").select("id").eq("id", supa.auth.getSession?.user?.id).maybeSingle();
      // optional; skip if not available in service context
      await supa.from("lead_events").insert({
        lead_id: null,
        actor_id: mgr?.id || null,
        type: "imported",
        metadata: { file_id: fileRow.id, inserted, skipped }
      }).catch(()=>{});
    }

    return { statusCode: 200, body: JSON.stringify({ ok: true, file_id: fileRow.id, inserted, skipped }) };
  } catch (e) {
    console.error(e);
    return { statusCode: 500, body: JSON.stringify({ error: String(e) }) };
  }
};

function* chunked(arr, size) {
  for (let i = 0; i < arr.length; i += size) yield arr.slice(i, i + size);
}
