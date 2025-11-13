// File: src/pages/Landing.jsx
import { useState } from "react";
import { Link } from "react-router-dom";

export default function Landing() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen text-white">
      {/* Page-level header: only hamburger on the right */}
      <header className="flex items-center justify-end px-6 py-4">
        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className="inline-flex flex-col justify-center items-center w-10 h-10 rounded-full border border-white/10 hover:border-white/40 hover:bg-white/5 transition"
          >
            <span className="w-5 h-0.5 bg-white mb-1 rounded-full" />
            <span className="w-5 h-0.5 bg-white mb-1 rounded-full" />
            <span className="w-5 h-0.5 bg-white rounded-full" />
          </button>

          {menuOpen && (
            <div
              className="
                absolute right-0 mt-2 w-56 rounded-2xl
                bg-slate-950/95 border border-white/10
                shadow-lg backdrop-blur-md
                text-sm text-white z-20
              "
            >
              <Link
                to="/momentum-lead-manager"
                className="block px-4 py-2 hover:bg-white/5"
                onClick={() => setMenuOpen(false)}
              >
                Momentum Lead Manager
              </Link>
              <Link
                to="/get-my-landing-page"
                className="block px-4 py-2 hover:bg-white/5"
                onClick={() => setMenuOpen(false)}
              >
                Get My Landing Page
              </Link>
            </div>
          )}
        </div>
      </header>

      {/* Hero / Intro */}
      <main className="px-6 pb-24">
        <section className="max-w-3xl mx-auto pt-10 text-center">
          <p className="text-sm uppercase tracking-[0.25em] text-emerald-400/80 mb-3">
            MOMENTUM MANAGER
          </p>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold leading-tight mb-4">
            The system that turns{" "}
            <span className="text-emerald-400">effort</span> into{" "}
            <span className="text-emerald-400">income</span>.
          </h2>
          <p className="text-sm sm:text-base text-white/70 mb-6">
            This isn&apos;t a &quot;hop in a Discord and hope&quot; team.
            We run like a business: live training, real accountability,
            a proven script, and leads that reward the agents who show up.
          </p>

          <div className="grid gap-4 md:grid-cols-3 text-left mt-8">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <h3 className="text-sm font-semibold mb-1">What to expect</h3>
              <p className="text-xs text-white/70">
                Daily dials, live Zooms, and clear non-negotiables. If you&apos;re
                coachable and consistent, the system will carry you further than
                motivation ever will.
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <h3 className="text-sm font-semibold mb-1">How we operate</h3>
              <p className="text-xs text-white/70">
                No hype, just standards. Track your numbers, plug into the
                system, and you&apos;ll always know what to do next to hit your
                weekly target.
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <h3 className="text-sm font-semibold mb-1">What we provide</h3>
              <p className="text-xs text-white/70">
                Lead flow, scripts, call recordings, CRM, and a team that&apos;s
                actually winning — not just talking. You bring the work ethic.
              </p>
            </div>
          </div>

          {/* Single Join Team button -> Logan's landing page */}
          <div className="mt-8 flex justify-center">
            <a
              href="https://logantharris.com"
              target="_blank"
              rel="noreferrer"
              className="btn btn-primary"
            >
              Join Team
            </a>
          </div>

          <p className="mt-4 text-xs text-white/50">
            If you&apos;re looking for &quot;easy&quot;, this isn&apos;t it.
            If you&apos;re looking for a framework to outwork everyone else, you&apos;re in
            the right place.
          </p>
        </section>
      </main>
    </div>
  );
}
