import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

export default function Me() {
  const [info, setInfo] = useState({ email: "", id: "", role: "" });

  useEffect(() => {
    (async () => {
      const { data: s } = await supabase.auth.getSession();
      const user = s?.session?.user;
      if (!user) return setInfo({ email: "", id: "", role: "signed out" });
      const { data } = await supabase.from("user_profiles").select("role").eq("id", user.id).single();
      setInfo({ email: user.email || "", id: user.id, role: data?.role || "unknown" });
    })();
  }, []);

  async function signOut(){
    await supabase.auth.signOut();
    location.href = "/login";
  }

  return (
    <div className="max-w-xl mx-auto mt-10 card p-6 space-y-2">
      <h2 className="text-xl font-semibold mb-2">My Session</h2>
      <div><b>Email:</b> {info.email || "—"}</div>
      <div><b>User ID:</b> {info.id || "—"}</div>
      <div><b>Role:</b> {info.role || "—"}</div>
      <button className="btn mt-4" onClick={signOut}>Sign out</button>
    </div>
  );
}
