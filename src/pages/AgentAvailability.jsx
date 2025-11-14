// File: src/pages/AgentAvailability.jsx
import React, { useEffect, useState } from "react";
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
  const [model, setModel] = useState(null); // { id?, tz, slot_minutes, buffer_minutes, min_lead_hours, booking_window_days, weekly }
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError("");

      const { data, error: avErr } = await supabase
        .from("mf_availability")
        .select("*")
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (cancelled) return;

      if (avErr) {
        console.error(avErr);
        setError("Failed to load availability.");
        setLoading(false);
        return;
      }

      if (!data) {
        // no row yet -> use sensible defaults
        setModel({
          id: null,
          tz: "America/Chicago",
          slot_minutes: 30,
          buffer_minutes: 30,
          min_lead_hours: 12,
          booking_window_days: 14,
          weekly: { ...DEFAULT_WEEKLY },
        });
        setLoading(false);
        return;
      }

      let weekly = data.weekly || {};
      if (typeof weekly === "string") {
        try {
          weekly = JSON.parse(weekly);
        } catch {
          weekly = {};
        }
      }
      // normalize weekly shape and add defaults if missing
      const normWeekly = { ...DEFAULT_WEEKLY };
      for (const d of DAYS) {
        const raw = weekly[d.key];
        if (Array.isArray(raw)) {
          normWeekly[d.key] = raw.map((pair) => {
            if (
              Array.isArray(pair) &&
              typeof pair[0] === "string" &&
              typeof pair[1] === "string"
            ) {
              return [pair[0], pair[1]];
            }
            return ["09:00", "21:00"];
          });
        }
      }

      setModel({
        id: data.id,
        tz: data.tz || "America/Chicago",
        slot_minutes: data.slot_minutes ?? 30,
        buffer_minutes: data.buffer_minutes ?? 30,
        min_lead_hours: data.min_lead_hours ?? 12,
        booking_window_days: data.booking_window_days ?? 14,
        weekly: normWeekly,
      });
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
    updateWeekly(dayKey, (ranges) => [
      ...ranges,
      ["09:00", "21:00"], // default for new range
    ]);
  }

  function updateRange(dayKey, idx, which, value) {
    // which: "start" | "end"
    updateWeekly(dayKey, (ranges) =>
      ranges.map((r, i) =>
        i === idx ? [which === "start" ? value : r[0], which === "end" ? value : r[1]] : r
      )
    );
  }

  function removeRange(dayKey, idx) {
    updateWeekly(dayKey, (ranges) => ranges.filter((_, i) => i !== idx));
  }

  async function saveAll() {
    if (!model) return;
    setSaving(true);
    setError("");
    setSaved(false);

    try {
      // Clean weekly: remove empty / invalid ranges
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
          .from("mf_availability")
          .update(payload)
          .eq("id", model.id);
        if (updErr) throw updErr;
      } else {
        const { data: inserted, error: insErr } = await supabase
          .from("mf_availability")
          .insert([payload])
          .select()
          .single();
        if (insErr) throw insErr;
        setModel((prev) => ({ ...prev, id: inserted.id }));
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error(err);
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

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold">Availability</h2>
        <p className="text-xs text-white/60">
          These hours control the booking times shown on your recruiting page.
          Slots already booked are automatically greyed out and can’t be
          selected.
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

        {/* Slot minutes + buffer */}
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

        {/* Min lead + window */}
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

        <div className="space-y-1">
          <label className="text-xs text-white/60">Window (days)</label>
          <input
            type="number"
            min={1}
            max={60}
            className="w-full rounded-lg bg-white/5 border border-white/15 px-3 py-2 text-sm"
            value={model.booking_window_days}
            onChange={(e) => updateField("booking_window_days", e.target.value)}
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
