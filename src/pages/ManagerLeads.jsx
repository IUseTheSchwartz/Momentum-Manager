import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";

export default function ManagerLeads() {
  const [rows, setRows] = useState([]);
  const [users, setUsers] = useState([]);
  const [assignTo, setAssignTo] = useState("");
  const [count, setCount] = useState(10);
  const [stateFilter, setStateFilter] = useState("");
  const [status, setStatus] = useState("");

  async function load() {
    const [{ data: leads }, { data: agents }] = await Promise.all([
      supabase.from("leads").select("id,first_name,last_name,phone_e164,email,state,military_branch,dob,age,lead_type,beneficiary_name,status,assigned_to,created_at").order("created_at", { ascending: false }).limit(2000),
      supabase.from("user_profiles").select("id, full_name, email").order("full_name", { ascending: true })
    ]);
    setRows(leads || []);
    setUsers(agents || []);
  }
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const s = stateFilter.trim().toUpperCase();
    return s ? rows.filter(r => (r.state || "").toUpperCase() === s) : rows;
  }, [rows, stateFilter]);

  async function quickAssign() {
    setStatus("Assigning…");
    const res = await fetch("/.netlify/functions/assign-leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assign_to_user: assignTo, count: Number(count) || 1, filters: { state: stateFilter || undefined } })
    });
    const j = await res.json().catch(()=>({}));
    if (!res.ok) { setStatus(j.error || "Failed"); return; }
    setStatus(`Assigned ${j.assigned} leads`);
    load();
  }

  return (
    <section className="mt-6 space-y-6">
      <h2 className="text-xl font-semibold">All Leads</h2>

      <div className="card p-4 grid sm:grid-cols-5 gap-3">
        <select className="rounded bg-white/5 border border-white/10 p-2" value={assignTo} onChange={e=>setAssignTo(e.target.value)}>
          <option value="">Assign to…</option>
          {users.map(u => <option key={u.id} value={u.id}>{u.full_name || u.email}</option>)}
        </select>
        <input type="number" min={1} className="rounded bg-white/5 border border-white/10 p-2" value={count} onChange={e=>setCount(e.target.value)} placeholder="Count" />
        <input className="rounded bg-white/5 border border-white/10 p-2" value={stateFilter} onChange={e=>setStateFilter(e.target.value)} placeholder="State (e.g., TN)" />
        <button className="btn btn-primary" onClick={quickAssign} disabled={!assignTo || !count}>Quick Assign</button>
        <div className="text-sm text-white/60 self-center">{status}</div>
      </div>

      <div className="card p-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-white/60">
            <tr>
              <th className="text-left p-2">Name</th>
              <th className="text-left p-2">Phone</th>
              <th className="text-left p-2">Email</th>
              <th className="text-left p-2">State</th>
              <th className="text-left p-2">Military</th>
              <th className="text-left p-2">DOB</th>
              <th className="text-left p-2">Age</th>
              <th className="text-left p-2">Lead Type</th>
              <th className="text-left p-2">Beneficiary</th>
              <th className="text-left p-2">Status</th>
              <th className="text-left p-2">Assigned To</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(l => (
              <tr key={l.id} className="border-t border-white/10">
                <td className="p-2">{[l.first_name,l.last_name].filter(Boolean).join(" ") || "—"}</td>
                <td className="p-2">{l.phone_e164 || "—"}</td>
                <td className="p-2">{l.email || "—"}</td>
                <td className="p-2">{l.state || "—"}</td>
                <td className="p-2">{l.military_branch || "—"}</td>
                <td className="p-2">{l.dob || "—"}</td>
                <td className="p-2">{(l.age ?? "") !== "" ? l.age : "—"}</td>
                <td className="p-2">{l.lead_type || "—"}</td>
                <td className="p-2">{l.beneficiary_name || "—"}</td>
                <td className="p-2 capitalize">{l.status.replaceAll("_"," ")}</td>
                <td className="p-2">{users.find(u => u.id === l.assigned_to)?.full_name || (l.assigned_to ? "—" : "Unassigned")}</td>
              </tr>
            ))}
            {!filtered.length && <tr><td className="p-3 text-white/60" colSpan={11}>No leads.</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  );
}
