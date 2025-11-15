// File: src/pages/Schedule.jsx
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { supabase } from "../lib/supabaseClient.js";

function Skeleton({ className = "" }) {
  return <div className={`animate-pulse rounded-md bg-white/10 ${className}`} />;
}

/* -------------------- Timezone helpers -------------------- */
function tzOffsetMinutes(instant, tz) {
  const asTz = new Date(instant.toLocaleString("en-US", { timeZone: tz }));
  const asUtc = new Date(instant.toLocaleString("en-US", { timeZone: "UTC" }));
  return Math.round((asTz - asUtc) / 60000);
}

function zonedDateTimeToUTCISO({ y, m, d, hh, mm, tz }) {
  const pseudoUtc = new Date(Date.UTC(y, m - 1, d, hh, mm, 0, 0));
  const off = tzOffsetMinutes(pseudoUtc, tz);
  return new Date(pseudoUtc.getTime() - off * 60000).toISOString();
}

function prettyInTz(utcISO, tz = "America/Chicago") {
  const d = new Date(utcISO);
  const day = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    timeZone: tz,
  }).format(d);
  const mon = new Intl.DateTimeFormat("en-US", {
    month: "short",
    timeZone: tz,
  }).format(d);
  const date = new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    timeZone: tz,
  }).format(d);
  const time = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: tz,
  }).format(d);
  return `${day}, ${mon} ${date} · ${time}`;
}

/* -------------------- Humanize slug → name fallback -------------------- */
function humanizeSlug(slug) {
  if (!slug) return "";
  return String(slug)
    .split("-")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/* -------------------- Compute slots for THIS agent site -------------------- */
/**
 * Returns:
 * {
 *   slots: [{ startUtc, endUtc, labelLocal, labelTz, isTaken, isBlocked }],
 *   tz: string,
 *   slotMin: number
 * }
 */
async function computeSlotsForAgent(agentSiteId) {
  if (!agentSiteId) return { slots: [], tz: "America/Chicago", slotMin: 30 };

  const { data: av, error: avErr } = await supabase
    .from("mm_agent_availability")
    .select("*")
    .eq("agent_site_id", agentSiteId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (avErr) {
    console.error("mm_agent_availability error:", avErr);
    return { slots: [], tz: "America/Chicago", slotMin: 30 };
  }
  if (!av) return { slots: [], tz: "America/Chicago", slotMin: 30 };

  const tz = av.tz || "America/Chicago";
  const slotMin = av.slot_minutes ?? 30;
  const buffer = av.buffer_minutes ?? 15;
  const minLeadH = av.min_lead_hours ?? 12;
  const windowDays = av.booking_window_days ?? 14;

  let weekly = av.weekly || {};
  if (typeof weekly === "string") {
    try {
      weekly = JSON.parse(weekly);
    } catch {
      weekly = {};
    }
  }

  // 🔹 Normalize weekly keys so "Mon", "monday" etc all work
  const normalizedWeekly = {};
  for (const [key, value] of Object.entries(weekly)) {
    const k = String(key).toLowerCase();
    let short;
    if (k.startsWith("sun")) short = "sun";
    else if (k.startsWith("mon")) short = "mon";
    else if (k.startsWith("tue")) short = "tue";
    else if (k.startsWith("wed")) short = "wed";
    else if (k.startsWith("thu")) short = "thu";
    else if (k.startsWith("fri")) short = "fri";
    else if (k.startsWith("sat")) short = "sat";
    else continue;
    normalizedWeekly[short] = value;
  }
  weekly = normalizedWeekly;

  const nowUtc = new Date();

  // 🔹 Defensive: make sure window isn't "inverted"
  let startWindowUtc = new Date(nowUtc.getTime() + minLeadH * 3600 * 1000);
  let endWindowUtc = new Date(
    nowUtc.getTime() + windowDays * 24 * 3600 * 1000
  );
  if (startWindowUtc > endWindowUtc) {
    // If min_lead_hours is bigger than the window, fall back to "start now"
    startWindowUtc = nowUtc;
  }

  const overlaps = (aStart, aEnd, bStart, bEnd) =>
    aStart < bEnd && bStart < aEnd;

  // NOTE: for now we are NOT checking taken / blackout tables per agent.
  // We'll wire that later; these are always false so buttons stay enabled.
  const taken = [];
  const blackouts = [];

  const out = [];
  let cursorUtc = startWindowUtc;

  while (cursorUtc <= endWindowUtc) {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
      .format(cursorUtc)
      .split("-");
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    const d = parseInt(parts[2], 10);

    const dow = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"][
      new Date(
        zonedDateTimeToUTCISO({ y, m, d, hh: 12, mm: 0, tz })
      ).getUTCDay()
    ];
    const ranges = weekly[dow] || [];

    for (const [startStr, endStr] of ranges) {
      const [sH, sM] = startStr.split(":").map(Number);
      const [eH, eM] = endStr.split(":").map(Number);

      let slotStartUtc = new Date(
        zonedDateTimeToUTCISO({ y, m, d, hh: sH, mm: sM, tz })
      );
      const rangeEndUtc = new Date(
        zonedDateTimeToUTCISO({ y, m, d, hh: eH, mm: eM, tz })
      );

      while (slotStartUtc < rangeEndUtc) {
        const slotEndUtc = new Date(slotStartUtc.getTime() + slotMin * 60000);
        const withBufEndUtc = new Date(
          slotEndUtc.getTime() + buffer * 60000
        );

        if (withBufEndUtc <= rangeEndUtc && slotStartUtc >= startWindowUtc) {
          const isTaken = taken.some((t) =>
            overlaps(
              slotStartUtc,
              withBufEndUtc,
              new Date(t.start_utc),
              new Date(t.end_utc)
            )
          );
          const isBlocked = blackouts.some((b) =>
            overlaps(
              slotStartUtc,
              withBufEndUtc,
              new Date(b.start_utc),
              new Date(b.end_utc)
            )
          );

          out.push({
            startUtc: slotStartUtc.toISOString(),
            endUtc: slotEndUtc.toISOString(),
            labelLocal: prettyInTz(slotStartUtc.toISOString(), tz),
            labelTz: `Ends ${new Intl.DateTimeFormat("en-US", {
              timeZone: tz,
              hour: "numeric",
              minute: "2-digit",
              hour12: true,
            }).format(slotEndUtc)}`,
            isTaken,
            isBlocked,
          });
        }

        slotStartUtc = new Date(slotStartUtc.getTime() + slotMin * 60000);
      }
    }

    const nextNoonUtcISO = zonedDateTimeToUTCISO({
      y,
      m,
      d: d + 1,
      hh: 12,
      mm: 0,
      tz,
    });
    cursorUtc = new Date(nextNoonUtcISO);
  }

  return {
    slots: out.slice(0, 120),
    tz,
    slotMin,
  };
}

/* -------------------- Component -------------------- */

export default function Schedule() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const leadId = searchParams.get("lead_id");
  const slugParam = searchParams.get("slug") || "";

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [lead, setLead] = useState(null);
  const [site, setSite] = useState(null);
  const [slots, setSlots] = useState([]);
  const [booking, setBooking] = useState(false);

  // meta about the slots (tz + duration) so booking matches availability
  const [slotMeta, setSlotMeta] = useState({
    tz: "America/Chicago",
    durationMin: 30,
  });

  // Load lead + agent site + availability
  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setErr("");
      let resolvedLead = null;
      let resolvedSite = null;

      try {
        // 1) Try to load lead (normal case)
        if (leadId) {
          const { data: leadRow, error: leadErr } = await supabase
            .from("mm_agent_leads")
            .select("id, full_name, email, phone, agent_site_id")
            .eq("id", leadId)
            .maybeSingle();

          if (!cancelled) {
            if (leadErr || !leadRow) {
              console.error("mm_agent_leads error:", leadErr);
              setErr(
                "We couldn’t find your application. Please return to the main page and start again."
              );
            } else {
              resolvedLead = leadRow;
              setLead(leadRow);
            }
          }
        } else {
          if (!cancelled) {
            setErr(
              "We couldn’t find your application. Please return to the main page and start again."
            );
          }
        }

        // 2) If we have a lead, load its site
        if (resolvedLead && !cancelled) {
          const { data: siteRow, error: siteErr } = await supabase
            .from("mm_agent_sites")
            .select("*")
            .eq("id", resolvedLead.agent_site_id)
            .maybeSingle();

          if (!cancelled) {
            if (siteErr || !siteRow) {
              console.error("mm_agent_sites error:", siteErr);
              setErr(
                "We found your application, but this recruiting site is missing some settings."
              );
            } else {
              resolvedSite = siteRow;
              setSite(siteRow);
            }
          }
        }

        // 3) Fallback: if no site yet, try by slug param (so header can still show agent)
        if (!resolvedSite && slugParam && !cancelled) {
          const { data: slugSite, error: slugErr } = await supabase
            .from("mm_agent_sites")
            .select("*")
            .eq("slug", slugParam)
            .eq("is_active", true)
            .maybeSingle();

          if (!cancelled) {
            if (slugErr) {
              console.error("mm_agent_sites slug fallback error:", slugErr);
            } else if (slugSite) {
              resolvedSite = slugSite;
              setSite(slugSite);
            }
          }
        }

        // 4) Only compute slots when we actually have a lead + site
        if (resolvedLead && resolvedSite && !cancelled) {
          const { slots: slotList, tz, slotMin } = await computeSlotsForAgent(
            resolvedSite.id
          );
          if (!cancelled) {
            setSlots(slotList);
            setSlotMeta({
              tz,
              durationMin: slotMin ?? 30,
            });
          }
        }
      } catch (e) {
        if (!cancelled) {
          console.error(e);
          setErr("Something went wrong loading your booking step.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [leadId, slugParam]);

  // 👉 Derived header bits
  const siteName = site?.site_name || "Momentum Financial";
  const slugName = humanizeSlug(site?.slug || slugParam);
  // Use about_name if present, else prettified slug, else global fallback
  const pageOwner = site?.about_name || slugName || "Momentum Financial";
  const homeHref = site?.slug
    ? `/${site.slug}`
    : slugParam
    ? `/${slugParam}`
    : "/";

  async function handleBook(slt) {
    if (!leadId) {
      alert(
        "We couldn't find your application. Please return to the main page and start again."
      );
      return;
    }

    try {
      setBooking(true);

      // Use the SAME tz + duration we used when generating slots
      const tz = slotMeta.tz || "America/Chicago";
      const durationMin = slotMeta.durationMin ?? 30;

      const res = await fetch("/.netlify/functions/appointment-create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lead_id: leadId,
          start_utc: slt.startUtc,
          duration_min: durationMin,
          tz,
          agent_site_id: site?.id || null, // helpful for routing on the backend
        }),
      });

      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        let msg = "Could not book. Try another slot.";
        try {
          const j = JSON.parse(txt);
          if (j?.error) msg = j.error;
        } catch {
          // ignore JSON parse issues
        }
        if (res.status === 409) {
          msg = "That slot was just taken. Pick another.";
        }
        throw new Error(msg);
      }

      const slugForThankYou = site?.slug || slugParam || "";
      const slugQuery = slugForThankYou
        ? `&slug=${encodeURIComponent(slugForThankYou)}`
        : "";
      navigate(`/thank-you?lead_id=${leadId}${slugQuery}`);
    } catch (e) {
      alert(e.message || "Could not book. Try another slot.");
    } finally {
      setBooking(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#1e1f22] text-white">
      {/* Header: logo + "Agent Name | Momentum Financial" */}
      <header className="mx-auto max-w-6xl px-4 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {loading ? (
            <Skeleton className="h-9 w-32 rounded" />
          ) : (
            <img
              src={site?.logo_url || "/logo.png"}
              alt={siteName}
              className="h-9 w-auto"
            />
          )}
          <span className="text-white/60 text-sm">
            {loading ? (
              <span className="inline-block h-4 w-28 animate-pulse bg-white/10 rounded" />
            ) : (
              <>
                {pageOwner} | {siteName}
              </>
            )}
          </span>
        </div>

        <Link
          to={homeHref}
          className="text-sm text-white/70 hover:text-white underline-offset-2 hover:underline"
        >
          Back to main page
        </Link>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-24">
        {loading ? (
          <div className="grid gap-3">
            <Skeleton className="h-7 w-40" />
            <Skeleton className="h-4 w-72" />
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-80">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full rounded-lg" />
              ))}
            </div>
          </div>
        ) : err ? (
          <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-sm">
            {err}
          </div>
        ) : (
          <>
            <h1 className="text-2xl sm:text-3xl font-bold mb-2">
              Pick a time
            </h1>
            <p className="text-white/70 mb-6 text-sm sm:text-base">
              Choose a time that works best for you. You’ll get a confirmation
              with all the details.
            </p>

            {!slots.length ? (
              <div className="text-white/70 text-sm">
                No slots available right now. Please check back later or reach
                out directly.
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-80 overflow-auto">
                {slots.map((slt) => {
                  const disabled = slt.isTaken || slt.isBlocked || booking;
                  return (
                    <button
                      key={slt.startUtc}
                      disabled={disabled}
                      onClick={() => handleBook(slt)}
                      className={`rounded-lg border px-3 py-2 text-left ${
                        disabled
                          ? "border-white/10 bg-white/[0.03] text-white/40 cursor-not-allowed"
                          : "border-white/15 bg-white/5 hover:bg-white/10"
                      }`}
                    >
                      <div className="font-semibold">{slt.labelLocal}</div>
                      <div className="text-xs text-white/60">
                        {slt.isTaken ? "Booked" : slt.labelTz}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
