import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { signIn } from "../lib/auth";

export default function AgentLogin() {
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const nav = useNavigate();

  async function submit(e) {
    e.preventDefault();
    setErr("");

    try {
      setBusy(true);
      await signIn({ email, password: pass });

      // After logging in from this flow, send them to the landing-page setup
      nav("/my-landing-page");
    } catch (e) {
      setErr(e.message || "Login failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-md mx-auto mt-16 card p-6">
      <h2 className="text-xl font-semibold mb-2">Agent login</h2>
      <p className="text-sm text-white/60 mb-3">
        Log in to set up and manage your recruiting landing page.
      </p>

      {err && <p className="text-red-400 text-sm mb-2">{err}</p>}

      <form onSubmit={submit} className="space-y-3">
        <input
          type="email"
          className="w-full p-3 rounded bg-white/5 border border-white/10"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <input
          type="password"
          className="w-full p-3 rounded bg-white/5 border border-white/10"
          placeholder="Password"
          value={pass}
          onChange={(e) => setPass(e.target.value)}
          minLength={6}
          required
        />

        <button className="btn btn-primary w-full" disabled={busy}>
          {busy ? "Logging in..." : "Login"}
        </button>
      </form>

      <p className="text-sm text-white/60 mt-3">
        Need an account? <Link to="/signup">Sign up with code</Link>
      </p>
    </div>
  );
}
