import { createClient } from "@supabase/supabase-js";

export const handler = async (event) => {
  try {
    if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };
    const { VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE } = process.env;
    const supa = createClient(VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE);
    const { user_id, email, code } = JSON.parse(event.body || "{}");
    if (!user_id || !code) return { statusCode: 400, body: "Missing" };

    // fetch code
    const { data: inv, error } = await supa.from("invite_codes").select("*").eq("code", code).single();
    if (error || !inv) return { statusCode: 400, body: "Invalid code" };
    if (inv.expires_at && new Date(inv.expires_at) < new Date()) return { statusCode: 400, body: "Expired" };
    if (inv.uses >= inv.max_uses) return { statusCode: 400, body: "Code exhausted" };

    // Optional: manager allowlist enforcement
    if (inv.role_on_use === "manager") {
      const { data: wl } = await supa.from("manager_whitelist").select("email").eq("email", email).maybeSingle();
      if (!wl) return { statusCode: 403, body: "Not allowlisted for manager role" };
    }

    // Promote role (or keep agent)
    await supa.from("user_profiles").update({ role: inv.role_on_use || "agent" }).eq("id", user_id);
    await supa.from("invite_codes").update({ uses: inv.uses + 1 }).eq("code", code);

    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: String(e) }) };
  }
};
