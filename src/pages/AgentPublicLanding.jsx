// File: src/pages/AgentPublicLanding.jsx
import { useState, useMemo } from "react";
import { useParams } from "react-router-dom";

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

function nameFromSlug(slug = "") {
  if (!slug) return "Your Name";
  return slug
    .split("-")
    .filter(Boolean)
    .map((p) => p[0]?.toUpperCase() + p.slice(1))
    .join(" ");
}

function Skeleton({ className = "" }) {
  return (
    <div
      className={`animate-pulse rounded-md bg-white/10 ${className}`}
    />
  );
}

/* ---------------------- Creator bar (avatar + socials) ---------------------- */

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
    },
    igUrl && {
      key: "ig",
      label: "Instagram",
      href: igUrl,
    },
    scUrl && {
      key: "sc",
      label: "Snapchat",
      href: scUrl,
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

/* ---------------------- Simple “Recent Wins” section ---------------------- */

const MOCK_PROOF = [
  {
    id: 1,
    name: "Agent J.",
    text: "Hit my first 10K week after plugging into the system.",
    amount: "$10,400",
    when: "Last week",
  },
  {
    id: 2,
    name: "Maria P.",
    text: "From 0 experience to consistent 5K–8K weeks in 60 days.",
    amount: "$7,800",
    when: "This month",
  },
  {
    id: 3,
    name: "Dylan R.",
    text: "Quit my 9–5 and matched my old income in under 45 days.",
    amount: "$6,200",
    when: "Recently",
  },
  {
    id: 4,
    name: "Team Momentum",
    text: "Record team month. Multiple 20K+ producers on the board.",
    amount: "$84,000",
    when: "This quarter",
  },
];

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
                  {p.name}
                </div>
                <div className="text-[11px] text-white/50">
                  {p.when}
                </div>
              </div>
              {p.amount && (
                <div className="text-xs font-semibold px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                  {p.amount}
                </div>
              )}
            </div>
            <p className="text-sm text-white/80">{p.text}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

/* ---------------------- Main page ---------------------- */

export default function AgentPublicLanding() {
  const { slug } = useParams();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState("contact");

  // contact form state (local only for now)
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  const aboutName = nameFromSlug(slug);
  const settings = {
    site_name: "Momentum Financial",
    about_name: aboutName,
    headshot_url: null, // we’ll swap in real per-agent headshot later
    hero_title: "Build a high-ticket sales career with Momentum Financial",
    hero_sub: "High expectations. High results. Real mentorship.",
    hero_youtube_url: "",
    youtube_url: "",
    social_youtube_url: "",
    social_instagram_url: "",
    social_snapchat_url: "",
  };

  const loading = false; // no async yet; we’ll wire Supabase later
  const proofItems = MOCK_PROOF;

  const ytId =
    extractYouTubeId(settings.hero_youtube_url) ||
    extractYouTubeId(settings.youtube_url) ||
    "";

  function openModal() {
    setOpen(true);
    setStep("contact");
  }

  function closeModal() {
    setOpen(false);
  }

  function handleContactSubmit(e) {
    e.preventDefault();
    // Later: create mm_agent_leads row and move to qualify step.
    setStep("qualify");
  }

  function handleQualifySubmit(e) {
    e.preventDefault();
    // Later: save answers + navigate to schedule page.
    setOpen(false);
  }

  return (
    <div className="space-y-10">
      {/* Top meta (mimic Logan header but inside your app shell) */}
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-9 w-32 bg-white/10 rounded" />
          <span className="text-white/60 text-sm">
            {settings.site_name}
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
              {settings.hero_title}
            </h1>
            <p className="mt-3 text-sm sm:text-base text-white/70">
              {settings.hero_sub}
            </p>
          </div>

          {/* video */}
          <div className="pt-2">
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
          </div>

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

          {/* About + socials */}
          <section className="mt-6 max-w-3xl mx-auto text-left">
            <h2 className="text-base font-semibold text-white/90">
              About {settings.about_name}
            </h2>
            <p className="mt-2 text-sm text-white/70">
              This page will be powered by your real bio, production, and
              expectations once we connect it to your Momentum Manager
              settings. For now, imagine this tells your story, what agents
              can expect on your team, and what it takes to win here.
            </p>
            <CreatorBar settings={settings} />
          </section>

          {/* Proof (mock for now, wired to Logan’s proof later) */}
          <ProofSection items={proofItems} />
        </section>
      </main>

      {/* MODAL: contact -> qualify (UI only) */}
      {open && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-[#2b2d31] border border-white/10 p-4">
            {/* header */}
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold">
                {step === "contact"
                  ? "Start your application"
                  : "Answer a few questions"}
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
                    className="w-full rounded-lg bg.white/5 border border-white/15 px-3 py-2 text-sm"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                  />
                </div>

                <p className="text-[11px] text-white/45">
                  This step will eventually create a lead in your Momentum
                  Manager account and send you a notification.
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
                  >
                    Next
                  </button>
                </div>
              </form>
            )}

            {/* STEP: QUALIFY (placeholder for now) */}
            {step === "qualify" && (
              <form onSubmit={handleQualifySubmit} className="grid gap-3">
                <p className="text-sm text-white/80">
                  Here we’ll use the same dynamic question system as Logan’s
                  site, powered by your per-agent questions. For now, this is
                  just a placeholder to match the flow.
                </p>

                <div className="mt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="px-3 py-1.5 rounded-lg text-xs text-white/70 hover:bg-white/5"
                  >
                    Close
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-lg text-xs font-semibold bg.white text-black hover:bg-white/90"
                  >
                    Continue
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
