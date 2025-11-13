// File: src/pages/MomentumLeadManager.jsx
import { useState } from "react";
import { Link } from "react-router-dom";

export default function MomentumLeadManager() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen text-white">
      {/* Page header: hamburger, with Home + Get My Landing Page */}
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
                to="/"
                className="block px-4 py-2 hover:bg-white/5"
                onClick={() => setMenuOpen(false)}
              >
                Home
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

      <main className="px-6 pb-24">
        <section className="text-center mt-24">
          <img src="/logo.png" alt="MF" className="mx-auto h-24 w-24 mb-6" />
          <h1 className="text-3xl font-bold mb-2">Momentum Lead Manager</h1>
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
