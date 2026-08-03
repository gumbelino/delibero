// Read/write access to the `parameters` table — the allowed values of each
// dimension. The dimensions themselves live in `dimensions.ts`.

import { tables, DATABASE_ID, TABLES, ID, Query } from "../appwrite";
import type { DimensionDef, DimensionId, Parameter, ParameterSet } from "../../types";

type Row = Record<string, unknown> & { $id: string };

function toParameter(row: Row): Parameter {
  return {
    id: row.$id,
    dimension: String(row.dimension) as DimensionId,
    value: String(row.value ?? "").trim(),
    label: String(row.label ?? "").trim(),
    description: String(row.description ?? "").trim() || undefined,
    order: Number(row.order ?? 0),
  };
}

/** An empty bucket per dimension, so callers can index without null checks. */
export function emptyParameterSet(dimensions: DimensionDef[] = []): ParameterSet {
  const set: ParameterSet = {};
  for (const d of dimensions) set[d.key] = [];
  return set;
}

/**
 * Fetch all parameter values, grouped by dimension and sorted by `order`.
 * Values are bucketed even if their dimension is unknown, so rows left behind
 * by a console-side edit never disappear without trace.
 */
export async function listParameters(dimensions: DimensionDef[] = []): Promise<ParameterSet> {
  const grouped = emptyParameterSet(dimensions);
  let cursor: string | undefined;

  for (;;) {
    const queries = [Query.limit(100), Query.orderAsc("order")];
    if (cursor) queries.push(Query.cursorAfter(cursor));

    const page = await tables.listRows({
      databaseId: DATABASE_ID,
      tableId: TABLES.parameters,
      queries,
    });

    for (const row of page.rows as Row[]) {
      const param = toParameter(row);
      (grouped[param.dimension] ??= []).push(param);
    }

    if (page.rows.length < 100) break;
    cursor = page.rows[page.rows.length - 1].$id;
  }

  return grouped;
}

function toPayload(p: Parameter) {
  return {
    dimension: p.dimension,
    value: p.value.trim(),
    label: p.label.trim(),
    description: p.description ?? "",
    order: p.order,
  };
}

export async function createParameter(p: Parameter): Promise<Parameter> {
  const row = await tables.createRow({
    databaseId: DATABASE_ID,
    tableId: TABLES.parameters,
    rowId: ID.unique(),
    data: toPayload(p),
  });
  return toParameter(row as Row);
}

export async function updateParameter(id: string, p: Parameter): Promise<Parameter> {
  const row = await tables.updateRow({
    databaseId: DATABASE_ID,
    tableId: TABLES.parameters,
    rowId: id,
    data: toPayload(p),
  });
  return toParameter(row as Row);
}

export async function deleteParameter(id: string): Promise<void> {
  await tables.deleteRow({
    databaseId: DATABASE_ID,
    tableId: TABLES.parameters,
    rowId: id,
  });
}

/**
 * Delete every value belonging to a dimension. Called when the dimension itself
 * is deleted — orphaned values are invisible in the UI and would silently
 * collide with the unique (dimension, value) index if the key were reused.
 */
export async function deleteParametersForDimension(dimension: DimensionId): Promise<number> {
  let deleted = 0;

  for (;;) {
    const page = await tables.listRows({
      databaseId: DATABASE_ID,
      tableId: TABLES.parameters,
      queries: [Query.equal("dimension", dimension), Query.limit(100)],
    });
    if (page.rows.length === 0) return deleted;

    for (const row of page.rows) {
      await tables.deleteRow({
        databaseId: DATABASE_ID,
        tableId: TABLES.parameters,
        rowId: row.$id,
      });
      deleted++;
    }
  }
}
