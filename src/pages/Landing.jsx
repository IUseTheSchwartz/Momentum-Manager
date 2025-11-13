// File: src/pages/Landing.jsx
import { useState } from "react";
import { Link } from "react-router-dom";

export default function Landing() {
  const [menuOpen, setMenuOpen] = useState(false);

  function scrollToLeadManager() {
    const el = document.getElementById("lead-manager");
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      setMenuOpen(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-slate-950 to-slate-900 text-white">
      {/* Top Nav */}
      <header className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="MF" className="h-10 w-10" />
          <div className="text-left">
            <h1 className="text-lg font-semibold tracking-tight">
              Momentum Financial
            </h1>
            <p className="text-xs text-white/50">
              Built different. No excuses. Just results.
            </p>
          </div>
        </div>

        {/* Hamburger */}
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
            <div className="absolute right-0 mt-2 w-48 rounded-xl bg-slate-900/95 border border-white/10 shadow-lg backdrop-blur-sm z-20">
              <button
                type="button"
                onClick={scrollToLeadManager}
                className="w-full text-left px-4 py-2 text-sm hover:bg-white/5"
              >
                Lead Manager
              </button>
              <Link
                to="/get-my-landing-page"
                className="block px-4 py-2 text-sm hover:bg-white/5"
                onClick={() => setMenuOpen(false)}
              >
                Get My Landing Page
              </Link>
              <div className="border-t border-white/10 my-1" />
              <Link
                to="/login"
                className="block px-4 py-2 text-sm hover:bg-white/5"
                onClick={() => setMenuOpen(false)}
              >
                Login
              </Link>
              <Link
                to="/signup"
                className="block px-4 py-2 text-sm hover:bg-white/5"
                onClick={() => setMenuOpen(false)}
              >
                Sign up with code
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

          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <Link className="btn btn-primary" to="/signup">
              Apply / Sign up with code
            </Link>
            <Link className="btn" to="/login">
              Already on the team? Login
            </Link>
          </div>

          <p className="mt-4 text-xs text-white/50">
            If you&apos;re looking for &quot;easy&quot;, this isn&apos;t it.
            If you&apos;re looking for a framework to outwork everyone else, you&apos;re in
            the right place.
          </p>
        </section>

        {/* Lead Manager Section – your old landing, preserved */}
        <section
          id="lead-manager"
          className="mt-20 max-w-xl mx-auto text-center border-t border-white/10 pt-10"
        >
          <img
            src="/logo.png"
            alt="MF"
            className="mx-auto h-24 w-24 mb-6"
          />
          <h2 className="text-3xl font-bold mb-2">Momentum Manager</h2>
          <p className="text-white/70 mb-6">
            Lead distribution for the Momentum Financial Discord.
          </p>
          <div className="flex gap-3 justify-center">
            <Link className="btn btn-primary" to="/login">
              Login
            </Link>
            <Link className="btn" to="/signup">
              Sign up with code
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
