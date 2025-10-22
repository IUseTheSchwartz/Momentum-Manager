import { createClient } from "@supabase/supabase-js";
function json(status, obj){ return { statusCode: status, headers: { "Content-Type":"application/json" }, body: JSON.stringify(obj) }; }

export const handler = async (event) => {
  try {
    if (event.httpMethod !== "POST") return json(405, { error: "Method Not Allowed" });
    const { VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE } = process.env;
    if (!VITE_SUPABASE_URL || !SUPABASE_SERVICE_ROLE) return json(500, { error: "Missing env" });

    const supa = createClient(VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE);
    const { assign_to_user, count = 10, filters = {} } = JSON.parse(event.body || "{}");
    if (!assign_to_user) return json(400, { error: "assign_to_user required" });

    // Build pool query: must be unassigned
    let q = supa.from("leads").select("id").is("assigned_to", null).order("created_at", { ascending: true }).limit(count);
    if (filters.state) q = q.eq("state", filters.state);
    if (filters.lead_type) q = q.eq("lead_type", filters.lead_type);

    const { data: pool, error: poolErr } = await q;
    if (poolErr) return json(500, { error: poolErr.message });

    const ids = (pool || []).map(r => r.id);
    if (!ids.length) return json(200, { assigned: 0 });

    // Assign block
    const nowISO = new Date().toISOString();
    const { error: upErr } = await supa
      .from("leads")
      .update({ assigned_to: assign_to_user, assigned_at: nowISO, status: "assigned" })
      .in("id", ids);
    if (upErr) return json(500, { error: upErr.message });

    // Audit in history (if you created the function earlier)
    await Promise.all(ids.map(id => supa.rpc("log_assignment", { p_lead: id, p_user: assign_to_user, p_reason: "manager-assign" })));

    return json(200, { assigned: ids.length });
  } catch (e) {
    return json(500, { error: String(e?.message || e) });
  }
};
