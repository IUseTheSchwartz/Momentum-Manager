// File: src/components/QualifyForm.jsx
import { useState } from "react";

/**
 * QualifyForm
 *
 * Props:
 * - questions: array of { id, question_text, input_type, input_options, placeholder, help_text, is_required }
 * - onSubmit(values): called with map { [questionId]: value }
 * - submitting: boolean (optional) to control button state
 */
export default function QualifyForm({ questions = [], onSubmit, submitting }) {
  const [values, setValues] = useState({});

  function setValue(id, value) {
    setValues((prev) => ({ ...prev, [id]: value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!onSubmit) return;
    onSubmit(values);
  }

  function getOptions(q) {
    if (!q) return [];
    if (Array.isArray(q.input_options)) return q.input_options;
    if (typeof q.input_options === "string") {
      return q.input_options
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    }
    return [];
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-3">
      {questions.length === 0 && (
        <p className="text-sm text-white/70">
          Your hiring manager hasn&apos;t added any questions yet, so we&apos;ll
          skip straight to reviewing your info.
        </p>
      )}

      {questions.map((q) => {
        const type = q.input_type || "text";
        const opts = getOptions(q);

        return (
          <div key={q.id} className="grid gap-1">
            <label className="text-xs text-white/70">
              {q.question_text}
              {q.is_required && <span className="text-red-400">*</span>}
            </label>

            {type === "textarea" ? (
              <textarea
                className="w-full rounded-lg bg-black/30 border border-white/10 px-3 py-2 text-sm outline-none"
                placeholder={q.placeholder || ""}
                value={values[q.id] || ""}
                onChange={(e) => setValue(q.id, e.target.value)}
                required={q.is_required}
              />
            ) : type === "select" && opts.length ? (
              <select
                className="w-full rounded-lg bg-black/30 border border-white/10 px-3 py-2 text-sm outline-none"
                value={values[q.id] || ""}
                onChange={(e) => setValue(q.id, e.target.value)}
                required={q.is_required}
              >
                <option value="">Select an option</option>
                {opts.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type={
                  type === "phone" ? "tel" : type === "email" ? "email" : "text"
                }
                className="w-full rounded-lg bg-black/30 border border-white/10 px-3 py-2 text-sm outline-none"
                placeholder={q.placeholder || ""}
                value={values[q.id] || ""}
                onChange={(e) => setValue(q.id, e.target.value)}
                required={q.is_required}
              />
            )}

            {q.help_text && (
              <p className="text-[11px] text-white/50">{q.help_text}</p>
            )}
          </div>
        );
      })}

      <div className="mt-2 flex justify-end gap-2">
        <button
          type="submit"
          className="px-4 py-2 rounded-lg text-xs font-semibold bg-white text-black hover:bg-white/90"
          disabled={submitting}
        >
          {submitting ? "Submitting..." : "Finish"}
        </button>
      </div>
    </form>
  );
}
