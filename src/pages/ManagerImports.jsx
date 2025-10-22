import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

const BUCKET = "lead_files";

export default function ManagerImports() {
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState("");
  const [history, setHistory] = useState([]);

  async function loadHistory() {
    const { data, error } = await supabase
      .from("lead_files")
      .select("id, original_filename, row_count, processed_count, skipped_count, status, created_at")
      .order("created_at", { ascending: false })
      .limit(25);
    if (!error) setHistory(data || []);
  }
  useEffect(() => { loadHistory(); }, []);

  async function uploadCsv() {
    setStatus("");
    if (!file) return;
    const { data: sess } = await supabase.auth.getSession();
    const userId = sess?.session?.user?.id;
    if (!userId) { setStatus("You must be logged in."); return; }

    setStatus("Uploading…");
    const key = new Date().toISOString().slice(0,10).replace(/-/g, "/");
    const path = `${key}/${cryptoRandom()}.csv`;

    const up = await supabase.storage.from(BUCKET).upload(path, file, {
      cacheControl: "3600",
      contentType: "text/csv",
      upsert: false,
    });
    if (up.error) {
      setStatus(`Upload failed: ${up.error.message}`);
      return;
    }

    setStatus("Processing…");
    let res;
    try {
      res = await fetch("/.netlify/functions/import-csv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bucket: BUCKET,
          file_path: path,
          original_filename: file.name,
          user_id: userId,
        }),
      });
    } catch (e) {
      setStatus(`Function call failed: ${e.message}`);
      return;
    }

    let payload;
    try {
      payload = await res.json();
    } catch {
      // Not JSON — get raw text
      const t = await res.text().catch(() => "");
      payload = { error: t };
    }

    if (!res.ok) {
      const detail = payload?.error ? ` — ${payload.error}` : "";
      setStatus(`Error ${res.status} ${res.statusText}${detail}`);
      return;
    }

    setStatus(`Processed: inserted ${payload.inserted}, skipped ${payload.skipped}`);
    setFile(null);
    loadHistory();
  }

  return (
    <section className="mt-6 space-y-6">
      <h2 className="text-xl font-semibold">Imports</h2>

      <div className="card p-4 space-y-3">
        <div className="text-sm text-white/70">Upload a CSV (we normalize headers and dedupe by phone).</div>
        <input type="file" accept=".csv,text/csv" onChange={(e)=>setFile(e.target.files?.[0] || null)} />
        <button className="btn btn-primary" onClick={uploadCsv} disabled={!file}>Upload & Process</button>
        {status && <div className="text-sm text-white/70">{status}</div>}
      </div>

      <div className="card p-4">
        <h3 className="font-semibold mb-2">Recent Uploads</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-white/60">
              <tr>
                <th className="text-left p-2">File</th>
                <th className="text-left p-2">Rows</th>
                <th className="text-left p-2">Processed</th>
                <th className="text-left p-2">Skipped</th>
                <th className="text-left p-2">Status</th>
                <th className="text-left p-2">Uploaded</th>
              </tr>
            </thead>
            <tbody>
              {(history || []).map(r => (
                <tr key={r.id} className="border-t border-white/10">
                  <td className="p-2">{r.original_filename}</td>
                  <td className="p-2">{r.row_count}</td>
                  <td className="p-2">{r.processed_count}</td>
                  <td className="p-2">{r.skipped_count}</td>
                  <td className="p-2">{r.status}</td>
                  <td className="p-2">{new Date(r.created_at).toLocaleString()}</td>
                </tr>
              ))}
              {!history?.length && <tr><td colSpan={6} className="p-3 text-white/60">No uploads yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function cryptoRandom() {
  return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
}
