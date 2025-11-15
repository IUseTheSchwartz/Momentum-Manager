// File: netlify/functions/reschedule.js
const { createClient } = require("@supabase/supabase-js");

// ------- Supabase client (matches appointment-create) -------
const supabaseUrl =
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !serviceKey) {
  console.warn(
    "[reschedule] Missing Supabase envs. URL:",
    !!supabaseUrl,
    "KEY:",
    !!serviceKey
  );
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false },
});

// -------- helpers (mirror Schedule logic) ----------
function tzOffsetMinutes(instant, tz) {
  const asTz = new Date(instant.toLocaleString("en-US", { timeZone: tz }));
  const asUtc = new Date(instant.toLocaleString("en-US", { timeZone: "UTC" }));
  return Math.round((asTz - asUtc) / 60000);
}

function zonedDateTimeToUTCISO({ y, m, d, hh, mm, tz }) {
  const pseudoUtc = new Date(Date.UTC(y, m - 1, d, hh, mm, 0, 0));
  const off = tzOffsetMinutes(pseudoUtc, tz);
  return new Date(pseudoUtc.getTime() - off * 60000).toISOString();
}

function prettyInTz(utcISO, tz = "America/Chicago") {
  const d = new Date(utcISO);
  const day = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    timeZone: tz,
  }).format(d);
  const mon = new Intl.DateTimeFormat("en-US", {
    month: "short",
    timeZone: tz,
  }).format(d);
  const date = new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    timeZone: tz,
  }).format(d);
  const time = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: tz,
  }).format(d);
  return `${day}, ${mon} ${date} · ${time}`;
}

function overlaps(aStart, aEnd, bStart, bEnd) {
  return aStart < bEnd && bStart < aEnd;
}

async function computeSlotsForAgentSite({
  agentSiteId,
  tz,
  slotMin,
  buffer,
  minLeadH,
  windowDays,
  weekly,
}) {
  // appointments to block for this agent site
  const { data: taken } = await supabase
    .from("mm_agent_appointments")
    .select("start_utc, end_utc, status")
    .eq("agent_site_id", agentSiteId)
    .in("status", ["scheduled", "rescheduled"]);

  // (no per-agent blackout table yet)
  const blackouts = [];

  const nowUtc = new Date();
  const startWindowUtc = new Date(nowUtc.getTime() + minLeadH * 3600 * 1000);
  const endWindowUtc = new Date(
    nowUtc.getTime() + windowDays * 24 * 3600 * 1000
  );

  const out = [];
  let cursorUtc = startWindowUtc;

  while (cursorUtc <= endWindowUtc) {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
      .format(cursorUtc)
      .split("-");
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    const d = parseInt(parts[2], 10);

    const dow = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"][
      new Date(
        zonedDateTimeToUTCISO({ y, m, d, hh: 12, mm: 0, tz })
      ).getUTCDay()
    ];
    const ranges = weekly[dow] || [];

    for (const [startStr, endStr] of ranges) {
      const [sH, sM] = startStr.split(":").map(Number);
      const [eH, eM] = endStr.split(":").map(Number);

      let slotStartUtc = new Date(
        zonedDateTimeToUTCISO({ y, m, d, hh: sH, mm: sM, tz })
      );
      const rangeEndUtc = new Date(
        zonedDateTimeToUTCISO({ y, m, d, hh: eH, mm: eM, tz })
      );

      while (slotStartUtc < rangeEndUtc) {
        const slotEndUtc = new Date(slotStartUtc.getTime() + slotMin * 60000);
        const withBufEndUtc = new Date(
          slotEndUtc.getTime() + buffer * 60000
        );

        let isTaken = false;
        let isBlocked = false;

        if (withBufEndUtc <= rangeEndUtc && slotStartUtc >= startWindowUtc) {
          isTaken = (taken || []).some((t) => {
            const tStart = new Date(t.start_utc);
            const tEnd = new Date(t.end_utc);
            return overlaps(slotStartUtc, withBufEndUtc, tStart, tEnd);
          });
          isBlocked = (blackouts || []).some((b) =>
            overlaps(
              slotStartUtc,
              withBufEndUtc,
              new Date(b.start_utc),
              new Date(b.end_utc)
            )
          );

          out.push({
            startUtc: slotStartUtc.toISOString(),
            endUtc: slotEndUtc.toISOString(),
            labelLocal: prettyInTz(slotStartUtc.toISOString(), tz),
            labelTz: `Ends ${new Intl.DateTimeFormat("en-US", {
              timeZone: tz,
              hour: "numeric",
              minute: "2-digit",
              hour12: true,
            }).format(slotEndUtc)}`,
            isTaken,
            isBlocked,
          });
        }

        slotStartUtc = new Date(slotStartUtc.getTime() + slotMin * 60000);
      }
    }

    const nextNoonUtcISO = zonedDateTimeToUTCISO({
      y,
      m,
      d: d + 1,
      hh: 12,
      mm: 0,
      tz,
    });
    cursorUtc = new Date(nextNoonUtcISO);
  }

  // sort available first, then by time
  out.sort((a, b) => {
    const ax = a.isTaken || a.isBlocked ? 1 : 0;
    const bx = b.isTaken || b.isBlocked ? 1 : 0;
    if (ax !== bx) return ax - bx;
    return new Date(a.startUtc) - new Date(b.startUtc);
  });

  return out.slice(0, 120);
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const body = JSON.parse(event.body || "{}");
    const action = body.action;

    // ------------- LOOKUP -------------
    if (action === "lookup") {
      const email = (body.email || "").trim().toLowerCase();
      const lead_id = body.lead_id || null;

      if (!email || !lead_id) {
        return {
          statusCode: 400,
          body: JSON.stringify({
            ok: false,
            error: "Email and lead_id are required.",
          }),
        };
      }

      // 1) Look up lead and confirm email matches
      const { data: lead, error: leadErr } = await supabase
        .from("mm_agent_leads")
        .select("id, email, agent_site_id")
        .eq("id", lead_id)
        .maybeSingle();

      if (leadErr || !lead) {
        return {
          statusCode: 404,
          body: JSON.stringify({
            ok: false,
            error: "We couldn't find your application.",
          }),
        };
      }

      const storedEmail = (lead.email || "").trim().toLowerCase();
      if (!storedEmail || storedEmail !== email) {
        return {
          statusCode: 403,
          body: JSON.stringify({
            ok: false,
            error:
              "That email doesn't match the one on your application. Double-check and try again.",
          }),
        };
      }

      // 2) Find upcoming appointment for this lead
      const nowIso = new Date().toISOString();
      const { data: apptList, error: apptErr } = await supabase
        .from("mm_agent_appointments")
        .select("*")
        .eq("lead_id", lead.id)
        .in("status", ["scheduled", "rescheduled"])
        .gt("start_utc", nowIso)
        .order("start_utc", { ascending: true })
        .limit(1);

      if (apptErr || !apptList || !apptList[0]) {
        return {
          statusCode: 404,
          body: JSON.stringify({
            ok: false,
            error:
              "We couldn't find an upcoming appointment for that email on this application.",
          }),
        };
      }

      const appt = apptList[0];

      // 3) Load availability for this agent site (same pattern as Schedule)
      const { data: av } = await supabase
        .from("mm_agent_availability")
        .select("*")
        .eq("agent_site_id", lead.agent_site_id)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const tz = av?.tz || appt.tz || "America/Chicago";
      const slotMin = av?.slot_minutes ?? 30;
      const buffer = av?.buffer_minutes ?? 15;
      const minLeadH = av?.min_lead_hours ?? 12;
      const windowDays = av?.booking_window_days ?? 14;

      let weekly = av?.weekly || {};
      if (typeof weekly === "string") {
        try {
          weekly = JSON.parse(weekly);
        } catch {
          weekly = {};
        }
      }

      const slots = await computeSlotsForAgentSite({
        agentSiteId: lead.agent_site_id,
        tz,
        slotMin,
        buffer,
        minLeadH,
        windowDays,
        weekly,
      });

      return {
        statusCode: 200,
        body: JSON.stringify({
          ok: true,
          appt_id: appt.id,
          token: null, // we don't use tokens in this version
          current_label: prettyInTz(appt.start_utc, tz),
          slots,
        }),
      };
    }

    // ------------- RESCHEDULE -------------
    if (action === "reschedule") {
      const { appt_id, start_utc, lead_id } = body || {};
      if (!appt_id || !start_utc) {
        return {
          statusCode: 400,
          body: JSON.stringify({
            ok: false,
            error: "Missing appt_id or start_utc.",
          }),
        };
      }

      // fetch appointment
      const { data: appt, error: apptErr } = await supabase
        .from("mm_agent_appointments")
        .select("*")
        .eq("id", appt_id)
        .maybeSingle();

      if (apptErr || !appt) {
        return {
          statusCode: 404,
          body: JSON.stringify({
            ok: false,
            error: "Appointment not found.",
          }),
        };
      }

      // optional safety: ensure it belongs to this lead_id (if provided)
      if (lead_id && appt.lead_id !== lead_id) {
        return {
          statusCode: 403,
          body: JSON.stringify({
            ok: false,
            error: "This appointment does not belong to that application.",
          }),
        };
      }

      // load availability for duration / tz
      const { data: av } = await supabase
        .from("mm_agent_availability")
        .select("*")
        .eq("agent_site_id", appt.agent_site_id)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const tz = av?.tz || appt.tz || "America/Chicago";
      const durationMin =
        appt.duration_min || av?.slot_minutes || 30;

      const start = new Date(start_utc);
      if (Number.isNaN(start.getTime())) {
        return {
          statusCode: 400,
          body: JSON.stringify({
            ok: false,
            error: "Invalid start_utc.",
          }),
        };
      }
      const end_utc = new Date(
        start.getTime() + durationMin * 60000
      ).toISOString();

      const { error: updErr } = await supabase
        .from("mm_agent_appointments")
        .update({
          start_utc: start.toISOString(),
          end_utc,
          tz,
          status: "rescheduled",
          updated_at: new Date().toISOString(),
        })
        .eq("id", appt_id);

      if (updErr) {
        console.error("[reschedule] update error", updErr);
        return {
          statusCode: 409,
          body: JSON.stringify({
            ok: false,
            error: "That slot was just taken. Pick another.",
          }),
        };
      }

      // (Optional) trigger a fresh confirmation email here if you want.

      return {
        statusCode: 200,
        body: JSON.stringify({ ok: true }),
      };
    }

    return {
      statusCode: 400,
      body: JSON.stringify({ ok: false, error: "Unknown action." }),
    };
  } catch (e) {
    console.error("[reschedule] unexpected error", e);
    return {
      statusCode: 500,
      body: JSON.stringify({ ok: false, error: "Server error" }),
    };
  }
};
