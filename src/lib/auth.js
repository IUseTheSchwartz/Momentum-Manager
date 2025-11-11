import { supabase } from "./supabaseClient";

export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data.user;
}

export async function signUp({ email, password, full_name, code }) {
  if (!code || !code.trim()) {
    throw new Error("Invite code is required.");
  }

  // 1) Create auth user with full_name in user_metadata
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name } },
  });
  if (error) throw error;
  const user = data.user;

  // 2) Immediately redeem invite with service role function
  const resp = await fetch("/.netlify/functions/redeem-invite", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      user_id: user.id,
      email,
      code: code.trim(),
    }),
  });

  // Parse and throw helpful errors
  let payload = null;
  try {
    payload = await resp.json();
  } catch {}
  if (!resp.ok || !payload?.ok) {
    // rollback option: you could signOut or alert—keeping simple here
    const msg =
      payload?.error ||
      payload?.message ||
      `Invite code invalid or expired.`;
    throw new Error(msg);
  }

  return user;
}

export async function getSession() {
  const { data } = await supabase.auth.getSession();
  return data.session;
}
