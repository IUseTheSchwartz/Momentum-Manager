// File: netlify/functions/appointment-create.js
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// IMPORTANT: use service role key so inserts bypass RLS for this function
const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});

export const handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  let payload;
  try {
    payload = JSON.parse(event.body || "{}");
  } catch {
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

  // Parse and normalize start + end times
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
    // 1) Verify the lead exists and belongs to the expected agent_site
    const { data: lead, error: leadErr } = await supabase
      .from("mm_agent_leads")
      .select("id, agent_site_id")
      .eq("id", lead_id)
      .maybeSingle();

    if (leadErr) {
      console.error("mm_agent_leads error:", leadErr);
      return {
        statusCode: 500,
        body: JSON.stringify({
          error: "We couldn't load your application. Please try again.",
        }),
      };
    }

    if (!lead) {
      return {
        statusCode: 404,
        body: JSON.stringify({
          error: "We couldn't find your application. Please start again.",
        }),
      };
    }

    // If the front-end sends agent_site_id, make sure it matches the lead
    const effectiveSiteId = agent_site_id || lead.agent_site_id;
    if (agent_site_id && lead.agent_site_id && agent_site_id !== lead.agent_site_id) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: "That time slot is not available for this recruiting site.",
        }),
      };
    }

    // 2) Optional: check for an existing appointment at the same time for this lead
    //    This lets the UI show a clean "slot taken" message (409)
    const { data: existingAppt, error: existingErr } = await supabase
      .from("mm_agent_appointments")
      .select("id, start_utc")
      .eq("lead_id", lead_id)
      .eq("start_utc", startIso)
      .maybeSingle();

    if (existingErr) {
      console.error("mm_agent_appointments conflict check error:", existingErr);
      // Don't hard fail; just continue and try insert.
    } else if (existingAppt) {
      return {
        statusCode: 409,
        body: JSON.stringify({
          error: "That slot was just taken. Pick another.",
        }),
      };
    }

    // 3) Insert the appointment
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
      .maybeSingle();

    if (apptErr) {
      console.error("mm_agent_appointments insert error:", apptErr);

      // If this is an RLS or unique constraint type situation, surface a friendly message
      const msg =
        apptErr.message && apptErr.message.includes("row-level security")
          ? "We couldn't save your appointment due to a security rule. Please contact support."
          : "Could not book. Try another slot.";

      return {
        statusCode: 500,
        body: JSON.stringify({ error: msg }),
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        ok: true,
        appointment_id: appt?.id ?? null,
      }),
    };
  } catch (e) {
    console.error("Unexpected appointment-create error:", e);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "Could not book. Try another slot.",
      }),
    };
  }
};
