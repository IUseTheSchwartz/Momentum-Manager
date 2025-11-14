// File: netlify/functions/logan-proof-feed.js
const { createClient } = require("@supabase/supabase-js");

const LOGAN_SUPABASE_URL = process.env.LOGAN_SUPABASE_URL;
const LOGAN_SUPABASE_ANON_KEY = process.env.LOGAN_SUPABASE_ANON_KEY;

// Create client only if env vars are present
let loganSupabase = null;
if (LOGAN_SUPABASE_URL && LOGAN_SUPABASE_ANON_KEY) {
  loganSupabase = createClient(LOGAN_SUPABASE_URL, LOGAN_SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
  });
} else {
  console.error(
    "[logan-proof-feed] Missing LOGAN_SUPABASE_URL or LOGAN_SUPABASE_ANON_KEY"
  );
}

exports.handler = async function (event, context) {
  try {
    if (!loganSupabase) {
      // Env not configured on this Netlify site
      return {
        statusCode: 500,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          error: "Missing Supabase configuration for Logan proof feed",
        }),
      };
    }

    const { data, error } = await loganSupabase
      .from("mf_proof_posts")
      .select(
        "id, display_name, avatar_url, message_text, amount_cents, currency, happened_at, screenshot_url, created_at, is_pinned, is_published"
      )
      .eq("is_published", true)
      .order("is_pinned", { ascending: false })
      .order("happened_at", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[logan-proof-feed] Supabase error:", error);
      return {
        statusCode: 500,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Failed to load proof posts" }),
      };
    }

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data || []),
    };
  } catch (err) {
    console.error("[logan-proof-feed] Unexpected error:", err);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Unexpected error" }),
    };
  }
};
