// File: src/components/ProofFeed.jsx
import React, { useEffect, useMemo, useState } from "react";

function formatAmount(amountCents, currency = "USD") {
  if (amountCents == null) return "";
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(amountCents / 100);
  } catch {
    return `$${(amountCents / 100).toFixed(2)}`;
  }
}

function formatDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  // Logan style is just MM/DD
  return d.toLocaleDateString("en-US", {
    month: "numeric",
    day: "numeric",
  });
}

/**
 * Discord-style proof carousel (Logan vibe)
 *
 * Props:
 *  - items:        array of proof posts
 *  - visibleCount: number of cards to show at once
 *  - cycleMs:      auto-advance interval in ms
 *  - blurTransition, bigSlides: cosmetic flags (kept to match Logan API)
 */
export default function ProofFeed({
  items = [],
  visibleCount = 4,
  cycleMs = 3000,
  blurTransition = false,
  bigSlides = false,
}) {
  const [index, setIndex] = useState(0);
  const total = items.length;

  // Auto-cycle like Logan’s bar
  useEffect(() => {
    if (total <= visibleCount) return;
    const id = setInterval(() => {
      setIndex((prev) => (prev + 1) % total);
    }, cycleMs);
    return () => clearInterval(id);
  }, [total, visibleCount, cycleMs]);

  const visibleItems = useMemo(() => {
    if (!total) return [];
    if (total <= visibleCount) return items;

    const out = [];
    for (let i = 0; i < visibleCount; i += 1) {
      out.push(items[(index + i) % total]);
    }
    return out;
  }, [items, index, total, visibleCount]);

  if (!total) {
    return (
      <div className="text-sm text-white/60 px-2 py-4 text-center">
        Recent wins will show up here once they’re added.
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* inner cards grid (Discord-style bar) */}
      <div
        className={`grid gap-3 ${
          bigSlides
            ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
            : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4"
        }`}
      >
        {visibleItems.map((item) => (
          <ProofCard
            key={item.id}
            item={item}
            blur={blurTransition}
          />
        ))}
      </div>

      {/* dots like Logan’s */}
      {total > visibleCount && (
        <div className="mt-3 flex justify-center gap-1">
          {Array.from({ length: Math.min(total, 10) }).map((_, i) => (
            <div
              key={i}
              className={`h-1 w-4 rounded-full ${
                i === index % Math.min(total, 10)
                  ? "bg-white/80"
                  : "bg-white/25"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ProofCard({ item, blur }) {
  const {
    display_name,
    avatar_url,
    message_text,
    amount_cents,
    currency,
    happened_at,
  } = item;

  const amountStr = formatAmount(amount_cents, currency);
  const dateStr = formatDate(happened_at);

  return (
    <article
      className={[
        "rounded-2xl border border-white/12",
        "bg-[#111214] px-4 py-3",
        "flex flex-col justify-between",
        "shadow-[0_0_0_1px_rgba(255,255,255,0.03)]",
        blur ? "backdrop-blur-sm" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {/* top row: avatar, name, date (Discord header) */}
      <div className="flex items-center gap-3 mb-2">
        {avatar_url ? (
          <img
            src={avatar_url}
            alt={display_name || ""}
            className="h-9 w-9 rounded-full object-cover border border-white/20"
          />
        ) : (
          <div className="h-9 w-9 rounded-full bg-white/10" />
        )}

        <div className="min-w-0 flex-1">
          <div className="text-[13px] font-medium text-white leading-tight truncate">
            {display_name || "Agent"}
          </div>
        </div>

        {dateStr && (
          <div className="text-[11px] text-white/45 ml-2 shrink-0">
            {dateStr}
          </div>
        )}
      </div>

      {/* middle: big green amount like Logan bar */}
      {amountStr && (
        <div className="text-sm font-semibold text-emerald-300 leading-tight">
          {amountStr}
        </div>
      )}

      {/* bottom: message text (product / notes) */}
      {message_text && (
        <p className="mt-1 text-[11px] text-white/80 leading-snug line-clamp-3">
          {message_text}
        </p>
      )}
    </article>
  );
}
