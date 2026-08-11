// The create/edit form for a recommendation, shared by the admin builder and
// the recommendation page's inline editor. It owns the draft state and the
// list ⇄ comma-separated-string conversion for dimension values; saving is the
// caller's job, since the two callers refresh different things afterwards.

import { useState } from "react";
import type { DimensionDef, ParameterSet, RecommendationRow } from "../types";
import { RichTextEditor } from "./RichTextEditor";

/** A dimension paired with its currently allowed values. */
export interface Dimension {
  key: string;
  label: string;
  values: string[];
}

export function toDimensions(dimensions: DimensionDef[], parameters: ParameterSet): Dimension[] {
  return dimensions.map((d) => ({
    key: d.key,
    label: d.label,
    values: (parameters[d.key] ?? []).map((p) => p.value),
  }));
}

export function blankRow(dimensions: DimensionDef[]): RecommendationRow {
  return {
    name: "", description: "", pros: "", cons: "", body: "",
    dims: Object.fromEntries(dimensions.map((d) => [d.key, "any"])),
  };
}

/** "any"/"" → [], "small,medium" → ["small","medium"]. */
export function parseDim(val: string): string[] {
  const t = (val ?? "").trim();
  if (!t || t === "any") return [];
  return t.split(",").map((s) => s.trim()).filter(Boolean);
}

/** [] → "any", ["small","medium"] → "small,medium". */
function toDim(selected: string[]): string {
  return selected.length === 0 ? "any" : selected.join(",");
}

/* ---- Reusable create/edit form ------------------------------------------- */

export function RecForm({
  initial, submitLabel, dimensions, onSubmit, onCancel,
}: {
  initial: RecommendationRow;
  submitLabel: string;
  /** All six dimensions, in display order. */
  dimensions: Dimension[];
  onSubmit: (row: RecommendationRow) => void;
  onCancel?: () => void;
}) {
  const [draft, setDraft] = useState<RecommendationRow>(initial);

  function set<K extends keyof RecommendationRow>(key: K, value: RecommendationRow[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  function toggleDim(key: string, value: string) {
    const current = parseDim(draft.dims?.[key] ?? "any");
    const next = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    setDraft((d) => ({ ...d, dims: { ...d.dims, [key]: toDim(next) } }));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.name.trim()) return;
    onSubmit({ ...draft, name: draft.name.trim() });
  }

  return (
    <form className="rec-form" onSubmit={submit}>
      <div className="rec-form-field">
        <label className="rec-form-label">Name</label>
        <input
          className="rec-form-input"
          value={draft.name}
          onChange={(e) => set("name", e.target.value)}
          placeholder="Recommendation name"
          required
        />
      </div>

      <div className="rec-form-field">
        <label className="rec-form-label">Description</label>
        <textarea
          className="rec-form-textarea"
          value={draft.description}
          onChange={(e) => set("description", e.target.value)}
          placeholder="What this recommendation is."
          rows={2}
        />
      </div>

      <div className="rec-form-dims">
        {dimensions.map((dim) => {
          const selected = parseDim(draft.dims?.[dim.key] ?? "any");
          return (
            <fieldset key={dim.key} className="rec-form-dim">
              <legend className="rec-form-label">
                {dim.label} {selected.length === 0 && <span className="rec-form-any">any</span>}
              </legend>
              <div className="rec-form-checks">
                {dim.values.length === 0 && (
                  <span className="rec-form-any">No values defined — add some under Parameters.</span>
                )}
                {dim.values.map((v) => (
                  <label key={v} className="rec-check">
                    <input
                      type="checkbox"
                      checked={selected.includes(v)}
                      onChange={() => toggleDim(dim.key, v)}
                    />
                    <span>{v}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          );
        })}
      </div>

      <div className="rec-form-row">
        <div className="rec-form-field">
          <label className="rec-form-label">Pros</label>
          <textarea
            className="rec-form-textarea"
            value={draft.pros}
            onChange={(e) => set("pros", e.target.value)}
            rows={2}
          />
        </div>
        <div className="rec-form-field">
          <label className="rec-form-label">Cons</label>
          <textarea
            className="rec-form-textarea"
            value={draft.cons}
            onChange={(e) => set("cons", e.target.value)}
            rows={2}
          />
        </div>
      </div>

      <div className="rec-form-field">
        <label className="rec-form-label">
          Body <span className="rec-form-any">optional · shown only on the recommendation page</span>
        </label>
        <RichTextEditor value={draft.body} onChange={(body) => set("body", body)} />
      </div>

      <div className="rec-form-actions">
        <button type="submit" className="btn btn-primary" disabled={!draft.name.trim()}>
          {submitLabel}
        </button>
        {onCancel && (
          <button type="button" className="btn btn-ghost" onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
