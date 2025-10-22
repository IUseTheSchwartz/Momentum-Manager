import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

export default function Leads() {
  const [rows, setRows] = useState([]);

  useEffect(() => {
    supabase.from("leads").select("*").order("created_at", { ascending:false }).then(({ data }) => setRows(data || []));
  }, []);

  return (
    <div className="mt-6">
      <h2 className="text-xl font-semibold mb-3">My Leads</h2>
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-white/60">
            <tr>
              <th className="text-left p-3">Name</th>
              <th className="text-left p-3">Phone</th>
              <th className="text-left p-3">State</th>
              <th className="text-left p-3">Status</th>
              <th className="text-left p-3">Notes</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(l => (
              <tr key={l.id} className="border-t border-white/10">
                <td className="p-3">{[l.first_name,l.last_name].filter(Boolean).join(" ") || "—"}</td>
                <td className="p-3">{l.phone_e164 || "—"}</td>
                <td className="p-3">{l.state || "—"}</td>
                <td className="p-3">{l.status}</td>
                <td className="p-3">{l.notes || "—"}</td>
              </tr>
            ))}
            {!rows.length && <tr><td className="p-4 text-white/50" colSpan={5}>No leads yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
