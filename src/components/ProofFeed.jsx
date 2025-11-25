// File: src/components/ProofFeed.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";

/* ---------------- helpers ---------------- */

function truncate(text = "", maxChars = 120) {
  const t = String(text || "").trim();
  if (!t) return "";
  if (t.length <= maxChars) return t;
  return t.slice(0, maxChars - 1) + "…";
}

// Take everything to the left of "|" (e.g. "Logan Harris ♟ | MOMENTUM" -> "Logan Harris ♟")
function cleanName(name = "") {
  const raw = String(name || "").trim();
  if (!raw) return "";
  const [left] = raw.split("|");
  return left.trim();
}

// Cut the body at "EFT" + the date line. If no EFT, fall back to a small number of lines / char limit.
function formatBody(raw = "") {
  const t = String(raw || "").trim();
  if (!t) return "";

  const lines = t.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (!lines.length) return "";

  // Look for an "EFT" line
  const eftIdx = lines.findIndex((ln) => ln.toUpperCase() === "EFT");
  if (eftIdx !== -1 && eftIdx + 1 < lines.length) {
    // Keep everything up through the date line (line after EFT)
    const kept = lines.slice(0, eftIdx + 2);
    return kept.join("\n");
  }

  // Fallback: keep first few lines
  const maxLines = 4;
  if (lines.length > maxLines) {
    return lines.slice(0, maxLines).join("\n");
  }

  // Final fallback: char-based truncate
  return truncate(t, 120);
}

/** Map your mf_proof_posts row -> UI model (STRICT to your schema) */
function mapRow(row) {
  // amount_cents -> currency display
  let amount = null;
  if (typeof row.amount_cents === "number" && !Number.isNaN(row.amount_cents)) {
    amount = row.amount_cents / 100;
  }
  const currency = row.currency || "USD";
  const fmt = (n) => {
    try {
      return new Intl.NumberFormat(undefined, {
        style: "currency",
        currency,
        maximumFractionDigits: 0,
      }).format(n);
    } catch {
      return `$${Number(n).toLocaleString()}`;
    }
  };

  return {
    name: row.display_name || "Member",
    avatar: row.avatar_url || null,
    text: row.message_text || "",
    image: row.screenshot_url || null, // show as “attachment” under the message
    when: row.happened_at
      ? new Date(row.happened_at)
      : row.created_at
      ? new Date(row.created_at)
      : null,
    amountStr: amount != null ? fmt(amount) : null,
    pinned: !!row.is_pinned, // keep for sorting only
    _raw: row,
  };
}

function initials(name = "") {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() || "").join("") || "MF";
}

export default function ProofFeed({
  items = [],
  visibleCount = 4,
  cycleMs = 3000,
  blurTransition = true,
  bigSlides = true,
}) {
  const normalized = useMemo(
    () => (Array.isArray(items) ? items.map(mapRow) : []),
    [items]
  );

  // Sort: pinned first, then newest
  const sorted = useMemo(() => {
    return [...normalized].sort((a, b) => {
      const pin = Number(b.pinned) - Number(a.pinned);
      if (pin !== 0) return pin;
      const ta = a.when ? a.when.getTime() : 0;
      const tb = b.when ? b.when.getTime() : 0;
      return tb - ta;
    });
  }, [normalized]);

  // Pages of N
  const pages = useMemo(() => {
    const chunk = Math.max(1, visibleCount);
    if (!sorted.length) return [[]];
    const out = [];
    for (let i = 0; i < sorted.length; i += chunk) {
      out.push(sorted.slice(i, i + chunk));
    }
    // if only one page and it has fewer than chunk, repeat items to fill
    if (out.length === 1 && out[0].length && out[0].length < chunk) {
      const base = out[0].slice();
      while (out[0].length < chunk) {
        out[0].push(base[out[0].length % base.length]);
      }
    }
    return out;
  }, [sorted, visibleCount]);

  const [page, setPage] = useState(0);
  const timer = useRef(null);

  useEffect(() => {
    if (pages.length <= 1) return;
    timer.current = setInterval(
      () => setPage((p) => (p + 1) % pages.length),
      cycleMs
    );
    return () => clearInterval(timer.current);
  }, [pages.length, cycleMs]);

  // re-trigger entrance animation
  const [slideKey, setSlideKey] = useState(0);
  useEffect(() => setSlideKey((k) => k + 1), [page]);

  /* ---------- lock all cards to the first card's natural height ---------- */
  const firstCardRef = useRef(null);
  const [lockedHeight, setLockedHeight] = useState(null);
  const [settleTick, setSettleTick] = useState(0); // bump when first card's image settles

  // Measure the first card once it exists (and after its image loads) and on resize.
  useEffect(() => {
    const measure = () => {
      if (!firstCardRef.current) return;
      requestAnimationFrame(() => {
        const h = firstCardRef.current.offsetHeight;
        if (h && h !== lockedHeight) setLockedHeight(h);
      });
    };

    // Only measure off the FIRST slide's FIRST card
    if (page === 0 && lockedHeight == null) {
      measure();
    }

    const onResize = () => {
      if (lockedHeight == null) measure();
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [page, slideKey, settleTick, lockedHeight]);

  // Callback for first card images to signal they've loaded/errored
  const handleFirstCardSettled = () => setSettleTick((t) => t + 1);

  return (
    <div className="relative">
      <div className="overflow-hidden">
        <div
          key={slideKey}
          className={`grid transition-all duration-700 ease-[cubic-bezier(.22,.61,.36,1)] ${
            bigSlides
              ? "md:grid-cols-4 grid-cols-2 gap-3"
              : "md:grid-cols-4 grid-cols-2 gap-2"
          } auto-rows-fr`}
        >
          {pages[page].map((it, i) => (
            <DiscordCard
              key={`${page}-${i}`}
              item={it}
              blur={blurTransition}
              // Lock exact height so cards are identical
              lockedHeight={lockedHeight}
              // tap the very first card on the very first slide for measuring
              cardRef={page === 0 && i === 0 ? firstCardRef : undefined}
              onImageSettled={
                page === 0 && i === 0 ? handleFirstCardSettled : undefined
              }
            />
          ))}
        </div>
      </div>

      {pages.length > 1 && (
        <div className="mt-3 flex items-center justify-center gap-2">
          {pages.map((_, i) => (
            <button
              key={i}
              onClick={() => setPage(i)}
              className={`h-1.5 rounded-full transition-all ${
                i === page
                  ? "w-6 bg-white"
                  : "w-3 bg-white/30 hover:bg-white/60"
              }`}
              aria-label={`Go to slide ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function DiscordCard({ item, blur, lockedHeight, cardRef, onImageSettled }) {
  const { name, avatar, text, image, amountStr } = item;

  const displayName = cleanName(name);
  const displayText = formatBody(text);

  return (
    <div
      ref={cardRef}
      className={[
        "rounded-xl border border-white/10 bg-[#2b2d31] p-3",
        "shadow-lg shadow-black/30",
        "transition-all duration-500",
        "flex flex-col overflow-hidden", // overflow-hidden so taller content doesn’t stretch
        blur ? "hover:scale-[1.01]" : "",
      ].join(" ")}
      style={{
        ...(blur
          ? {
              animation: "pfFade 600ms ease both, pfSlide 600ms ease both",
            }
          : {}),
        ...(lockedHeight ? { height: `${lockedHeight}px` } : {}), // exact height once measured
      }}
      data-proof-card
    >
      {/* Header line = avatar + name + amount chip */}
      <div className="flex items-start gap-3">
        {/* Avatar (fallback initials) */}
        {avatar ? (
          <img
            src={avatar}
            alt=""
            className="h-10 w-10 rounded-full object-cover border border-white/10"
            onLoad={onImageSettled}
            onError={onImageSettled}
          />
        ) : (
          <div className="h-10 w-10 rounded-full grid place-items-center bg-white/10 border border-white/10 text-xs font-semibold">
            {initials(name)}
          </div>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <span className="font-semibold text-[13px] sm:text-[14px] leading-snug">
              {displayName}
            </span>
            <div className="ml-auto flex items-center gap-2">
              {/* Pinned badge intentionally not shown here */}
              {amountStr && (
                <span className="text-xs font-bold px-2 py-0.5 rounded bg-white text-black whitespace-nowrap">
                  {amountStr}
                </span>
              )}
            </div>
          </div>

          {/* Message body (cut after EFT + date) */}
          {displayText && (
            <div className="mt-1 text-[13px] leading-snug text-white/90 whitespace-pre-line">
              {displayText}
            </div>
          )}

          {/* Attachment image (if any) */}
          {image && (
            <div className="mt-2 overflow-hidden rounded-lg border border-white/10">
              <img
                src={image}
                alt=""
                className="w-full h-auto max-h-56 object-cover"
                style={{ display: "block" }}
                onLoad={onImageSettled}
                onError={onImageSettled}
              />
            </div>
          )}
        </div>
      </div>

      {/* spacer so footer (if you ever add one) sits at bottom */}
      <div className="flex-1" />

      <style>{`
@keyframes pfFade {
  0% { opacity: .0; filter: ${blur ? "blur(6px)" : "none"}; transform: scale(.995); }
  100% { opacity: 1; filter: blur(0); transform: scale(1); }
}
@keyframes pfSlide {
  0% { transform: translateY(4px); }
  100% { transform: translateY(0); }
}
      `}</style>
    </div>
  );
}
