// Read/write access to the `recommendations` table.
//
// Reads are public; writes require a session belonging to the editors team
// (enforced by Appwrite table permissions, not by this file).
//
// Storage note: the six seeded dimensions have real indexed columns, while
// admin-created dimensions live in a JSON `tags` column. This module merges
// both into `RecommendationRow.dims` on read and splits them again on write, so
// the rest of the app never has to care which is which.

import { tables, DATABASE_ID, TABLES, ID, Query } from "../appwrite";
import type { RecommendationRow } from "../../types";

/** Dimensions with a dedicated column, for querying and CSV compatibility. */
export const COLUMN_DIMENSIONS = [
  "size", "level", "mode", "criteria", "stage", "principles",
] as const;

const TEXT_FIELDS = ["name", "description", "pros", "cons", "body"] as const;

type Row = Record<string, unknown> & { $id: string };

function parseTags(raw: unknown): Record<string, string> {
  if (typeof raw !== "string" || !raw.trim()) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return Object.fromEntries(
      Object.entries(parsed as Record<string, unknown>).map(([k, v]) => [k, String(v ?? "")]),
    );
  } catch {
    // A malformed tags blob must not take down the whole knowledge base.
    console.warn("Ignoring malformed tags JSON on a recommendation row");
    return {};
  }
}

function toRecommendation(row: Row): RecommendationRow {
  const dims: Record<string, string> = parseTags(row.tags);
  for (const d of COLUMN_DIMENSIONS) {
    dims[d] = String(row[d] ?? "").trim() || "any";
  }
  return {
    id: row.$id,
    name: String(row.name ?? "").trim(),
    description: String(row.description ?? "").trim(),
    pros: String(row.pros ?? "").trim(),
    cons: String(row.cons ?? "").trim(),
    body: String(row.body ?? ""),
    dims,
  };
}

function toPayload(rec: RecommendationRow): Record<string, string> {
  const data: Record<string, string> = {};
  for (const f of TEXT_FIELDS) data[f] = rec[f] ?? "";

  const custom: Record<string, string> = {};
  for (const [key, value] of Object.entries(rec.dims ?? {})) {
    if ((COLUMN_DIMENSIONS as readonly string[]).includes(key)) continue;
    // "any" is the default; omitting it keeps the blob small.
    if (value && value !== "any") custom[key] = value;
  }

  for (const d of COLUMN_DIMENSIONS) data[d] = rec.dims?.[d] || "any";
  data.tags = Object.keys(custom).length > 0 ? JSON.stringify(custom) : "";

  return data;
}

/** Fetch every recommendation, paging past Appwrite's 100-row default limit. */
export async function listRecommendations(): Promise<RecommendationRow[]> {
  const all: RecommendationRow[] = [];
  let cursor: string | undefined;

  for (;;) {
    const queries = [Query.limit(100), Query.orderAsc("name")];
    if (cursor) queries.push(Query.cursorAfter(cursor));

    const page = await tables.listRows({
      databaseId: DATABASE_ID,
      tableId: TABLES.recommendations,
      queries,
    });

    all.push(...(page.rows as Row[]).map(toRecommendation));
    if (page.rows.length < 100) break;
    cursor = page.rows[page.rows.length - 1].$id;
  }

  return all;
}

export async function createRecommendation(rec: RecommendationRow): Promise<RecommendationRow> {
  const row = await tables.createRow({
    databaseId: DATABASE_ID,
    tableId: TABLES.recommendations,
    rowId: ID.unique(),
    data: toPayload(rec),
  });
  return toRecommendation(row as Row);
}

export async function updateRecommendation(
  id: string,
  rec: RecommendationRow,
): Promise<RecommendationRow> {
  const row = await tables.updateRow({
    databaseId: DATABASE_ID,
    tableId: TABLES.recommendations,
    rowId: id,
    data: toPayload(rec),
  });
  return toRecommendation(row as Row);
}

export async function deleteRecommendation(id: string): Promise<void> {
  await tables.deleteRow({
    databaseId: DATABASE_ID,
    tableId: TABLES.recommendations,
    rowId: id,
  });
}
