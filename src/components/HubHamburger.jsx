import { useState } from "react";
import { Link } from "react-router-dom";

export default function HubHamburger() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
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
  );
}
