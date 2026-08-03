// CSV export for the admin builder.
//
// The app reads exclusively from Appwrite — there is no CSV import path at
// runtime any more. The files under public/data are seed input for
// scripts/seed-appwrite.mjs, which parses them in Node, not here.

import Papa from "papaparse";
import type { DimensionId, RecommendationRow } from "../types";

/** Columns that are recommendation prose rather than a dimension. */
const TEXT_COLUMNS = ["name", "description", "pros", "cons", "body"] as const;

/**
 * Serialize recommendation rows to CSV, emitting one column per dimension so an
 * export stays complete after an admin adds a dimension. Papa handles
 * quoting/escaping (commas, quotes, newlines) so the output is always valid.
 */
export function serializeRecommendations(
  rows: RecommendationRow[],
  dimensionKeys?: DimensionId[],
): string {
  // Prefer the caller's dimension order; otherwise derive it from the rows so
  // the export is still complete when no dimension list is available.
  const keys =
    dimensionKeys ?? [...new Set(rows.flatMap((r) => Object.keys(r.dims ?? {})))];

  const fields = [...keys, ...TEXT_COLUMNS];
  const data = rows.map((r) => {
    const flat: Record<string, string> = {};
    for (const key of keys) flat[key] = r.dims?.[key] ?? "any";
    for (const col of TEXT_COLUMNS) flat[col] = r[col] ?? "";
    return flat;
  });

  return Papa.unparse({ fields, data }, { columns: fields });
}
