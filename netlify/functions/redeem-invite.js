// File: netlify/functions/redeem-invite.js
import { createClient } from "@supabase/supabase-js";

const json = (statusCode, bodyObj) => ({
  statusCode,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(bodyObj),
});

export const handler = async (event) => {
  try {
    if (event.httpMethod !== "POST") {
      return json(405, { error: "Method Not Allowed" });
    }

    const { VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE, SUPABASE_SERVICE_ROLE_KEY } = process.env;
    const SERVICE_KEY = SUPABASE_SERVICE_ROLE || SUPABASE_SERVICE_ROLE_KEY;

    if (!VITE_SUPABASE_URL || !SERVICE_KEY) {
      return json(500, { error: "Server not configured for invite redemption." });
    }

    let payload = {};
    try {
      payload = JSON.parse(event.body || "{}");
    } catch {
      return json(400, { error: "Invalid JSON body." });
    }

    const { user_id, email, code } = payload;
    if (!user_id || !email || !code) {
      return json(400, { error: "Missing user_id, email, or code." });
    }

    const supa = createClient(VITE_SUPABASE_URL, SERVICE_KEY);

    // 1) Fetch invite code
    const { data: inv, error: invErr } = await supa
      .from("invite_codes")
      .select("code, role_on_use, max_uses, uses, expires_at")
      .eq("code", code)
      .maybeSingle();

    if (invErr) return json(500, { error: "Failed to read invite code." });
    if (!inv)  return json(400, { error: "Invalid invite code." });

    // 2) Validate role, expiry, usage
    const now = new Date();
    const expired = inv.expires_at ? new Date(inv.expires_at) <= now : false;
    const maxUses = Number.isInteger(inv?.max_uses) && inv.max_uses !== null ? inv.max_uses : null;
    const currentUses = Number.isInteger(inv?.uses) ? inv.uses : 0;
    const usedUp = maxUses !== null ? currentUses >= maxUses : false;

    if (expired) return json(400, { error: "Invite code has expired." });

    const role = (inv.role_on_use || "").toLowerCase();
    if (!["agent", "manager"].includes(role)) {
      return json(400, { error: "Invite code has no valid role." });
    }
    if (usedUp) return json(400, { error: "Invite code has reached its max uses." });

    // 3) Manager allowlist (ONLY enforce if list has entries)
    if (role === "manager") {
      try {
        const wlCountQ = await supa
          .from("manager_whitelist")
          .select("email", { count: "exact", head: true });

        const hasAnyWhitelist = (wlCountQ?.count ?? 0) > 0;

        if (hasAnyWhitelist) {
          const { data: wl, error: wlErr } = await supa
            .from("manager_whitelist")
            .select("email")
            .ilike("email", email)
            .maybeSingle();

          if (wlErr) return json(500, { error: "Allowlist check failed." });
          if (!wl)   return json(403, { error: "Not allowlisted for manager role." });
        }
        // if no whitelist rows, skip enforcement
      } catch (e) {
        // If the table doesn't exist or other metadata issues, skip enforcement
        console.warn("[redeem-invite] allowlist check skipped:", e?.message || e);
      }
    }

    // 4) Set user role in user_profiles
    const { data: updData, error: updErr } = await supa
      .from("user_profiles")
      .update({ role })
      .eq("id", user_id)
      .select("id");

    if (updErr) {
      console.warn("[redeem-invite] update error:", updErr);
    }

    let updated = Array.isArray(updData) ? updData.length : 0;

    if (!updated) {
      const { error: insErr } = await supa
        .from("user_profiles")
        .insert([{ id: user_id, email, role }]);
      if (insErr) {
        return json(500, { error: "Failed to set user role.", detail: insErr.message || String(insErr) });
      }
    }

    // 5) Increment invite uses (RPC preferred; fallback guarded update)
    let incOk = true;
    try {
      const { error: rpcErr } = await supa.rpc("increment_invite_uses", { p_code: code });
      if (rpcErr) incOk = false;
    } catch {
      incOk = false;
    }
    if (!incOk) {
      const { error: updUsesErr } = await supa
        .from("invite_codes")
        .update({ uses: currentUses + 1 })
        .eq("code", code)
        .eq("uses", currentUses);
      if (updUsesErr) {
        return json(500, { error: "Failed to increment invite usage." });
      }
    }

    return json(200, { ok: true, role });
  } catch (e) {
    return json(500, { error: e.message || "Unknown error." });
  }
};
