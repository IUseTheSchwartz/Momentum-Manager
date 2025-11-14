// File: src/pages/MyLandingPage.jsx
import { Link, Outlet, useLocation } from "react-router-dom";

const TABS = [
  { key: "settings", slug: "", label: "settings" },
  { key: "questions", slug: "questions", label: "questions" },
  // { key: "proof", slug: "proof", label: "proof" }, // ❌ removed
  { key: "leads", slug: "leads", label: "leads" },
  { key: "availability", slug: "availability", label: "availability" },
];

export default function MyLandingPage() {
  const loc = useLocation();
  const base = "/my-landing-page";

  // strip base path to work out which tab is active
  let rest = loc.pathname.startsWith(base)
    ? loc.pathname.slice(base.length)
    : "";
  if (rest.startsWith("/")) rest = rest.slice(1);

  const activeKey = rest.split("/")[0] || "settings";

  return (
    <div className="max-w-4xl mx-auto mt-10 card p-6 space-y-6">
      {/* Tabs */}
      <div className="flex gap-2 mb-2">
        {TABS.map((tab) => {
          const selected = activeKey === tab.key;
          const to = tab.slug ? `${base}/${tab.slug}` : base;

          return (
            <Link
              key={tab.key}
              to={to}
              className={[
                "px-4 py-1.5 rounded-full text-xs sm:text-sm capitalize border",
                selected
                  ? "bg-white text-black border-white"
                  : "bg-white/5 text-white/70 border-white/10 hover:bg-white/10",
              ].join(" ")}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold mb-1">My recruiting site</h1>
        <p className="text-sm text-white/60">
          This is where you control your personal recruiting landing page. Each
          tab matches the sections we&apos;ll wire up on your live site.
        </p>
      </div>

      {/* Tab content */}
      <Outlet />
    </div>
  );
}
