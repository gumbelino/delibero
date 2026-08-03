import { useState } from "react";
import type { DimensionDef, ParameterSet, Parameter, Question } from "../types";
import {
  createParameter,
  deleteParameter,
  deleteParametersForDimension,
  updateParameter,
} from "../lib/repo/parameters";
import {
  createDimension,
  deleteDimension,
  updateDimension,
  toKey,
} from "../lib/repo/dimensions";

interface Props {
  dimensions: DimensionDef[];
  /** Used to show which question (if any) currently feeds each dimension. */
  questions: Question[];
  parameters: ParameterSet;
  onRefresh: () => Promise<void>;
}

const BLANK_DIM = { label: "", description: "", matching: false };

/**
 * Editor for dimensions and their values.
 *
 * Two immutability rules, both because recommendations reference these by slug:
 * a dimension's `key` and a value's `value` are fixed once saved. Labels are
 * freely editable, which covers the common case of fixing wording.
 */
export function ParametersEditor({ dimensions, questions, parameters, onRefresh }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addingValueTo, setAddingValueTo] = useState<string | null>(null);
  const [valueDraft, setValueDraft] = useState({ value: "", label: "", description: "" });
  const [addingDim, setAddingDim] = useState(false);
  const [dimDraft, setDimDraft] = useState(BLANK_DIM);

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

  /* ---- Dimensions -------------------------------------------------------- */

  async function addDimension() {
    const label = dimDraft.label.trim();
    const key = toKey(label);
    if (!label || !key) return;

    if (dimensions.some((d) => d.key === key)) {
      setError(`A dimension with the key "${key}" already exists.`);
      return;
    }

    await run(async () => {
      await createDimension({
        key,
        label,
        description: dimDraft.description.trim() || undefined,
        matching: dimDraft.matching,
        order: dimensions.length,
        builtin: false,
      });
      setDimDraft(BLANK_DIM);
      setAddingDim(false);
    });
  }

  async function renameDimension(dim: DimensionDef, label: string) {
    if (!label || label === dim.label) return;
    await run(async () => {
      await updateDimension(dim.id!, { ...dim, label });
    });
  }

  async function setMatching(dim: DimensionDef, matching: boolean) {
    await run(async () => {
      await updateDimension(dim.id!, { ...dim, matching });
    });
  }

  async function removeDimension(dim: DimensionDef) {
    const count = parameters[dim.key]?.length ?? 0;
    if (
      !window.confirm(
        `Delete the "${dim.label}" dimension and its ${count} value(s)?\n\n` +
          "Recommendations tagged with it keep the tag in the database but it " +
          "will no longer be shown or used for matching.",
      )
    )
      return;

    await run(async () => {
      await deleteParametersForDimension(dim.key);
      await deleteDimension(dim.id!);
    });
  }

  /* ---- Values ------------------------------------------------------------ */

  async function addValue(dimension: string) {
    const value = valueDraft.value.trim();
    if (!value) return;
    await run(async () => {
      await createParameter({
        dimension,
        value,
        label: valueDraft.label.trim() || value,
        description: valueDraft.description.trim() || undefined,
        order: parameters[dimension]?.length ?? 0,
      });
      setValueDraft({ value: "", label: "", description: "" });
      setAddingValueTo(null);
    });
  }

  async function renameValue(param: Parameter, label: string) {
    if (label === param.label) return;
    await run(async () => {
      await updateParameter(param.id!, { ...param, label });
    });
  }

  async function removeValue(param: Parameter) {
    if (
      !window.confirm(
        `Delete "${param.label}"?\n\nRecommendations still tagged "${param.value}" will keep ` +
          `that tag but it will no longer appear as a choice.`,
      )
    )
      return;
    await run(async () => {
      await deleteParameter(param.id!);
    });
  }

  /* ---- Render ------------------------------------------------------------ */

  return (
    <div className="admin-params">
      <p className="results-sub">
        Dimensions are the ways a recommendation can be classified. Matching dimensions
        filter what users are shown; the rest are descriptive tags.
              </p>

      {error && <p className="app-status app-error">{error}</p>}

      {addingDim ? (
          <section className="admin-param-group">
            <h3 className="admin-section-title">New dimension</h3>
            <div className="admin-dim-form">
              <label className="rec-form-field">
                <span className="rec-form-label">Name</span>
                <input
                  className="rec-form-input"
                  placeholder="e.g. Duration"
                  value={dimDraft.label}
                  onChange={(e) => setDimDraft((d) => ({ ...d, label: e.target.value }))}
                />
                {dimDraft.label.trim() && (
                  <span className="admin-param-hint">
                    Key: <code>{toKey(dimDraft.label)}</code> — permanent once saved.
                  </span>
                )}
              </label>

              <label className="rec-form-field">
                <span className="rec-form-label">Description</span>
                <input
                  className="rec-form-input"
                  placeholder="What this dimension captures (optional)"
                  value={dimDraft.description}
                  onChange={(e) => setDimDraft((d) => ({ ...d, description: e.target.value }))}
                />
              </label>

              <label className="rec-check">
                <input
                  type="checkbox"
                  checked={dimDraft.matching}
                  onChange={(e) => setDimDraft((d) => ({ ...d, matching: e.target.checked }))}
                />
                <span>Use for matching (filters which recommendations users see)</span>
              </label>


              <div className="rec-form-actions">
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={busy || !dimDraft.label.trim()}
                  onClick={() => void addDimension()}
                >
                  Create dimension
                </button>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => {
                    setAddingDim(false);
                    setDimDraft(BLANK_DIM);
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </section>
      ) : (
        <div className="admin-actions">
          <button
            type="button"
            className="btn btn-secondary"
            disabled={busy}
            onClick={() => setAddingDim(true)}
          >
            + New dimension
          </button>
        </div>
      )}

      {dimensions.map((dim) => {
        const items = parameters[dim.key] ?? [];
        const question = questions.find((q) => q.enabled && q.dimension === dim.key);
        const unwired = dim.matching && !question;
        return (
          <section key={dim.id ?? dim.key} className="admin-param-group">
            <div className="admin-card-head">
              <h3 className="admin-section-title">
                {dim.label}{" "}
                <span className={`admin-tag${dim.matching ? "" : " admin-tag-any"}`}>
                  {dim.matching ? "matching" : "tag only"}
                </span>
                {dim.builtin && <span className="admin-tag admin-tag-any">built-in</span>}
              </h3>
              {!dim.builtin && (
                <button
                  type="button"
                  className="btn btn-ghost admin-delete"
                  disabled={busy}
                  onClick={() => void removeDimension(dim)}
                >
                  Delete dimension
                </button>
              )}
            </div>

            {dim.description && <p className="admin-param-hint">{dim.description}</p>}

            <p className="admin-param-hint">
              {question ? (
                <>Answered by: <strong>{question.title}</strong></>
              ) : (
                <>
                  No question feeds this dimension.
                  {unwired && " It is flagged for matching but currently ignored — attach a question in the Questions tab."}
                </>
              )}
            </p>


            {!dim.builtin && (
              <div className="admin-dim-controls">
                <label className="rec-check">
                  <input
                    type="checkbox"
                    checked={dim.matching}
                    disabled={busy}
                    onChange={(e) => void setMatching(dim, e.target.checked)}
                  />
                  <span>Use for matching</span>
                </label>
                <input
                  className="rec-form-input"
                  defaultValue={dim.label}
                  disabled={busy}
                  onBlur={(e) => void renameDimension(dim, e.target.value.trim())}
                />
              </div>
            )}

            <ul className="admin-param-list">
              {items.map((param) => (
                <li key={param.id ?? param.value} className="admin-param-row">
                  <code className="admin-param-value">{param.value}</code>
                  <input
                    className="rec-form-input"
                    defaultValue={param.label}
                    disabled={busy}
                    onBlur={(e) => void renameValue(param, e.target.value.trim())}
                  />
                  <button
                    type="button"
                    className="btn btn-ghost admin-delete"
                    disabled={busy}
                    onClick={() => void removeValue(param)}
                  >
                    Delete
                  </button>
                </li>
              ))}
              {items.length === 0 && <li className="admin-param-empty">No values yet.</li>}
            </ul>

            {addingValueTo === dim.key ? (
                <div className="admin-param-add">
                  <input
                    className="rec-form-input"
                    placeholder="value (e.g. very-large)"
                    value={valueDraft.value}
                    onChange={(e) => setValueDraft((d) => ({ ...d, value: e.target.value }))}
                  />
                  <input
                    className="rec-form-input"
                    placeholder="Label shown to users"
                    value={valueDraft.label}
                    onChange={(e) => setValueDraft((d) => ({ ...d, label: e.target.value }))}
                  />
                  <input
                    className="rec-form-input"
                    placeholder="Description (optional)"
                    value={valueDraft.description}
                    onChange={(e) =>
                      setValueDraft((d) => ({ ...d, description: e.target.value }))
                    }
                  />
                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={busy || !valueDraft.value.trim()}
                    onClick={() => void addValue(dim.key)}
                  >
                    Add
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => setAddingValueTo(null)}
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  className="btn btn-ghost"
                  disabled={busy}
                  onClick={() => setAddingValueTo(dim.key)}
                >
                  + Add value
                </button>
              )}
          </section>
        );
      })}
    </div>
  );
}
