// File: src/pages/Videos.jsx
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";

const STATUS_COLORS = {
  pending: "bg-yellow-900/30 text-yellow-100",
  in_progress: "bg-blue-900/30 text-blue-100",
  needs_info: "bg-orange-900/30 text-orange-100",
  completed: "bg-green-900/30 text-green-100",
};

function classNames(...parts) {
  return parts.filter(Boolean).join(" ");
}

// Helper to decide if an email is a Video Hub admin
function isEmailVideoHubAdmin(emailRaw) {
  if (!emailRaw) return false;
  const email = emailRaw.toLowerCase();

  // Read comma-separated admin list from env:
  // e.g. VITE_VIDEO_HUB_ADMIN_EMAILS="jacobprieto@gmail.com,other@email.com"
  const envListRaw = import.meta.env.VITE_VIDEO_HUB_ADMIN_EMAILS || "";
  const list = envListRaw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  if (list.length > 0) {
    return list.includes(email);
  }

  // Fallback: just you
  return email === "jacobprieto@gmail.com";
}

export default function Videos() {
  const [userId, setUserId] = useState(null);
  const [userEmail, setUserEmail] = useState(null);
  const [role, setRole] = useState(null); // still storing role but not using it for admin

  const [activeTab, setActiveTab] = useState("requests"); // "requests" | "received"

  // My requests + videos sent to me
  const [myRequests, setMyRequests] = useState([]);
  const [myDeliveries, setMyDeliveries] = useState([]);

  // Admin view
  const [queueRequests, setQueueRequests] = useState([]);
  const [agents, setAgents] = useState([]);

  const [loading, setLoading] = useState(true);
  const [savingRequest, setSavingRequest] = useState(false);
  const [savingQueue, setSavingQueue] = useState(false);
  const [sendingVideo, setSendingVideo] = useState(false);

  // New request form (simplified: just Drive link + notes)
  const [reqDriveLink, setReqDriveLink] = useState("");
  const [reqNotes, setReqNotes] = useState("");

  // Send video form (admin)
  const [sendTitle, setSendTitle] = useState("");
  const [sendLink, setSendLink] = useState("");
  const [sendDescription, setSendDescription] = useState("");
  const [sendCategory, setSendCategory] = useState("broadcast");
  const [sendTargetMode, setSendTargetMode] = useState("all"); // "all" | "single"
  const [sendTargetUserId, setSendTargetUserId] = useState("");

  const isVideoHubAdmin = useMemo(
    () => isEmailVideoHubAdmin(userEmail),
    [userEmail]
  );

  useEffect(() => {
    let mounted = true;

    const loadAll = async () => {
      setLoading(true);
      try {
        const { data: s, error: sessErr } = await supabase.auth.getSession();
        if (sessErr) {
          console.warn("[Videos] getSession error:", sessErr);
        }
        const user = s?.session?.user || null;
        if (!mounted || !user) {
          if (!user) {
            setUserId(null);
            setUserEmail(null);
            setRole(null);
          }
          setLoading(false);
          return;
        }

        setUserId(user.id);
        setUserEmail(user.email || null);

        // Load role from user_profiles (not required for admin, but still useful)
        const { data: profile, error: profileErr } = await supabase
          .from("user_profiles")
          .select("role")
          .eq("id", user.id)
          .maybeSingle();

        if (profileErr) {
          console.warn("[Videos] user_profiles error:", profileErr);
        }
        if (!profile) {
          console.warn("[Videos] No user_profiles row found for user", user.id);
        }

        const r = profile?.role || null;
        if (mounted) {
          setRole(r);
        }

        // Load my own data
        await Promise.all([
          loadMyRequests(user.id, setMyRequests),
          loadMyDeliveries(user.id, setMyDeliveries),
        ]);

        // If this email is an admin, load queue + agents
        if (isEmailVideoHubAdmin(user.email || "")) {
          await Promise.all([
            loadQueueRequests(setQueueRequests),
            loadAgents(setAgents),
          ]);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadAll();

    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (!session?.user) {
        setUserId(null);
        setUserEmail(null);
        setRole(null);
        setMyRequests([]);
        setMyDeliveries([]);
        setQueueRequests([]);
        setAgents([]);
      } else {
        loadAll();
      }
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const handleCreateRequest = async (e) => {
    e.preventDefault();
    if (!userId) return;

    if (!reqDriveLink.trim()) {
      alert("Please paste your Google Drive link.");
      return;
    }
    if (!reqDriveLink.includes("drive.google.com")) {
      const ok = window.confirm(
        "This link doesn't look like a Google Drive link. Submit anyway?"
      );
      if (!ok) return;
    }

    // Auto-generate a simple title so the DB not-null constraint is happy
    const autoTitle = `Video request - ${new Date().toLocaleString()}`;

    setSavingRequest(true);
    try {
      const { error } = await supabase.from("video_edit_requests").insert({
        owner_user_id: userId,
        title: autoTitle,
        drive_link_raw: reqDriveLink.trim(),
        notes: reqNotes.trim(),
        status: "pending",
      });

      if (error) {
        console.error("[Videos] create request error:", error);
        alert("Something went wrong creating your request.");
        return;
      }

      // Clear form & reload
      setReqDriveLink("");
      setReqNotes("");

      await loadMyRequests(userId, setMyRequests);
    } finally {
      setSavingRequest(false);
    }
  };

  const handleUpdateRequestStatus = async (id, status) => {
    if (!isVideoHubAdmin) return;
    setSavingQueue(true);
    try {
      const { error } = await supabase
        .from("video_edit_requests")
        .update({ status })
        .eq("id", id);

      if (error) {
        console.error("[Videos] update status error:", error);
        alert("Failed to update status.");
        return;
      }
      await loadQueueRequests(setQueueRequests);
    } finally {
      setSavingQueue(false);
    }
  };

  const handleUpdateFinalLink = async (id, value) => {
    if (!isVideoHubAdmin) return;
    const link = (value || "").trim();
    if (!link) {
      alert("Final video link cannot be empty.");
      return;
    }
    setSavingQueue(true);
    try {
      const { error } = await supabase
        .from("video_edit_requests")
        .update({ drive_link_final: link, status: "completed" })
        .eq("id", id);

      if (error) {
        console.error("[Videos] update final link error:", error);
        alert("Failed to save final video link.");
        return;
      }
      await Promise.all([
        loadQueueRequests(setQueueRequests),
        userId ? loadMyRequests(userId, setMyRequests) : Promise.resolve(),
      ]);
    } finally {
      setSavingQueue(false);
    }
  };

  const handleSendVideo = async (e) => {
    e.preventDefault();
    if (!isVideoHubAdmin) return;

    if (!sendTitle.trim()) {
      alert("Please add a title for this video.");
      return;
    }
    if (!sendLink.trim()) {
      alert("Please paste the Google Drive link for the final video.");
      return;
    }
    if (!sendLink.includes("drive.google.com")) {
      const ok = window.confirm(
        "This link doesn't look like a Google Drive link. Submit anyway?"
      );
      if (!ok) return;
    }

    const isBroadcast = sendTargetMode === "all";

    if (!isBroadcast && !sendTargetUserId) {
      alert("Please choose the agent to send this to.");
      return;
    }

    setSendingVideo(true);
    try {
      const payload = {
        title: sendTitle.trim(),
        drive_link_final: sendLink.trim(),
        description: sendDescription.trim() || null,
        category: sendCategory,
        is_broadcast: isBroadcast,
        recipient_user_id: isBroadcast ? null : sendTargetUserId,
      };

      const { error } = await supabase
        .from("video_deliveries")
        .insert(payload);

      if (error) {
        console.error("[Videos] send video error:", error);
        alert("Failed to send video.");
        return;
      }

      setSendTitle("");
      setSendLink("");
      setSendDescription("");
      setSendCategory("broadcast");
      setSendTargetMode("all");
      setSendTargetUserId("");

      // Reload "sent to me" for my own account if relevant
      if (userId) {
        await loadMyDeliveries(userId, setMyDeliveries);
      }
    } finally {
      setSendingVideo(false);
    }
  };

  const myRequestsSorted = useMemo(
    () =>
      [...myRequests].sort((a, b) =>
        (a.created_at || "").localeCompare(b.created_at || "") * -1
      ),
    [myRequests]
  );

  const myDeliveriesSorted = useMemo(
    () =>
      [...myDeliveries].sort((a, b) =>
        (a.created_at || "").localeCompare(b.created_at || "") * -1
      ),
    [myDeliveries]
  );

  const queueRequestsSorted = useMemo(
    () =>
      [...queueRequests].sort((a, b) =>
        (a.created_at || "").localeCompare(b.created_at || "") * -1
      ),
    [queueRequests]
  );

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Video Hub</h1>
        <p className="text-sm text-white/70 max-w-2xl">
          Submit Google Drive links for edits and download finished videos here.
          Max video length is{" "}
          <span className="font-semibold text-white">10 minutes</span>, and
          edits can take{" "}
          <span className="font-semibold text-white">up to 7 days</span>{" "}
          depending on volume from other users.
        </p>
      </header>

      {loading ? (
        <p className="text-sm text-white/60">Loading your videos…</p>
      ) : (
        <>
          {/* Tabs */}
          <div className="inline-flex rounded-full bg-white/5 p-1 text-xs">
            <button
              type="button"
              onClick={() => setActiveTab("requests")}
              className={classNames(
                "px-4 py-1.5 rounded-full transition",
                activeTab === "requests"
                  ? "bg-white text-slate-950"
                  : "text-white/70 hover:text-white"
              )}
            >
              My edit requests
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("received")}
              className={classNames(
                "px-4 py-1.5 rounded-full transition",
                activeTab === "received"
                  ? "bg-white text-slate-950"
                  : "text-white/70 hover:text-white"
              )}
            >
              Videos sent to me
            </button>
          </div>

          {activeTab === "requests" ? (
            <section className="space-y-6">
              {/* Create request (simplified form) */}
              <form
                onSubmit={handleCreateRequest}
                className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <h2 className="text-sm font-semibold">
                    New edit request (Google Drive link)
                  </h2>
                  <p className="text-[11px] text-white/60">
                    Max length: 10 minutes · Turnaround: up to 7 days
                  </p>
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-white/70">
                    Google Drive link to raw video{" "}
                    <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="url"
                    className="w-full rounded-lg bg-slate-950/60 border border-white/15 px-3 py-2 text-sm outline-none focus:border-white/40"
                    placeholder="https://drive.google.com/..."
                    value={reqDriveLink}
                    onChange={(e) => setReqDriveLink(e.target.value)}
                  />
                  <p className="text-[11px] text-white/50">
                    Upload your clip to Google Drive, set it to{" "}
                    <span className="font-semibold">Anyone with the link</span>{" "}
                    and paste the link here. Please keep clips under 10 minutes.
                  </p>
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-white/70">Notes</label>
                  <textarea
                    rows={3}
                    className="w-full rounded-lg bg-slate-950/60 border border-white/15 px-3 py-2 text-sm outline-none focus:border-white/40 resize-none"
                    placeholder="What you want done (cuts, captions, blur names, etc.)"
                    value={reqNotes}
                    onChange={(e) => setReqNotes(e.target.value)}
                  />
                </div>

                <div className="flex items-center justify-between gap-3 pt-1">
                  <p className="text-[11px] text-white/50">
                    You&apos;ll see updates here as your request moves to In
                    Progress and Completed.
                  </p>
                  <button
                    type="submit"
                    disabled={savingRequest}
                    className="inline-flex items-center justify-center rounded-full px-4 py-1.5 text-xs font-medium bg-white text-slate-950 hover:bg-slate-100 disabled:opacity-60 disabled:cursor-not-allowed transition"
                  >
                    {savingRequest ? "Submitting…" : "Submit request"}
                  </button>
                </div>
              </form>

              {/* My requests list */}
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-semibold">My requests</h2>
                  <span className="text-[11px] text-white/60">
                    {myRequestsSorted.length} total
                  </span>
                </div>
                {myRequestsSorted.length === 0 ? (
                  <p className="text-sm text-white/60">
                    You haven&apos;t submitted any edit requests yet.
                  </p>
                ) : (
                  <div className="space-y-3 text-sm">
                    {myRequestsSorted.map((r) => (
                      <div
                        key={r.id}
                        className="rounded-xl border border-white/10 bg-slate-950/60 p-3"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                          <div className="space-y-0.5">
                            <p className="font-medium">
                              {r.title || "Video request"}
                            </p>
                            {r.created_at && (
                              <p className="text-[11px] text-white/50">
                                Created{" "}
                                {new Date(r.created_at).toLocaleString()}
                              </p>
                            )}
                          </div>
                          <span
                            className={classNames(
                              "inline-flex items-center rounded-full px-3 py-0.5 text-[11px] capitalize",
                              STATUS_COLORS[r.status] ||
                                "bg-slate-800 text-white/80"
                            )}
                          >
                            {r.status?.replace("_", " ") || "pending"}
                          </span>
                        </div>

                        <div className="flex flex-wrap gap-2 items-center text-[11px]">
                          <a
                            href={r.drive_link_raw}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center rounded-full px-3 py-1 bg-white/5 border border-white/10 hover:bg-white/10 transition"
                          >
                            Raw video (Drive)
                          </a>
                          {r.drive_link_final && (
                            <a
                              href={r.drive_link_final}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center rounded-full px-3 py-1 bg-white text-slate-950 hover:bg-slate-100 transition"
                            >
                              Download final video
                            </a>
                          )}
                        </div>

                        {r.notes && (
                          <p className="mt-2 text-[11px] text-white/60">
                            <span className="font-semibold">Notes: </span>
                            {r.notes}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>
          ) : (
            <section className="space-y-4">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-semibold">Videos sent to me</h2>
                  <span className="text-[11px] text-white/60">
                    {myDeliveriesSorted.length} total
                  </span>
                </div>

                {myDeliveriesSorted.length === 0 ? (
                  <p className="text-sm text-white/60">
                    When videos are sent to you by the team, they&apos;ll show
                    up here.
                  </p>
                ) : (
                  <div className="space-y-3 text-sm">
                    {myDeliveriesSorted.map((d) => (
                      <div
                        key={d.id}
                        className="rounded-xl border border-white/10 bg-slate-950/60 p-3"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                          <p className="font-medium">{d.title}</p>
                          <span className="text-[11px] text-white/50">
                            {d.category || "video"}
                            {d.is_broadcast ? " · sent to team" : ""}
                          </span>
                        </div>
                        {d.description && (
                          <p className="text-[11px] text-white/60 mb-2">
                            {d.description}
                          </p>
                        )}
                        <a
                          href={d.drive_link_final}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center rounded-full px-3 py-1 bg-white text-slate-950 hover:bg-slate-100 text-[11px] transition"
                        >
                          Open in Google Drive
                        </a>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Admin view (only for configured emails) */}
          {isVideoHubAdmin && (
            <section className="space-y-4 pt-4 border-t border-white/10 mt-6">
              <h2 className="text-sm font-semibold">
                Admin tools (edit queue &amp; send videos)
              </h2>

              {/* Queue */}
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold">Edit queue</p>
                  <span className="text-[11px] text-white/60">
                    {queueRequestsSorted.length} requests
                  </span>
                </div>
                {queueRequestsSorted.length === 0 ? (
                  <p className="text-sm text-white/60">
                    No edit requests in the queue right now.
                  </p>
                ) : (
                  <div className="space-y-3 text-xs">
                    {queueRequestsSorted.map((r) => (
                      <div
                        key={r.id}
                        className="rounded-xl border border-white/10 bg-slate-950/60 p-3 space-y-2"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="space-y-0.5">
                            <p className="font-medium text-sm">
                              {r.title || "Video request"}
                            </p>
                            {r.created_at && (
                              <p className="text-[11px] text-white/50">
                                Created{" "}
                                {new Date(r.created_at).toLocaleString()}
                              </p>
                            )}
                            <p className="text-[11px] text-white/45">
                              Owner: {r.owner_user_id}
                            </p>
                          </div>
                          <select
                            value={r.status || "pending"}
                            disabled={savingQueue}
                            onChange={(e) =>
                              handleUpdateRequestStatus(r.id, e.target.value)
                            }
                            className="rounded-full bg-slate-950/80 border border-white/20 px-2.5 py-1 text-[11px] outline-none"
                          >
                            <option value="pending">Pending</option>
                            <option value="in_progress">In progress</option>
                            <option value="needs_info">Needs info</option>
                            <option value="completed">Completed</option>
                          </select>
                        </div>

                        <div className="flex flex-wrap gap-2 items-center">
                          <a
                            href={r.drive_link_raw}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center rounded-full px-3 py-1 bg-white/5 border border-white/10 hover:bg-white/10 text-[11px] transition"
                          >
                            Raw video (Drive)
                          </a>
                          {r.drive_link_final && (
                            <a
                              href={r.drive_link_final}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center rounded-full px-3 py-1 bg-white text-slate-950 hover:bg-slate-100 text-[11px] transition"
                            >
                              Final video
                            </a>
                          )}
                        </div>

                        <div className="space-y-1">
                          <label className="text-[11px] text-white/60">
                            Final video link (Google Drive)
                          </label>
                          <div className="flex gap-2">
                            <input
                              type="url"
                              defaultValue={r.drive_link_final || ""}
                              placeholder="https://drive.google.com/..."
                              onBlur={(e) =>
                                e.target.value &&
                                e.target.value !== r.drive_link_final &&
                                handleUpdateFinalLink(r.id, e.target.value)
                              }
                              className="flex-1 rounded-lg bg-slate-950/60 border border-white/15 px-2.5 py-1.5 text-[11px] outline-none focus:border-white/40"
                            />
                          </div>
                        </div>

                        {r.notes && (
                          <p className="text-[11px] text-white/60">
                            <span className="font-semibold">Notes: </span>
                            {r.notes}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Send video */}
              <form
                onSubmit={handleSendVideo}
                className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold">Send video to agents</p>
                  <p className="text-[11px] text-white/60">
                    Use this for finished edits or team-wide promos.
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <label className="text-xs text-white/70">
                      Title <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      className="w-full rounded-lg bg-slate-950/60 border border-white/15 px-3 py-2 text-sm outline-none focus:border-white/40"
                      placeholder="e.g. New recruiting reel"
                      value={sendTitle}
                      onChange={(e) => setSendTitle(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-white/70">
                      Google Drive link <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="url"
                      className="w-full rounded-lg bg-slate-950/60 border border-white/15 px-3 py-2 text-sm outline-none focus:border-white/40"
                      placeholder="https://drive.google.com/..."
                      value={sendLink}
                      onChange={(e) => setSendLink(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-white/70">Description</label>
                  <textarea
                    rows={3}
                    className="w-full rounded-lg bg-slate-950/60 border border-white/15 px-3 py-2 text-sm outline-none focus:border-white/40 resize-none"
                    placeholder="How they should use this video, suggested caption, etc."
                    value={sendDescription}
                    onChange={(e) => setSendDescription(e.target.value)}
                  />
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="space-y-1">
                    <label className="text-xs text-white/70">Category</label>
                    <select
                      className="w-full rounded-lg bg-slate-950/60 border border-white/15 px-3 py-2 text-sm outline-none focus:border-white/40"
                      value={sendCategory}
                      onChange={(e) => setSendCategory(e.target.value)}
                    >
                      <option value="broadcast">Team broadcast</option>
                      <option value="custom">Custom edit</option>
                      <option value="training">Training</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-xs text-white/70">
                      Send to who?
                    </label>
                    <div className="flex flex-col sm:flex-row gap-2 text-xs">
                      <label className="inline-flex items-center gap-2">
                        <input
                          type="radio"
                          name="send-target"
                          value="all"
                          checked={sendTargetMode === "all"}
                          onChange={() => setSendTargetMode("all")}
                        />
                        <span>All agents</span>
                      </label>
                      <label className="inline-flex items-center gap-2">
                        <input
                          type="radio"
                          name="send-target"
                          value="single"
                          checked={sendTargetMode === "single"}
                          onChange={() => setSendTargetMode("single")}
                        />
                        <span>Single agent</span>
                      </label>
                      {sendTargetMode === "single" && (
                        <select
                          className="flex-1 rounded-lg bg-slate-950/60 border border-white/15 px-3 py-1.5 text-xs outline-none focus:border-white/40"
                          value={sendTargetUserId}
                          onChange={(e) =>
                            setSendTargetUserId(e.target.value || "")
                          }
                        >
                          <option value="">Select agent…</option>
                          {agents.map((a) => (
                            <option key={a.id} value={a.id}>
                              {a.full_name || a.email || a.id}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end">
                  <button
                    type="submit"
                    disabled={sendingVideo}
                    className="inline-flex items-center justify-center rounded-full px-4 py-1.5 text-xs font-medium bg-white text-slate-950 hover:bg-slate-100 disabled:opacity-60 disabled:cursor-not-allowed transition"
                  >
                    {sendingVideo ? "Sending…" : "Send video"}
                  </button>
                </div>
              </form>
            </section>
          )}
        </>
      )}
    </div>
  );
}

/* ------------------------ helpers ------------------------ */

async function loadMyRequests(userId, setState) {
  const { data, error } = await supabase
    .from("video_edit_requests")
    .select("*")
    .eq("owner_user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[Videos] loadMyRequests error:", error);
    setState([]);
    return;
  }
  setState(data || []);
}

async function loadMyDeliveries(userId, setState) {
  const { data, error } = await supabase
    .from("video_deliveries")
    .select("*")
    .or(`recipient_user_id.eq.${userId},is_broadcast.eq.true`)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[Videos] loadMyDeliveries error:", error);
    setState([]);
    return;
  }
  setState(data || []);
}

async function loadQueueRequests(setState) {
  const { data, error } = await supabase
    .from("video_edit_requests")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[Videos] loadQueueRequests error:", error);
    setState([]);
    return;
  }
  setState(data || []);
}

async function loadAgents(setState) {
  const { data, error } = await supabase
    .from("user_profiles")
    .select("id, email, full_name, role")
    .in("role", ["agent", "manager"]);

  if (error) {
    console.error("[Videos] loadAgents error:", error);
    setState([]);
    return;
  }
  setState(data || []);
}
