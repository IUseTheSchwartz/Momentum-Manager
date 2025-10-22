import { Outlet, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

export default function RoleGate({ role }) {
  const [ok, setOk] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData?.session?.user?.id;
      if (!userId) {
        if (mounted) { setReady(true); setOk(false); }
        return;
      }
      const { data, error } = await supabase
        .from("user_profiles")
        .select("role")
        .eq("id", userId)
        .single();
      if (mounted) {
        setOk(!error && data?.role === role);
        setReady(true);
      }
    })();
    return () => { mounted = false; };
  }, [role]);

  if (!ready) return null;
  return ok ? <Outlet /> : <Navigate to="/leads" replace />;
}
