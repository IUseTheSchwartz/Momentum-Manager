// File: src/pages/AgentProof.jsx
import { useEffect, useState } from "react";

function SkeletonCard() {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 animate-pulse space-y-3">
      <div className="h-3 w-24 bg-white/15 rounded" />
      <div className="h-3 w-40 bg-white/10 rounded" />
      <div className="h-3 w-32 bg-white/5 rounded" />
    </div>
  );
}

export default function AgentProof() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setErr(null);
      try {
        const res = await fetch("/.netlify/functions/logan-proof-feed");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setItems(data || []);
      } catch (e) {
        console.error(e);
        setErr("Failed to load proof feed.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="space-y-4">
      <header className="space-y-1">
        <h2 className="text-lg font-semibold">Proof feed</h2>
        <p className="text-xs text-white/60">
          This previews the global Momentum proof feed pulled from Logan&apos;s
          system. It&apos;s read-only here and will show on your public
          recruiting site.
        </p>
      </header>

      {loading && (
        <div className="grid gap-3 md:grid-cols-2">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      )}

      {!loading && err && (
        <div className="text-sm text-red-400">{err}</div>
      )}

      {!loading && !err && !items.length && (
        <div className="text-sm text-white/60">
          No proof posts found yet. Once they are added in Logan&apos;s system,
          they&apos;ll appear here automatically.
        </div>
      )}

      {!loading && !err && items.length > 0 && (
        <div className="grid gap-3 md:grid-cols-2">
          {items.map((p) => (
            <article
              key={p.id}
              className="rounded-xl border border-white/10 bg-white/[0.03] p-3 space-y-2"
            >
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="text-sm font-semibold">
                    {p.display_name || "Momentum Agent"}
                  </div>
                  <div className="text-[11px] text-white/50">
                    {p.happened_at
                      ? new Date(p.happened_at).toLocaleDateString()
                      : ""}
                  </div>
                </div>
                {p.amount_cents != null && (
                  <div className="text-xs font-semibold px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                    {p.currency === "usd" ? "$" : ""}
                    {(p.amount_cents / 100).toLocaleString()}
                  </div>
                )}
              </div>
              <p className="text-sm text-white/80">{p.message_text}</p>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
