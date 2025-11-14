// File: src/pages/AgentQuestions.jsx
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient.js";

const INPUT_TYPES = ["text", "textarea", "email", "phone", "number", "select"];

function EmptyState() {
  return (
    <div className="rounded-xl border border-dashed border-white/15 bg-white/[0.02] p-4 text-sm text-white/60">
      You don&apos;t have any questions yet. Use &quot;Add question&quot; to
      create your first one. These will power the application step of your
      public recruiting site.
    </div>
  );
}

export default function AgentQuestions() {
  const [agentSite, setAgentSite] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      const {
        data: { user },
        error: userErr,
      } = await supabase.auth.getUser();

      if (cancelled) return;

      if (userErr || !user) {
        console.error(userErr);
        setError("You must be logged in to manage questions.");
        setLoading(false);
        return;
      }

      // find agent site
      const { data: site, error: siteErr } = await supabase
        .from("mm_agent_sites")
        .select("id")
        .eq("agent_user_id", user.id)
        .maybeSingle();

      if (cancelled) return;

      if (siteErr || !site) {
        console.error(siteErr);
        setError("You need to configure your Settings first.");
        setLoading(false);
        return;
      }

      setAgentSite(site);

      const { data: qs, error: qErr } = await supabase
        .from("mm_agent_questions")
        .select("*")
        .eq("agent_site_id", site.id)
        .order("sort_order", { ascending: true });

      if (cancelled) return;

      if (qErr) {
        console.error(qErr);
        setError("Failed to load questions.");
        setLoading(false);
        return;
      }

      setQuestions(qs || []);
      setLoading(false);
    }

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  function addQuestion() {
    const maxSort =
      questions.reduce(
        (max, q) => (q.sort_order > max ? q.sort_order : max),
        0
      ) || 0;

    setQuestions([
      ...questions,
      {
        id: `new-${Date.now()}`,
        agent_site_id: agentSite?.id || null,
        question_text: "",
        input_type: "text",
        input_options: [],
        placeholder: "",
        help_text: "",
        is_required: false,
        is_active: true,
        sort_order: maxSort + 1,
      },
    ]);
  }

  function updateQuestion(id, patch) {
    setQuestions((prev) =>
      prev.map((q) => (q.id === id ? { ...q, ...patch } : q))
    );
  }

  function removeQuestion(id) {
    setQuestions((prev) => prev.filter((q) => q.id !== id));
  }

  async function saveAll() {
    if (!agentSite) return;
    setSaving(true);
    setError(null);

    try {
      // simple strategy: delete all + reinsert
      const { error: delErr } = await supabase
        .from("mm_agent_questions")
        .delete()
        .eq("agent_site_id", agentSite.id);

      if (delErr) throw delErr;

      const clean = questions
        .filter((q) => (q.question_text || "").trim())
        .map((q, idx) => ({
          agent_site_id: agentSite.id,
          question_text: q.question_text.trim(),
          input_type: q.input_type || "text",
          input_options: Array.isArray(q.input_options)
            ? q.input_options
            : (q.input_options || "")
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean),
          placeholder: q.placeholder || "",
          help_text: q.help_text || "",
          is_required: !!q.is_required,
          is_active: q.is_active !== false,
          sort_order: idx + 1,
        }));

      if (clean.length) {
        const { error: insErr } = await supabase
          .from("mm_agent_questions")
          .insert(clean);
        if (insErr) throw insErr;
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error(err);
      setError("Failed to save questions.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="h-5 w-40 bg-white/10 rounded animate-pulse" />
        <div className="h-32 w-full bg-white/5 rounded animate-pulse" />
      </div>
    );
  }

  if (error) {
    return <div className="text-sm text-red-400">{error}</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Application questions</h2>
          <p className="text-xs text-white/60">
            These will show after someone enters their contact info on your
            public page.
          </p>
        </div>
        <button
          type="button"
          onClick={addQuestion}
          className="btn btn-secondary text-xs"
        >
          + Add question
        </button>
      </div>

      {!questions.length && <EmptyState />}

      <div className="space-y-3">
        {questions.map((q) => (
          <div
            key={q.id}
            className="rounded-xl border border-white/10 bg-white/[0.03] p-3 space-y-2"
          >
            <div className="flex gap-2">
              <input
                className="flex-1 rounded bg-white/5 border border-white/15 px-3 py-2 text-sm"
                placeholder="Question text"
                value={q.question_text || ""}
                onChange={(e) =>
                  updateQuestion(q.id, { question_text: e.target.value })
                }
              />
              <select
                className="w-32 rounded bg-white/5 border border-white/15 px-2 py-2 text-xs"
                value={q.input_type || "text"}
                onChange={(e) =>
                  updateQuestion(q.id, { input_type: e.target.value })
                }
              >
                {INPUT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            {(q.input_type === "select" || q.input_type === "radio") && (
              <div className="grid gap-1">
                <label className="text-[11px] text-white/50">
                  Options (comma separated)
                </label>
                <input
                  className="w-full rounded bg-white/5 border border-white/15 px-3 py-1.5 text-xs"
                  placeholder="Example: Part-time, Full-time"
                  value={
                    Array.isArray(q.input_options)
                      ? q.input_options.join(", ")
                      : q.input_options || ""
                  }
                  onChange={(e) =>
                    updateQuestion(q.id, { input_options: e.target.value })
                  }
                />
              </div>
            )}

            <div className="grid gap-1">
              <label className="text-[11px] text-white/50">
                Placeholder (optional)
              </label>
              <input
                className="w-full rounded bg-white/5 border border-white/15 px-3 py-1.5 text-xs"
                value={q.placeholder || ""}
                onChange={(e) =>
                  updateQuestion(q.id, { placeholder: e.target.value })
                }
              />
            </div>

            <div className="grid gap-1">
              <label className="text-[11px] text-white/50">
                Help text (optional)
              </label>
              <input
                className="w-full rounded bg-white/5 border border-white/15 px-3 py-1.5 text-xs"
                value={q.help_text || ""}
                onChange={(e) =>
                  updateQuestion(q.id, { help_text: e.target.value })
                }
              />
            </div>

            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-3">
                <label className="inline-flex items-center gap-1">
                  <input
                    type="checkbox"
                    className="rounded border-white/30 bg-white/5"
                    checked={!!q.is_required}
                    onChange={(e) =>
                      updateQuestion(q.id, { is_required: e.target.checked })
                    }
                  />
                  <span>Required</span>
                </label>
                <label className="inline-flex items-center gap-1">
                  <input
                    type="checkbox"
                    className="rounded border-white/30 bg-white/5"
                    checked={q.is_active !== false}
                    onChange={(e) =>
                      updateQuestion(q.id, { is_active: e.target.checked })
                    }
                  />
                  <span>Active</span>
                </label>
              </div>
              <button
                type="button"
                onClick={() => removeQuestion(q.id)}
                className="text-red-300 hover:text-red-200"
              >
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="pt-2 flex items-center gap-3">
        <button
          type="button"
          onClick={saveAll}
          className="btn btn-primary text-xs"
          disabled={saving}
        >
          {saving ? "Saving..." : "Save questions"}
        </button>
        {saved && (
          <span className="text-xs text-emerald-400">
            Questions saved to Supabase.
          </span>
        )}
        {error && (
          <span className="text-xs text-red-400">{error}</span>
        )}
      </div>
    </div>
  );
}
