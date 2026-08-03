import { useNavigate, useParams } from "react-router-dom";
import type { DimensionDef, RecommendationRow } from "../types";
import { renderMarkdown } from "../engine/markdown";

interface Props {
  recommendations: RecommendationRow[];
  dimensions: DimensionDef[];
}

/** A single recommendation at /recommendations/:id, including its long-form body. */
export function RecommendationPage({ recommendations, dimensions }: Props) {
  const { id } = useParams();
  const navigate = useNavigate();

  const rec = recommendations.find((r) => r.id === id);

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

  return (
    <article className="rec-page">
      <header className="rec-page-head">
        <h1 className="rec-page-title">{rec.name}</h1>
        {rec.description && <p className="rec-page-desc">{rec.description}</p>}
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
