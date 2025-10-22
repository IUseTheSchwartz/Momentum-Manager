import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";

const STATUS_COLORS = {
  sold: "bg-green-900/30",
  no_pickup: "bg-yellow-900/30",
  appointment: "bg-purple-900/30",
  do_not_call: "bg-red-900/30",
};

export default function Leads() {
  const [rows, setRows] = useState([]);
  const [filter, setFilter] = useState("");
  const [activeLead, setActiveLead] = useState(null); // for notes drawer

  async function load() {
    const { data } = await supabase
      .from("leads")
      .select("id, first_name, last_name, phone_e164, email, state, military_branch, dob, age, status, notes, created_at")
      .order("created_at", { ascending:false });
    setRows(data || []);
  }
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const f = filter.trim().toLowerCase();
    if (!f) return rows;
    return rows.filter(r => {
      const name = [r.first_name, r.last_name].filter(Boolean).join(" ").toLowerCase();
      return name.includes(f) || (r.phone_e164 || "").includes(f) || (r.email || "").toLowerCase().includes(f) || (r.state || "").toLowerCase().includes(f);
    });
  }, [rows, filter]);

  async function setStatus(leadId, status) {
    await supabase.from("leads").update({ status }).eq("id", leadId);
    setRows(prev => prev.map(r => r.id === leadId ? { ...r, status } : r));
  }

  return (
    <div className="mt-6 space-y-4">
      <div className="flex items-center gap-3">
        <h2 className="text-xl font-semibold">My Leads</h2>
        <input
          className="ml-auto w-64 p-2 rounded bg-white/5 border border-white/10 text-sm"
          placeholder="Search name / phone / email / state"
          value={filter}
          onChange={e=>setFilter(e.target.value)}
        />
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-white/60">
            <tr>
              <th className="text-left p-3">Name</th>
              <th className="text-left p-3">Phone</th>
              <th className="text-left p-3">Email</th>
              <th className="text-left p-3">State</th>
              <th className="text-left p-3">Military</th>
              <th className="text-left p-3">DOB</th>
              <th className="text-left p-3">Age</th>
              <th className="text-left p-3">Status</th>
              <th className="text-left p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(l => {
              const rowClass = STATUS_COLORS[l.status] || "";
              return (
                <tr key={l.id} className={`border-t border-white/10 ${rowClass}`}>
                  <td className="p-3">{[l.first_name,l.last_name].filter(Boolean).join(" ") || "—"}</td>
                  <td className="p-3">{l.phone_e164 || "—"}</td>
                  <td className="p-3">{l.email || "—"}</td>
                  <td className="p-3">{l.state || "—"}</td>
                  <td className="p-3">{l.military_branch || "—"}</td>
                  <td className="p-3">{l.dob || "—"}</td>
                  <td className="p-3">{(l.age ?? "") !== "" ? l.age : "—"}</td>
                  <td className="p-3 capitalize">{l.status.replaceAll("_"," ")}</td>
                  <td className="p-3">
                    <div className="flex flex-wrap gap-2">
                      <button className="btn text-xs" onClick={()=>setStatus(l.id, "sold")}>Sold</button>
                      <button className="btn text-xs" onClick={()=>setStatus(l.id, "no_pickup")}>No pickup</button>
                      <button className="btn text-xs" onClick={()=>setStatus(l.id, "appointment")}>Appointment</button>
                      <button className="btn text-xs" onClick={()=>setStatus(l.id, "do_not_call")}>Don’t call</button>
                      <button className="btn text-xs" onClick={()=>setActiveLead(l)}>Notes</button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {!filtered.length && <tr><td className="p-4 text-white/50" colSpan={9}>No leads yet.</td></tr>}
          </tbody>
        </table>
      </div>

      {activeLead && <NotesDrawer lead={activeLead} onClose={() => setActiveLead(null)} />}
    </div>
  );
}

function NotesDrawer({ lead, onClose }) {
  const [items, setItems] = useState([]);
  const [body, setBody] = useState("");

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("lead_notes")
        .select("id, body, author_id, created_at")
        .eq("lead_id", lead.id)
        .order("created_at", { ascending: false });
      setItems(data || []);
    })();
  }, [lead.id]);

  async function addNote() {
    if (!body.trim()) return;
    const { data: s } = await supabase.auth.getSession();
    const author_id = s?.session?.user?.id || null;
    const ins = await supabase.from("lead_notes").insert({
      lead_id: lead.id, author_id, body: body.trim()
    }).select("id, body, author_id, created_at").single();
    if (!ins.error) {
      setItems(prev => [ins.data, ...prev]);
      setBody("");
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex">
      <div className="ml-auto w-full max-w-md h-full bg-[#0b0b0c] border-l border-white/10 p-4 flex flex-col">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold">Notes — { [lead.first_name, lead.last_name].filter(Boolean).join(' ') || lead.phone_e164 }</h3>
          <button className="btn" onClick={onClose}>Close</button>
        </div>
        <div className="flex items-center gap-2 mb-3">
          <input
            className="flex-1 p-2 rounded bg-white/5 border border-white/10"
            placeholder="Add a note…"
            value={body}
            onChange={e=>setBody(e.target.value)}
            onKeyDown={(e)=>{ if (e.key === "Enter") addNote(); }}
          />
          <button className="btn btn-primary" onClick={addNote}>Add</button>
        </div>
        <div className="overflow-y-auto space-y-2">
          {items.map(n => (
            <div key={n.id} className="p-2 border border-white/10 rounded">
              <div className="text-xs text-white/50">{new Date(n.created_at).toLocaleString()}</div>
              <div className="text-sm">{n.body}</div>
            </div>
          ))}
          {!items.length && <div className="text-white/60 text-sm">No notes yet.</div>}
        </div>
      </div>
    </div>
  );
}
