// File: src/pages/ThankYou.jsx
import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { supabase } from "../lib/supabaseClient.js";

function Skeleton({ className = "" }) {
  return <div className={`animate-pulse rounded-md bg-white/10 ${className}`} />;
}

export default function ThankYou() {
  const [searchParams] = useSearchParams();
  const leadId = searchParams.get("lead_id");

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [site, setSite] = useState(null);

  useEffect(() => {
    async function load() {
      if (!leadId) {
        // still show generic thank-you, just skip lookup
        setLoading(false);
        return;
      }

      try {
        const { data: leadRow, error: leadErr } = await supabase
          .from("mm_agent_leads")
          .select("agent_site_id")
          .eq("id", leadId)
          .maybeSingle();

        if (leadErr || !leadRow) {
          console.error(leadErr);
          setErr("We couldn’t load your recruiting site details.");
          setLoading(false);
          return;
        }

        const { data: siteRow, error: siteErr } = await supabase
          .from("mm_agent_sites")
          .select("*")
          .eq("id", leadRow.agent_site_id)
          .maybeSingle();

        if (siteErr || !siteRow) {
          console.error(siteErr);
          setErr("We couldn’t load your recruiting site details.");
          setLoading(false);
          return;
        }

        setSite(siteRow);
        setLoading(false);
      } catch (e) {
        console.error(e);
        setErr("Something went wrong loading your confirmation.");
        setLoading(false);
      }
    }

    load();
  }, [leadId]);

  // Meta Pixel style event (safe even if fbq missing)
  useEffect(() => {
    if (window.fbq) {
      window.fbq("track", "Schedule");
    }
  }, []);

  const siteName = site?.site_name || "Momentum Financial";
  const pageOwner = site?.about_name || "Your Mentor";
  const homeHref = site?.slug ? `/${site.slug}` : "/";

  return (
    <div className="min-h-screen bg-[#1e1f22] text-white">
      <header className="mx-auto max-w-6xl px-4 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {loading ? (
            <Skeleton className="h-9 w-32 rounded" />
          ) : site?.logo_url ? (
            <img src={site.logo_url} alt="logo" className="h-9" />
          ) : (
            <div className="h-9 w-32 bg-white/10 rounded" />
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

      <main className="mx-auto max-w-6xl px-4 pb-24 flex flex-col items-start justify-center gap-4">
        {loading ? (
          <>
            <Skeleton className="h-8 w-64 mb-2" />
            <Skeleton className="h-4 w-80 mb-1" />
            <Skeleton className="h-4 w-96 mb-1" />
          </>
        ) : (
          <>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              You’re all set. ✅
            </h1>
            <p className="text-white/75 text-lg max-w-xl">
              Your application has been sent to{" "}
              <span className="font-semibold">{pageOwner}</span>&apos;s team.
              They&apos;ll reach out soon to line up a time to talk next
              steps—keep your phone nearby and watch your email.
            </p>
            <p className="text-white/60 text-sm max-w-xl">
              If you need to update your contact info or have a question before
              they reach out, reply directly to the confirmation email or text
              you receive.
            </p>
            <Link
              to={homeHref}
              className="mt-4 inline-flex items-center justify-center rounded-xl bg-white px-6 py-3 font-semibold text-black shadow hover:shadow-lg active:scale-[.99]"
            >
              Back to main page
            </Link>
          </>
        )}
        {err && (
          <div className="mt-4 text-xs text-red-400">
            {err}
          </div>
        )}
      </main>
    </div>
  );
}
