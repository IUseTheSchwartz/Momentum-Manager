import { Outlet, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

export default function ProtectedRoute() {
  const [ready, setReady] = useState(false);
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setAuthed(!!data.session);
      localStorage.setItem("sb-session", JSON.stringify(data.session || {}));
      setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setAuthed(!!session);
      localStorage.setItem("sb-session", JSON.stringify(session || {}));
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  if (!ready) return null;
  return authed ? <Outlet /> : <Navigate to="/login" replace />;
}
