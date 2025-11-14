// File: src/pages/AgentAvailability.jsx
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient.js";

const DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
const DAY_LABELS = {
  mon: "Monday",
  tue: "Tuesday",
  wed: "Wednesday",
  thu: "Thursday",
  fri: "Friday",
  sat: "Saturday",
  sun: "Sunday",
};

function parseRangeString(str) {
  if (!str) return [];
  return str
    .split(",")
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map((chunk) => {
      const [start, end] = chunk.split("-").map((t) => t.trim());
      if (!start || !end) return null;
      return [start, end];
    })
    .filter(Boolean);
}

function stringifyRanges(ranges) {
  if (!Array.isArray(ranges) || !ranges.length) return "";
  return ranges.map(([start, end]) => `${start}-${end}`).join(", ");
}

export default function AgentAvailability() {
  const [agentSite, setAgentSite] = useState(null);
  const [availability, setAvailability] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState(null);
  const [saved, setSaved] = useState(false);

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
        setErr("You must be logged in to manage availability.");
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

      const { data: avail, error: aErr } = await supabase
        .from("mm_agent_availability")
        .select("*")
        .eq("agent_site_id", site.id)
        .maybeSingle();

      if (cancelled) return;

      if (aErr) {
        console.error(aErr);
        setErr("Failed to load availability.");
        setLoading(false);
        return;
      }

      if (avail) {
        setAvailability(avail);
      } else {
        setAvailability({
          agent_site_id: site.id,
          tz: "America/Chicago",
          slot_minutes: 30,
          buffer_minutes: 15,
          min_lead_hours: 4,
          booking_window_days: 14,
          weekly: {
            mon: [["09:00", "17:00"]],
            tue: [["09:00", "17:00"]],
            wed: [["09:00", "17:00"]],
            thu: [["09:00", "17:00"]],
            fri: [["09:00", "17:00"]],
            sat: [],
            sun: [],
          },
        });
      }

      setLoading(false);
    }

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  function update(field, value) {
    setAvailability((prev) => ({ ...prev, [field]: value }));
  }

  function updateDay(day, value) {
    const weekly = { ...(availability?.weekly || {}) };
    weekly[day] = parseRangeString(value);
    setAvailability((prev) => ({ ...prev, weekly }));
  }

  async function save() {
    if (!agentSite || !availability) return;

    setSaving(true);
    setErr(null);

    try {
      const payload = {
        agent_site_id: agentSite.id,
        tz: availability.tz,
        slot_minutes: availability.slot_minutes,
        buffer_minutes: availability.buffer_minutes,
        min_lead_hours: availability.min_lead_hours,
        booking_window_days: availability.booking_window_days,
        weekly: availability.weekly,
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from("mm_agent_availability")
        .upsert(payload, { onConflict: "agent_site_id" })
        .select("*")
        .single();

      if (error) throw error;

      setAvailability(data);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      console.error(e);
      setErr("Failed to save availability.");
    } finally {
      setSaving(false);
    }
  }

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
      <header className="space-y-1">
        <h2 className="text-lg font-semibold">Availability</h2>
        <p className="text-xs text-white/60">
          This controls when prospects can book calls on your calendar from the
          public site. (We&apos;ll wire the full scheduler in next.)
        </p>
      </header>

      {/* core settings */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1 text-xs">
          <label className="text-white/60">Timezone</label>
          <input
            className="w-full rounded bg-white/5 border border-white/15 px-3 py-2 text-sm"
            value={availability.tz}
            onChange={(e) => update("tz", e.target.value)}
          />
        </div>
        <div className="space-y-1 text-xs">
          <label className="text-white/60">Slot length (minutes)</label>
          <input
            type="number"
            min={10}
            className="w-full rounded bg-white/5 border border-white/15 px-3 py-2 text-sm"
            value={availability.slot_minutes}
            onChange={(e) =>
              update("slot_minutes", Number(e.target.value) || 0)
            }
          />
        </div>
        <div className="space-y-1 text-xs">
          <label className="text-white/60">
            Buffer between calls (minutes)
          </label>
          <input
            type="number"
            min={0}
            className="w-full rounded bg-white/5 border border-white/15 px-3 py-2 text-sm"
            value={availability.buffer_minutes}
            onChange={(e) =>
              update("buffer_minutes", Number(e.target.value) || 0)
            }
          />
        </div>
        <div className="space-y-1 text-xs">
          <label className="text-white/60">
            Booking window (days into the future)
          </label>
          <input
            type="number"
            min={1}
            className="w-full rounded bg-white/5 border border-white/15 px-3 py-2 text-sm"
            value={availability.booking_window_days}
            onChange={(e) =>
              update(
                "booking_window_days",
                Number(e.target.value) || 0
              )
            }
          />
        </div>
      </div>

      {/* weekly ranges */}
      <div className="space-y-2 pt-2 border-t border-white/10">
        <h3 className="text-sm font-semibold text-white/80">
          Weekly schedule
        </h3>
        <p className="text-[11px] text-white/50">
          Use 24h format and comma-separated ranges, e.g.{" "}
          <code>09:00-12:00, 13:00-17:00</code>.
        </p>

        <div className="grid gap-3 md:grid-cols-2">
          {DAYS.map((d) => (
            <div key={d} className="space-y-1 text-xs">
              <label className="text-white/60">{DAY_LABELS[d]}</label>
              <input
                className="w-full rounded bg-white/5 border border-white/15 px-3 py-2 text-sm"
                value={stringifyRanges((availability.weekly || {})[d] || [])}
                onChange={(e) => updateDay(d, e.target.value)}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="pt-2 flex items-center gap-3">
        <button
          type="button"
          onClick={save}
          className="btn btn-primary text-xs"
          disabled={saving}
        >
          {saving ? "Saving..." : "Save availability"}
        </button>
        {saved && (
          <span className="text-xs text-emerald-400">
            Availability saved to Supabase.
          </span>
        )}
        {err && <span className="text-xs text-red-400">{err}</span>}
      </div>
    </div>
  );
}
