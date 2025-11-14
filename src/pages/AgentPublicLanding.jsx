// File: src/pages/AgentPublicLanding.jsx
import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../lib/supabaseClient.js";
import { readUTM } from "../lib/utm.js";

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

function Skeleton({ className = "" }) {
  return (
    <div className={`animate-pulse rounded-md bg-white/10 ${className}`} />
  );
}

/* ---------------------- Creator bar ---------------------- */

function CreatorBar({ settings }) {
  const name = settings?.about_name || "Your Name";
  const avatar = settings?.headshot_url || null;

  const ytUrl = settings?.social_youtube_url || "";
  const igUrl = settings?.social_instagram_url || "";
  const scUrl = settings?.social_snapchat_url || "";

  const items = [
    ytUrl && { key: "yt", label: "YouTube", href: ytUrl },
    igUrl && { key: "ig", label: "Instagram", href: igUrl },
    scUrl && { key: "sc", label: "Snapchat", href: scUrl },
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
              <div className="font-semibold leading-tight truncate">
                {name}
              </div>
            </div>
          </div>

          {/* socials */}
          <div className="sm:ml-auto">
            <div className="grid grid-cols-2 gap-2 max-[380px]:grid-cols-1 sm:flex sm:flex-row sm:items-center">
              {items.map(({ key, label, href }) => (
                <a
                  key={key}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm text-white/90 hover:bg-white/15 transition"
                >
                  <span className="truncate">{label}</span>
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------------------- Proof section ---------------------- */

function ProofSection({ items }) {
  const cards = useMemo(() => items || [], [items]);

  if (!cards.length) return null;

  return (
    <section className="mt-10">
      <div className="flex items-baseline justify-between mb-4">
        <h2 className="text-lg font-semibold">Recent wins</h2>
        <p className="text-xs text-white/50">
          Live examples from the Momentum Financial team.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {cards.map((p) => (
          <article
            key={p.id}
            className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 flex flex-col gap-2"
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold truncate">
                  {p.display_name || "Momentum Agent"}
                </div>
                <div className="text-[11px] text-white/50">
                  {p.happened_at
                    ? new Date(p.happened_at).toLocaleDateString()
                    : ""}
                </div>
              </div>
              {p.amount_cents != null && (
                <div className="text-xs font-semibold px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                  {p.currency === "usd" ? "$" : ""}
                  {(p.amount_cents / 100).toLocaleString()}
                </div>
              )}
            </div>
            <p className="text-sm text-white/80">{p.message_text}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

/* ---------------------- Main page ---------------------- */

export default function AgentPublicLanding() {
  const { slug } = useParams();

  const [site, setSite] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [proofItems, setProofItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [proofLoading, setProofLoading] = useState(true);
  const [err, setErr] = useState(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [step, setStep] = useState("contact");
  const [leadId, setLeadId] = useState(null);

  // contact
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  // qualify answers
  const [answers, setAnswers] = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function loadSiteAndQuestions() {
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

      const { data: qs, error: qErr } = await supabase
        .from("mm_agent_questions")
        .select("*")
        .eq("agent_site_id", siteRow.id)
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

      if (qErr) {
        console.error(qErr);
      }

      setQuestions(qs || []);
      setLoading(false);
    }

    loadSiteAndQuestions();
  }, [slug]);

  useEffect(() => {
    async function loadProof() {
      setProofLoading(true);
      try {
        const res = await fetch("/.netlify/functions/logan-proof-feed");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setProofItems(data || []);
      } catch (e) {
        console.error(e);
      } finally {
        setProofLoading(false);
      }
    }
    loadProof();
  }, []);

  const ytId = useMemo(() => {
    if (!site) return "";
    return (
      extractYouTubeId(site.hero_youtube_url) ||
      extractYouTubeId(site.youtube_url)
    );
  }, [site]);

  function openModal() {
    setModalOpen(true);
    setStep("contact");
    setLeadId(null);
  }

  function closeModal() {
    setModalOpen(false);
  }

  async function handleContactSubmit(e) {
    e.preventDefault();
    if (!site) return;

    setSubmitting(true);
    try {
      const utm = readUTM ? readUTM() : null;
      const now = new Date().toISOString();

      const { data, error } = await supabase
        .from("mm_agent_leads")
        .insert({
          agent_site_id: site.id,
          full_name: fullName,
          email,
          phone,
          utm,
          is_complete: false,
          stage: "new",
          started_at: now,
          last_activity_at: now,
        })
        .select("id")
        .single();

      if (error) throw error;

      setLeadId(data.id);
      setStep("qualify");
    } catch (err) {
      console.error(err);
      alert("Failed to submit. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function setAnswer(questionId, value) {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  }

  async function handleQualifySubmit(e) {
    e.preventDefault();
    if (!leadId || !site) {
      closeModal();
      return;
    }

    setSubmitting(true);
    try {
      const now = new Date().toISOString();
      const answersPayload = questions.map((q) => ({
        question_id: q.id,
        question: q.question_text,
        value: answers[q.id] ?? "",
      }));

      const { error } = await supabase
        .from("mm_agent_leads")
        .update({
          answers: answersPayload,
          is_complete: true,
          last_activity_at: now,
        })
        .eq("id", leadId);

      if (error) throw error;

      setStep("done");
    } catch (err) {
      console.error(err);
      alert("Failed to save answers. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-5 w-32 bg-white/10 rounded animate-pulse" />
        <div className="h-10 w-64 bg-white/10 rounded animate-pulse" />
        <Skeleton className="aspect-video w-full rounded-2xl" />
      </div>
    );
  }

  if (err) {
    return (
      <div className="mt-10 text-center text-sm text-red-400">
        {err}
      </div>
    );
  }

  const siteName = site.site_name || "Momentum Financial";

  return (
    <div className="space-y-10">
      {/* Top meta */}
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-9 w-32 bg-white/10 rounded" />
          <span className="text-white/60 text-sm">
            {siteName}
          </span>
        </div>
        <div className="text-xs text-white/40">
          Powered by Momentum Manager
        </div>
      </header>

      {/* HERO */}
      <main className="mx-auto w-full">
        <section className="space-y-6">
          {/* title + sub */}
          <div className="text-center max-w-2xl mx-auto">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-semibold tracking-tight">
              {site.hero_title ||
                "Build a high-ticket sales career with Momentum Financial"}
            </h1>
            <p className="mt-3 text-sm sm:text-base text-white/70">
              {site.hero_sub ||
                "High expectations. High results. Real mentorship."}
            </p>
          </div>

          {/* video */}
          <div className="pt-2">
            {ytId ? (
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
          </div>

          {/* CTA */}
          <div className="mt-4 text-center">
            <button
              onClick={openModal}
              className="inline-flex w-full sm:w-auto items-center justify-center rounded-xl bg-white px-6 py-3 font-semibold text-black shadow hover:shadow-lg active:scale-[.99]"
            >
              Book Call
            </button>
          </div>

          {/* About + socials */}
          <section className="mt-6 max-w-3xl mx-auto text-left">
            <h2 className="text-base font-semibold text-white/90">
              About {site.about_name || "your hiring manager"}
            </h2>
            <p className="mt-2 text-sm text-white/70">
              {site.about_bio ||
                "This section will be powered by your real bio, production, and expectations once you fill it out in your Agent Settings panel."}
            </p>
            <CreatorBar settings={site} />
          </section>

          {/* Proof */}
          {!proofLoading && proofItems.length > 0 && (
            <ProofSection items={proofItems} />
          )}
        </section>
      </main>

      {/* MODAL */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-[#2b2d31] border border-white/10 p-4">
            {/* header */}
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
              <form onSubmit={handleContactSubmit} className="grid gap-3">
                <div className="grid gap-1">
                  <label className="text-xs text-white/60">Full name</label>
                  <input
                    className="w-full rounded-lg bg-white/5 border border-white/15 px-3 py-2 text-sm"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />
                </div>
                <div className="grid gap-1">
                  <label className="text-xs text-white/60">Email</label>
                  <input
                    type="email"
                    className="w-full rounded-lg bg-white/5 border border-white/15 px-3 py-2 text-sm"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="grid gap-1">
                  <label className="text-xs text-white/60">Phone</label>
                  <input
                    className="w-full rounded-lg bg-white/5 border border-white/15 px-3 py-2 text-sm"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                  />
                </div>

                <p className="text-[11px] text-white/45">
                  This will create a lead in your hiring manager&apos;s
                  Momentum Manager account and send them a notification.
                </p>

                <div className="mt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="px-3 py-1.5 rounded-lg text-xs text-white/70 hover:bg-white/5"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-lg text-xs font-semibold bg-white text-black hover:bg-white/90"
                    disabled={submitting}
                  >
                    {submitting ? "Submitting..." : "Next"}
                  </button>
                </div>
              </form>
            )}

            {/* STEP: QUALIFY */}
            {step === "qualify" && (
              <form onSubmit={handleQualifySubmit} className="grid gap-3">
                {questions.length === 0 && (
                  <p className="text-sm text-white/70">
                    Your hiring manager hasn&apos;t added any questions yet, so
                    we&apos;ll skip straight to scheduling.
                  </p>
                )}

                {questions.map((q) => (
                  <div key={q.id} className="grid gap-1">
                    <label className="text-xs text-white/70">
                      {q.question_text}
                      {q.is_required && (
                        <span className="text-red-400">*</span>
                      )}
                    </label>
                    {q.input_type === "textarea" ? (
                      <textarea
                        className="w-full rounded-lg bg-white/5 border border-white/15 px-3 py-2 text-sm"
                        placeholder={q.placeholder || ""}
                        value={answers[q.id] || ""}
                        onChange={(e) =>
                          setAnswer(q.id, e.target.value)
                        }
                        required={q.is_required}
                      />
                    ) : (
                      <input
                        className="w-full rounded-lg bg-white/5 border border-white/15 px-3 py-2 text-sm"
                        placeholder={q.placeholder || ""}
                        value={answers[q.id] || ""}
                        onChange={(e) =>
                          setAnswer(q.id, e.target.value)
                        }
                        required={q.is_required}
                      />
                    )}
                    {q.help_text && (
                      <p className="text-[11px] text-white/50">
                        {q.help_text}
                      </p>
                    )}
                  </div>
                ))}

                <div className="mt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="px-3 py-1.5 rounded-lg text-xs text-white/70 hover:bg-white/5"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-lg text-xs font-semibold bg-white text-black hover:bg-white/90"
                    disabled={submitting}
                  >
                    {submitting ? "Submitting..." : "Finish"}
                  </button>
                </div>
              </form>
            )}

            {/* STEP: DONE */}
            {step === "done" && (
              <div className="space-y-3 text-sm text-white/80">
                <p>
                  Thanks for applying. Your information has been sent to the
                  team. They&apos;ll reach out to you about next steps.
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
