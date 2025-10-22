import { Outlet, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

export default function RoleGate({ role }) {
  const [ok, setOk] = useState(false);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    supabase.from("user_profiles").select("role").single().then(({ data }) => {
      setOk(data?.role === role);
      setReady(true);
    });
  }, [role]);
  if (!ready) return null;
  return ok ? <Outlet /> : <Navigate to="/leads" replace />;
}
