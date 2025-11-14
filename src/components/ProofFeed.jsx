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
 * Discord-style proof carousel (Logan vibe)
 *
 * Props:
 *  - items:        array of proof posts
 *  - visibleCount: cards per "page"
 *  - cycleMs:      time between page slides
 *  - blurTransition, bigSlides: cosmetic flags kept for API compatibility
 */
export default function ProofFeed({
  items = [],
  visibleCount = 4,
  cycleMs = 3000,
  blurTransition = false,
  bigSlides = false,
}) {
  // Chunk items into "pages"
  const pages = useMemo(() => {
    if (!items.length) return [];
    const arr = [];
    for (let i = 0; i < items.length; i += visibleCount) {
      arr.push(items.slice(i, i + visibleCount));
    }
    return arr;
  }, [items, visibleCount]);

  const [pageIndex, setPageIndex] = useState(0);

  // Reset page when items change
  useEffect(() => {
    setPageIndex(0);
  }, [items.length, visibleCount]);

  // Auto-slide between pages
  useEffect(() => {
    if (pages.length <= 1) return;
    const id = setInterval(
      () => setPageIndex((prev) => (prev + 1) % pages.length),
      cycleMs
    );
    return () => clearInterval(id);
  }, [pages.length, cycleMs]);

  if (!pages.length) return null;

  const clampedIndex =
    pageIndex >= pages.length ? pages.length - 1 : pageIndex;

  return (
    <div className="w-full">
      {/* Slider */}
      <div className="relative overflow-hidden">
        <div
          className="flex transition-transform duration-500 ease-out"
          style={{ transform: `translateX(-${clampedIndex * 100}%)` }}
        >
          {pages.map((pageItems, idx) => (
            <div
              key={idx}
              className={`min-w-full grid gap-3 ${
                bigSlides
                  ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
                  : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4"
              }`}
            >
              {pageItems.map((item) => (
                <ProofCard
                  key={item.id}
                  item={item}
                  blur={blurTransition}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Dots under slider (Discord-style) */}
      {pages.length > 1 && (
        <div className="mt-3 flex justify-center gap-1">
          {pages.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setPageIndex(i)}
              className={`h-1 w-4 rounded-full transition-colors ${
                i === clampedIndex ? "bg-white/80" : "bg-white/25"
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
        "bg-[#2b2d31] px-4 py-3", // Discord grey
        "flex flex-col justify-between",
        "shadow-[0_0_0_1px_rgba(0,0,0,0.4)]",
        blur ? "backdrop-blur-sm" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {/* top row: avatar, name, date */}
      <div className="flex items-center gap-3 mb-2">
        {avatar_url ? (
          <img
            src={avatar_url}
            alt={display_name || ""}
            className="h-9 w-9 rounded-full object-cover border border-black/40"
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

      {/* amount (big, green like Logan) */}
      {amountStr && (
        <div className="text-sm font-semibold text-emerald-300 leading-tight">
          {amountStr}
        </div>
      )}

      {/* message text (product / details) */}
      {message_text && (
        <p className="mt-1 text-[11px] text-white/80 leading-snug line-clamp-3">
          {message_text}
        </p>
      )}
    </article>
  );
}
