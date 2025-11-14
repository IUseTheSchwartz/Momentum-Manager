// File: netlify/functions/logan-proof-feed.js
const { createClient } = require("@supabase/supabase-js");

const LOGAN_SUPABASE_URL = process.env.LOGAN_SUPABASE_URL;
const LOGAN_SUPABASE_ANON_KEY = process.env.LOGAN_SUPABASE_ANON_KEY;

const loganSupabase = createClient(LOGAN_SUPABASE_URL, LOGAN_SUPABASE_ANON_KEY, {
  auth: { persistSession: false },
});

exports.handler = async function (event, context) {
  try {
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
      console.error(error);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Failed to load proof posts" }),
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify(data || []),
    };
  } catch (err) {
    console.error(err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Unexpected error" }),
    };
  }
};
