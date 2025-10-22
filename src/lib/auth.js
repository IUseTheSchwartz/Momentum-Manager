import { supabase } from "./supabaseClient";

export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data.user;
}

export async function signUp({ email, password, full_name, code }) {
  const { data, error } = await supabase.auth.signUp({
    email, password, options: { data: { full_name } }
  });
  if (error) throw error;

  // redeem invite immediately (service role function)
  await fetch("/.netlify/functions/redeem-invite", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id: data.user.id, email, code })
  });
  return data.user;
}

export async function getSession() {
  const { data } = await supabase.auth.getSession();
  return data.session;
}
