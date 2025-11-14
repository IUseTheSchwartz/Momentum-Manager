import { useState } from "react";

export default function MyLandingPage() {
  const [headshotFile, setHeadshotFile] = useState(null);
  const [notificationEmails, setNotificationEmails] = useState("");
  const [siteName, setSiteName] = useState("");
  const [heroTitle, setHeroTitle] = useState("");
  const [heroSub, setHeroSub] = useState("");
  const [aboutName, setAboutName] = useState("");
  const [aboutBio, setAboutBio] = useState("");
  const [heroYoutubeUrl, setHeroYoutubeUrl] = useState("");
  const [heroYoutubeFallback, setHeroYoutubeFallback] = useState("");
  const [socialYoutube, setSocialYoutube] = useState("");
  const [socialInstagram, setSocialInstagram] = useState("");
  const [socialSnapchat, setSocialSnapchat] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  function handleHeadshotChange(e) {
    const file = e.target.files?.[0] || null;
    setHeadshotFile(file);
  }

  function submit(e) {
    e.preventDefault();
    setSaving(true);
    // Shell only – no DB wiring yet
    setTimeout(() => {
      setSaving(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }, 600);
  }

  return (
    <div className="max-w-3xl mx-auto mt-10 card p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold mb-1">My recruiting site</h1>
        <p className="text-sm text-white/60">
          This is the basic info that will power your personal recruiting
          landing page. We&apos;ll hook this up to the database next.
        </p>
      </div>

      <form onSubmit={submit} className="space-y-6">
        {/* Headshot + notifications */}
        <section className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3 md:items-center">
            <div className="text-sm text-white/70">
              <div className="font-semibold mb-1">Headshot (crop &amp; upload)</div>
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
              Site Name
            </div>
            <div className="md:col-span-2">
              <input
                className="w-full p-3 rounded bg-white/5 border border-white/10 text-sm"
                placeholder="Your Name | Momentum Financial"
                value={siteName}
                onChange={(e) => setSiteName(e.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3 md:items-center">
            <div className="text-sm text-white/70 font-semibold">
              Hero Title
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
              Hero Sub
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
              About Name
            </div>
            <div className="md:col-span-2 space-y-2">
              <input
                className="w-full p-3 rounded bg-white/5 border border-white/10 text-sm"
                placeholder="Your name"
                value={aboutName}
                onChange={(e) => setAboutName(e.target.value)}
              />
              <textarea
                className="w-full p-3 rounded bg-white/5 border border-white/10 text-sm min-h-[120px]"
                placeholder="Short bio about you, what you produce, how you work with agents, what they can expect from your team..."
                value={aboutBio}
                onChange={(e) => setAboutBio(e.target.value)}
              />
            </div>
          </div>
        </section>

        {/* Video URLs */}
        <section className="space-y-3 pt-2 border-t border-white/10">
          <div className="grid gap-4 md:grid-cols-3 md:items-center">
            <div className="text-sm text-white/70 font-semibold">
              Hero YouTube URL
            </div>
            <div className="md:col-span-2">
              <input
                className="w-full p-3 rounded bg-white/5 border border-white/10 text-sm"
                placeholder="https://www.youtube.com/watch?v=..."
                value={heroYoutubeUrl}
                onChange={(e) => setHeroYoutubeUrl(e.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3 md:items-center">
            <div className="text-sm text-white/70 font-semibold">
              YouTube URL (fallback)
            </div>
            <div className="md:col-span-2">
              <input
                className="w-full p-3 rounded bg-white/5 border border-white/10 text-sm"
                placeholder="Used if the main video can&apos;t load"
                value={heroYoutubeFallback}
                onChange={(e) => setHeroYoutubeFallback(e.target.value)}
              />
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

        {/* Save button */}
        <div className="pt-4">
          <button
            type="submit"
            className="btn btn-primary"
            disabled={saving}
          >
            {saving ? "Saving..." : "Save (shell only)"}
          </button>
          {saved && (
            <span className="ml-3 text-xs text-emerald-400">
              Saved locally. We&apos;ll wire this into Supabase + your live site next.
            </span>
          )}
        </div>
      </form>
    </div>
  );
}
