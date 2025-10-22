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
      supabase.from("leads").select("id,first_name,last_name,phone_e164,state,status,assigned_to,created_at").order("created_at", { ascending: false }).limit(500),
      supabase.from("user_profiles").select("id, full_name, email").order("full_name", { ascending: true })
    ]);
    setRows(leads || []);
    setUsers(agents || []);
  }
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    return rows.filter(r => (stateFilter ? (r.state || "").toUpperCase() === stateFilter.toUpperCase() : true));
  }, [rows, stateFilter]);

  async function quickAssign() {
    setStatus("Assigning…");
    const { data: s } = await supabase.auth.getSession();
    const manager_id = s?.session?.user?.id;

    const res = await fetch("/.netlify/functions/assign-leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ manager_id, assign_to_user: assignTo, count: Number(count) || 1, filters: { state: stateFilter || undefined } })
    });
    const j = await res.json();
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
              <th className="text-left p-2">State</th>
              <th className="text-left p-2">Status</th>
              <th className="text-left p-2">Assigned To</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(l => (
              <tr key={l.id} className="border-t border-white/10">
                <td className="p-2">{[l.first_name,l.last_name].filter(Boolean).join(" ") || "—"}</td>
                <td className="p-2">{l.phone_e164 || "—"}</td>
                <td className="p-2">{l.state || "—"}</td>
                <td className="p-2">{l.status}</td>
                <td className="p-2">{users.find(u => u.id === l.assigned_to)?.full_name || (l.assigned_to ? "—" : "Unassigned")}</td>
              </tr>
            ))}
            {!filtered.length && <tr><td className="p-3 text-white/60" colSpan={5}>No leads.</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  );
}
