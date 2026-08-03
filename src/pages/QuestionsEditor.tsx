import { useEffect, useState } from "react";
import type { DimensionDef, ParameterSet, Question, QuestionType } from "../types";
import {
  OPTION_TYPES,
  TYPE_LABELS,
  createQuestion,
  deleteQuestion,
  saveQuestionOrder,
  updateQuestion,
} from "../lib/repo/questions";
import { toKey } from "../lib/repo/dimensions";

interface Props {
  questions: Question[];
  dimensions: DimensionDef[];
  parameters: ParameterSet;
  onRefresh: () => Promise<void>;
}

const TYPES: QuestionType[] = ["single", "multi", "rank", "numberPair", "info"];

const BLANK = { id: "", title: "", help: "", type: "single" as QuestionType, dimension: "" };

/**
 * Editor for the questionnaire: order, wording, type, and which dimension
 * supplies each question's answer options.
 *
 * Options are deliberately not editable here — they are the attached
 * dimension's values, edited in the Parameters tab. Duplicating them would let
 * a question drift from the vocabulary used to tag recommendations, which is
 * exactly what makes matching stop working.
 */
export function QuestionsEditor({ questions, dimensions, parameters, onRefresh }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState(BLANK);
  const [order, setOrder] = useState<Question[]>(questions);

  // Reordering is local until saved, so re-sync whenever fresh data arrives.
  useEffect(() => {
    setOrder([...questions].sort((a, b) => a.order - b.order));
  }, [questions]);

  const reordered = order.some((q, i) => q.id !== questions[i]?.id);

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await action();
      await onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save.");
    } finally {
      setBusy(false);
    }
  }

  function move(index: number, delta: number) {
    const target = index + delta;
    if (target < 0 || target >= order.length) return;
    const next = [...order];
    [next[index], next[target]] = [next[target], next[index]];
    setOrder(next);
  }

  async function addQuestion() {
    const title = draft.title.trim();
    const id = toKey(draft.id.trim() || title);
    if (!title || !id) return;

    if (questions.some((q) => q.id === id)) {
      setError(`A question with the id "${id}" already exists.`);
      return;
    }
    if (OPTION_TYPES.includes(draft.type) && !draft.dimension) {
      setError("Choose which dimension supplies this question's answer options.");
      return;
    }

    await run(async () => {
      await createQuestion({
        id,
        title,
        help: draft.help.trim() || undefined,
        type: draft.type,
        dimension: draft.dimension || undefined,
        order: questions.length,
        enabled: true,
      });
      setDraft(BLANK);
      setAdding(false);
    });
  }

  async function patch(q: Question, changes: Partial<Question>) {
    await run(async () => {
      await updateQuestion(q.rowId!, { ...q, ...changes });
    });
  }

  async function remove(q: Question) {
    if (
      !window.confirm(
        `Delete "${q.title}"?\n\nPast responses keep their answer for this question, ` +
          "but it will no longer be asked. To hide it temporarily, untick Enabled instead.",
      )
    )
      return;
    await run(async () => {
      await deleteQuestion(q.rowId!);
    });
  }

  async function persistOrder() {
    await run(async () => {
      await saveQuestionOrder(order);
    });
  }

  return (
    <div className="admin-params">
      <p className="results-sub">
        The questionnaire, in the order users see it. A question's answer options come
        from the dimension it is attached to — edit those in the Parameters tab.
      </p>

      {error && <p className="app-status app-error">{error}</p>}

      <div className="admin-actions">
        <button
          type="button"
          className="btn btn-secondary"
          disabled={busy}
          onClick={() => setAdding((o) => !o)}
        >
          {adding ? "Close" : "+ New question"}
        </button>
        <span className="admin-count">{questions.length} questions</span>
        {reordered && (
          <button
            type="button"
            className="btn btn-primary"
            disabled={busy}
            onClick={() => void persistOrder()}
          >
            Save new order
          </button>
        )}
      </div>

      {adding && (
        <section className="admin-param-group">
          <h3 className="admin-section-title">New question</h3>
          <div className="admin-dim-form">
            <label className="rec-form-field">
              <span className="rec-form-label">Question text</span>
              <input
                className="rec-form-input"
                placeholder="e.g. How long will the process run?"
                value={draft.title}
                onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
              />
              {draft.title.trim() && (
                <span className="admin-param-hint">
                  Id: <code>{toKey(draft.id.trim() || draft.title)}</code> — permanent once
                  saved, because answers are stored under it.
                </span>
              )}
            </label>

            <label className="rec-form-field">
              <span className="rec-form-label">Help text</span>
              <input
                className="rec-form-input"
                placeholder="Guidance shown under the question (optional)"
                value={draft.help}
                onChange={(e) => setDraft((d) => ({ ...d, help: e.target.value }))}
              />
            </label>

            <label className="rec-form-field">
              <span className="rec-form-label">Type</span>
              <select
                className="all-recs-select"
                value={draft.type}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, type: e.target.value as QuestionType }))
                }
              >
                {TYPES.map((t) => (
                  <option key={t} value={t}>
                    {TYPE_LABELS[t]}
                  </option>
                ))}
              </select>
            </label>

            {OPTION_TYPES.includes(draft.type) && (
              <label className="rec-form-field">
                <span className="rec-form-label">Answer options come from</span>
                <select
                  className="all-recs-select"
                  value={draft.dimension}
                  onChange={(e) => setDraft((d) => ({ ...d, dimension: e.target.value }))}
                >
                  <option value="">— choose a dimension —</option>
                  {dimensions.map((d) => (
                    <option key={d.key} value={d.key}>
                      {d.label} ({parameters[d.key]?.length ?? 0} options)
                    </option>
                  ))}
                </select>
              </label>
            )}

            <div className="rec-form-actions">
              <button
                type="button"
                className="btn btn-primary"
                disabled={busy || !draft.title.trim()}
                onClick={() => void addQuestion()}
              >
                Create question
              </button>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => {
                  setAdding(false);
                  setDraft(BLANK);
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </section>
      )}

      <ol className="admin-question-list">
        {order.map((q, i) => {
          const dim = dimensions.find((d) => d.key === q.dimension);
          const optionCount = q.dimension ? parameters[q.dimension]?.length ?? 0 : 0;
          const needsDimension = OPTION_TYPES.includes(q.type) && !dim;

          return (
            <li key={q.id} className={`admin-param-group${q.enabled ? "" : " admin-q-disabled"}`}>
              <div className="admin-card-head">
                <h3 className="admin-section-title">
                  <span className="rec-rank">{i + 1}</span>
                  {q.title}
                  <span className="admin-tag admin-tag-any">{TYPE_LABELS[q.type]}</span>
                  {!q.enabled && <span className="admin-tag">hidden</span>}
                </h3>
                <div className="admin-card-actions">
                  <button
                    type="button"
                    className="btn btn-ghost"
                    disabled={busy || i === 0}
                    onClick={() => move(i, -1)}
                    aria-label="Move up"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    disabled={busy || i === order.length - 1}
                    onClick={() => move(i, 1)}
                    aria-label="Move down"
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost admin-delete"
                    disabled={busy}
                    onClick={() => void remove(q)}
                  >
                    Delete
                  </button>
                </div>
              </div>

              <p className="admin-param-hint">
                Id <code>{q.id}</code>
                {dim && (
                  <>
                    {" · options from "}
                    <strong>{dim.label}</strong> ({optionCount})
                    {dim.matching && " · filters recommendations"}
                  </>
                )}
              </p>

              {needsDimension && (
                <p className="app-status app-error">
                  This question has no dimension attached, so it has no answer options.
                  Pick one below.
                </p>
              )}

              <div className="admin-dim-controls">
                  <label className="rec-check">
                    <input
                      type="checkbox"
                      checked={q.enabled}
                      disabled={busy}
                      onChange={(e) => void patch(q, { enabled: e.target.checked })}
                    />
                    <span>Enabled</span>
                  </label>

                  <select
                    className="all-recs-select"
                    value={q.type}
                    disabled={busy}
                    onChange={(e) => void patch(q, { type: e.target.value as QuestionType })}
                  >
                    {TYPES.map((t) => (
                      <option key={t} value={t}>
                        {TYPE_LABELS[t]}
                      </option>
                    ))}
                  </select>

                  {OPTION_TYPES.includes(q.type) && (
                    <select
                      className="all-recs-select"
                      value={q.dimension ?? ""}
                      disabled={busy}
                      onChange={(e) => void patch(q, { dimension: e.target.value || undefined })}
                    >
                      <option value="">— no dimension —</option>
                      {dimensions.map((d) => (
                        <option key={d.key} value={d.key}>
                          {d.label} ({parameters[d.key]?.length ?? 0})
                        </option>
                      ))}
                  </select>
                )}
              </div>

              <div className="admin-q-text">
                <label className="rec-form-field">
                  <span className="rec-form-label">Question text</span>
                  <input
                    className="rec-form-input"
                    defaultValue={q.title}
                    disabled={busy}
                    onBlur={(e) => {
                      const title = e.target.value.trim();
                      if (title && title !== q.title) void patch(q, { title });
                    }}
                  />
                </label>
                <label className="rec-form-field">
                  <span className="rec-form-label">Help text</span>
                  <textarea
                    className="rec-form-textarea"
                    defaultValue={q.help ?? ""}
                    rows={2}
                    disabled={busy}
                    onBlur={(e) => {
                      const help = e.target.value.trim();
                      if (help !== (q.help ?? "")) void patch(q, { help: help || undefined });
                    }}
                  />
                </label>
              </div>

              {q.options && q.options.length > 0 && (
                <p className="admin-param-hint">
                  Options: {q.options.map((o) => o.label).join(" · ")}
                </p>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
