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
  return d.toLocaleDateString("en-US", {
    month: "numeric",
    day: "numeric",
  });
}

/**
 * Logan-style proof carousel
 *
 * Props:
 * - items:        array of proof posts
 * - visibleCount: how many cards to show at once (default 4)
 * - cycleMs:      auto-advance interval in ms (default 3000)
 * - blurTransition / bigSlides: cosmetic toggles to match Logan API
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

  // auto-cycle like Logan’s
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
            big={bigSlides}
          />
        ))}
      </div>

      {total > visibleCount && (
        <div className="mt-3 flex justify-center gap-1">
          {Array.from({ length: Math.min(total, 8) }).map((_, i) => (
            <div
              key={i}
              className={`h-1 w-4 rounded-full ${
                i === index % Math.min(total, 8)
                  ? "bg-white/80"
                  : "bg-white/20"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ProofCard({ item, blur, big }) {
  const {
    display_name,
    avatar_url,
    message_text,
    amount_cents,
    currency,
    happened_at,
  } = item;

  return (
    <article
      className={`rounded-2xl border border-white/10 bg-black/40 px-3 py-3 flex flex-col justify-between ${
        blur ? "backdrop-blur-sm" : ""
      } ${big ? "min-h-[120px]" : "min-h-[100px]"}`}
    >
      {/* Top: avatar + name */}
      <div className="flex items-center gap-2 mb-2">
        {avatar_url ? (
          <img
            src={avatar_url}
            alt={display_name || ""}
            className="h-9 w-9 rounded-full object-cover border border-white/10"
          />
        ) : (
          <div className="h-9 w-9 rounded-full bg-white/10" />
        )}
        <div className="min-w-0">
          <div className="text-xs text-white/60 leading-tight">
            {display_name || "Agent"}
          </div>
          {amount_cents != null && (
            <div className="text-xs font-semibold leading-tight text-white">
              {formatAmount(amount_cents, currency)}
            </div>
          )}
        </div>
        {happened_at && (
          <div className="ml-auto text-[11px] text-white/50">
            {formatDate(happened_at)}
          </div>
        )}
      </div>

      {/* Message */}
      {message_text && (
        <p className="text-[11px] text-white/80 leading-snug line-clamp-3">
          {message_text}
        </p>
      )}
    </article>
  );
}
