import { supabase } from "./supabaseClient";

export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data.user;
}

export async function signUp({ email, password, full_name, code }) {
  const trimmed = (code || "").trim();
  if (!trimmed) throw new Error("Invite code is required.");

  // 0) Pre-validate invite code BEFORE creating auth user
  const pre = await fetch("/.netlify/functions/validate-invite", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, code: trimmed }),
  });
  let preJson = null;
  try { preJson = await pre.json(); } catch {}
  if (!pre.ok || !preJson?.ok) {
    const msg = preJson?.error || preJson?.message || "Invalid or expired invite code.";
    throw new Error(msg);
  }

  // 1) Create auth user with full_name in user_metadata
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name } },
  });
  if (error) throw error;
  const user = data.user;

  // 2) Redeem invite to set role + increment usage
  const redeem = await fetch("/.netlify/functions/redeem-invite", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id: user.id, email, code: trimmed }),
  });

  let redeemJson = null;
  try { redeemJson = await redeem.json(); } catch {}

  if (!redeem.ok || !redeemJson?.ok) {
    // Rollback UX: sign out immediately so they can't proceed with a bare account
    try { await supabase.auth.signOut(); } catch {}
    const msg = redeemJson?.error || redeemJson?.message || "Invite redemption failed.";
    throw new Error(msg);
  }

  return user;
}

export async function getSession() {
  const { data } = await supabase.auth.getSession();
  return data.session;
}
