// File: src/pages/AgentSettings.jsx
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient.js";

const DEFAULT_INTRO_VIDEO_URL = "https://www.youtube.com/watch?v=Co1LfteWE8I";
// 🔹 Make sure this matches your Supabase storage bucket name
const HEADSHOT_BUCKET = "mm_agent_assets";

function slugFromName(name) {
  const trimmed = (name || "").trim().toLowerCase();
  if (!trimmed) return "";
  return trimmed
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, "-");
}

// Normalize either a full URL or @handle into full URL
function normalizeSocial(value, kind) {
  const raw = (value || "").trim();
  if (!raw) return "";

  // Already a URL
  if (raw.startsWith("http://") || raw.startsWith("https://")) {
    return raw;
  }

  const handle = raw.startsWith("@") ? raw.slice(1) : raw;

  switch (kind) {
    case "youtube":
      return `https://youtube.com/@${handle}`;
    case "instagram":
      return `https://instagram.com/${handle}`;
    case "snapchat":
      return `https://snapchat.com/add/${handle}`;
    default:
      return raw;
  }
}

export default function AgentSettings() {
  const [site, setSite] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(null);

  const [headshotFile, setHeadshotFile] = useState(null);
  const [headshotPreview, setHeadshotPreview] = useState("");
  const [headshotError, setHeadshotError] = useState("");

  const [notificationEmails, setNotificationEmails] = useState("");
  const [agentPhone, setAgentPhone] = useState("");
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

      // If none, create with defaults
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
            hero_youtube_url: DEFAULT_INTRO_VIDEO_URL,
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
      setAgentPhone(siteRow.agent_phone || "");
      setHeroTitle(siteRow.hero_title || "");
      setHeroSub(siteRow.hero_sub || "");
      setAboutName(siteRow.about_name || "");
      setAboutBio(siteRow.about_bio || "");
      setHeroYoutubeUrl(
        siteRow.hero_youtube_url || DEFAULT_INTRO_VIDEO_URL
      );
      setSocialYoutube(siteRow.social_youtube_url || "");
      setSocialInstagram(siteRow.social_instagram_url || "");
      setSocialSnapchat(siteRow.social_snapchat_url || "");
      setHeadshotPreview(siteRow.headshot_url || "");
      setLoading(false);
    }

    ensureSite();

    return () => {
      cancelled = true;
    };
  }, []);

  function handleHeadshotChange(e) {
    const file = e.target.files?.[0] || null;
    setHeadshotError("");
    setHeadshotFile(file);
    if (file) {
      const url = URL.createObjectURL(file);
      setHeadshotPreview(url);
    } else {
      setHeadshotPreview(site?.headshot_url || "");
    }
  }

  // Slug preview: prefer name-derived slug, fall back to existing site slug
  const slug = useMemo(() => {
    const fromName = slugFromName(aboutName);
    if (fromName) return fromName;
    if (site?.slug) return site.slug;
    return "first-lastname";
  }, [site, aboutName]);

  const siteUrl = `https://momentummanager.net/${slug}`;
  const previewSiteName = `${
    aboutName || site?.about_name || "Your Name"
  } | Momentum Financial`;

  async function uploadHeadshotIfNeeded(currentSite) {
    if (!headshotFile || !currentSite) return currentSite.headshot_url || "";

    try {
      const ext =
        headshotFile.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `headshots/${currentSite.id}-${Date.now()}.${ext}`;

      const { data: uploadData, error: uploadErr } = await supabase.storage
        .from(HEADSHOT_BUCKET)
        .upload(path, headshotFile, {
          contentType: headshotFile.type || "image/jpeg",
          upsert: true,
        });

      if (uploadErr) {
        console.error("[AgentSettings] headshot upload error", uploadErr);
        setHeadshotError("Failed to upload headshot.");
        return currentSite.headshot_url || "";
      }

      const { data: publicUrlData } = supabase.storage
        .from(HEADSHOT_BUCKET)
        .getPublicUrl(uploadData.path);

      const publicUrl = publicUrlData?.publicUrl || "";
      if (!publicUrl) {
        setHeadshotError("Failed to get headshot URL.");
        return currentSite.headshot_url || "";
      }

      return publicUrl;
    } catch (e) {
      console.error("[AgentSettings] upload error", e);
      setHeadshotError("Failed to process headshot.");
      return currentSite.headshot_url || "";
    }
  }

  async function submit(e) {
    e.preventDefault();
    if (!site) return;
    setSaving(true);
    setError(null);

    try {
      // New slug we will actually save
      const newSlug = slugFromName(aboutName) || site.slug || slug;

      // Normalize socials from URL or @handle
      const normalizedYoutube = normalizeSocial(socialYoutube, "youtube");
      const normalizedInstagram = normalizeSocial(
        socialInstagram,
        "instagram"
      );
      const normalizedSnapchat = normalizeSocial(
        socialSnapchat,
        "snapchat"
      );

      // Upload headshot if needed
      const headshotUrl = await uploadHeadshotIfNeeded(site);

      const updates = {
        notification_emails: notificationEmails,
        agent_phone: agentPhone,
        hero_title: heroTitle,
        hero_sub: heroSub,
        about_name: aboutName,
        about_bio: aboutBio,
        hero_youtube_url: heroYoutubeUrl,
        social_youtube_url: normalizedYoutube,
        social_instagram_url: normalizedInstagram,
        social_snapchat_url: normalizedSnapchat,
        headshot_url: headshotUrl,
        slug: newSlug,
        updated_at: new Date().toISOString(),
      };

      const { data, error: upErr } = await supabase
        .from("mm_agent_sites")
        .update(updates)
        .eq("id", site.id)
        .select("*")
        .single();

      if (upErr) throw upErr;

      setSite(data);
      setHeadshotPreview(data.headshot_url || headshotPreview);
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
        <div className="grid gap-4 md:grid-cols-3 md:items-start">
          <div className="text-sm text-white/70">
            <div className="font-semibold mb-1">
              Headshot (square avatar)
            </div>
            <p className="text-xs text-white/50">
              Upload a clear front-facing photo. We&apos;ll display it as a
              square avatar on your page.
            </p>
            {headshotError && (
              <p className="text-xs text-red-400 mt-1">{headshotError}</p>
            )}
          </div>
          <div className="md:col-span-2 space-y-3">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-white/5 overflow-hidden flex items-center justify-center">
                {headshotPreview || site?.headshot_url ? (
                  <img
                    src={headshotPreview || site?.headshot_url}
                    alt="Headshot preview"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-[10px] text-white/40 text-center px-1">
                    No headshot
                  </span>
                )}
              </div>
              <div className="flex-1">
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

        {/* Agent phone for emails/texts */}
        <div className="grid gap-4 md:grid-cols-3 md:items-center">
          <div className="text-sm text-white/70">
            <div className="font-semibold mb-1">
              Phone number for calls/texts
            </div>
            <p className="text-xs text-white/50">
              This number will appear in client emails as the number to text or
              expect a call from.
            </p>
          </div>
          <div className="md:col-span-2">
            <input
              className="w-full p-3 rounded bg-white/5 border border-white/10 text-sm"
              placeholder="e.g. (555) 123-4567"
              value={agentPhone}
              onChange={(e) => setAgentPhone(e.target.value)}
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
            <p className="text-xs text-white/50">
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
              className="w-full p-3 rounded bg-white/5 border border-white/10 text-sm"
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
            placeholder="YouTube URL or @handle"
            value={socialYoutube}
            onChange={(e) => setSocialYoutube(e.target.value)}
          />
          <input
            className="w-full p-3 rounded bg-white/5 border border-white/10 text-sm"
            placeholder="Instagram URL or @handle"
            value={socialInstagram}
            onChange={(e) => setSocialInstagram(e.target.value)}
          />
          <input
            className="w-full p-3 rounded bg-white/5 border border-white/10 text-sm"
            placeholder="Snapchat URL or @handle"
            value={socialSnapchat}
            onChange={(e) => setSocialSnapchat(e.target.value)}
          />
        </div>

        <p className="text-xs text-white/50">
          You can paste full links or just your @username. We&apos;ll save the
          proper URLs for you.
        </p>
      </section>

      {/* Site URL preview */}
      <section className="space-y-2 pt-2 border-t border-white/10">
        <h2 className="text-sm font-semibold text-white/80">Your site URL</h2>
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <input
            className="flex-1 p-3 rounded bg.white/5 border border-white/10 text-sm"
            readOnly
            value={siteUrl}
          />
          <a
            href={siteUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center rounded bg-white text-black text-sm font-semibold px-4 py-2 hover:bg-gray-100"
          >
            Open site
          </a>
        </div>
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
          <div className="mt-2 text-xs text-red-400">{error}</div>
        )}
      </div>
    </form>
  );
}
