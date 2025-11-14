// File: src/pages/AgentAvailability.jsx
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient.js";

const DAYS = [
  { key: "mon", label: "Mon" },
  { key: "tue", label: "Tue" },
  { key: "wed", label: "Wed" },
  { key: "thu", label: "Thu" },
  { key: "fri", label: "Fri" },
  { key: "sat", label: "Sat" },
  { key: "sun", label: "Sun" },
];

const DEFAULT_WEEKLY = {
  mon: [["09:00", "21:00"]],
  tue: [["09:00", "21:00"]],
  wed: [["09:00", "21:00"]],
  thu: [["09:00", "21:00"]],
  fri: [["09:00", "21:00"]],
  sat: [],
  sun: [],
};

function Skeleton({ className = "" }) {
  return <div className={`animate-pulse rounded-md bg-white/10 ${className}`} />;
}

export default function AgentAvailability() {
  const [agentSite, setAgentSite] = useState(null);
  const [model, setModel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError("");

      // 1) current user
      const {
        data: { user },
        error: userErr,
      } = await supabase.auth.getUser();

      if (cancelled) return;

      if (userErr || !user) {
        console.error(userErr);
        setError("You must be logged in to manage availability.");
        setLoading(false);
        return;
      }

      // 2) their agent site
      const { data: siteRow, error: siteErr } = await supabase
        .from("mm_agent_sites")
        .select("*")
        .eq("agent_user_id", user.id)
        .maybeSingle();

      if (cancelled) return;

      if (siteErr || !siteRow) {
        console.error(siteErr);
        setError("You need to configure your Settings tab first.");
        setLoading(false);
        return;
      }

      setAgentSite(siteRow);

      // 3) per-agent availability row
      const { data: avRow, error: avErr } = await supabase
        .from("mm_agent_availability")
        .select("*")
        .eq("agent_site_id", siteRow.id)
        .maybeSingle();

      if (cancelled) return;

      if (avErr) {
        console.error("[AgentAvailability] load error:", avErr);
        setError("Failed to load availability. Using defaults.");
      }

      let weekly;
      if (!avRow) {
        weekly = { ...DEFAULT_WEEKLY };
      } else {
        let rawWeekly = avRow.weekly || {};
        if (typeof rawWeekly === "string") {
          try {
            rawWeekly = JSON.parse(rawWeekly);
          } catch {
            rawWeekly = {};
          }
        }

        weekly = { ...DEFAULT_WEEKLY };
        for (const d of DAYS) {
          const raw = rawWeekly[d.key];
          if (Array.isArray(raw)) {
            weekly[d.key] = raw
              .filter(
                (pair) =>
                  Array.isArray(pair) &&
                  typeof pair[0] === "string" &&
                  typeof pair[1] === "string"
              )
              .map((pair) => [pair[0], pair[1]]);
          }
        }
      }

      const modelNext = {
        id: avRow?.id ?? null,
        agent_site_id: siteRow.id,
        tz: avRow?.tz || "America/Chicago",
        slot_minutes: avRow?.slot_minutes ?? 30,
        buffer_minutes: avRow?.buffer_minutes ?? 30,
        min_lead_hours: avRow?.min_lead_hours ?? 12,
        booking_window_days: avRow?.booking_window_days ?? 14,
        weekly,
      };

      setModel(modelNext);
      setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  function updateField(field, value) {
    setModel((prev) => ({ ...prev, [field]: value }));
  }

  function updateWeekly(dayKey, updater) {
    setModel((prev) => {
      const current = prev?.weekly || {};
      const dayRanges = current[dayKey] || [];
      const nextRanges = updater(dayRanges);
      return {
        ...prev,
        weekly: {
          ...current,
          [dayKey]: nextRanges,
        },
      };
    });
  }

  function addRange(dayKey) {
    updateWeekly(dayKey, (ranges) => [...ranges, ["09:00", "21:00"]]);
  }

  function updateRange(dayKey, idx, which, value) {
    updateWeekly(dayKey, (ranges) =>
      ranges.map((r, i) =>
        i === idx
          ? [
              which === "start" ? value : r[0],
              which === "end" ? value : r[1],
            ]
          : r
      )
    );
  }

  function removeRange(dayKey, idx) {
    updateWeekly(dayKey, (ranges) => ranges.filter((_, i) => i !== idx));
  }

  async function saveAll() {
    if (!model || !agentSite) return;
    setSaving(true);
    setError("");
    setSaved(false);

    try {
      const cleanedWeekly = {};
      for (const d of DAYS) {
        const list = model.weekly?.[d.key] || [];
        const cleaned = list.filter((pair) => {
          const [s, e] = pair || [];
          return typeof s === "string" && typeof e === "string" && s && e;
        });
        cleanedWeekly[d.key] = cleaned;
      }

      const payload = {
        agent_site_id: agentSite.id,
        tz: model.tz || "America/Chicago",
        slot_minutes: Number(model.slot_minutes) || 30,
        buffer_minutes: Number(model.buffer_minutes) || 0,
        min_lead_hours: Number(model.min_lead_hours) || 0,
        booking_window_days: Number(model.booking_window_days) || 14,
        weekly: cleanedWeekly,
        updated_at: new Date().toISOString(),
      };

      if (model.id) {
        const { error: updErr } = await supabase
          .from("mm_agent_availability")
          .update(payload)
          .eq("id", model.id);

        if (updErr) throw updErr;
      } else {
        const { data: inserted, error: insErr } = await supabase
          .from("mm_agent_availability")
          .insert([payload])
          .select()
          .single();

        if (insErr) throw insErr;
        setModel((prev) => ({ ...prev, id: inserted.id }));
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error("[AgentAvailability] save error:", err);
      setError("Failed to save availability.");
    } finally {
      setSaving(false);
    }
  }

  if (loading || !model) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (error && !agentSite) {
    return <div className="text-sm text-red-400">{error}</div>;
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold">Availability</h2>
        <p className="text-xs text-white/60">
          These hours control the booking times shown on your recruiting page.
          Slots that are already booked are automatically greyed out and can’t
          be selected by new applicants.
        </p>
      </div>

      {/* Top config row */}
      <div className="grid gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Timezone */}
        <div className="space-y-1">
          <label className="text-xs text-white/60">Timezone</label>
          <select
            className="w-full rounded-lg bg-white/5 border border-white/15 px-3 py-2 text-sm"
            value={model.tz}
            onChange={(e) => updateField("tz", e.target.value)}
          >
            <option value="America/Chicago">America/Chicago (CT)</option>
            <option value="America/New_York">America/New_York (ET)</option>
            <option value="America/Denver">America/Denver (MT)</option>
            <option value="America/Los_Angeles">America/Los_Angeles (PT)</option>
          </select>
        </div>

        {/* Slot minutes */}
        <div className="space-y-1">
          <label className="text-xs text-white/60">Slot minutes</label>
          <input
            type="number"
            min={5}
            max={180}
            className="w-full rounded-lg bg-white/5 border border-white/15 px-3 py-2 text-sm"
            value={model.slot_minutes}
            onChange={(e) => updateField("slot_minutes", e.target.value)}
          />
          <p className="text-[11px] text-white/40">
            Length of each appointment slot (default 30).
          </p>
        </div>

        {/* Buffer minutes */}
        <div className="space-y-1">
          <label className="text-xs text-white/60">Buffer minutes</label>
          <input
            type="number"
            min={0}
            max={180}
            className="w-full rounded-lg bg-white/5 border border-white/15 px-3 py-2 text-sm"
            value={model.buffer_minutes}
            onChange={(e) => updateField("buffer_minutes", e.target.value)}
          />
          <p className="text-[11px] text-white/40">
            Extra time after each call before the next slot.
          </p>
        </div>

        {/* Min lead */}
        <div className="space-y-1">
          <label className="text-xs text-white/60">Min lead (hours)</label>
          <input
            type="number"
            min={0}
            max={72}
            className="w-full rounded-lg bg-white/5 border border-white/15 px-3 py-2 text-sm"
            value={model.min_lead_hours}
            onChange={(e) => updateField("min_lead_hours", e.target.value)}
          />
          <p className="text-[11px] text-white/40">
            How far in advance someone has to book. (E.g. 12 = no same-day.)
          </p>
        </div>

        {/* Window days */}
        <div className="space-y-1">
          <label className="text-xs text-white/60">Window (days)</label>
          <input
            type="number"
            min={1}
            max={60}
            className="w-full rounded-lg bg-white/5 border border-white/15 px-3 py-2 text-sm"
            value={model.booking_window_days}
            onChange={(e) =>
              updateField("booking_window_days", e.target.value)
            }
          />
          <p className="text-[11px] text-white/40">
            How many days into the future people can see / book.
          </p>
        </div>
      </div>

      {/* Weekly ranges */}
      <div className="space-y-4">
        {DAYS.map((d) => {
          const ranges = model.weekly?.[d.key] || [];
          return (
            <div
              key={d.key}
              className="rounded-2xl border border-white/10 bg-white/[0.02] p-4"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="font-medium text-sm">{d.label}</div>
                <button
                  type="button"
                  onClick={() => addRange(d.key)}
                  className="text-xs rounded-lg border border-white/25 px-2 py-1 text-white/80 hover:bg-white/10"
                >
                  Add range
                </button>
              </div>

              {ranges.length === 0 && (
                <p className="text-xs text-white/50">
                  No availability set for this day.
                </p>
              )}

              <div className="space-y-2">
                {ranges.map((r, idx) => (
                  <div
                    key={idx}
                    className="flex flex-wrap items-center gap-2 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-white/60">Start</span>
                      <input
                        type="time"
                        className="rounded bg-white/5 border border-white/15 px-2 py-1 text-xs"
                        value={r[0]}
                        onChange={(e) =>
                          updateRange(d.key, idx, "start", e.target.value)
                        }
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-white/60">End</span>
                      <input
                        type="time"
                        className="rounded bg-white/5 border border-white/15 px-2 py-1 text-xs"
                        value={r[1]}
                        onChange={(e) =>
                          updateRange(d.key, idx, "end", e.target.value)
                        }
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeRange(d.key, idx)}
                      className="ml-auto text-red-300 hover:text-red-200"
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Save bar */}
      <div className="pt-2 flex items-center gap-3">
        <button
          type="button"
          onClick={saveAll}
          className="btn btn-primary text-xs"
          disabled={saving}
        >
          {saving ? "Saving..." : "Save availability"}
        </button>
        {saved && (
          <span className="text-xs text-emerald-400">
            Availability saved.
          </span>
        )}
        {error && <span className="text-xs text-red-400">{error}</span>}
      </div>
    </div>
  );
}
