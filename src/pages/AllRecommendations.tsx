import { useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { DimensionDef, RecommendationRow } from "../types";

interface Props {
  recommendations: RecommendationRow[];
  /** Drives the filter controls; admins can add or remove these at runtime. */
  dimensions: DimensionDef[];
}

/** Selected filter value per dimension key; empty string means "all". */
type Filters = Record<string, string>;

/**
 * Distinct values a dimension actually takes across the library. Rows may hold
 * a comma-separated list, so split before collecting.
 */
function uniqueValues(rows: RecommendationRow[], key: string): string[] {
  const vals = new Set<string>();
  for (const row of rows) {
    const raw = row.dims?.[key];
    if (!raw || raw === "any") continue;
    for (const v of raw.split(",").map((x) => x.trim()).filter(Boolean)) vals.add(v);
  }
  return Array.from(vals).sort();
}

function matchesFilter(rowVal: string, filterVal: string): boolean {
  if (!filterVal) return true;
  if (!rowVal || rowVal === "any") return true;
  return rowVal.split(",").map((v) => v.trim()).includes(filterVal);
}

function matchesSearch(row: RecommendationRow, query: string): boolean {
  if (!query) return true;
  const q = query.toLowerCase();
  return (
    row.name.toLowerCase().includes(q) ||
    row.description.toLowerCase().includes(q) ||
    row.pros.toLowerCase().includes(q) ||
    row.cons.toLowerCase().includes(q)
  );
}

export function AllRecommendations({ recommendations, dimensions }: Props) {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<Filters>({});

  // Offer a filter only where the library actually varies — a dimension every
  // row marks "any" produces an empty dropdown that does nothing.
  const filterDims = useMemo(
    () =>
      dimensions
        .map((d) => ({ dim: d, values: uniqueValues(recommendations, d.key) }))
        .filter(({ values }) => values.length > 0),
    [dimensions, recommendations],
  );

  const filtered = useMemo(() =>
    recommendations.filter((row) =>
      filterDims.every(({ dim }) =>
        matchesFilter(row.dims?.[dim.key] ?? "any", filters[dim.key] ?? "")
      ) &&
      matchesSearch(row, search)
    ),
    [recommendations, filterDims, filters, search]
  );

  function setFilter(key: string, value: string) {
    setFilters((f) => ({ ...f, [key]: value }));
  }

  return (
    <div className="all-recs">
      <header className="results-header">
        <div>
          <h2 className="results-title">All recommendations</h2>
          <p className="results-sub">Browse and filter the full library of recommendations.</p>
        </div>
      </header>

      <div className="all-recs-toolbar">
        <input
          type="search"
          className="all-recs-search"
          placeholder="Search recommendations…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="all-recs-filters">
          {filterDims.map(({ dim, values }) => (
            <select
              key={dim.key}
              className="all-recs-select"
              value={filters[dim.key] ?? ""}
              onChange={(e) => setFilter(dim.key, e.target.value)}
            >
              <option value="">All {dim.label}</option>
              {values.map((v) => (
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
            <li key={row.id ?? i} className="rec-card">
              <h3 className="rec-name">
                {row.id ? (
                  <Link className="rec-link" to={`/recommendations/${row.id}`}>
                    {row.name}
                  </Link>
                ) : (
                  row.name
                )}
              </h3>
              <p className="rec-desc">{row.description}</p>
              {row.pros && (
                <div className="rec-pros">
                  <strong>Pros</strong>
                  <p>{row.pros}</p>
                </div>
              )}
              {row.cons && (
                <div className="rec-cons">
                  <strong>Cons</strong>
                  <p>{row.cons}</p>
                </div>
              )}
            </li>
          ))}
        </ol>
      )}

      <div className="results-actions no-print">
        <button type="button" className="btn btn-ghost" onClick={() => navigate(-1)}>
          Back
        </button>
      </div>
    </div>
  );
}
