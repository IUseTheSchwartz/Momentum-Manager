// File: src/pages/MomentumLeadManager.jsx
import { Link } from "react-router-dom";

export default function MomentumLeadManager() {
  return (
    <section className="text-center mt-24">
      <img src="/logo.png" alt="MF" className="mx-auto h-24 w-24 mb-6" />
      <h1 className="text-3xl font-bold mb-2">Momentum Lead Manager</h1>
      <p className="text-white/70 mb-6">
        Lead distribution for the Momentum Financial Discord.
      </p>
      <div className="flex gap-3 justify-center">
        <Link className="btn btn-primary" to="/login">
          Login
        </Link>
        <Link className="btn" to="/signup">
          Sign up with code
        </Link>
      </div>
    </section>
  );
}
