// File: src/pages/ThankYou.jsx
import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { supabase } from "../lib/supabaseClient.js";

function Skeleton({ className = "" }) {
  return <div className={`animate-pulse rounded-md bg-white/10 ${className}`} />;
}

function escapeHtml(str = "") {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const SITE_URL = import.meta.env.VITE_SITE_URL || window.location.origin;

export default function ThankYou() {
  const [searchParams] = useSearchParams();
  const leadId = searchParams.get("lead_id");
  const slugParam = searchParams.get("slug") || "";

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [site, setSite] = useState(null);
  const [lead, setLead] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        if (!leadId) {
          setLoading(false);
          return;
        }

        // 1) fetch lead
        const { data: leadRow, error: leadErr } = await supabase
          .from("mm_agent_leads")
          .select("*")
          .eq("id", leadId)
          .maybeSingle();

        if (leadErr || !leadRow) {
          console.error(leadErr);
          setErr("We couldn’t load your recruiting site details.");
          setLoading(false);
          return;
        }

        setLead(leadRow);

        // 2) fetch site
        const { data: siteRow, error: siteErr } = await supabase
          .from("mm_agent_sites")
          .select("*")
          .eq("id", leadRow.agent_site_id)
          .maybeSingle();

        if (siteErr || !siteRow) {
          console.error(siteErr);
          setErr("We couldn’t load your recruiting site details.");
          setLoading(false);
          return;
        }

        setSite(siteRow);
        setLoading(false);

        // 3) send appointment confirmation email to the lead
        if (leadRow.email) {
          await sendAppointmentEmail(siteRow, leadRow, slugParam);
        }

        // 4) mark stage complete + send internal "new application" email ONCE
        if (!leadRow.completed_emailed) {
          await finalizeAndNotify(siteRow, leadRow);
        }
      } catch (e) {
        console.error(e);
        setErr("Something went wrong loading your confirmation.");
        setLoading(false);
      }
    }

    load();
  }, [leadId, slugParam]);

  // Meta Pixel: Schedule event on thank-you page
  useEffect(() => {
    if (window.fbq) {
      window.fbq("track", "Schedule");
    }
  }, []);

  const siteName = site?.site_name || "Momentum Financial";
  const pageOwner = site?.about_name || "Your Mentor";
  const homeHref = site?.slug ? `/${site.slug}` : "/";

  return (
    <div className="min-h-screen bg-[#1e1f22] text-white">
      <header className="mx-auto max-w-6xl px-4 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {loading ? (
            <Skeleton className="h-9 w-32 rounded" />
          ) : site?.logo_url ? (
            <img src={site.logo_url} alt="logo" className="h-9" />
          ) : (
            <div className="h-9 w-32 bg-white/10 rounded" />
          )}
          <span className="text-white/60 text-sm">
            {loading ? (
              <span className="inline-block h-4 w-28 animate-pulse bg-white/10 rounded" />
            ) : (
              <>
                {pageOwner} | {siteName}
              </>
            )}
          </span>
        </div>

        <Link
          to={homeHref}
          className="text-sm text.white/70 hover:text-white underline-offset-2 hover:underline"
        >
          Back to main page
        </Link>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-24 flex flex-col items-start justify-center gap-4">
        {loading ? (
          <>
            <Skeleton className="h-8 w-64 mb-2" />
            <Skeleton className="h-4 w-80 mb-1" />
            <Skeleton className="h-4 w-96 mb-1" />
          </>
        ) : (
          <>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              You’re all set. ✅
            </h1>
            <p className="text-white/75 text-lg max-w-xl">
              Your application has been sent to{" "}
              <span className="font-semibold">{pageOwner}</span>&apos;s team.
              They&apos;ll reach out soon to line up a time to talk next
              steps—keep your phone nearby and watch your email.
            </p>
            <p className="text-white/60 text-sm max-w-xl">
              If you need to update your contact info or have a question before
              they reach out, reply directly to the confirmation email or text
              you receive.
            </p>
            <Link
              to={homeHref}
              className="mt-4 inline-flex items-center justify-center rounded-xl bg-white px-6 py-3 font-semibold text-black shadow hover:shadow-lg active:scale-[.99]"
            >
              Back to main page
            </Link>
          </>
        )}
        {err && <div className="mt-4 text-xs text-red-400">{err}</div>}
      </main>
    </div>
  );
}

/* -------------------- Email helpers -------------------- */

function formatApptForEmail(whenIso, tz = "America/Chicago") {
  try {
    const d = new Date(whenIso);
    const datePart = new Intl.DateTimeFormat("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      timeZone: tz,
    }).format(d);
    const timePart = new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZone: tz,
    }).format(d);
    return `${datePart} at ${timePart} ${tz}`;
  } catch {
    return whenIso;
  }
}

// Same style as Logan's btn() helper
function btn(href, label, solid = true) {
  const base =
    "padding:10px 14px;border-radius:8px;text-decoration:none;display:inline-block;";
  const solidStyle = "background:#111;color:#fff;";
  const outlineStyle = "border:1px solid #111;color:#111;";
  return `<a href="${href}" style="${solid ? solidStyle : outlineStyle}${base}">${label}</a>`;
}

async function sendAppointmentEmail(site, lead, slugParam) {
  try {
    if (!lead?.email) return;

    const { data: appt, error: apptErr } = await supabase
      .from("mm_agent_appointments")
      .select("start_utc, tz, duration_min")
      .eq("lead_id", lead.id)
      .order("start_utc", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (apptErr) {
      console.error("[ThankYou] load appointment error", apptErr);
      return;
    }
    if (!appt) return;

    const tz = appt.tz || "America/Chicago";
    const durationMin = appt.duration_min ?? 30;
    const when = formatApptForEmail(appt.start_utc, tz);

    const agentName = site?.about_name || "Your Agent";
    const siteName = site?.site_name || "Momentum Financial";

    // Pick agent phone from site record if present
    const agentPhoneRaw =
      site?.agent_phone || site?.phone || site?.owner_phone || "";
    const phoneDigits = agentPhoneRaw.replace(/[^\d+]/g, "");
    const phoneHref = phoneDigits ? `tel:${phoneDigits}` : "";
    const phoneLabel = agentPhoneRaw || "your agent";

    const safeAgent = escapeHtml(agentName);
    const safeLead = escapeHtml(lead.full_name || "there");
    const safeWhen = escapeHtml(when);
    const safePhoneLabel = escapeHtml(phoneLabel);

    // Build reschedule URL – goes to /reschedule (your reschedule page)
    const slugQuery =
      site?.slug || slugParam
        ? `&slug=${encodeURIComponent(site.slug || slugParam)}`
        : "";
    const rescheduleUrl = `${SITE_URL}/reschedule?lead_id=${encodeURIComponent(
      lead.id
    )}${slugQuery}`;

    // Optional vCard URL (if present on site)
    const vcardUrl =
      site?.vcard_url || site?.contact_vcard_url || "";

    const html = `
      <h2 style="margin:0 0 8px;">You're booked with ${safeAgent}</h2>
      <p style="margin:0 0 12px;color:#555">Thanks for scheduling—here are the details.</p>
      <p style="margin:0 0 6px;"><strong>When:</strong> ${safeWhen} (${durationMin} min)</p>
      <p style="margin:0 0 6px;"><strong>Where:</strong> Phone call — ${safeAgent} will call you.</p>
      <p style="margin:0 0 6px;"><strong>Call will come from:</strong> ${
        phoneHref
          ? `<a href="${phoneHref}" style="color:#0ea5e9;text-decoration:none;">${safePhoneLabel}</a>`
          : safePhoneLabel
      }</p>
      <div style="margin:16px 0;">
        ${btn(rescheduleUrl, "Reschedule", true)}
        ${
          vcardUrl
            ? `&nbsp;&nbsp;${btn(vcardUrl, "Save Contact", false)}`
            : ""
        }
      </div>
      <p style="margin-top:16px;color:#777;font-size:13px;">
        If you need anything before the call, just text ${safePhoneLabel}.
      </p>`;

    const text = `You're booked with ${agentName}
When: ${when} (${durationMin} min)
Where: Phone call — ${agentName} will call you.
Call will come from: ${phoneLabel}
Reschedule: ${rescheduleUrl}${
      vcardUrl ? `\nSave contact: ${vcardUrl}` : ""
    }

If you need anything before the call, text ${phoneLabel}.`;

    await fetch(`${SITE_URL}/.netlify/functions/send-email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: lead.email,
        subject: `Your call with ${agentName} – ${when}`,
        html,
        text,
        fromName: `${agentName} | ${siteName}`,
      }),
    });
  } catch (e) {
    console.error("[ThankYou] sendAppointmentEmail error", e);
  }
}

async function finalizeAndNotify(site, lead) {
  try {
    const nowIso = new Date().toISOString();

    // 1) mark as fully complete for future runs / incomplete checker
    await supabase
      .from("mm_agent_leads")
      .update({
        stage: "complete",
        last_activity_at: nowIso,
        completed_emailed: true,
      })
      .eq("id", lead.id);

    const agentName = site?.about_name || "Your Agent";
    const siteName = site?.site_name || "Momentum Financial";
    const leadName = lead.full_name || "Lead";
    const answers = Array.isArray(lead.answers) ? lead.answers : [];

    const safeAgent = escapeHtml(agentName);
    const safeLead = escapeHtml(leadName);
    const safeEmail = escapeHtml(lead.email || "");
    const safePhone = escapeHtml(lead.phone || "");
    const safeSlug = escapeHtml(site.slug || "");

    const answersHtml = answers
      .filter((a) => a?.value && String(a.value).trim().length > 0)
      .map(
        (a) =>
          `<li><strong>${escapeHtml(a.question)}</strong>: ${escapeHtml(
            a.value
          )}</li>`
      )
      .join("");

    const answersText = answers
      .filter((a) => a?.value && String(a.value).trim().length > 0)
      .map((a) => `- ${a.question}: ${a.value}`)
      .join("\n");

    const html = `
      <h3 style="margin:0 0 8px;">New application for ${safeAgent}</h3>
      <p style="margin:0 0 8px;color:#555;">Someone just completed your recruiting application.</p>
      <ul style="margin:0 0 12px 0;padding-left:18px;color:#111;">
        <li><strong>Name:</strong> ${safeLead}</li>
        <li><strong>Phone:</strong> ${safePhone}</li>
        <li><strong>Email:</strong> ${safeEmail}</li>
        <li><strong>Site:</strong> ${escapeHtml(siteName)} (slug: ${safeSlug})</li>
      </ul>
      ${
        answersHtml
          ? `<h4 style="margin:0 0 6px;">Application answers</h4>
      <ul style="margin:0 0 12px 0;padding-left:18px;color:#111;">${answersHtml}</ul>`
          : ""
      }
      <p style="margin-top:16px;color:#777;font-size:13px;">
        Log into your Momentum Manager account and open the <strong>Leads</strong> tab on your site to follow up.
      </p>`;

    const text = `New application for ${agentName}

Name: ${leadName}
Phone: ${lead.phone || ""}
Email: ${lead.email || ""}
Site: ${siteName} (slug: ${site.slug || ""})

${
  answersText
    ? `Application answers:\n${answersText}\n\n`
    : ""
}Log into Momentum Manager and open the Leads tab on your site to follow up.`;

    const to = (site.notification_emails || "").trim();
    if (!to) return;

    await fetch(`${SITE_URL}/.netlify/functions/send-email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to,
        subject: `New application – ${leadName}`,
        html,
        text,
        fromName: `${agentName} | Momentum Financial`,
      }),
    });
  } catch (e) {
    console.error("[ThankYou] finalizeAndNotify error", e);
  }
}
