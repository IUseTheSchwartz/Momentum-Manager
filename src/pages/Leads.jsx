// File: src/pages/Leads.jsx (Agent view) — FIXED for smaller screens + status changing after first select
import { useEffect, useMemo, useState, Fragment } from "react";
import { supabase } from "../lib/supabaseClient";
import { fmtMDY } from "../lib/dateFmt";

const STATUS_COLORS = {
  sold: "bg-green-900/30",
  no_pickup: "bg-yellow-900/30",
  appointment: "bg-purple-900/30",
  do_not_call: "bg-red-900/30",
};

export default function Leads() {
  const [rows, setRows] = useState([]);
  const [filter, setFilter] = useState("");
  const [activeLead, setActiveLead] = useState(null);
  const [userId, setUserId] = useState(null);
  const [savingStatusId, setSavingStatusId] = useState(null);

  // ✅ NEW: selection state for CSV export
  const [selectedIds, setSelectedIds] = useState(() => new Set());

  async function loadForUser(uid) {
    if (!uid) {
      setRows([]);
      setSelectedIds(new Set());
      return;
    }

    const ids = new Set();
    const assignedAtMap = new Map();

    // 1) currently assigned to me (from leads.assigned_to)
    const cur = await supabase
      .from("leads")
      .select("id, assigned_to, created_at")
      .eq("assigned_to", uid);

    (cur.data || []).forEach((r) => {
      ids.add(r.id);
      if (!assignedAtMap.get(r.id)) assignedAtMap.set(r.id, r.created_at);
    });

    // 2) historically assigned to me (via lead_assignments, with assigned_at)
    const hist = await supabase
      .from("lead_assignments")
      .select("lead_id, assigned_at")
      .eq("user_id", uid)
      .limit(2000);

    (hist.data || []).forEach((r) => {
      ids.add(r.lead_id);
      const prev = assignedAtMap.get(r.lead_id);
      if (!prev || new Date(r.assigned_at) > new Date(prev)) {
        assignedAtMap.set(r.lead_id, r.assigned_at);
      }
    });

    if (!ids.size) {
      setRows([]);
      setSelectedIds(new Set());
      return;
    }

    // fetch details
    const list = Array.from(ids);
    const batched = [];
    const chunk = 500;

    for (let i = 0; i < list.length; i += chunk) {
      const slice = list.slice(i, i + chunk);
      const res = await supabase
        .from("leads")
        .select(
          "id, first_name, last_name, phone_e164, email, state, address, military_branch, dob, age, lead_type, beneficiary_name, assigned_to, created_at"
        )
        .in("id", slice);
      if (!res.error) batched.push(...(res.data || []));
    }

    // 3) fetch my per-user meta (status/DNC) for these leads
    const metaMap = new Map();
    for (let i = 0; i < list.length; i += chunk) {
      const slice = list.slice(i, i + chunk);
      const metaRes = await supabase
        .from("lead_user_meta")
        .select("lead_id, status, do_not_call")
        .eq("user_id", uid)
        .in("lead_id", slice);

      if (!metaRes.error) {
        (metaRes.data || []).forEach((m) => {
          metaMap.set(m.lead_id, {
            my_status: m.status || null,
            my_dnc: !!m.do_not_call,
          });
        });
      }
    }

    // merge into rows, attach assigned_at from lead_assignments (fallback to created_at)
    const merged = batched.map((r) => {
      const meta = metaMap.get(r.id) || {};
      const assigned_at = assignedAtMap.get(r.id) || r.created_at;
      return {
        ...r,
        my_status: meta.my_status || null,
        my_dnc: !!meta.my_dnc,
        assigned_at,
      };
    });

    // sort by assigned_at (newest first)
    merged.sort((a, b) => {
      const aT = a.assigned_at ? new Date(a.assigned_at) : new Date(a.created_at);
      const bT = b.assigned_at ? new Date(b.assigned_at) : new Date(b.created_at);
      return bT - aT;
    });

    setRows(merged);

    // ✅ keep selection only for leads that still exist after refresh
    setSelectedIds((prev) => {
      const keep = new Set();
      const allowed = new Set(merged.map((r) => r.id));
      prev.forEach((id) => {
        if (allowed.has(id)) keep.add(id);
      });
      return keep;
    });
  }

  useEffect(() => {
    (async () => {
      const { data: s } = await supabase.auth.getSession();
      const uid = s?.session?.user?.id || null;
      setUserId(uid);
      await loadForUser(uid);

      if (!uid) return;

      const ch = supabase
        .channel("leads-my-assignments")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "leads", filter: `assigned_to=eq.${uid}` },
          () => loadForUser(uid)
        )
        .subscribe();

      return () => {
        supabase.removeChannel(ch);
      };
    })();
  }, []);

  const filtered = useMemo(() => {
    const f = filter.trim().toLowerCase();
    if (!f) return rows;
    return rows.filter((r) => {
      const name = [r.first_name, r.last_name].filter(Boolean).join(" ").toLowerCase();
      return (
        name.includes(f) ||
        (r.phone_e164 || "").includes(f) ||
        (r.email || "").toLowerCase().includes(f) ||
        (r.state || "").toLowerCase().includes(f) ||
        (r.lead_type || "").toLowerCase().includes(f) ||
        (r.beneficiary_name || "").toLowerCase().includes(f)
      );
    });
  }, [rows, filter]);

  // ✅ NEW: selection helpers (uses FILTERED list for select-all)
  const allFilteredSelected = useMemo(() => {
    if (!filtered.length) return false;
    for (const r of filtered) {
      if (!selectedIds.has(r.id)) return false;
    }
    return true;
  }, [filtered, selectedIds]);

  const selectedCount = selectedIds.size;

  function toggleOne(id) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAllFiltered() {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      const shouldSelectAll = !allFilteredSelected;
      if (shouldSelectAll) {
        filtered.forEach((r) => next.add(r.id));
      } else {
        filtered.forEach((r) => next.delete(r.id));
      }
      return next;
    });
  }

  function clearSelection() {
    setSelectedIds(new Set());
  }

  function escapeCsvCell(v) {
    const s = v == null ? "" : String(v);
    const needsQuotes = /[",\n\r]/.test(s);
    const escaped = s.replace(/"/g, '""');
    return needsQuotes ? `"${escaped}"` : escaped;
  }

  function downloadSelectedCsv() {
    const selected = rows.filter((r) => selectedIds.has(r.id));
    if (!selected.length) return;

    const columns = [
      { key: "first_name", label: "first_name" },
      { key: "last_name", label: "last_name" },
      { key: "phone_e164", label: "phone" },
      { key: "email", label: "email" },
      { key: "state", label: "state" },
      { key: "address", label: "address" },
      { key: "military_branch", label: "military_branch" },
      { key: "dob", label: "dob" },
      { key: "age", label: "age" },
      { key: "lead_type", label: "lead_type" },
      { key: "beneficiary_name", label: "beneficiary_name" },
      { key: "my_status", label: "my_status" },
      { key: "my_dnc", label: "do_not_call" },
      { key: "assigned_at", label: "assigned_at" },
    ];

    const header = columns.map((c) => escapeCsvCell(c.label)).join(",");
    const lines = selected.map((r) =>
      columns
        .map((c) => {
          const val = r[c.key];
          return escapeCsvCell(val);
        })
        .join(",")
    );

    const csv = [header, ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const ts = new Date();
    const y = ts.getFullYear();
    const m = String(ts.getMonth() + 1).padStart(2, "0");
    const d = String(ts.getDate()).padStart(2, "0");
    const filename = `my-leads-selected-${y}-${m}-${d}.csv`;

    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  // ✅ FIXED: update-first, insert-fallback, optimistic UI
  async function setMyStatus(leadId, status) {
    if (!userId) return;

    const nextDnc = status === "do_not_call";
    setSavingStatusId(leadId);

    // optimistic UI
    const prevRow = rows.find((r) => r.id === leadId) || null;
    setRows((prev) =>
      prev.map((r) => (r.id === leadId ? { ...r, my_status: status, my_dnc: nextDnc } : r))
    );

    try {
      const payload = {
        status,
        do_not_call: nextDnc,
        updated_at: new Date().toISOString(),
      };

      // 1) try UPDATE existing row
      const upd = await supabase
        .from("lead_user_meta")
        .update(payload)
        .eq("lead_id", leadId)
        .eq("user_id", userId)
        .select("lead_id");

      // If update fails OR updates 0 rows, do INSERT
      if (upd.error || !(upd.data && upd.data.length)) {
        const ins = await supabase.from("lead_user_meta").insert({
          lead_id: leadId,
          user_id: userId,
          ...payload,
        });

        if (ins.error) throw ins.error;
      }
    } catch (e) {
      console.error(e);

      // rollback UI if backend failed
      if (prevRow) {
        setRows((prev) => prev.map((r) => (r.id === leadId ? prevRow : r)));
      }

      alert(
        "Could not change status. (Likely a permissions/policy issue on updating lead_user_meta.)"
      );
    } finally {
      setSavingStatusId(null);
    }
  }

  return (
    <div className="mt-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <h2 className="text-xl font-semibold">My Leads</h2>

        {/* ✅ NEW: CSV export actions */}
        <div className="sm:ml-auto flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <div className="flex gap-2">
            <button
              className="btn text-xs"
              onClick={toggleSelectAllFiltered}
              disabled={!filtered.length}
              title="Select/Deselect all leads currently shown"
            >
              {allFilteredSelected ? "Unselect all (shown)" : "Select all (shown)"}
            </button>

            <button
              className="btn text-xs"
              onClick={downloadSelectedCsv}
              disabled={!selectedCount}
              title="Download selected leads as CSV"
            >
              Download CSV ({selectedCount})
            </button>

            <button
              className="btn text-xs"
              onClick={clearSelection}
              disabled={!selectedCount}
              title="Clear selection"
            >
              Clear
            </button>
          </div>

          <input
            className="w-full sm:w-96 p-2 rounded bg-white/5 border border-white/10 text-sm"
            placeholder="Search name / phone / email / state / type / beneficiary"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
        </div>
      </div>

      {/* SMALL + MEDIUM: cards */}
      <div className="lg:hidden space-y-3">
        {filtered.map((l) => {
          const key = l.my_status || (l.assigned_to ? null : "unassigned");
          const rowClass =
            key && STATUS_COLORS[key] ? STATUS_COLORS[key] : l.assigned_to ? "" : "opacity-80";

          const fullName = [l.first_name, l.last_name].filter(Boolean).join(" ") || "—";
          const isSaving = savingStatusId === l.id;
          const checked = selectedIds.has(l.id);

          return (
            <div
              key={l.id}
              className={`rounded-xl border border-white/10 bg-white/[0.02] p-4 ${rowClass}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex items-start gap-3">
                  {/* ✅ NEW: checkbox */}
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4 accent-emerald-500"
                    checked={checked}
                    onChange={() => toggleOne(l.id)}
                    aria-label={`Select ${fullName}`}
                  />

                  <div className="min-w-0">
                    <div className="font-semibold text-white/90 truncate">{fullName}</div>
                    <div className="text-xs text-white/60 mt-1">
                      {l.phone_e164 || "—"}
                      {l.email ? <span className="text-white/50"> • {l.email}</span> : null}
                    </div>
                  </div>
                </div>

                <div className="shrink-0 text-right">
                  <div className="text-[11px] text-white/50">My Status</div>
                  <div className="text-xs capitalize">{(l.my_status || "—").replaceAll("_", " ")}</div>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-lg border border-white/10 bg-black/10 px-3 py-2">
                  <div className="text-[11px] text-white/50">State</div>
                  <div className="text-white/85">{l.state || "—"}</div>
                </div>

                <div className="rounded-lg border border-white/10 bg-black/10 px-3 py-2">
                  <div className="text-[11px] text-white/50">Lead Type</div>
                  <div className="text-white/85">{l.lead_type || "—"}</div>
                </div>

                <div className="col-span-2 rounded-lg border border-white/10 bg-black/10 px-3 py-2">
                  <div className="text-[11px] text-white/50">Address</div>
                  <div className="text-white/85 break-words">{l.address || "—"}</div>
                </div>

                <div className="rounded-lg border border-white/10 bg-black/10 px-3 py-2">
                  <div className="text-[11px] text-white/50">DOB</div>
                  <div className="text-white/85">{fmtMDY(l.dob)}</div>
                </div>

                <div className="rounded-lg border border-white/10 bg-black/10 px-3 py-2">
                  <div className="text-[11px] text-white/50">Age</div>
                  <div className="text-white/85">{(l.age ?? "") !== "" ? l.age : "—"}</div>
                </div>

                <div className="rounded-lg border border-white/10 bg-black/10 px-3 py-2">
                  <div className="text-[11px] text-white/50">Military</div>
                  <div className="text-white/85">{l.military_branch || "—"}</div>
                </div>

                <div className="rounded-lg border border-white/10 bg-black/10 px-3 py-2">
                  <div className="text-[11px] text-white/50">Beneficiary</div>
                  <div className="text-white/85 break-words">{l.beneficiary_name || "—"}</div>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <button className="btn text-xs" disabled={isSaving} onClick={() => setMyStatus(l.id, "sold")}>
                  Sold
                </button>
                <button className="btn text-xs" disabled={isSaving} onClick={() => setMyStatus(l.id, "no_pickup")}>
                  No pickup
                </button>
                <button className="btn text-xs" disabled={isSaving} onClick={() => setMyStatus(l.id, "appointment")}>
                  Appointment
                </button>
                <button className="btn text-xs" disabled={isSaving} onClick={() => setMyStatus(l.id, "do_not_call")}>
                  Don’t call
                </button>
                <button className="btn text-xs" onClick={() => setActiveLead(l)}>
                  Notes
                </button>
              </div>
            </div>
          );
        })}

        {!filtered.length && (
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 text-white/60">
            No leads yet.
          </div>
        )}
      </div>

      {/* LARGE+: table */}
      <div className="hidden lg:block">
        <div className="card">
          <table className="w-full text-sm">
            <thead className="text-white/60">
              <tr>
                {/* ✅ NEW: header checkbox */}
                <th className="text-left p-3 w-10">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-emerald-500"
                    checked={allFilteredSelected}
                    onChange={toggleSelectAllFiltered}
                    aria-label="Select all shown"
                  />
                </th>

                <th className="text-left p-3">Name</th>
                <th className="text-left p-3">Phone</th>
                <th className="text-left p-3">Email</th>
                <th className="text-left p-3">State</th>
                <th className="text-left p-3">Address</th>
                <th className="text-left p-3">Military</th>
                <th className="text-left p-3">DOB</th>
                <th className="text-left p-3">Age</th>
                <th className="text-left p-3">Lead Type</th>
                <th className="text-left p-3">Beneficiary</th>
                <th className="text-left p-3">My Status</th>
                <th className="text-left p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {(() => {
                let lastDateKey = null;

                return filtered.map((l) => {
                  const sourceTs = l.assigned_at || l.created_at;
                  const d = sourceTs ? new Date(sourceTs) : null;
                  const dateKey = d ? d.toISOString().slice(0, 10) : "unknown";
                  const showDivider = dateKey !== lastDateKey;
                  lastDateKey = dateKey;

                  const key = l.my_status || (l.assigned_to ? null : "unassigned");
                  const rowClass =
                    key && STATUS_COLORS[key] ? STATUS_COLORS[key] : l.assigned_to ? "" : "opacity-80";

                  const prettyDay = dateKey && dateKey !== "unknown" ? fmtMDY(dateKey) : "Unknown date";
                  const isSaving = savingStatusId === l.id;
                  const checked = selectedIds.has(l.id);

                  return (
                    <Fragment key={l.id}>
                      {showDivider && (
                        <tr>
                          <td colSpan={13} className="pt-6 pb-2">
                            <div className="flex items-center gap-3">
                              <div className="flex-1 border-t border-emerald-500/60" />
                              <span className="text-xs uppercase tracking-wide text-emerald-400">
                                Assigned on {prettyDay}
                              </span>
                              <div className="flex-1 border-t border-emerald-500/60" />
                            </div>
                          </td>
                        </tr>
                      )}

                      <tr className={`border-t border-white/10 ${rowClass}`}>
                        {/* ✅ NEW: row checkbox */}
                        <td className="p-3">
                          <input
                            type="checkbox"
                            className="h-4 w-4 accent-emerald-500"
                            checked={checked}
                            onChange={() => toggleOne(l.id)}
                            aria-label={`Select ${[l.first_name, l.last_name].filter(Boolean).join(" ") || l.phone_e164}`}
                          />
                        </td>

                        <td className="p-3">
                          {[l.first_name, l.last_name].filter(Boolean).join(" ") || "—"}
                        </td>
                        <td className="p-3">{l.phone_e164 || "—"}</td>
                        <td className="p-3">{l.email || "—"}</td>
                        <td className="p-3">{l.state || "—"}</td>
                        <td className="p-3">{l.address || "—"}</td>
                        <td className="p-3">{l.military_branch || "—"}</td>
                        <td className="p-3">{fmtMDY(l.dob)}</td>
                        <td className="p-3">{(l.age ?? "") !== "" ? l.age : "—"}</td>
                        <td className="p-3">{l.lead_type || "—"}</td>
                        <td className="p-3">{l.beneficiary_name || "—"}</td>
                        <td className="p-3 capitalize">{(l.my_status || "—").replaceAll("_", " ")}</td>
                        <td className="p-3">
                          <div className="flex flex-wrap gap-2">
                            <button className="btn text-xs" disabled={isSaving} onClick={() => setMyStatus(l.id, "sold")}>
                              Sold
                            </button>
                            <button
                              className="btn text-xs"
                              disabled={isSaving}
                              onClick={() => setMyStatus(l.id, "no_pickup")}
                            >
                              No pickup
                            </button>
                            <button
                              className="btn text-xs"
                              disabled={isSaving}
                              onClick={() => setMyStatus(l.id, "appointment")}
                            >
                              Appointment
                            </button>
                            <button
                              className="btn text-xs"
                              disabled={isSaving}
                              onClick={() => setMyStatus(l.id, "do_not_call")}
                            >
                              Don’t call
                            </button>
                            <button className="btn text-xs" onClick={() => setActiveLead(l)}>
                              Notes
                            </button>
                          </div>
                        </td>
                      </tr>
                    </Fragment>
                  );
                });
              })()}

              {!filtered.length && (
                <tr>
                  <td className="p-4 text-white/50" colSpan={13}>
                    No leads yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {activeLead && (
        <NotesDrawer lead={activeLead} userId={userId} onClose={() => setActiveLead(null)} />
      )}
    </div>
  );
}

function NotesDrawer({ lead, userId, onClose }) {
  const [items, setItems] = useState([]);
  const [body, setBody] = useState("");

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("lead_notes")
        .select("id, body, author_id, created_at")
        .eq("lead_id", lead.id)
        .eq("author_id", userId)
        .order("created_at", { ascending: false });
      setItems(data || []);
    })();
  }, [lead.id, userId]);

  async function addNote() {
    if (!body.trim() || !userId) return;
    const ins = await supabase
      .from("lead_notes")
      .insert({ lead_id: lead.id, author_id: userId, body: body.trim() })
      .select("id, body, author_id, created_at")
      .single();
    if (!ins.error) {
      setItems((prev) => [ins.data, ...prev]);
      setBody("");
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex">
      <div className="ml-auto w-full max-w-md h-full bg-[#0b0b0c] border-l border-white/10 p-4 flex flex-col">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold">
            Notes —{" "}
            {[lead.first_name, lead.last_name].filter(Boolean).join(" ") || lead.phone_e164}
          </h3>
          <button className="btn" onClick={onClose}>
            Close
          </button>
        </div>
        <div className="flex items-center gap-2 mb-3">
          <input
            className="flex-1 p-2 rounded bg-white/5 border border-white/10"
            placeholder="Add a note…"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") addNote();
            }}
          />
          <button className="btn btn-primary" onClick={addNote}>
            Add
          </button>
        </div>
        <div className="overflow-y-auto space-y-2">
          {items.map((n) => (
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
