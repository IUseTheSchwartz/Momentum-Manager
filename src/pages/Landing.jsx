import { useState } from "react";
import { Link } from "react-router-dom";

export default function Landing() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen text-white">
      {/* Page header: hamburger only */}
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
            <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-slate-950/95 border border-white/10 shadow-lg backdrop-blur-md text-sm text-white z-20">
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
              <div className="border-t border-white/10 mt-1" />
              <Link
                to="/signup"
                className="block px-4 py-2 hover:bg-white/5"
                onClick={() => setMenuOpen(false)}
              >
                Sign up with code
              </Link>
            </div>
          )}
        </div>
      </header>

      {/* Internal hub hero */}
      <main className="px-6 pb-24">
        <section className="max-w-3xl mx-auto pt-10 text-center">
          <p className="text-sm uppercase tracking-[0.25em] text-emerald-400/80 mb-3">
            MOMENTUM MANAGER
          </p>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold leading-tight mb-4">
            Tools for Momentum Financial agents.
          </h2>
          <p className="text-sm sm:text-base text-white/70 mb-6">
            This is the internal hub for the team. Use the menu to jump into
            the lead manager, get your personal landing page, and stay plugged
            into the systems we run every day.
          </p>

          {/* Primary CTA: Sign up with code */}
          <div className="flex justify-center mb-8">
            <Link
              to="/signup"
              className="btn btn-primary inline-flex items-center justify-center px-6 py-2.5 text-sm font-semibold"
            >
              Sign up with code
            </Link>
          </div>

          <div className="grid gap-4 md:grid-cols-3 text-left mt-4">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <h3 className="text-sm font-semibold mb-1">Lead manager</h3>
              <p className="text-xs text-white/70">
                See what&apos;s in your queue, claim leads when they&apos;re live,
                and keep the pipeline moving. If you&apos;re here to work, this is
                where you live.
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <h3 className="text-sm font-semibold mb-1">Agent assets</h3>
              <p className="text-xs text-white/70">
                Get your personal landing page and tools built around how we
                sell, so everything you send clients looks clean and on-brand.
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <h3 className="text-sm font-semibold mb-1">How we move</h3>
              <p className="text-xs text-white/70">
                Show up, plug in, and execute. This hub is here to make the work
                easier to do every day — the grind still has to come from you.
              </p>
            </div>
          </div>

          <p className="mt-10 text-xs text-white/50">
            Bookmark this page. When you&apos;re ready to work, start here and
            use the menu to get where you need to go.
          </p>
        </section>
      </main>
    </div>
  );
}
