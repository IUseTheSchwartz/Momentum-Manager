// File: src/pages/Reschedule.jsx
import React from "react";
import { Link } from "react-router-dom";

export default function Reschedule() {
  return (
    <div className="min-h-screen bg-[#1e1f22] text-white p-6">
      <div className="max-w-xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">Reschedule your call</h1>
        <div className="rounded-lg border border-white/10 bg-white/5 p-4 space-y-3 text-sm text-white/80">
          <p>
            For now, interview times with Momentum agents are scheduled
            manually.
          </p>
          <p>
            If you need to change your time, reply directly to the text or
            email you received from your mentor&apos;s team and let them know
            a few windows that work best for you.
          </p>
          <p className="text-white/60 text-xs">
            We&apos;ll eventually add full self-serve rescheduling here (just
            like Logan&apos;s calendar), but we&apos;re not using that yet for
            the recruiting sites.
          </p>
        </div>

        <Link
          to="/"
          className="mt-6 inline-flex items-center justify-center rounded-xl bg-white px-6 py-3 font-semibold text-black shadow hover:shadow-lg active:scale-[.99]"
        >
          Back to main page
        </Link>
      </div>
    </div>
  );
}
