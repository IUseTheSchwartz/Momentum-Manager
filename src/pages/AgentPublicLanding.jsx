// File: src/pages/AgentPublicLanding.jsx
import { useParams } from "react-router-dom";

export default function AgentPublicLanding() {
  const { slug } = useParams();

  return (
    <div className="max-w-4xl mx-auto mt-10 card p-6 space-y-4">
      <h1 className="text-2xl font-semibold">
        Public agent landing (coming soon)
      </h1>
      <p className="text-sm text-white/70">
        This page will become the Logan-style recruiting site for{" "}
        <span className="font-mono bg-white/5 px-2 py-0.5 rounded">
          {slug}
        </span>
        . We&apos;ll wire it up to your agent site settings, questions, proof
        feed, and availability.
      </p>
    </div>
  );
}
