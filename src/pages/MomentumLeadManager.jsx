// File: src/pages/MomentumLeadManager.jsx
import { Link } from "react-router-dom";

export default function MomentumLeadManager() {
  return (
    <section className="text-center mt-24">
      <img src="/logo.png" alt="MF" className="mx-auto h-24 w-24 mb-6" />
      <h1 className="text-3xl font-bold mb-2">Momentum Lead Manager</h1>
      <p className="text-white/70 mb-6">
        Lead system for Momentum Financial agents. Leads are provided by the
        team — this is where you keep track of who you&apos;ve contacted and
        who still needs a call.
      </p>
      <div className="flex gap-3 justify-center">
        <Link className="btn btn-primary" to="/leads">
          Open Lead Manager
        </Link>
      </div>
    </section>
  );
}
