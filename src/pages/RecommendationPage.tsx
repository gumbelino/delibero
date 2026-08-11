import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import type { DimensionDef, ParameterSet, Question, RecommendationRow } from "../types";
import { renderMarkdown } from "../engine/markdown";
import { taggableDimensions } from "../engine/questions";
import { updateRecommendation } from "../lib/repo/recommendations";
import { useAuth } from "../state/authStore";
import { RecForm, toDimensions } from "../components/RecForm";

interface Props {
  recommendations: RecommendationRow[];
  dimensions: DimensionDef[];
  parameters: ParameterSet;
  /** Only used to work out which dimensions are still live for tagging. */
  questions: Question[];
  onRefresh: () => Promise<void>;
}

/** A single recommendation at /recommendations/:id, including its long-form body. */
export function RecommendationPage({
  recommendations, dimensions, parameters, questions, onRefresh,
}: Props) {
  const { id } = useParams();
  const navigate = useNavigate();

  // Editing in place saves a trip to /admin for the common "spotted a typo
  // while reading" case. The button is UX only — Appwrite rejects the write
  // for anyone outside the editors team regardless of what is rendered.
  const canEdit = useAuth((s) => s.user?.canEdit ?? false);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const editableDims = useMemo(
    () => toDimensions(taggableDimensions(dimensions, questions), parameters),
    [dimensions, questions, parameters],
  );

  const rec = recommendations.find((r) => r.id === id);

  async function save(updated: RecommendationRow) {
    setBusy(true);
    setSaveError(null);
    try {
      if (!rec?.id) throw new Error("This recommendation has no database id — reload and retry.");
      await updateRecommendation(rec.id, { ...updated, id: rec.id });
      await onRefresh();
      setEditing(false);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Could not save to Appwrite.");
    } finally {
      setBusy(false);
    }
  }

  if (!rec) {
    return (
      <div className="rec-page">
        <h2 className="results-title">Recommendation not found</h2>
        <p className="results-sub">
          It may have been deleted, or the link may be out of date.
        </p>
        <div className="results-actions">
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => navigate("/recommendations")}
          >
            Browse all recommendations
          </button>
        </div>
      </div>
    );
  }

  const tags = dimensions
    .map((dim) => ({ dim, value: rec.dims?.[dim.key] ?? "any" }))
    .filter(({ value }) => value && value !== "any");

  const body = renderMarkdown(rec.body);

  if (editing) {
    return (
      <article className="rec-page">
        <header className="rec-page-head">
          <h1 className="rec-page-title">Editing “{rec.name}”</h1>
          <p className="rec-page-desc">Changes go live for everyone as soon as you save.</p>
        </header>

        {saveError && <p className="app-status app-error">{saveError}</p>}

        <fieldset className="rec-form-fieldset" disabled={busy}>
          <RecForm
            initial={rec}
            submitLabel={busy ? "Saving…" : "Save changes"}
            dimensions={editableDims}
            onSubmit={(row) => void save(row)}
            onCancel={() => {
              setSaveError(null);
              setEditing(false);
            }}
          />
        </fieldset>
      </article>
    );
  }

  return (
    <article className="rec-page">
      <header className="rec-page-head">
        <div>
          <h1 className="rec-page-title">{rec.name}</h1>
          {rec.description && <p className="rec-page-desc">{rec.description}</p>}
        </div>
        {canEdit && (
          <button
            type="button"
            className="btn btn-secondary rec-page-edit no-print"
            onClick={() => setEditing(true)}
          >
            Edit
          </button>
        )}
      </header>

      {tags.length > 0 && (
        <div className="admin-tags no-print">
          {tags.map(({ dim, value }) => (
            <span key={dim.key} className="admin-tag">
              <span className="admin-tag-key">{dim.label}</span>
              {value}
            </span>
          ))}
        </div>
      )}

      {(rec.pros || rec.cons) && (
        <div className="rec-page-proscons">
          {rec.pros && (
            <div className="rec-pros">
              <strong>Pros</strong>
              <p>{rec.pros}</p>
            </div>
          )}
          {rec.cons && (
            <div className="rec-cons">
              <strong>Cons</strong>
              <p>{rec.cons}</p>
            </div>
          )}
        </div>
      )}

      {body && (
        // Safe: renderMarkdown escapes all input and emits a fixed tag set.
        <div className="rec-body" dangerouslySetInnerHTML={{ __html: body }} />
      )}

      <div className="results-actions no-print">
        <button type="button" className="btn btn-ghost" onClick={() => navigate(-1)}>
          Back
        </button>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => navigate("/recommendations")}
        >
          All recommendations
        </button>
      </div>
    </article>
  );
}
