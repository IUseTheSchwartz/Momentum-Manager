import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

export default function Nav() {
  const [role, setRole] = useState(null);
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: s } = await supabase.auth.getSession();
      const user = s?.session?.user;
      setAuthed(!!user);
      if (user) {
        const { data } = await supabase.from("user_profiles").select("role").eq("id", user.id).single();
        setRole(data?.role || null);
      }
    })();
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setAuthed(!!session);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  return (
    <header className="border-b border-white/10">
      <div className="max-w-6xl mx-auto flex items-center justify-between p-3">
        <Link to="/" className="flex items-center gap-3">
          <img src="/logo.png" alt="MF" className="h-8 w-8" />
          <span className="font-semibold">Momentum Manager</span>
        </Link>
        <nav className="flex gap-4 text-sm items-center">
          {authed && <Link to="/leads">Leads</Link>}
          {authed && role === "manager" && (
            <>
              <Link to="/manager">Manager</Link>
              <Link to="/manager/imports">Imports</Link>
              <Link to="/manager/leads">All Leads</Link>
            </>
          )}
          {!authed ? (
            <>
              <Link to="/login">Login</Link>
              <Link to="/signup">Sign up</Link>
            </>
          ) : null}
        </nav>
      </div>
    </header>
  );
}
