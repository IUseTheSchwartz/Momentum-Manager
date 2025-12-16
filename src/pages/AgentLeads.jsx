// File: src/pages/AgentLeads.jsx
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient.js";

const STAGES = ["new", "applied", "booked", "no-show", "closed"];

function fmt(ts) {
  return ts ? new Date(ts).toLocaleString() : "—";
}

export default function AgentLeads() {
  const [agentSite, setAgentSite] = useState(null);
  const [rows, setRows] = useState([]);
  const [stageFilter, setStageFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [savingId, setSavingId] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setErr(null);

      const {
        data: { user },
        error: userErr,
      } = await supabase.auth.getUser();

      if (cancelled) return;

      if (userErr || !user) {
        console.error(userErr);
        setErr("You must be logged in to view leads.");
        setLoading(false);
        return;
      }

      const { data: site, error: siteErr } = await supabase
        .from("mm_agent_sites")
        .select("id")
        .eq("agent_user_id", user.id)
        .maybeSingle();

      if (cancelled) return;

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

      if (cancelled) return;

      if (lErr) {
        console.error(lErr);
        setErr("Failed to load leads.");
        setLoading(false);
        return;
      }

      setRows(leads || []);
      setLoading(false);
    }

    load();

    return () => {
      cancelled = true;
    };
  }, []);

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

      setRows((prev) => prev.map((r) => (r.id === id ? { ...r, stage } : r)));
    } catch (e) {
      console.error(e);
      alert("Failed to update stage.");
    } finally {
      setSavingId(null);
    }
  }

  const filtered = rows.filter((r) => (stageFilter ? r.stage === stageFilter : true));

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
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Leads from your site</h2>
          <p className="text-xs text-white/60">
            Everyone who fills out the form on your recruiting landing page shows up here.
          </p>
        </div>

        <select
          className="w-full sm:w-auto rounded bg-white/5 border border-white/15 px-3 py-2 text-xs"
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
          No leads yet. Once someone hits your public page and fills out the form, they&apos;ll appear here.
        </div>
      )}

      {filtered.length > 0 && (
        <>
          {/* MOBILE / SMALL SCREENS: stacked "one-piece" cards (no horizontal scroll box) */}
          <div className="md:hidden -mx-4 px-4 space-y-3">
            {filtered.map((r) => (
              <div
                key={r.id}
                className="rounded-xl border border-white/10 bg-white/[0.02] p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-semibold text-white/90 truncate">
                      {r.full_name || "—"}
                    </div>
                    <div className="text-[11px] text-white/60 mt-0.5">
                      Created: <span className="text-white/80">{fmt(r.created_at)}</span>
                    </div>
                  </div>

                  <div className="shrink-0">
                    <select
                      className="rounded bg-white/5 border border-white/20 px-2 py-1 text-[11px]"
                      value={r.stage || "new"}
                      disabled={savingId === r.id}
                      onChange={(e) => updateStage(r.id, e.target.value || "new")}
                    >
                      {STAGES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-1 gap-2 text-[12px]">
                  <div className="rounded-lg border border-white/10 bg-black/10 px-3 py-2">
                    <div className="text-[11px] text-white/50">Email</div>
                    <div className="text-white/85 break-words">{r.email || "—"}</div>
                  </div>

                  <div className="rounded-lg border border-white/10 bg-black/10 px-3 py-2">
                    <div className="text-[11px] text-white/50">Phone</div>
                    <div className="text-white/85 break-words">{r.phone || "—"}</div>
                  </div>

                  <div className="rounded-lg border border-white/10 bg-black/10 px-3 py-2">
                    <div className="text-[11px] text-white/50">Last activity</div>
                    <div className="text-white/80">{fmt(r.last_activity_at)}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* DESKTOP: table */}
          <div className="hidden md:block">
            <div className="rounded-xl border border-white/10 bg-white/[0.02] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="text-white/60">
                    <tr className="border-b border-white/10">
                      <th className="py-2 px-3 text-left">Name</th>
                      <th className="py-2 px-3 text-left">Contact</th>
                      <th className="py-2 px-3 text-left">Stage</th>
                      <th className="py-2 px-3 text-left">Created</th>
                      <th className="py-2 px-3 text-left">Last activity</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((r) => (
                      <tr key={r.id} className="border-b border-white/5 hover:bg-white/5">
                        <td className="py-2 px-3 align-top">
                          <div className="font-semibold text-white/90">{r.full_name || "—"}</div>
                        </td>
                        <td className="py-2 px-3 align-top">
                          <div>{r.email || "—"}</div>
                          <div className="text-white/50">{r.phone || ""}</div>
                        </td>
                        <td className="py-2 px-3 align-top">
                          <select
                            className="rounded bg-white/5 border border-white/20 px-2 py-1 text-[11px]"
                            value={r.stage || "new"}
                            disabled={savingId === r.id}
                            onChange={(e) => updateStage(r.id, e.target.value || "new")}
                          >
                            {STAGES.map((s) => (
                              <option key={s} value={s}>
                                {s}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="py-2 px-3 align-top text-white/70">{fmt(r.created_at)}</td>
                        <td className="py-2 px-3 align-top text-white/70">{fmt(r.last_activity_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
