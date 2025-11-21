// File: src/pages/VideoHub.jsx
import { Link } from "react-router-dom";
import HubHamburger from "../components/HubHamburger.jsx";

export default function VideoHub() {
  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      <HubHamburger />

      <main className="flex-1 flex flex-col items-center justify-center px-6 pb-12 pt-4">
        <div className="max-w-3xl w-full text-center space-y-6">
          <p className="text-xs uppercase tracking-[0.2em] text-white/50">
            MOMENTUM VIDEO HUB
          </p>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-semibold leading-tight">
            Done-for-you edits for{" "}
            <span className="text-indigo-400">Momentum agents</span>.
          </h1>
          <p className="text-sm sm:text-base text-white/70">
            Drop a Google Drive link, tell us what you want, and get a finished
            short-form video back. Max length{" "}
            <span className="font-semibold text-white">10 minutes</span>, and
            edits can take{" "}
            <span className="font-semibold text-white">up to 7 days</span>{" "}
            depending on volume from other users.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Link
              to="/login"
              className="inline-flex items-center justify-center rounded-full px-6 py-2.5 text-sm font-medium bg-white text-slate-950 hover:bg-slate-100 transition"
            >
              Login to Video Hub
            </Link>
            <Link
              to="/signup"
              className="inline-flex items-center justify-center rounded-full px-6 py-2.5 text-sm font-medium border border-white/20 bg-white/5 hover:bg-white/10 transition"
            >
              Sign up with code
            </Link>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-3 text-left text-xs sm:text-sm">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="font-medium mb-1">Google Drive links only</p>
              <p className="text-white/70">
                Upload your raw video to Google Drive, set it to &quot;anyone
                with the link can view&quot;, and paste it into the Hub.
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="font-medium mb-1">Max 10-minute clips</p>
              <p className="text-white/70">
                Keep clips tight. If it&apos;s longer than 10 minutes, trim it
                down to the best section before submitting.
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="font-medium mb-1">Delivered inside your portal</p>
              <p className="text-white/70">
                Track edit requests and download finished videos from your
                Momentum Manager account.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
