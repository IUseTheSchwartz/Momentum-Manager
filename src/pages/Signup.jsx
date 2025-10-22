import { useState } from "react";
import { signUp } from "../lib/auth";
import { useNavigate, Link } from "react-router-dom";

export default function Signup() {
  const [email, setEmail] = useState(""); const [pass, setPass] = useState("");
  const [name, setName] = useState(""); const [code, setCode] = useState("");
  const [err, setErr] = useState(""); const nav = useNavigate();

  async function submit(e){ e.preventDefault(); setErr("");
    try { await signUp({ email, password: pass, full_name: name, code }); nav("/leads"); }
    catch(e){ setErr(e.message); } }

  return (
    <div className="max-w-md mx-auto mt-16 card p-6">
      <h2 className="text-xl font-semibold mb-4">Sign up</h2>
      <p className="text-sm text-white/60 mb-2">You must have an invite code.</p>
      {err && <p className="text-red-400 text-sm mb-2">{err}</p>}
      <form onSubmit={submit} className="space-y-3">
        <input className="w-full p-3 rounded bg-white/5 border border-white/10" placeholder="Full name" value={name} onChange={e=>setName(e.target.value)} />
        <input className="w-full p-3 rounded bg-white/5 border border-white/10" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} />
        <input type="password" className="w-full p-3 rounded bg-white/5 border border-white/10" placeholder="Password" value={pass} onChange={e=>setPass(e.target.value)} />
        <input className="w-full p-3 rounded bg-white/5 border border-white/10" placeholder="Invite code" value={code} onChange={e=>setCode(e.target.value)} />
        <button className="btn btn-primary w-full">Create account</button>
      </form>
      <p className="text-sm text-white/60 mt-3">Have an account? <Link to="/login">Log in</Link></p>
    </div>
  );
}
