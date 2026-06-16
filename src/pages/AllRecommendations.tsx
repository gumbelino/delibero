import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import type { RecommendationRow } from "../types";

interface Props {
  recommendations: RecommendationRow[];
}

type Filters = {
  size: string;
  level: string;
  mode: string;
  criteria: string;
};

function uniqueValues(rows: RecommendationRow[], key: keyof RecommendationRow): string[] {
  const vals = new Set<string>();
  for (const row of rows) {
    const v = row[key];
    if (v && v !== "any") vals.add(v);
  }
  return Array.from(vals).sort();
}

function matchesFilter(rowVal: string, filterVal: string): boolean {
  if (!filterVal) return true;
  return rowVal === filterVal || rowVal === "any";
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

const FILTER_LABELS: Record<keyof Filters, string> = {
  size: "Size",
  level: "Level",
  mode: "Mode",
  criteria: "Criteria",
};

export function AllRecommendations({ recommendations }: Props) {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<Filters>({ size: "", level: "", mode: "", criteria: "" });

  const options = useMemo(() => ({
    size: uniqueValues(recommendations, "size"),
    level: uniqueValues(recommendations, "level"),
    mode: uniqueValues(recommendations, "mode"),
    criteria: uniqueValues(recommendations, "criteria"),
  }), [recommendations]);

  const filtered = useMemo(() =>
    recommendations.filter((row) =>
      matchesFilter(row.size, filters.size) &&
      matchesFilter(row.level, filters.level) &&
      matchesFilter(row.mode, filters.mode) &&
      matchesFilter(row.criteria, filters.criteria) &&
      matchesSearch(row, search)
    ),
    [recommendations, filters, search]
  );

  function setFilter(key: keyof Filters, value: string) {
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
          {(Object.keys(filters) as (keyof Filters)[]).map((key) => (
            <select
              key={key}
              className="all-recs-select"
              value={filters[key]}
              onChange={(e) => setFilter(key, e.target.value)}
            >
              <option value="">All {FILTER_LABELS[key]}</option>
              {options[key].map((v) => (
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
              <h3 className="rec-name">{row.name}</h3>
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
