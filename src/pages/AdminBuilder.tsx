import { useState, useMemo, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { DimensionDef, ParameterSet, Question, RecommendationRow } from "../types";
import { serializeRecommendations } from "../engine/csv";
import {
  createRecommendation,
  deleteRecommendation,
  updateRecommendation,
} from "../lib/repo/recommendations";
import { RichTextEditor } from "../components/RichTextEditor";
import { ParametersEditor } from "./ParametersEditor";
import { QuestionsEditor } from "./QuestionsEditor";

interface Props {
  recommendations: RecommendationRow[];
  /** Admin-defined dimensions; drives every checkbox group and filter below. */
  dimensions: DimensionDef[];
  parameters: ParameterSet;
  questions: Question[];
  onRefresh: () => Promise<void>;
  onSignOut: () => void;
}

/** A dimension paired with its currently allowed values. */
interface Dimension {
  key: string;
  label: string;
  values: string[];
}

function toDimensions(dimensions: DimensionDef[], parameters: ParameterSet): Dimension[] {
  return dimensions.map((d) => ({
    key: d.key,
    label: d.label,
    values: (parameters[d.key] ?? []).map((p) => p.value),
  }));
}

function blankRow(dimensions: DimensionDef[]): RecommendationRow {
  return {
    name: "", description: "", pros: "", cons: "", body: "",
    dims: Object.fromEntries(dimensions.map((d) => [d.key, "any"])),
  };
}

/** "any"/"" → [], "small,medium" → ["small","medium"]. */
function parseDim(val: string): string[] {
  const t = (val ?? "").trim();
  if (!t || t === "any") return [];
  return t.split(",").map((s) => s.trim()).filter(Boolean);
}

/** [] → "any", ["small","medium"] → "small,medium". */
function toDim(selected: string[]): string {
  return selected.length === 0 ? "any" : selected.join(",");
}

/* ---- Reusable create/edit form ------------------------------------------- */

function RecForm({
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

/* ---- Filtering (mirrors AllRecommendations) ------------------------------ */

/** Selected filter value per dimension key; empty string means "all". */
type Filters = Record<string, string>;

function matchesFilter(rowVal: string, filterVal: string): boolean {
  if (!filterVal) return true;
  return parseDim(rowVal).includes(filterVal) || rowVal === "any";
}

function matchesSearch(row: RecommendationRow, query: string): boolean {
  if (!query) return true;
  const q = query.toLowerCase();
  return (
    row.name.toLowerCase().includes(q) ||
    row.description.toLowerCase().includes(q) ||
    row.pros.toLowerCase().includes(q) ||
    row.cons.toLowerCase().includes(q) ||
    row.body.toLowerCase().includes(q)
  );
}

/* ---- Page ---------------------------------------------------------------- */

export function AdminBuilder({
  recommendations, dimensions, parameters, questions, onRefresh, onSignOut,
}: Props) {
  const navigate = useNavigate();
  const [rows, setRows] = useState<RecommendationRow[]>(recommendations);
  const [editing, setEditing] = useState<RecommendationRow | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<Filters>({});
  const [tab, setTab] = useState<"recommendations" | "questions" | "parameters">(
    "recommendations",
  );
  const [busy, setBusy] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Every dimension is offered when tagging; only matching ones become filters,
  // since filtering by a descriptive tag would not tell an editor anything the
  // search box does not.
  const allDims = useMemo(() => toDimensions(dimensions, parameters), [dimensions, parameters]);
  const filterDims = useMemo(
    () => toDimensions(dimensions.filter((d) => d.matching), parameters),
    [dimensions, parameters],
  );

  // Re-seed when the loaded data changes identity.
  useEffect(() => {
    setRows(recommendations);
  }, [recommendations]);

  /**
   * Run a write against Appwrite, surfacing failures instead of silently
   * dropping them.
   */
  async function persist(action: () => Promise<void>): Promise<boolean> {
    setBusy(true);
    setSaveError(null);
    try {
      await action();
      return true;
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Could not save to Appwrite.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  const filtered = useMemo(() =>
    rows.filter((row) =>
      filterDims.every((dim) => matchesFilter(row.dims?.[dim.key] ?? "any", filters[dim.key] ?? "")) &&
      matchesSearch(row, search)
    ),
    [rows, filterDims, filters, search]
  );

  function setFilter(key: string, value: string) {
    setFilters((f) => ({ ...f, [key]: value }));
  }

  async function addRow(row: RecommendationRow) {
    let created = row;
    const ok = await persist(async () => {
      created = await createRecommendation(row);
    });
    if (!ok) return;
    setRows((rs) => [created, ...rs]);
    setAddOpen(false);
  }

  async function saveRow(original: RecommendationRow, updated: RecommendationRow) {
    const next = { ...updated, id: original.id };
    const ok = await persist(async () => {
      if (!next.id) throw new Error("This row has no database id — reload the page and retry.");
      await updateRecommendation(next.id, next);
    });
    if (!ok) return;
    setRows((rs) => rs.map((r) => (r === original ? next : r)));
    setEditing(null);
  }

  async function deleteRow(row: RecommendationRow) {
    if (!window.confirm(`Delete "${row.name}"?`)) return;
    const ok = await persist(async () => {
      if (!row.id) throw new Error("This row has no database id — reload the page and retry.");
      await deleteRecommendation(row.id);
    });
    if (!ok) return;
    setRows((rs) => rs.filter((r) => r !== row));
  }

  function download() {
    const csv = serializeRecommendations(rows, dimensions.map((d) => d.key));
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "recommendations.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="all-recs">
      <header className="results-header">
        <div>
          <h2 className="results-title">Knowledge Base Admin</h2>
          <p className="results-sub">
            Changes save immediately and are live for everyone — there is no deploy step.
          </p>
        </div>
        <button type="button" className="btn btn-ghost no-print" onClick={onSignOut}>
          Sign out
        </button>
      </header>

      <div className="admin-tabs no-print">
        <button
          type="button"
          className={`btn ${tab === "recommendations" ? "btn-secondary" : "btn-ghost"}`}
          onClick={() => setTab("recommendations")}
        >
          Recommendations
        </button>
        <button
          type="button"
          className={`btn ${tab === "questions" ? "btn-secondary" : "btn-ghost"}`}
          onClick={() => setTab("questions")}
        >
          Questions
        </button>
        <button
          type="button"
          className={`btn ${tab === "parameters" ? "btn-secondary" : "btn-ghost"}`}
          onClick={() => setTab("parameters")}
        >
          Parameters
        </button>
      </div>

      {saveError && <p className="app-status app-error">{saveError}</p>}

      {tab === "questions" ? (
        <QuestionsEditor
          questions={questions}
          dimensions={dimensions}
          parameters={parameters}
          onRefresh={onRefresh}
        />
      ) : tab === "parameters" ? (
        <ParametersEditor
          dimensions={dimensions}
          questions={questions}
          parameters={parameters}
          onRefresh={onRefresh}
        />
      ) : (
        <>
        <div className="admin-actions no-print">
          <button type="button" className="btn btn-secondary" onClick={() => setAddOpen((o) => !o)} disabled={busy}>
            {addOpen ? "Close" : "+ New recommendation"}
          </button>
          <span className="admin-count">{rows.length} total</span>
          <button type="button" className="btn btn-ghost" onClick={() => void onRefresh()} disabled={busy}>
            Reload
          </button>
          <button type="button" className="btn btn-primary" onClick={download}>
            Export CSV
          </button>
        </div>

        {addOpen && (
          <section className="admin-new">
            <h3 className="admin-section-title">New recommendation</h3>
            <RecForm
              initial={blankRow(dimensions)}
              dimensions={allDims}
              submitLabel="Add recommendation"
              onSubmit={addRow}
              onCancel={() => setAddOpen(false)}
            />
          </section>
        )}

        <div className="all-recs-toolbar">
          <input
            type="search"
            className="all-recs-search"
            placeholder="Search recommendations…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="all-recs-filters">
            {filterDims.map((dim) => (
              <select
                key={dim.key}
                className="all-recs-select"
                value={filters[dim.key] ?? ""}
                onChange={(e) => setFilter(dim.key, e.target.value)}
              >
                <option value="">All {dim.label}</option>
                {dim.values.map((v) => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
            ))}
          </div>
        </div>

        {filtered.length === 0 ? (
          <p className="all-recs-empty">No recommendations match your filters.</p>
        ) : (
          <ol className="results-list">
            {filtered.map((row, i) => (
              <li key={i} className="rec-card">
                {editing === row ? (
                  <RecForm
                    initial={row}
                    dimensions={allDims}
                    submitLabel="Save changes"
                    onSubmit={(updated) => saveRow(row, updated)}
                    onCancel={() => setEditing(null)}
                  />
                ) : (
                  <>
                    <div className="admin-card-head">
                      <h3 className="rec-name">{row.name}</h3>
                      <div className="admin-card-actions no-print">
                        {row.id && (
                          <Link className="btn btn-ghost" to={`/recommendations/${row.id}`}>
                            View
                          </Link>
                        )}
                        <button type="button" className="btn btn-ghost" onClick={() => setEditing(row)}>Edit</button>
                        <button type="button" className="btn btn-ghost admin-delete" onClick={() => deleteRow(row)}>Delete</button>
                      </div>
                    </div>
                    <div className="admin-tags">
                      {allDims.map((dim) => (
                        <span
                          key={dim.key}
                          className={`admin-tag${(row.dims?.[dim.key] ?? "any") === "any" ? " admin-tag-any" : ""}`}
                        >
                          <span className="admin-tag-key">{dim.label}</span>
                          {row.dims?.[dim.key] || "any"}
                        </span>
                      ))}
                    </div>
                    {row.description && <p className="rec-desc">{row.description}</p>}
                    {row.pros && (
                      <div className="rec-pros"><strong>Pros</strong><p>{row.pros}</p></div>
                    )}
                    {row.cons && (
                      <div className="rec-cons"><strong>Cons</strong><p>{row.cons}</p></div>
                    )}
                  </>
                )}
              </li>
            ))}
          </ol>
        )}

        </>
      )}

      <div className="results-actions no-print">
        <button type="button" className="btn btn-ghost" onClick={() => navigate(-1)}>
          Back
        </button>
      </div>
    </div>
  );
}
