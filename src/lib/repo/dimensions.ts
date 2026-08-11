// Read/write access to the `dimensions` table — the set of parameter types
// themselves, not their values. Admins can add dimensions here without any
// schema change, because recommendations store dimension values in a JSON map
// rather than one column per dimension.

import { tables, DATABASE_ID, TABLES, ID, Query } from "../appwrite";
import type { DimensionDef } from "../../types";

// Every dimension is editable and deletable, seeded or not: the seed set is a
// starting point for the research team, not a protected core. Which question
// feeds a dimension is recorded on the question, not here.

type Row = Record<string, unknown> & { $id: string };

function toDimension(row: Row): DimensionDef {
  return {
    id: row.$id,
    key: String(row.key ?? "").trim(),
    label: String(row.label ?? "").trim(),
    description: String(row.description ?? "").trim() || undefined,
    matching: Boolean(row.matching),
    order: Number(row.order ?? 0),
  };
}

function toPayload(d: DimensionDef) {
  return {
    key: d.key.trim(),
    label: d.label.trim(),
    description: d.description ?? "",
    matching: d.matching,
    order: d.order,
  };
}

export async function listDimensions(): Promise<DimensionDef[]> {
  const page = await tables.listRows({
    databaseId: DATABASE_ID,
    tableId: TABLES.dimensions,
    queries: [Query.limit(100), Query.orderAsc("order")],
  });
  return (page.rows as Row[]).map(toDimension);
}

export async function createDimension(d: DimensionDef): Promise<DimensionDef> {
  const row = await tables.createRow({
    databaseId: DATABASE_ID,
    tableId: TABLES.dimensions,
    rowId: ID.unique(),
    data: toPayload(d),
  });
  return toDimension(row as Row);
}

export async function updateDimension(id: string, d: DimensionDef): Promise<DimensionDef> {
  const row = await tables.updateRow({
    databaseId: DATABASE_ID,
    tableId: TABLES.dimensions,
    rowId: id,
    data: toPayload(d),
  });
  return toDimension(row as Row);
}

export async function deleteDimension(id: string): Promise<void> {
  await tables.deleteRow({
    databaseId: DATABASE_ID,
    tableId: TABLES.dimensions,
    rowId: id,
  });
}

/** Slugify a label into a usable dimension key. */
export function toKey(label: string): string {
  return label
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
