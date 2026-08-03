// Help requests submitted from the results page.
//
// Each row links back to the wizard run it came from, so a researcher reading a
// request can see the answers that produced it:
//
//   contacts.responseId → responses.$id   (exact row, when available)
//   contacts.sessionId  → responses.sessionId  (always set, survives a race)
//
// Anonymous visitors may create rows but never read them — these hold personal
// contact details, so reads are restricted to the editors team.

import { tables, DATABASE_ID, TABLES, ID, Query } from "../appwrite";

export interface ContactRequest {
  name: string;
  /** Email address or phone number — the form accepts either. */
  contact: string;
  sessionId: string;
  /** Row id of this run's `responses` row, if that write has completed. */
  responseId?: string;
}

/**
 * Save a help request. Unlike the analytics write in `responses.ts`, failures
 * are surfaced: the visitor asked to be contacted and must not be told it
 * worked when it did not.
 */
export async function saveContactRequest(req: ContactRequest): Promise<string> {
  const row = await tables.createRow({
    databaseId: DATABASE_ID,
    tableId: TABLES.contacts,
    rowId: ID.unique(),
    data: {
      name: req.name.trim(),
      contact: req.contact.trim(),
      sessionId: req.sessionId,
      responseId: req.responseId ?? "",
      handled: false,
    },
  });
  return row.$id;
}

/** A stored help request, as read by an editor. */
export interface StoredContactRequest extends ContactRequest {
  id: string;
  handled: boolean;
  /** ISO timestamp Appwrite assigned on create. */
  createdAt: string;
}

type Row = Record<string, unknown> & { $id: string; $createdAt: string };

function toRequest(row: Row): StoredContactRequest {
  return {
    id: row.$id,
    name: String(row.name ?? "").trim(),
    contact: String(row.contact ?? "").trim(),
    sessionId: String(row.sessionId ?? ""),
    responseId: String(row.responseId ?? "") || undefined,
    handled: Boolean(row.handled),
    createdAt: row.$createdAt,
  };
}

/**
 * All help requests, newest first. Editors only — anonymous callers get a 401,
 * which is why this is never called from the public data layer.
 */
export async function listContactRequests(): Promise<StoredContactRequest[]> {
  const all: StoredContactRequest[] = [];
  let cursor: string | undefined;

  for (;;) {
    const queries = [Query.limit(100), Query.orderDesc("$createdAt")];
    if (cursor) queries.push(Query.cursorAfter(cursor));

    const page = await tables.listRows({
      databaseId: DATABASE_ID,
      tableId: TABLES.contacts,
      queries,
    });

    all.push(...(page.rows as Row[]).map(toRequest));
    if (page.rows.length < 100) break;
    cursor = page.rows[page.rows.length - 1].$id;
  }

  return all;
}

export async function setContactHandled(id: string, handled: boolean): Promise<void> {
  await tables.updateRow({
    databaseId: DATABASE_ID,
    tableId: TABLES.contacts,
    rowId: id,
    data: { handled },
  });
}

export async function deleteContactRequest(id: string): Promise<void> {
  await tables.deleteRow({
    databaseId: DATABASE_ID,
    tableId: TABLES.contacts,
    rowId: id,
  });
}
