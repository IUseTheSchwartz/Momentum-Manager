import { createClient } from "@supabase/supabase-js";

/**
 * Sweep non-sold leads that have been assigned >= N days.
 * - Unassigns them (returns to pool)
 * - Closes the open row in lead_assignments (unassigned_at + reason)
 *
 * TESTING: call with ?days=0 to recycle immediately.
 * Example:
 *   https://YOUR-SITE.netlify.app/.netlify/functions/sweep-unsold?days=0
 */
export const handler = async (event) => {
  try {
    const { VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE } = process.env;
    if (!VITE_SUPABASE_URL || !SUPABASE_SERVICE_ROLE) {
      return j(500, { error: "Missing env: VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE" });
    }

    const supa = createClient(VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE);

    // read ?days query param (default 14)
    const url = new URL(event.rawUrl || `http://x${event.path}${event.queryStringParameters ? "?" + new URLSearchParams(event.queryStringParameters) : ""}`);
    const days = Math.max(0, Number(url.searchParams.get("days") || 14));
    const cutoffISO = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    // fetch stale leads (assigned, not sold, assigned_at <= cutoff)
    const { data: stale, error: fetchErr } = await supa
      .from("leads")
      .select("id, assigned_to, assigned_at, status")
      .not("assigned_to", "is", null)
      .neq("status", "sold")
      .lte("assigned_at", cutoffISO)
      .limit(5000); // bump if you need
    if (fetchErr) return j(500, { error: `fetch stale: ${fetchErr.message}` });

    if (!stale?.length) return j(200, { recycled: 0, days, note: "nothing to do" });

    let recycled = 0, closedHistory = 0;

    // close history rows first (if open)
    for (const row of stale) {
      const leadId = row.id;
      const userId = row.assigned_to;

      // Close the open assignment history if present
      const { data: laRows, error: laErr } = await supa
        .from("lead_assignments")
        .update({ unassigned_at: new Date().toISOString(), reason: `auto-recycle-${days}d` })
        .eq("lead_id", leadId)
        .eq("user_id", userId)
        .is("unassigned_at", null)
        .select("id");
      if (laErr) return j(500, { error: `close history: ${laErr.message}` });
      closedHistory += (laRows?.length || 0);
    }

    // return to pool
    const ids = stale.map(s => s.id);
    const { error: upErr } = await supa
      .from("leads")
      .update({ assigned_to: null, assigned_at: null, updated_at: new Date().toISOString() })
      .in("id", ids);
    if (upErr) return j(500, { error: `unassign: ${upErr.message}` });

    recycled = ids.length;
    return j(200, { ok: true, recycled, closedHistory, days });
  } catch (e) {
    return j(500, { error: String(e?.message || e) });
  }
};

function j(status, obj) {
  return { statusCode: status, headers: { "Content-Type": "application/json" }, body: JSON.stringify(obj) };
}
