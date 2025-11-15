// File: netlify/functions/appointment-create.js
// CommonJS style so Netlify picks it up reliably.

const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

// Fail loudly if envs are missing
if (!supabaseUrl || !supabaseKey) {
  console.warn(
    "[appointment-create] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY / SUPABASE_ANON_KEY"
  );
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
});

exports.handler = async (event) => {
  // ───────────────────────────────── METHOD GUARD ──────────────────────────────
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  // ───────────────────────────────── PARSE BODY ────────────────────────────────
  let payload;
  try {
    payload = JSON.parse(event.body || "{}");
  } catch (e) {
    console.error("[appointment-create] JSON parse error:", e);
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Invalid JSON body" }),
    };
  }

  const { lead_id, start_utc, duration_min, tz, agent_site_id } = payload || {};

  if (!lead_id || !start_utc) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        error: "Missing required fields: lead_id and start_utc.",
      }),
    };
  }

  // ──────────────────────────────── TIME PARSING ───────────────────────────────
  const start = new Date(start_utc);
  if (Number.isNaN(start.getTime())) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Invalid start_utc value." }),
    };
  }

  const duration = parseInt(duration_min ?? 30, 10);
  if (!Number.isFinite(duration) || duration <= 0) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Invalid duration_min value." }),
    };
  }

  const startIso = start.toISOString();
  const endIso = new Date(start.getTime() + duration * 60000).toISOString();
  const tzFinal = tz || "America/Chicago";

  try {
    // ─────────────────────────── VERIFY LEAD EXISTS ────────────────────────────
    const { data: lead, error: leadErr } = await supabase
      .from("mm_agent_leads")
      .select("id, agent_site_id")
      .eq("id", lead_id)
      .maybeSingle();

    if (leadErr) {
      console.error("[appointment-create] mm_agent_leads error:", leadErr);
      return {
        statusCode: 500,
        body: JSON.stringify({
          error:
            "We couldn't load your application. Please try again. (LEAD_ERR)",
          detail: leadErr.message || leadErr,
        }),
      };
    }

    if (!lead) {
      return {
        statusCode: 404,
        body: JSON.stringify({
          error:
            "We couldn't find your application. Please start again. (LEAD_NOT_FOUND)",
        }),
      };
    }

    const effectiveSiteId = agent_site_id || lead.agent_site_id;

    if (!effectiveSiteId) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error:
            "This recruiting site is missing some settings. Please contact the agent. (NO_SITE_ID)",
        }),
      };
    }

    if (
      agent_site_id &&
      lead.agent_site_id &&
      agent_site_id !== lead.agent_site_id
    ) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error:
            "That time slot is not available for this recruiting site. (SITE_MISMATCH)",
        }),
      };
    }

    // ───────────────────────────── CONFLICT CHECK ──────────────────────────────
    const { data: existingAppt, error: existingErr } = await supabase
      .from("mm_agent_appointments")
      .select("id, start_utc")
      .eq("lead_id", lead_id)
      .eq("start_utc", startIso)
      .maybeSingle();

    if (existingErr) {
      console.error(
        "[appointment-create] appointments conflict check error:",
        existingErr
      );
      // Don't hard fail here; keep going.
    } else if (existingAppt) {
      return {
        statusCode: 409,
        body: JSON.stringify({
          error: "That slot was just taken. Pick another. (ALREADY_BOOKED)",
        }),
      };
    }

    // ────────────────────────────── INSERT APPOINTMENT ─────────────────────────
    const { data: appt, error: apptErr } = await supabase
      .from("mm_agent_appointments")
      .insert({
        lead_id,
        agent_site_id: effectiveSiteId,
        start_utc: startIso,
        end_utc: endIso,
        tz: tzFinal,
        duration_min: duration,
        status: "scheduled",
      })
      .select("id")
      .single();

    if (apptErr) {
      console.error("[appointment-create] insert error:", apptErr);

      let msg = "Could not book. Try another slot. (APPT_ERR)";
      if (
        apptErr.message &&
        apptErr.message.toLowerCase().includes("row-level security")
      ) {
        msg =
          "We couldn't save your appointment due to a security rule. (RLS) Please contact support.";
      } else if (
        apptErr.message &&
        apptErr.message.toLowerCase().includes("foreign key")
      ) {
        msg =
          "We couldn't link your appointment correctly. (FK_ERR) Please contact the agent.";
      }

      return {
        statusCode: 500,
        body: JSON.stringify({
          error: msg,
          detail: apptErr.message || apptErr,
          code: apptErr.code || null,
        }),
      };
    }

    // ───────────────────────────────── SUCCESS ─────────────────────────────────
    return {
      statusCode: 200,
      body: JSON.stringify({
        ok: true,
        appointment_id: appt?.id ?? null,
      }),
    };
  } catch (e) {
    console.error("[appointment-create] unexpected error:", e);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "Could not book. Try another slot. (UNEXPECTED)",
        detail: e.message || String(e),
      }),
    };
  }
};
