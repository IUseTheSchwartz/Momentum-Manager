// File: src/pages/AgentPublicLanding.jsx
import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../lib/supabaseClient.js";
import { readUTM } from "../lib/utm.js";
import ProofFeed from "../components/ProofFeed.jsx";
import QualifyForm from "../components/QualifyForm.jsx";

/* --------------------------- helpers --------------------------- */

function extractYouTubeId(url = "") {
  if (!url) return "";
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtu.be")) return u.pathname.slice(1);
    if (u.searchParams.get("v")) return u.searchParams.get("v");
    const parts = u.pathname.split("/").filter(Boolean);
    const idx = parts.findIndex((p) => ["embed", "shorts"].includes(p));
    if (idx >= 0 && parts[idx + 1]) return parts[idx + 1];
    return parts[0] || "";
  } catch {
    return "";
  }
}

/* tiny skeleton blocks to avoid ugly flashes */
function Skeleton({ className = "" }) {
  return <div className={`animate-pulse rounded-md bg-white/10 ${className}`} />;
}

/* ---------------------- Creator Bar (Logan-style) ---------------------- */

function CreatorBar({ settings }) {
  const name = settings?.about_name || "Your Name";
  const avatar = settings?.headshot_url || null;

  const ytUrl = settings?.social_youtube_url || "";
  const igUrl = settings?.social_instagram_url || "";
  const scUrl = settings?.social_snapchat_url || "";

  const items = [
    ytUrl && {
      key: "yt",
      label: "YouTube",
      href: ytUrl,
      Icon: (props) => (
        <svg
          viewBox="0 0 24 24"
          className="h-4 w-4"
          aria-hidden="true"
          fill="currentColor"
          {...props}
        >
          <path d="M23.5 6.2a4 4 0 0 0-2.8-2.9C18.8 2.8 12 2.8 12 2.8s-6.8 0-8.7.5A4 4 0 0 0 .5 6.2 41.7 41.7 0 0 0 0 12a41.7 41.7 0 0 0 .5 5.8 4 4 0 0 0 2.8 2.9c1.9.5 8.7.5 8.7.5s6.8 0 8.7-.5a4 4 0 0 0 2.8-2.9c.4-1.9.5-5.8.5-5.8s0-3.9-.5-5.8ZM9.6 15.5v-7l6.6 3.5-6.6 3.5Z" />
        </svg>
      ),
    },
    igUrl && {
      key: "ig",
      label: "Instagram",
      href: igUrl,
      Icon: (props) => (
        <svg
          viewBox="0 0 24 24"
          className="h-4 w-4"
          aria-hidden="true"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          {...props}
        >
          <rect x="2.5" y="2.5" width="19" height="19" rx="5" />
          <circle cx="12" cy="12" r="4" />
          <circle cx="17.5" cy="6.5" r="1.2" fill="currentColor" stroke="none" />
        </svg>
      ),
    },
    scUrl && {
      key: "sc",
      label: "Snapchat",
      href: scUrl,
      Icon: () => (
        <img
          src="https://cdn.simpleicons.org/snapchat/FFFFFF"
          alt=""
          className="h-4 w-4 object-contain"
          loading="lazy"
        />
      ),
    },
  ].filter(Boolean);

  if (!items.length) return null;

  return (
    <section className="mt-5">
      <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {/* avatar + name */}
          <div className="flex items-center gap-3">
            <div className="shrink-0">
              {avatar ? (
                <img
                  src={avatar}
                  alt={name}
                  className="h-10 w-10 rounded-xl object-cover border border-white/10"
                />
              ) : (
                <div className="h-10 w-10 rounded-xl bg-white/10" />
              )}
            </div>
            <div className="min-w-0">
              <div className="text-sm text-white/60 leading-tight">
                Personal page
              </div>
              <div className="font-semibold leading-tight truncate">{name}</div>
            </div>
          </div>

          {/* socials */}
          <div className="sm:ml-auto">
            <div className="grid grid-cols-2 gap-2 max-[380px]:grid-cols-1 sm:flex sm:flex-row sm:items-center">
              {items.map(({ key, label, href, Icon }) => (
                <a
                  key={key}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm text-white/90 hover:bg-white/15 transition"
                  aria-label={label}
                >
                  <Icon />
                  <span className="font-medium">{label}</span>
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------------------- Email helpers (Logan-style) ---------------------- */

function escapeHtml(str = "") {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildAgentLeadEmail({ site, lead, answers }) {
  const agentName = site?.about_name || "Your Agent";
  const siteName = site?.site_name || "Momentum Financial";
  const leadName = lead.full_name || "Lead";

  const safeAgent = escapeHtml(agentName);
  const safeLead = escapeHtml(leadName);
  const safeEmail = escapeHtml(lead.email || "");
  const safePhone = escapeHtml(lead.phone || "");
  const safeSlug = escapeHtml(site.slug || "");

  const answersHtml = (answers || [])
    .filter((a) => a.value && String(a.value).trim().length > 0)
    .map(
      (a) =>
        `<li><strong>${escapeHtml(a.question)}</strong>: ${escapeHtml(
          a.value
        )}</li>`
    )
    .join("");

  const answersText = (answers || [])
    .filter((a) => a.value && String(a.value).trim().length > 0)
    .map((a) => `- ${a.question}: ${a.value}`)
    .join("\n");

  const html = `
  <h3 style="margin:0 0 8px;">New application for ${safeAgent}</h3>
  <p style="margin:0 0 8px;color:#555;">Someone just applied on your Momentum recruiting site.</p>
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

  const subject = `New application – ${leadName}`;

  return { subject, html, text };
}

async function sendLeadNotification({ site, lead, answers }) {
  const to = (site.notification_emails || "").trim();
  if (!to) {
    // no per-agent emails set; function will fall back to SMTP_TO only if we omit `to`,
    // but here we want "per agent or nothing", so just bail.
    return;
  }

  const { subject, html, text } = buildAgentLeadEmail({ site, lead, answers });

  // 🔹 Use "Agent Name | Momentum Financial" as the FROM display name
  const fromName = `${site?.about_name || "Your Agent"} | Momentum Financial`;

  try {
    const res = await fetch("/.netlify/functions/send-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to, subject, html, text, fromName }),
    });
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      console.error("[AgentPublicLanding] send-email failed:", res.status, t);
    }
  } catch (err) {
    console.error("[AgentPublicLanding] send-email error:", err);
  }
}

/* ---------------------- Main page ---------------------- */

export default function AgentPublicLanding() {
  const { slug } = useParams();

  const [site, setSite] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [proof, setProof] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  // modal / booking
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState("contact");

  // lead state
  const [leadId, setLeadId] = useState(null);
  const [leadDraft, setLeadDraft] = useState(null);

  // contact fields
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  const [submitting, setSubmitting] = useState(false);

  /* ---------------------- Load site + questions + proof ---------------------- */

  useEffect(() => {
    async function load() {
      setLoading(true);
      setErr(null);

      // site by slug
      const { data: siteRow, error: siteErr } = await supabase
        .from("mm_agent_sites")
        .select("*")
        .eq("slug", slug)
        .eq("is_active", true)
        .maybeSingle();

      if (siteErr || !siteRow) {
        console.error(siteErr);
        setErr("This recruiting page was not found.");
        setLoading(false);
        return;
      }

      setSite(siteRow);

      try {
        const [qRes, proofRes] = await Promise.all([
          supabase
            .from("mm_agent_questions")
            .select("*")
            .eq("agent_site_id", siteRow.id)
            .eq("is_active", true)
            .order("sort_order", { ascending: true }),
          fetch("/.netlify/functions/logan-proof-feed"),
        ]);

        if (qRes.error) {
          console.error(qRes.error);
        }
        setQuestions(qRes.data || []);

        if (proofRes.ok) {
          const json = await proofRes.json();
          setProof(Array.isArray(json) ? json : []);
        } else {
          console.error("logan-proof-feed error status:", proofRes.status);
          setProof([]);
        }
      } catch (fetchErr) {
        console.error("Error loading questions/proof:", fetchErr);
        setProof([]);
      }

      setLoading(false);
    }

    load();
  }, [slug]);

  /* ---------------------- Derived values ---------------------- */

  const ytId = useMemo(() => {
    if (!site) return "";
    return (
      extractYouTubeId(site.hero_youtube_url) ||
      extractYouTubeId(site.youtube_url)
    );
  }, [site]);

  const brandVars = useMemo(() => {
    const primary = site?.brand_primary || "#6b8cff";
    const accent = site?.brand_accent || "#9b5cff";
    return { primary, accent };
  }, [site]);

  const siteName = site?.site_name || "Momentum Financial";
  const pageOwner = site?.about_name || "Your Mentor";

  /* ---------------------- Modal helpers ---------------------- */

  function openModal() {
    setOpen(true);
    setStep("contact");
    setLeadId(null);
    setLeadDraft(null);
    setFullName("");
    setEmail("");
    setPhone("");
  }

  function closeModal() {
    setOpen(false);
  }

  /* ---------------------- CONTACT → create mm_agent_leads row ---------------------- */

  async function handleContactNext() {
    if (!site) return;

    const name = (fullName || "").trim();
    const em = (email || "").trim();
    const ph = (phone || "").trim();

    if (!name && !em && !ph) {
      alert("Please provide at least a name, email, or phone.");
      return;
    }

    setSubmitting(true);
    try {
      const utm = readUTM ? readUTM() : null;
      const nowIso = new Date().toISOString();

      const { data, error } = await supabase
        .from("mm_agent_leads")
        .insert({
          agent_site_id: site.id,
          full_name: name || null,
          email: em || null,
          phone: ph || null,
          utm,
          is_complete: false,
          stage: "new",
          started_at: nowIso,
          last_activity_at: nowIso,
        })
        .select("id")
        .single();

      if (error) throw error;

      setLeadId(data.id);
      setLeadDraft({
        full_name: name || null,
        email: em || null,
        phone: ph || null,
      });
      setStep("qualify");
    } catch (e) {
      console.error(e);
      alert("Could not start your application. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  /* ---------------------- QUALIFY → update mm_agent_leads + email ---------------------- */

  async function handleQualifySubmit(values) {
    if (!leadId || !site) {
      setStep("done");
      return;
    }

    setSubmitting(true);
    try {
      const nowIso = new Date().toISOString();
      const answers = questions.map((q) => ({
        question_id: q.id,
        question: q.question_text,
        value: values[q.id] || "",
      }));

      const leadPayload = {
        full_name: leadDraft?.full_name || fullName?.trim() || null,
        email: leadDraft?.email || email?.trim() || null,
        phone: leadDraft?.phone || phone?.trim() || null,
      };

      const { error } = await supabase
        .from("mm_agent_leads")
        .update({
          ...leadPayload,
          answers,
          is_complete: true,
          last_activity_at: nowIso,
        })
        .eq("id", leadId);

      if (error) throw error;

      // 🔔 Fire per-agent notification email (doesn't block UI if it fails)
      await sendLeadNotification({
        site,
        lead: {
          full_name: leadPayload.full_name || "",
          email: leadPayload.email || "",
          phone: leadPayload.phone || "",
        },
        answers,
      });

      setStep("done");
    } catch (e) {
      console.error(e);
      alert("Submission failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  /* ---------------------- Render ---------------------- */

  if (err) {
    return (
      <div className="min-h-screen bg-[#1e1f22] text-white grid place-items-center">
        <p className="text-sm text-red-400">{err}</p>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-[#1e1f22] text-white"
      style={{
        "--brand-primary": brandVars.primary,
        "--brand-accent": brandVars.accent,
      }}
    >
      {/* Header (Logan-style) */}
      <header className="mx-auto max-w-6xl px-4 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {loading ? (
            <Skeleton className="h-9 w-32 rounded" />
          ) : site?.logo_url ? (
            <img src={site.logo_url} alt={siteName} className="h-9" />
          ) : (
            <div className="h-9 w-32 bg-white/10 rounded" />
          )}
          <span className="text-white/60 text-sm">
            {loading ? (
              <span className="inline-block h-4 w-32 animate-pulse bg-white/10 rounded" />
            ) : (
              <>
                {pageOwner} | {siteName}
              </>
            )}
          </span>
        </div>
        <div />
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-24">
        {/* HERO — video + CTA + creator bar */}
        <section className="pt-2">
          {/* video */}
          {loading ? (
            <div className="mx-auto w-full max-w-[720px]">
              <Skeleton className="aspect-video w-full rounded-2xl border border-white/10" />
            </div>
          ) : ytId ? (
            <div className="mx-auto w-full max-w-[720px]">
              <div className="relative aspect-video overflow-hidden rounded-2xl border border-white/10 shadow-2xl shadow-black/40">
                <iframe
                  className="absolute inset-0 h-full w-full"
                  src={`https://www.youtube.com/embed/${ytId}?rel=0&modestbranding=1&playsinline=1`}
                  title="Intro"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  loading="lazy"
                />
              </div>
            </div>
          ) : (
            <div className="mx-auto w-full max-w-[720px]">
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
                <div className="aspect-video w-full rounded-xl bg-black/30 border border-white/10 grid place-items-center">
                  <div className="text-center">
                    <div className="text-sm uppercase tracking-wide text-white/50">
                      Video Coming Soon
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* CTA */}
          <div className="mt-4 text-center">
            {loading ? (
              <Skeleton className="mx-auto h-12 w-full sm:w-72 rounded-xl" />
            ) : (
              <button
                onClick={openModal}
                className="inline-flex w-full sm:w-auto items-center justify-center rounded-xl bg-white px-6 py-3 font-semibold text-black shadow hover:shadow-lg active:scale-[.99]"
              >
                Book Call
              </button>
            )}
          </div>

          {/* Creator / socials */}
          {loading ? (
            <div className="mt-5">
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-xl" />
                  <div className="flex-1">
                    <Skeleton className="h-3 w-24 rounded mb-2" />
                    <Skeleton className="h-4 w-40 rounded" />
                  </div>
                  <Skeleton className="h-9 w-28 rounded-xl" />
                  <Skeleton className="h-9 w-28 rounded-xl" />
                </div>
              </div>
            </div>
          ) : (
            <CreatorBar settings={site} />
          )}

          {/* Headline + sub */}
          <div className="mt-8">
            {loading ? (
              <>
                <Skeleton className="h-8 w-3/4 rounded mb-2" />
                <Skeleton className="h-4 w-1/2 rounded" />
              </>
            ) : (
              <>
                <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight">
                  {site?.hero_title || "Build a high-ticket sales career"}
                </h1>
                <p className="mt-3 text-white/70 text-lg">
                  {site?.hero_sub || "High Expectations. High Results."}
                </p>
              </>
            )}
          </div>

          {/* PROOF */}
          <div className="mt-6">
            {loading ? (
              <div className="rounded-2xl border border-white/10 bg.white/[0.03] p-3">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-28 w-full rounded-xl" />
                  ))}
                </div>
              </div>
            ) : proof.length ? (
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                <ProofFeed
                  items={proof}
                  visibleCount={4}
                  cycleMs={3000}
                  blurTransition
                  bigSlides
                />
              </div>
            ) : null}
          </div>
        </section>

        {/* ABOUT section */}
        <section className="mt-16 grid gap-6 sm:grid-cols-[160px,1fr] items-start">
          {loading ? (
            <>
              <Skeleton className="h-40 w-40 rounded-2xl" />
              <div>
                <Skeleton className="h-5 w-40 rounded mb-3" />
                <Skeleton className="h-4 w-full rounded mb-2" />
                <Skeleton className="h-4 w-5/6 rounded" />
              </div>
            </>
          ) : (
            <>
              {site?.headshot_url ? (
                <img
                  src={site.headshot_url}
                  alt={pageOwner}
                  className="h-40 w-40 rounded-2xl object-cover"
                />
              ) : (
                <div className="h-40 w-40 rounded-2xl bg-white/10" />
              )}
              <div>
                <h2 className="text-xl font-bold">About {pageOwner}</h2>
                <p className="text-white/80 mt-2">
                  {site?.about_bio ||
                    "This section will be powered by your real bio once you fill it out in your Agent Settings panel."}
                </p>
              </div>
            </>
          )}
        </section>
      </main>

      {/* BOOKING MODAL */}
      {open && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-[#2b2d31] border border-white/10 p-4">
            {/* HEADER */}
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold">
                {step === "contact"
                  ? "Start your application"
                  : step === "qualify"
                  ? "Answer a few questions"
                  : "Application received"}
              </h3>
              <button
                onClick={closeModal}
                className="text-white/60 hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* STEP: CONTACT */}
            {step === "contact" && (
              <div className="grid gap-3">
                <div className="grid gap-2">
                  <label className="text-sm text-white/70">Full Name</label>
                  <input
                    className="w-full rounded-lg bg-black/30 border border-white/10 px-3 py-2 outline-none text-sm"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="John Carter"
                  />
                </div>
                <div className="grid gap-2">
                  <label className="text-sm text-white/70">Phone</label>
                  <input
                    className="w-full rounded-lg bg-black/30 border border-white/10 px-3 py-2 outline-none text-sm"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="(555) 555-5555"
                  />
                </div>
                <div className="grid gap-2">
                  <label className="text-sm text-white/70">Email</label>
                  <input
                    type="email"
                    className="w-full rounded-lg bg-black/30 border border-white/10 px-3 py-2 outline-none text-sm"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 mt-2">
                  <button
                    onClick={closeModal}
                    className="px-3 py-2 rounded-lg border border-white/15 text-white/80 hover:bg-white/5 text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleContactNext}
                    className="px-4 py-2 rounded-lg bg-white text-black font-semibold text-xs"
                    disabled={submitting}
                  >
                    {submitting ? "Submitting..." : "Next"}
                  </button>
                </div>
                <p className="text-xs text-white/50">
                  You can finish later; we&apos;ll save your info as an
                  incomplete application.
                </p>
              </div>
            )}

            {/* STEP: QUALIFY */}
            {step === "qualify" && (
              <div>
                <button
                  onClick={() => setStep("contact")}
                  className="text-white/60 hover:text-white mb-3 text-sm"
                >
                  ← Back
                </button>
                <QualifyForm
                  questions={questions}
                  onSubmit={handleQualifySubmit}
                  submitting={submitting}
                />
              </div>
            )}

            {/* STEP: DONE */}
            {step === "done" && (
              <div className="space-y-3 text-sm text-white/80">
                <p>
                  Thanks for applying. Your information has been sent to{" "}
                  {pageOwner}&apos;s team. They&apos;ll reach out to you about
                  next steps.
                </p>
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="px-4 py-2 rounded-lg text-xs font-semibold bg-white text-black hover:bg-white/90"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
