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

import { tables, DATABASE_ID, TABLES, ID } from "../appwrite";

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
