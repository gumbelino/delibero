// Write access to the `responses` table — one row per wizard run, for research
// analysis. Anonymous visitors may create rows but never read them back; only
// the editors team can list responses (enforced by table permissions).
//
// Answers are stored as a JSON string rather than typed columns so that adding
// or reordering questions never requires a schema migration.

import { tables, DATABASE_ID, TABLES, ID } from "../appwrite";
import type { Answers, MatchedRecommendation } from "../../types";

/** Random per-run id, so a single visitor's updates land on one row. */
function newSessionId(): string {
  return ID.unique();
}

export interface ResponseDraft {
  sessionId: string;
  answers: Answers;
  matched: MatchedRecommendation[];
  completed: boolean;
}

function toPayload(draft: ResponseDraft) {
  return {
    sessionId: draft.sessionId,
    answers: JSON.stringify(draft.answers),
    matched: JSON.stringify(draft.matched.map((m) => m.row.name)),
    completed: draft.completed,
  };
}

/**
 * Persist a completed run. Returns the new row id, or null if the write failed —
 * analytics must never break the user's session, so callers ignore failures.
 */
export async function saveResponse(draft: ResponseDraft): Promise<string | null> {
  try {
    const row = await tables.createRow({
      databaseId: DATABASE_ID,
      tableId: TABLES.responses,
      rowId: ID.unique(),
      data: toPayload(draft),
    });
    return row.$id;
  } catch (err) {
    console.warn("Could not save response:", err);
    return null;
  }
}

export { newSessionId };
