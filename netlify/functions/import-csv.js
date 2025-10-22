import { createClient } from "@supabase/supabase-js";

export const handler = async (event) => {
  try {
    if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };
    const { VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE } = process.env;
    const supa = createClient(VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE);

    const { user_id, file_path, original_filename, row_count } = JSON.parse(event.body || "{}");

    // manager check
    const { data: me } = await supa.from("user_profiles").select("role").eq("id", user_id).single();
    if (!me || me.role !== "manager") return { statusCode: 403, body: "Forbidden" };

    // record file (CSV will be uploaded to Supabase Storage in client; this just registers + kicks off processing)
    const { data, error } = await supa.from("lead_files").insert({
      uploaded_by: user_id, file_path, original_filename, row_count, status: "received"
    }).select("id").single();
    if (error) throw error;

    // TODO: parse & normalize rows -> insert into leads, handle dedupe, update counts
    return { statusCode: 200, body: JSON.stringify({ ok: true, file_id: data.id }) };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: String(e) }) };
  }
};
