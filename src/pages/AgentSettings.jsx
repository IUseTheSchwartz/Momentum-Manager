// File: src/pages/AgentSettings.jsx
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient.js";

const DEFAULT_INTRO_VIDEO_URL = "https://www.youtube.com/watch?v=Co1LfteWE8I";

function slugFromName(name) {
  const trimmed = (name || "").trim().toLowerCase();
  if (!trimmed) return "";
  return trimmed
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, "-");
}

export default function AgentSettings() {
  const [site, setSite] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(null);

  const [headshotFile, setHeadshotFile] = useState(null);
  const [notificationEmails, setNotificationEmails] = useState("");
  const [heroTitle, setHeroTitle] = useState("");
  const [heroSub, setHeroSub] = useState("");
  const [aboutName, setAboutName] = useState("");
  const [aboutBio, setAboutBio] = useState("");
  const [heroYoutubeUrl, setHeroYoutubeUrl] = useState("");
  const [socialYoutube, setSocialYoutube] = useState("");
  const [socialInstagram, setSocialInstagram] = useState("");
  const [socialSnapchat, setSocialSnapchat] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function ensureSite() {
      setLoading(true);
      setError(null);

      // 1) get current user from Supabase auth
      const {
        data: { user },
        error: userErr,
      } = await supabase.auth.getUser();

      if (cancelled) return;

      if (userErr || !user) {
        console.error(userErr);
        setError("You must be logged in to manage your recruiting site.");
        setLoading(false);
        return;
      }

      // 2) Try to find an existing site for this user
      const { data: existing, error: selErr } = await supabase
        .from("mm_agent_sites")
        .select("*")
        .eq("agent_user_id", user.id)
        .maybeSingle();

      if (cancelled) return;

      if (selErr) {
        console.error(selErr);
        setError("Failed to load site settings.");
        setLoading(false);
        return;
      }

      let siteRow = existing;

      // 3) If none, create with defaults
      if (!siteRow) {
        const defaultName =
          user.user_metadata?.full_name ||
          user.user_metadata?.name ||
          "Your Name";
        const defaultSlug =
          slugFromName(defaultName) || `agent-${user.id.slice(0, 8)}`;

        const { data: created, error: insErr } = await supabase
          .from("mm_agent_sites")
          .insert({
            agent_user_id: user.id,
            slug: defaultSlug,
            about_name: defaultName,
            site_name: "Momentum Financial",
            hero_title:
              "Build a high-ticket sales career with Momentum Financial",
            hero_sub: "High expectations. High results. Real mentorship.",
            hero_youtube_url: DEFAULT_INTRO_VIDEO_URL, // default to Logan intro video
            notification_emails: user.email || "",
            is_active: true,
            show_proof: true,
          })
          .select("*")
          .single();

        if (cancelled) return;

        if (insErr) {
          console.error(insErr);
          setError("Failed to create default site.");
          setLoading(false);
          return;
        }

        siteRow = created;
      }

      setSite(siteRow);

      // hydrate form state
      setNotificationEmails(siteRow.notification_emails || "");
      setHeroTitle(siteRow.hero_title || "");
      setHeroSub(siteRow.hero_sub || "");
      setAboutName(siteRow.about_name || "");
      setAboutBio(siteRow.about_bio || "");
      // if no custom video set, default to Logan intro
      setHeroYoutubeUrl(
        siteRow.hero_youtube_url || DEFAULT_INTRO_VIDEO_URL
      );
      setSocialYoutube(siteRow.social_youtube_url || "");
      setSocialInstagram(siteRow.social_instagram_url || "");
      setSocialSnapchat(siteRow.social_snapchat_url || "");
      setLoading(false);
    }

    ensureSite();

    return () => {
      cancelled = true;
    };
  }, []);

  function handleHeadshotChange(e) {
    const file = e.target.files?.[0] || null;
    setHeadshotFile(file);
  }

  const slug = useMemo(() => {
    if (!site) return slugFromName(aboutName) || "first-lastname";
    return site.slug || slugFromName(aboutName) || "first-lastname";
  }, [site, aboutName]);

  const siteUrl = `https://momentummanager.net/${slug}`;
  const previewSiteName = `${aboutName || site?.about_name || "Your Name"} | Momentum Financial`;

  async function submit(e) {
    e.preventDefault();
    if (!site) return;
    setSaving(true);
    setError(null);

    try {
      // TODO: later wire real headshot upload to Storage; for now we ignore headshotFile
      const updates = {
        notification_emails: notificationEmails, // ✅ use state var here
        hero_title: heroTitle,
        hero_sub: heroSub,
        about_name: aboutName,
        about_bio: aboutBio,
        hero_youtube_url: heroYoutubeUrl,
        social_youtube_url: socialYoutube,
        social_instagram_url: socialInstagram,
        social_snapchat_url: socialSnapchat,
        updated_at: new Date().toISOString(),
      };

      const { data, error: upErr } = await supabase
        .from("mm_agent_sites")
        .update(updates)
        .eq("id", site.id)
        .select("*")
        .single();

      if (upErr) {
        throw upErr;
      }

      setSite(data);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error(err);
      setError("Failed to save settings.");
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

  if (error && !site) {
    return (
      <div className="text-sm text-red-400">
        {error || "Something went wrong loading your settings."}
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      {/* Headshot + notifications */}
      <section className="space-y-4">
        <div className="grid gap-4 md:grid-cols-3 md:items-center">
          <div className="text-sm text-white/70">
            <div className="font-semibold mb-1">
              Headshot (crop &amp; upload)
            </div>
            <p className="text-xs text-white/50">
              We&apos;ll add proper cropping + hosting later.
            </p>
          </div>
          <div className="md:col-span-2">
            <input
              type="file"
              accept="image/*"
              onChange={handleHeadshotChange}
              className="block w-full text-sm text-white/70 file:mr-3 file:py-2 file:px-4 file:rounded file:border-0 file:bg-white/10 file:text-white hover:file:bg-white/20"
            />
            {headshotFile && (
              <p className="text-xs text-white/50 mt-1">
                Selected: {headshotFile.name}
              </p>
            )}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3 md:items-center">
          <div className="text-sm text-white/70">
            <div className="font-semibold mb-1">
              Notification recipients (emails)
            </div>
            <p className="text-xs text-white/50">
              Where new lead notifications from your site should go.
            </p>
          </div>
          <div className="md:col-span-2">
            <input
              className="w-full p-3 rounded bg-white/5 border border-white/10 text-sm"
              placeholder="you@example.com, manager@example.com"
              value={notificationEmails}
              onChange={(e) => setNotificationEmails(e.target.value)}
            />
          </div>
        </div>
      </section>

      {/* Core site copy */}
      <section className="space-y-3 pt-2 border-t border-white/10">
        <div className="grid gap-4 md:grid-cols-3 md:items-center">
          <div className="text-sm text-white/70 font-semibold">
            Main headline
          </div>
          <div className="md:col-span-2">
            <input
              className="w-full p-3 rounded bg-white/5 border border-white/10 text-sm"
              placeholder="Build a high-ticket sales career"
              value={heroTitle}
              onChange={(e) => setHeroTitle(e.target.value)}
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3 md:items-center">
          <div className="text-sm text-white/70 font-semibold">
            Subtitle (under headline)
          </div>
          <div className="md:col-span-2">
            <input
              className="w-full p-3 rounded bg-white/5 border border-white/10 text-sm"
              placeholder="High expectations. High results."
              value={heroSub}
              onChange={(e) => setHeroSub(e.target.value)}
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3 md:items-start">
          <div className="text-sm text-white/70 font-semibold">
            Your name &amp; bio
          </div>
          <div className="md:col-span-2 space-y-2">
            <input
              className="w-full p-3 rounded bg-white/5 border border-white/10 text-sm"
              placeholder="Your name"
              value={aboutName}
              onChange={(e) => setAboutName(e.target.value)}
            />
            <p className="text-xs text:white/50">
              Your site will display as{" "}
              <span className="font-semibold">{previewSiteName}</span> in the
              browser title.
            </p>
            <textarea
              className="w-full p-3 rounded bg-white/5 border border-white/10 text-sm min-h-[120px]"
              placeholder="Short bio about you, what you produce, how you work with agents, what they can expect from your team..."
              value={aboutBio}
              onChange={(e) => setAboutBio(e.target.value)}
            />
          </div>
        </div>
      </section>

      {/* Video URL */}
      <section className="space-y-3 pt-2 border-t border-white/10">
        <div className="grid gap-4 md:grid-cols-3 md:items-center">
          <div className="text-sm text-white/70 font-semibold">
            Intro video (YouTube link)
          </div>
          <div className="md:col-span-2 space-y-1">
            <input
              className="w-full p-3 rounded bg:white/5 border border:white/10 text-sm"
              placeholder="https://www.youtube.com/watch?v=..."
              value={heroYoutubeUrl}
              onChange={(e) => setHeroYoutubeUrl(e.target.value)}
            />
            <p className="text-xs text-white/50">
              If you don&apos;t add your own video, we&apos;ll show Logan&apos;s
              default intro video here.
            </p>
          </div>
        </div>
      </section>

      {/* Socials */}
      <section className="space-y-3 pt-2 border-t border-white/10">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white/80">Socials</h2>
        </div>

        <div className="grid gap-3">
          <input
            className="w-full p-3 rounded bg-white/5 border border-white/10 text-sm"
            placeholder="YouTube URL"
            value={socialYoutube}
            onChange={(e) => setSocialYoutube(e.target.value)}
          />
          <input
            className="w-full p-3 rounded bg-white/5 border border-white/10 text-sm"
            placeholder="Instagram URL"
            value={socialInstagram}
            onChange={(e) => setSocialInstagram(e.target.value)}
          />
          <input
            className="w-full p-3 rounded bg-white/5 border border-white/10 text-sm"
            placeholder="Snapchat URL"
            value={socialSnapchat}
            onChange={(e) => setSocialSnapchat(e.target.value)}
          />
        </div>

        <p className="text-xs text-white/50">
          Paste full links only. These will power the icon buttons on your
          public landing page.
        </p>
      </section>

      {/* Site URL preview */}
      <section className="space-y-2 pt-2 border-t border-white/10">
        <h2 className="text-sm font-semibold text-white/80">Your site URL</h2>
        <input
          className="w-full p-3 rounded bg-white/5 border border-white/10 text-sm"
          readOnly
          value={siteUrl}
        />
        <p className="text-xs text-white/50">
          This is where your public page will live. It&apos;s generated from
          your name as <code>first-lastname</code> and stored as a slug.
        </p>
      </section>

      {/* Save button */}
      <div className="pt-4">
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? "Saving..." : "Save settings"}
        </button>
        {saved && (
          <span className="ml-3 text-xs text-emerald-400">
            Saved to Supabase.
          </span>
        )}
        {error && (
          <div className="mt-2 text-xs text-red-400">
            {error}
          </div>
        )}
      </div>
    </form>
  );
}
