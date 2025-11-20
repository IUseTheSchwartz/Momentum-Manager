import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import HubHamburger from "../components/HubHamburger.jsx";

export default function MomentumLeadManager() {
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (!mounted) return;

      if (error) {
        console.warn("[MomentumLeadManager] getSession error:", error);
        setAuthed(false);
        return;
      }

      setAuthed(!!data?.session);
    };

    load();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      setAuthed(!!session);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return (
    <div className="min-h-screen text-white">
      {/* Page header: shared hamburger */}
      <HubHamburger />

      <main className="px-6 pb-24">
        <section className="text-center mt-24">
          <img src="/logo.png" alt="MF" className="mx-auto h-24 w-24 mb-6" />
          <h1 className="text-3xl font-bold mb-2">Momentum Lead Manager</h1>
          <p className="text-white/70 mb-6">
            Lead distribution for the Momentum Financial Discord.
          </p>

          <div className="flex gap-3 justify-center">
            {authed ? (
              <Link className="btn btn-primary" to="/leads">
                Open Lead Manager
              </Link>
            ) : (
              <>
                <Link className="btn btn-primary" to="/login">
                  Login
                </Link>
                <Link className="btn" to="/signup">
                  Sign up with code
                </Link>
              </>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
