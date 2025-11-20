// File: src/lib/supabaseClient.js
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,       // ✅ keep users signed in across refreshes
    autoRefreshToken: true,     // ✅ auto-refresh JWT before it expires
    detectSessionInUrl: true,   // ✅ handle magic links / redirects if you ever use them
  },
});
