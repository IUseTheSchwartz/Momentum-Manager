// File: netlify/functions/mm-agent-incomplete.js
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SITE_URL = process.env.SITE_URL || "http://localhost:8888";

const supabase = SUPABASE_URL && SERVICE_KEY
  ? createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })
  : null;

function minutesAgo(min) {
  return new Date(Date.now() - min * 60_000).toISOString();
}

async function sendEmail({ to, subject, html, text }) {
  if (!to) return;
  const res = await fetch(`${SITE_URL}/.netlify/functions/send-email`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ to, subject, html, text }),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    console.error("[mm-agent-incomplete] send-email failed:", res.status, t);
  }
}

export const handler = async () => {
  if (!supabase) {
    console.log("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    return { statusCode: 200, body: "missing env" };
  }

  // 1) contact-only → never finished questions
  const qCutoff = minutesAgo(15); // idle 15+ min
  const { data: qLeads, error: qErr } = await supabase
    .from("mm_agent_leads")
    .select(
      "id, agent_site_id, full_name, email, phone, last_activity_at, stage, incomplete_questions_emailed"
    )
    .eq("stage", "contact")
    .eq("is_complete", false)
    .eq("incomplete_questions_emailed", false)
    .lte("last_activity_at", qCutoff);

  if (qErr) console.error("qErr", qErr);

  // 2) finished questions → never finished booking/thank-you
  const bCutoff = minutesAgo(30); // idle 30+ min
  const { data: bLeads, error: bErr } = await supabase
    .from("mm_agent_leads")
    .select(
      "id, agent_site_id, full_name, email, phone, last_activity_at, stage, incomplete_booking_emailed"
    )
    .eq("stage", "questions")
    .eq("is_complete", true)
    .eq("incomplete_booking_emailed", false)
    .lte("last_activity_at", bCutoff);

  if (bErr) console.error("bErr", bErr);

  // load sites in batch
  const siteIds = [
    ...(qLeads || []).map((l) => l.agent_site_id),
    ...(bLeads || []).map((l) => l.agent_site_id),
  ].filter(Boolean);
  const uniqueSiteIds = [...new Set(siteIds)];

  const sitesById = {};
  if (uniqueSiteIds.length) {
    const { data: sites, error: sErr } = await supabase
      .from("mm_agent_sites")
      .select("id, about_name, site_name, slug, notification_emails")
      .in("id", uniqueSiteIds);
    if (sErr) {
      console.error("siteErr", sErr);
    } else {
      for (const s of sites) sitesById[s.id] = s;
    }
  }

  const jobs = [];

  // ---- Incomplete questions ----
  for (const lead of qLeads || []) {
    const site = sitesById[lead.agent_site_id];
    if (!site || !site.notification_emails) continue;

    const to = site.notification_emails.trim();
    if (!to) continue;

    const leadName = lead.full_name || "Lead";
    const agentName = site.about_name || "Your Agent";
    const siteName = site.site_name || "Momentum Financial";

    const resumeUrl = `${SITE_URL}/${site.slug || ""}`;

    const subject = `Form not finished – ${leadName}`;
    const html = `
      <h3 style="margin:0 0 8px;">New application started (not finished)</h3>
      <p style="margin:0 0 8px;color:#555;">${leadName} entered their info but didn’t finish your application questions.</p>
      <ul style="margin:0 0 12px 0;padding-left:18px;color:#111;">
        <li><strong>Name:</strong> ${leadName}</li>
        <li><strong>Phone:</strong> ${lead.phone || ""}</li>
        <li><strong>Email:</strong> ${lead.email || ""}</li>
        <li><strong>Page:</strong> ${siteName}</li>
      </ul>
      <p style="margin:0 0 12px;color:#555;">You can follow up directly and walk them through the rest of the application.</p>
      <p style="margin-top:8px;font-size:13px;color:#777;">Recruiting page: <a href="${resumeUrl}">${resumeUrl}</a></p>
    `;
    const text = `New application started (not finished)
Name: ${leadName}
Phone: ${lead.phone || ""}
Email: ${lead.email || ""}
Page: ${siteName}

They entered their info but didn’t finish your application questions.
Recruiting page: ${resumeUrl}`;

    jobs.push(
      (async () => {
        await sendEmail({ to, subject, html, text });
        await supabase
          .from("mm_agent_leads")
          .update({ incomplete_questions_emailed: true })
          .eq("id", lead.id);
      })()
    );
  }

  // ---- Finished questions, no booking/thank-you ----
  for (const lead of bLeads || []) {
    const site = sitesById[lead.agent_site_id];
    if (!site || !site.notification_emails) continue;

    const to = site.notification_emails.trim();
    if (!to) continue;

    const leadName = lead.full_name || "Lead";
    const siteName = site.site_name || "Momentum Financial";

    const subject = `Booking not finished – ${leadName}`;
    const html = `
      <h3 style="margin:0 0 8px;">Application completed (no booking)</h3>
      <p style="margin:0 0 8px;color:#555;">${leadName} finished your application but never completed the booking step.</p>
      <ul style="margin:0 0 12px 0;padding-left:18px;color:#111;">
        <li><strong>Name:</strong> ${leadName}</li>
        <li><strong>Phone:</strong> ${lead.phone || ""}</li>
        <li><strong>Email:</strong> ${lead.email || ""}</li>
        <li><strong>Page:</strong> ${siteName}</li>
      </ul>
      <p style="margin:0 0 12px;color:#555;">Reach out directly to lock in an interview time.</p>
    `;
    const text = `Application completed (no booking)
Name: ${leadName}
Phone: ${lead.phone || ""}
Email: ${lead.email || ""}
Page: ${siteName}

They finished the application but never completed the booking step. Reach out directly to lock in a time.`;

    jobs.push(
      (async () => {
        await sendEmail({ to, subject, html, text });
        await supabase
          .from("mm_agent_leads")
          .update({ incomplete_booking_emailed: true })
          .eq("id", lead.id);
      })()
    );
  }

  await Promise.all(jobs);

  return {
    statusCode: 200,
    body: JSON.stringify({
      ok: true,
      incomplete_questions_sent: (qLeads || []).length,
      incomplete_booking_sent: (bLeads || []).length,
    }),
  };
};
