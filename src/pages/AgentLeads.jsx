// File: src/pages/AgentLeads.jsx
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient.js";
import { useAuth } from "../auth.jsx";

const STAGES = ["new", "applied", "booked", "no-show", "closed"];

export default function AgentLeads() {
  const { user } = useAuth();
  const [agentSite, setAgentSite] = useState(null);
  const [rows, setRows] = useState([]);
  const [stageFilter, setStageFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [savingId, setSavingId] = useState(null);

  useEffect(() => {
    if (!user) return;

    async function load() {
      setLoading(true);
      setErr(null);

      const { data: site, error: siteErr } = await supabase
        .from("mm_agent_sites")
        .select("id")
        .eq("agent_user_id", user.id)
        .maybeSingle();

      if (siteErr || !site) {
        console.error(siteErr);
        setErr("You need to configure your Settings first.");
        setLoading(false);
        return;
      }

      setAgentSite(site);

      const { data: leads, error: lErr } = await supabase
        .from("mm_agent_leads")
        .select("*")
        .eq("agent_site_id", site.id)
        .order("created_at", { ascending: false });

      if (lErr) {
        console.error(lErr);
        setErr("Failed to load leads");
        setLoading(false);
        return;
      }

      setRows(leads || []);
      setLoading(false);
    }

    load();
  }, [user]);

  async function updateStage(id, stage) {
    setSavingId(id);
    try {
      const { error } = await supabase
        .from("mm_agent_leads")
        .update({
          stage,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);
      if (error) throw error;
      setRows((prev) =>
        prev.map((r) => (r.id === id ? { ...r, stage } : r))
      );
    } catch (e) {
      console.error(e);
      alert("Failed to update stage");
    } finally {
      setSavingId(null);
    }
  }

  const filtered = rows.filter((r) =>
    stageFilter ? r.stage === stageFilter : true
  );

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="h-5 w-40 bg-white/10 rounded animate-pulse" />
        <div className="h-32 w-full bg-white/5 rounded animate-pulse" />
      </div>
    );
  }

  if (err) {
    return <div className="text-sm text-red-400">{err}</div>;
  }

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Leads from your site</h2>
          <p className="text-xs text-white/60">
            Everyone who fills out the form on your recruiting landing page
            shows up here.
          </p>
        </div>

        <select
          className="rounded bg-white/5 border border-white/15 px-3 py-2 text-xs"
          value={stageFilter}
          onChange={(e) => setStageFilter(e.target.value)}
        >
          <option value="">All stages</option>
          {STAGES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </header>

      {!filtered.length && (
        <div className="rounded-xl border border-dashed border-white/15 bg-white/[0.02] p-4 text-sm text-white/60">
          No leads yet. Once someone hits your public page and fills out the
          form, they&apos;ll appear here.
        </div>
      )}

      {filtered.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="text-white/60">
              <tr className="border-b border-white/10">
                <th className="py-2 text-left">Name</th>
                <th className="py-2 text-left">Contact</th>
                <th className="py-2 text-left">Stage</th>
                <th className="py-2 text-left">Created</th>
                <th className="py-2 text-left">Last activity</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr
                  key={r.id}
                  className="border-b border-white/5 hover:bg-white/5"
                >
                  <td className="py-2 align-top">
                    <div className="font-semibold text-white/90">
                      {r.full_name || "—"}
                    </div>
                  </td>
                  <td className="py-2 align-top">
                    <div>{r.email || "—"}</div>
                    <div className="text-white/50">{r.phone || ""}</div>
                  </td>
                  <td className="py-2 align-top">
                    <select
                      className="rounded bg-white/5 border border-white/20 px-2 py-1 text-[11px]"
                      value={r.stage || "new"}
                      disabled={savingId === r.id}
                      onChange={(e) =>
                        updateStage(r.id, e.target.value || "new")
                      }
                    >
                      {STAGES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="py-2 align-top text-white/70">
                    {r.created_at
                      ? new Date(r.created_at).toLocaleString()
                      : "—"}
                  </td>
                  <td className="py-2 align-top text-white/70">
                    {r.last_activity_at
                      ? new Date(r.last_activity_at).toLocaleString()
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
