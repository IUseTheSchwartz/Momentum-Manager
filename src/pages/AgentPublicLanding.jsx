// File: src/pages/AgentPublicLanding.jsx
import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
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

/* Check bullet like main landing */
function CheckItem({ children }) {
  return (
    <li className="flex items-start gap-3">
      <div className="mt-1 h-5 w-5 rounded-full bg-[#00A160]/20 text-[#00A160] flex items-center justify-center text-xs font-bold">
        ✓
      </div>
      <p className="text-sm sm:text-base text-white/80">{children}</p>
    </li>
  );
}

/* ---------------------- Email helpers (per-agent notification) ---------------------- */

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
    return;
  }

  const { subject, html, text } = buildAgentLeadEmail({ site, lead, answers });

  try {
    const res = await fetch("/.netlify/functions/send-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to, subject, html, text }),
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
  const navigate = useNavigate();

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

  function scrollToSection(id) {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
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

  /* ---------------------- QUALIFY → update mm_agent_leads + email + redirect ---------------------- */

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

      // 🔔 per-agent notification email (ONLY on full completion)
      await sendLeadNotification({
        site,
        lead: {
          full_name: leadPayload.full_name || "",
          email: leadPayload.email || "",
          phone: leadPayload.phone || "",
        },
        answers,
      });

      // ➡️ redirect to booking shell (then Thank You)
      navigate(`/schedule?lead_id=${leadId}`);
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

  const carrierNames = ["Americo", "Foresters", "Mutual of Omaha", "Ethos", "Aetna"];

  return (
    <div
      className="min-h-screen bg-[#1e1f22] text-white"
      style={{
        "--brand-primary": brandVars.primary,
        "--brand-accent": brandVars.accent,
      }}
    >
      {/* local marquee styles */}
      <style>{`
        @keyframes momentum-marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .momentum-marquee {
          position: relative;
          overflow: hidden;
        }
        .momentum-marquee-inner {
          display: inline-flex;
          gap: 3rem;
          white-space: nowrap;
          animation: momentum-marquee 28s linear infinite;
        }
      `}</style>

      {/* Header */}
      <header className="mx-auto max-w-6xl px-4 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {loading ? (
            <Skeleton className="h-9 w-32 rounded" />
          ) : (
            <img src="/logo.png" alt="Momentum Manager" className="h-9" />
          )}
          <span className="text-white/60 text-sm sm:text-base">
            {loading ? (
              <span className="inline-block h-4 w-32 animate-pulse bg-white/10 rounded" />
            ) : (
              <>
                {pageOwner} | {siteName}
              </>
            )}
          </span>
        </div>

        <nav className="hidden md:flex items-center gap-6 text-sm text-white/70">
          <button
            type="button"
            onClick={() => scrollToSection("why")}
            className="hover:text-white"
          >
            Why This Team
          </button>
          <button
            type="button"
            onClick={() => scrollToSection("what-you-get")}
            className="hover:text-white"
          >
            What You Get
          </button>
          <button
            type="button"
            onClick={() => scrollToSection("results")}
            className="hover:text-white"
          >
            Results
          </button>
          <button
            type="button"
            onClick={() => scrollToSection("faq")}
            className="hover:text-white"
          >
            FAQ
          </button>
          <button
            onClick={openModal}
            className="rounded-xl bg-[#00A160] px-4 py-2 font-semibold text-sm text-black hover:bg-[#00C978] transition shadow"
          >
            Join the Team
          </button>
        </nav>

        {/* mobile CTA only */}
        <button
          onClick={openModal}
          className="md:hidden rounded-xl bg-[#00A160] px-4 py-2 font-semibold text-sm text-black hover:bg-[#00C978] transition shadow"
        >
          Join the Team
        </button>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-24">
        {/* HERO — copy + video */}
        <section id="hero" className="pt-4">
          {loading ? (
            <div className="grid gap-10 lg:grid-cols-2 items-center">
              <div>
                <Skeleton className="h-6 w-48 mb-4" />
                <Skeleton className="h-9 w-3/4 mb-3" />
                <Skeleton className="h-9 w-2/3 mb-6" />
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-5/6 mb-6" />
                <Skeleton className="h-10 w-40" />
              </div>
              <div className="mx-auto w-full max-w-[720px]">
                <Skeleton className="aspect-video w-full rounded-2xl border border-white/10" />
              </div>
            </div>
          ) : (
            <div className="grid gap-10 lg:grid-cols-2 items-center">
              {/* left: promise + bullets */}
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.04] px-3 py-1 text-xs font-medium text-white/70">
                  <span className="h-2 w-2 rounded-full bg-[#00A160]" />
                  Remote life insurance agency • Mentored by {pageOwner}
                </div>

                <h1 className="mt-4 text-3xl sm:text-5xl font-extrabold tracking-tight">
                  {site?.hero_title || "Jumpstart your career in life insurance"}
                </h1>

                <p className="mt-4 text-white/70 text-sm sm:text-base">
                  {site?.hero_sub ||
                    `Work directly with ${pageOwner} inside a system built to help hungry people win in life insurance.`}
                </p>

                <ul className="mt-5 space-y-3">
                  <CheckItem>A clear roadmap from brand-new to top producer</CheckItem>
                  <CheckItem>Daily mentorship and accountability</CheckItem>
                  <CheckItem>
                    A proven system and leadership that actually cares about your success
                  </CheckItem>
                </ul>

                <div className="mt-6">
                  <button
                    onClick={openModal}
                    className="inline-flex w-full sm:w-auto items-center justify-center rounded-xl bg-[#00A160] px-6 py-3 font-semibold text-black shadow hover:bg-[#00C978] active:scale-[.99] transition"
                  >
                    Join the Team
                  </button>
                  <p className="mt-2 text-xs text-white/55">
                    No experience required. We&apos;ll help you get licensed.
                  </p>
                </div>
              </div>

              {/* right: video */}
              <div className="mx-auto w-full max-w-[720px]">
                {ytId ? (
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
                ) : (
                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
                    <div className="aspect-video w-full rounded-xl bg-black/30 border border-white/10 grid place-items-center">
                      <div className="text-center">
                        <div className="text-sm uppercase tracking-wide text-white/50">
                          Video Coming Soon
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </section>

        {/* PARTNER STRIP */}
        <section id="partners" className="mt-16">
          <h2 className="text-center text-xl sm:text-2xl font-bold">
            Our partnerships with industry leaders
          </h2>
          <p className="mt-2 text-center text-sm text-white/70">
            Work with trusted, A-rated carriers that actually issue policies and pay fast.
          </p>

          <div className="momentum-marquee mt-6 rounded-2xl border border-white/10 bg-black/30 py-4">
            <div className="momentum-marquee-inner px-6 text-xs sm:text-sm text-white/70 uppercase tracking-[0.35em]">
              {carrierNames.concat(carrierNames).map((name, idx) => (
                <span key={idx}>{name}</span>
              ))}
            </div>
          </div>
        </section>

        {/* WHY SECTION */}
        <section id="why" className="mt-20 grid gap-10 lg:grid-cols-2 items-center">
          {loading ? (
            <>
              <div>
                <Skeleton className="h-6 w-40 mb-3" />
                <Skeleton className="h-8 w-3/4 mb-4" />
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-5/6 mb-4" />
                <Skeleton className="h-4 w-1/2 mb-4" />
                <Skeleton className="h-10 w-40" />
              </div>
              <Skeleton className="h-64 w-full rounded-2xl" />
            </>
          ) : (
            <>
              <div>
                <h2 className="text-2xl sm:text-3xl font-bold">
                  Why agents choose this team
                </h2>
                <p className="mt-3 text-sm sm:text-base text-white/75">
                  You&apos;re not just joining a random downline. You&apos;re plugging
                  into a system with {pageOwner} and a team that&apos;s still in the field
                  doing the work every day.
                </p>

                <ul className="mt-5 space-y-3">
                  <CheckItem>Daily mentorship and accountability</CheckItem>
                  <CheckItem>
                    A culture that rewards effort, coachability, and results
                  </CheckItem>
                  <CheckItem>
                    Work from anywhere with leaders and teammates online all day actually
                    doing the work
                  </CheckItem>
                </ul>

                <button
                  onClick={openModal}
                  className="mt-6 inline-flex w-full sm:w-auto items-center justify-center rounded-xl bg-[#00A160] px-6 py-3 font-semibold text-black shadow hover:bg-[#00C978] active:scale-[.99] transition"
                >
                  Join the Team
                </button>
              </div>

              <div className="h-full">
                <div className="relative h-full min-h-[230px] rounded-2xl border border-white/10 bg-gradient-to-br from-[#004830] via-black to-[#00A160] p-6 shadow-xl shadow-black/40">
                  <div className="text-xs uppercase tracking-[0.3em] text-white/60">
                    Momentum System
                  </div>
                  <div className="mt-4 space-y-2 text-sm sm:text-base font-semibold">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-[#00A160]" />
                      Top commissions
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-[#00A160]" />
                      Consistent conversations with people who requested info
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-[#00A160]" />
                      Daily mentorship
                    </div>
                  </div>
                  <div className="absolute inset-x-6 bottom-6 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />
                </div>
              </div>
            </>
          )}
        </section>

        {/* WHAT YOU GET */}
        <section id="what-you-get" className="mt-20">
          <h2 className="text-2xl sm:text-3xl font-bold">What you get when you join</h2>
          <p className="mt-2 text-sm sm:text-base text-white/75">
            You&apos;re not just joining an agency. You&apos;re plugging into a system
            built for closers.
          </p>

          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {/* Card 1 – single explicit leads mention */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 flex flex-col">
              <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#00A160]/15 text-[#00A160]">
                ✓
              </div>
              <h3 className="font-semibold text-lg mb-2">Access to high quality leads</h3>
              <p className="text-sm text-white/75 flex-1">
                Plug into a steady flow of people who already requested coverage, so
                you&apos;re spending your time helping families instead of cold-calling
                random lists.
              </p>
              <button
                onClick={openModal}
                className="mt-4 inline-flex items-center justify-center rounded-xl bg-[#00A160] px-4 py-2 text-sm font-semibold text-black hover:bg-[#00C978] transition"
              >
                Join the Team
              </button>
            </div>

            {/* Card 2 */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 flex flex-col">
              <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#00A160]/15 text-[#00A160]">
                🎧
              </div>
              <h3 className="font-semibold text-lg mb-2">
                Live dials, one-on-one coaching &amp; mentorship
              </h3>
              <p className="text-sm text-white/75 flex-1">
                Join live dials, get real feedback, and work directly with people who are
                in the field every day so you always know exactly what to say and do.
              </p>
              <button
                onClick={openModal}
                className="mt-4 inline-flex items-center justify-center rounded-xl bg-[#00A160] px-4 py-2 text-sm font-semibold text-black hover:bg-[#00C978] transition"
              >
                Join the Team
              </button>
            </div>

            {/* Card 3 */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 flex flex-col">
              <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#00A160]/15 text-[#00A160]">
                🤝
              </div>
              <h3 className="font-semibold text-lg mb-2">
                A team that actually cares about your success
              </h3>
              <p className="text-sm text-white/75 flex-1">
                People on every day, all day, doing the work and showing results. You&apos;ll
                see what works in real time and never feel like you&apos;re doing this
                alone.
              </p>
              <button
                onClick={openModal}
                className="mt-4 inline-flex items-center justify-center rounded-xl bg-[#00A160] px-4 py-2 text-sm font-semibold text-black hover:bg-[#00C978] transition"
              >
                Join the Team
              </button>
            </div>
          </div>
        </section>

        {/* ABOUT / MENTOR SECTION */}
        <section className="mt-20" id="mentor">
          {loading ? (
            <section className="grid gap-6 sm:grid-cols-[160px,1fr] items-start">
              <Skeleton className="h-40 w-40 rounded-2xl" />
              <div>
                <Skeleton className="h-5 w-40 rounded mb-3" />
                <Skeleton className="h-4 w-full rounded mb-2" />
                <Skeleton className="h-4 w-5/6 rounded" />
              </div>
            </section>
          ) : (
            <section className="grid gap-6 sm:grid-cols-[160px,1fr] items-start">
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
            </section>
          )}
        </section>

        {/* RESULTS / LIVE SALES FEED */}
        <section id="results" className="mt-20">
          <div className="grid gap-8 lg:grid-cols-2 items-start">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold">Live sales from our team</h2>
              <p className="mt-3 text-sm sm:text-base text-white/75">
                This isn&apos;t a collage of old screenshots. The feed you&apos;re seeing
                is powered by our internal systems and updates as our agents write new
                business.
              </p>
              <ul className="mt-4 space-y-3">
                <CheckItem>Shows real policies our agents are issuing</CheckItem>
                <CheckItem>Updates throughout the day as sales come in</CheckItem>
              </ul>

              <button
                onClick={openModal}
                className="mt-6 inline-flex w-full sm:w-auto items-center justify-center rounded-xl bg-[#00A160] px-6 py-3 font-semibold text-black shadow hover:bg-[#00C978] active:scale-[.99] transition"
              >
                Join the Team
              </button>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 overflow-hidden">
              {loading ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-28 w-full rounded-xl" />
                  ))}
                </div>
              ) : proof.length ? (
                <>
                  <ProofFeed
                    items={proof}
                    visibleCount={4}
                    cycleMs={3000}
                    blurTransition
                    bigSlides
                  />
                  <p className="mt-2 text-xs text-white/55 text-center">
                    Updated automatically as the team writes business.
                  </p>
                </>
              ) : (
                <p className="text-xs text-white/55 text-center py-6">
                  Live sales feed coming soon.
                </p>
              )}
            </div>
          </div>
        </section>

        {/* FIT SECTION */}
        <section id="fit" className="mt-20">
          <h2 className="text-2xl sm:text-3xl font-bold">Is this a fit for you?</h2>
          <p className="mt-2 text-sm sm:text-base text-white/75">
            We&apos;re not for everyone. Here&apos;s who thrives on this team.
          </p>

          <div className="mt-8 grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <h3 className="font-semibold text-lg mb-3 text-red-300">Not for you if…</h3>
              <ul className="space-y-3 text-sm text-white/75">
                <li>• You want a salary or hourly job with no upside.</li>
                <li>
                  • You&apos;re not willing to study, get licensed, and show up to
                  training.
                </li>
                <li>• You&apos;re looking for easy money without putting in real work.</li>
              </ul>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <h3 className="font-semibold text-lg mb-3 text-[#00C978]">
                Perfect for you if…
              </h3>
              <ul className="space-y-3 text-sm text.white/75">
                <li>• You&apos;re hungry, coachable, and competitive.</li>
                <li>• You like the idea of being paid directly on results.</li>
                <li>
                  • You want daily mentorship and accountability, not just a login and
                  &quot;good luck&quot;.
                </li>
              </ul>
            </div>
          </div>

          <button
            onClick={openModal}
            className="mt-8 inline-flex w-full sm:w-auto items-center justify.center rounded-xl bg-[#00A160] px-6 py-3 font-semibold text-black shadow hover:bg-[#00C978] active:scale-[.99] transition"
          >
            Join the Team
          </button>
        </section>

        {/* FAQ SECTION */}
        <section id="faq" className="mt-20">
          <h2 className="text-2xl sm:text-3xl font-bold">Frequently asked questions</h2>
          <p className="mt-2 text-sm sm:text-base text-white/75">
            A few quick answers before you apply.
          </p>

          <div className="mt-6 space-y-5">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <h3 className="font-semibold text-sm sm:text-base">
                Do I need a life insurance license already?
              </h3>
              <p className="mt-2 text-sm text.white/75">
                No. If you&apos;re not licensed yet, we&apos;ll show you exactly how to
                get it quickly and what that process looks like.
              </p>
            </div>

            <div className="rounded-2xl border border.white/10 bg-white/[0.03] p-4">
              <h3 className="font-semibold text-sm sm:text-base">
                Is this commission only?
              </h3>
              <p className="mt-2 text-sm text.white/75">
                Yes. That also means there&apos;s no cap on your income. We&apos;ll show
                you how to ramp up so the numbers make sense.
              </p>
            </div>

            <div className="rounded-2xl border border.white/10 bg-white/[0.03] p-4">
              <h3 className="font-semibold text-sm sm:text-base">
                Who will I be talking to?
              </h3>
              <p className="mt-2 text-sm text.white/75">
                You&apos;ll be talking to people who have requested information about life
                insurance – never random cold calls or just your friends and family.
              </p>
            </div>

            <div className="rounded-2xl border border.white/10 bg-white/[0.03] p-4">
              <h3 className="font-semibold text-sm sm:text-base">
                Can I start part-time?
              </h3>
              <p className="mt-2 text-sm text.white/75">
                Many agents start part-time while they get licensed and learn the system,
                then go full-time once they see the results.
              </p>
            </div>

            <div className="rounded-2xl border border.white/10 bg-white/[0.03] p-4">
              <h3 className="font-semibold text-sm sm:text-base">
                Where is training held?
              </h3>
              <p className="mt-2 text-sm text.white/75">
                Mostly on Zoom so you can plug in from anywhere.
              </p>
            </div>

            <div className="rounded-2xl border border.white/10 bg-white/[0.03] p-4">
              <h3 className="font-semibold text-sm sm:text-base">
                How soon can I realistically start making money?
              </h3>
              <p className="mt-2 text-sm text.white/75">
                Once you&apos;re licensed and plugged into the system, we expect you to
                be in the field and writing business within your first few days.
              </p>
            </div>
          </div>

          <button
            onClick={openModal}
            className="mt-8 inline-flex w-full sm:w-auto items.center justify-center rounded-xl bg-[#00A160] px-6 py-3 font-semibold text-black shadow hover:bg-[#00C978] active:scale-[.99] transition"
          >
            Join the Team
          </button>
        </section>
      </main>

      {/* BOOKING MODAL */}
      {open && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items.center justify-center p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-[#2b2d31] border border.white/10 p-4">
            {/* HEADER */}
            <div className="flex items.center justify-between mb-3">
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
                  <label className="text-sm text.white/70">Full Name</label>
                  <input
                    className="w-full rounded-lg bg-black/30 border border.white/10 px-3 py-2 outline-none text-sm"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="John Carter"
                  />
                </div>
                <div className="grid gap-2">
                  <label className="text-sm text.white/70">Phone</label>
                  <input
                    className="w-full rounded-lg bg-black/30 border border.white/10 px-3 py-2 outline-none text-sm"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="(555) 555-5555"
                  />
                </div>
                <div className="grid gap-2">
                  <label className="text-sm text.white/70">Email</label>
                  <input
                    type="email"
                    className="w-full rounded-lg bg-black/30 border border.white/10 px-3 py-2 outline-none text-sm"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                  />
                </div>

                <div className="flex items.center justify-end gap-2 mt-2">
                  <button
                    onClick={closeModal}
                    className="px-3 py-2 rounded-lg border border.white/15 text-white/80 hover:bg-white/5 text-xs"
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
                <p className="text-xs text.white/50">
                  You can finish later; we&apos;ll save your info as an incomplete
                  application.
                </p>
              </div>
            )}

            {/* STEP: QUALIFY */}
            {step === "qualify" && (
              <div>
                <button
                  onClick={() => setStep("contact")}
                  className="text-white/60 hover.text-white mb-3 text-sm"
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

            {/* STEP: DONE (fallback only) */}
            {step === "done" && (
              <div className="space-y-3 text-sm text.white/80">
                <p>
                  Thanks for applying. Your information has been sent to{" "}
                  {pageOwner}&apos;s team. They&apos;ll reach out to you about next
                  steps.
                </p>
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="px-4 py-2 rounded-lg text-xs font-semibold bg.white text-black hover:bg-white/90"
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
