import { useState } from "react";

export default function MyLandingPage() {
  const [name, setName] = useState("");
  const [snapchat, setSnapchat] = useState("");
  const [instagram, setInstagram] = useState("");
  const [youtube, setYoutube] = useState("");
  const [aboutHeadline, setAboutHeadline] = useState("");
  const [bio, setBio] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [saved, setSaved] = useState(false);

  function submit(e) {
    e.preventDefault();
    // For now this is just a shell – no DB wiring yet
    setSaved(true);
    const timer = setTimeout(() => setSaved(false), 2500);
    return () => clearTimeout(timer);
  }

  return (
    <div className="max-w-3xl mx-auto mt-10 card p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold mb-1">My recruiting site</h1>
        <p className="text-sm text-white/60">
          This is the basic info that will power your personal recruiting
          landing page. We&apos;ll hook this up to the database next.
        </p>
      </div>

      <form onSubmit={submit} className="space-y-6">
        {/* Name */}
        <section className="space-y-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-white/70">
            Your name
          </h2>
          <input
            className="w-full p-3 rounded bg-white/5 border border-white/10"
            placeholder="Full name (e.g. Logan Harris)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </section>

        {/* Socials */}
        <section className="space-y-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-white/70">
            Socials <span className="text-white/40 text-xs">(optional)</span>
          </h2>
          <div className="grid gap-3 md:grid-cols-3">
            <input
              className="w-full p-3 rounded bg-white/5 border border-white/10 text-sm"
              placeholder="Snapchat (username or link)"
              value={snapchat}
              onChange={(e) => setSnapchat(e.target.value)}
            />
            <input
              className="w-full p-3 rounded bg-white/5 border border-white/10 text-sm"
              placeholder="Instagram (username or link)"
              value={instagram}
              onChange={(e) => setInstagram(e.target.value)}
            />
            <input
              className="w-full p-3 rounded bg-white/5 border border-white/10 text-sm"
              placeholder="YouTube (channel link)"
              value={youtube}
              onChange={(e) => setYoutube(e.target.value)}
            />
          </div>
        </section>

        {/* About section */}
        <section className="space-y-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-white/70">
            About section
          </h2>

          <input
            className="w-full p-3 rounded bg-white/5 border border-white/10 text-sm"
            placeholder={
              name ? `About ${name}` : "About (headline for your section)"
            }
            value={aboutHeadline}
            onChange={(e) => setAboutHeadline(e.target.value)}
          />

          <textarea
            className="w-full p-3 rounded bg-white/5 border border-white/10 text-sm min-h-[120px]"
            placeholder="Short bio about you, how you run your business, what agents can expect working with you..."
            value={bio}
            onChange={(e) => setBio(e.target.value)}
          />

          <input
            className="w-full p-3 rounded bg-white/5 border border-white/10 text-sm"
            placeholder="Profile image URL (we'll add upload later)"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
          />

          <p className="text-xs text-white/50">
            Later we&apos;ll replace this image URL with a proper uploader and
            wire everything into the agent site template.
          </p>
        </section>

        <div className="pt-2">
          <button
            type="submit"
            className="btn btn-primary w-full md:w-auto"
          >
            Save (shell only)
          </button>
          {saved && (
            <p className="text-xs text-emerald-400 mt-2">
              Saved locally. We&apos;ll hook this up to Supabase next.
            </p>
          )}
        </div>
      </form>
    </div>
  );
}
