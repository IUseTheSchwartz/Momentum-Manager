import { createClient } from "@supabase/supabase-js";

export const handler = async (event) => {
  try {
    if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };
    const { VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE } = process.env;
    const supa = createClient(VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE);

    const { manager_id, assign_to_user, count, filters } = JSON.parse(event.body || "{}");

    const { data: me } = await supa.from("user_profiles").select("role").eq("id", manager_id).single();
    if (!me || me.role !== "manager") return { statusCode: 403, body: "Forbidden" };

    let q = supa.from("leads").select("id").is("assigned_to", null).eq("status", "new").limit(count);
    if (filters?.state) q = q.eq("state", filters.state);
    // (Add more filters as needed)

    const { data: ids } = await q;
    if (!ids || !ids.length) return { statusCode: 200, body: JSON.stringify({ ok: true, assigned: 0 }) };

    const now = new Date().toISOString();
    const idList = ids.map((r) => r.id);
    await supa.from("leads").update({
      assigned_to: assign_to_user, assigned_at: now, status: "assigned"
    }).in("id", idList);

    // Events
    await supa.from("lead_events").insert(
      idList.map((lead_id) => ({
        lead_id, actor_id: manager_id, type: "assigned", to_value: assign_to_user
      }))
    );

    return { statusCode: 200, body: JSON.stringify({ ok: true, assigned: idList.length }) };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: String(e) }) };
  }
};
