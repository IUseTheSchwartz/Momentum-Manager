// File: src/pages/Schedule.jsx
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { supabase } from "../lib/supabaseClient.js";

function Skeleton({ className = "" }) {
  return <div className={`animate-pulse rounded-md bg-white/10 ${className}`} />;
}

export default function Schedule() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const leadId = searchParams.get("lead_id");

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [lead, setLead] = useState(null);
  const [site, setSite] = useState(null);

  useEffect(() => {
    async function load() {
      if (!leadId) {
        setErr(
          "We couldn’t find your application. Please return to the main page and start again."
        );
        setLoading(false);
        return;
      }

      try {
        // grab the agent lead
        const { data: leadRow, error: leadErr } = await supabase
          .from("mm_agent_leads")
          .select("id, full_name, email, phone, agent_site_id")
          .eq("id", leadId)
          .maybeSingle();

        if (leadErr || !leadRow) {
          console.error(leadErr);
          setErr(
            "We couldn’t find your application. Please return to the main page and start again."
          );
          setLoading(false);
          return;
        }

        setLead(leadRow);

        // grab the agent site for branding
        const { data: siteRow, error: siteErr } = await supabase
          .from("mm_agent_sites")
          .select("*")
          .eq("id", leadRow.agent_site_id)
          .maybeSingle();

        if (siteErr || !siteRow) {
          console.error(siteErr);
          setErr(
            "We found your application, but this recruiting site is missing some settings."
          );
          setLoading(false);
          return;
        }

        setSite(siteRow);
        setLoading(false);
      } catch (e) {
        console.error(e);
        setErr("Something went wrong loading your booking step.");
        setLoading(false);
      }
    }

    load();
  }, [leadId]);

  const siteName = site?.site_name || "Momentum Financial";
  const pageOwner = site?.about_name || "Your Mentor";
  const homeHref = site?.slug ? `/${site.slug}` : "/";

  function goNext() {
    if (leadId) {
      navigate(`/thank-you?lead_id=${leadId}`);
    } else {
      navigate("/thank-you");
    }
  }

  return (
    <div className="min-h-screen bg-[#1e1f22] text-white">
      <header className="mx-auto max-w-6xl px-4 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {loading ? (
            <Skeleton className="h-9 w-32 rounded" />
          ) : site?.logo_url ? (
            <img src={site.logo_url} alt={siteName} className="h-9" />
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

      <main className="mx-auto max-w-6xl px-4 pb-24">
        {loading ? (
          <>
            <Skeleton className="h-7 w-40 mb-3" />
            <Skeleton className="h-4 w-72 mb-2" />
            <Skeleton className="h-24 w-full max-w-xl" />
          </>
        ) : err ? (
          <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-sm">
            {err}
          </div>
        ) : (
          <div className="max-w-xl space-y-4">
            <h1 className="text-2xl sm:text-3xl font-bold">
              Next step: schedule your call
            </h1>
            <p className="text-white/75 text-sm sm:text-base">
              Thanks for applying to work with{" "}
              <span className="font-semibold">{pageOwner}</span>&apos;s team.
              Right now we schedule interviews manually so we can match your
              availability with the team&apos;s calendar.
            </p>
            <p className="text-white/70 text-sm sm:text-base">
              You&apos;ll hear from{" "}
              <span className="font-semibold">{pageOwner}</span> or someone on
              their leadership team within the next business day at{" "}
              <span className="font-semibold">
                {lead?.phone || lead?.email || "the contact info you provided"}
              </span>{" "}
              to lock in a time.
            </p>
            <p className="text-white/60 text-xs sm:text-sm">
              When they reach out, reply quickly—interview slots are limited
              and we prioritize the most responsive candidates.
            </p>
            <button
              type="button"
              onClick={goNext}
              className="mt-4 inline-flex items-center justify-center rounded-xl bg-white px-6 py-3 font-semibold text-black shadow hover:shadow-lg active:scale-[.99]"
            >
              Continue
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
