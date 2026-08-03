// Write access to the `responses` table — one row per wizard run, for research
// analysis. Anonymous visitors may create rows but never read them back; only
// the editors team can list responses (enforced by table permissions).
//
// Answers are stored as a JSON string rather than typed columns so that adding
// or reordering questions never requires a schema migration.

import { tables, DATABASE_ID, TABLES, ID, Query } from "../appwrite";
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

/** A stored run, as read by an editor. */
export interface StoredResponse {
  id: string;
  sessionId: string;
  answers: Answers;
  /** Names of the recommendations this run produced. */
  matched: string[];
  createdAt: string;
}

function parseJson<T>(raw: unknown, fallback: T): T {
  if (typeof raw !== "string" || !raw.trim()) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    // A malformed blob must not break the whole requests list.
    return fallback;
  }
}

function toResponse(row: Record<string, unknown> & { $id: string; $createdAt: string }): StoredResponse {
  return {
    id: row.$id,
    sessionId: String(row.sessionId ?? ""),
    answers: parseJson<Answers>(row.answers, {}),
    matched: parseJson<string[]>(row.matched, []),
    createdAt: row.$createdAt,
  };
}

/**
 * Fetch the runs behind a set of help requests, keyed by both row id and
 * sessionId so callers can look up either way — `responseId` is absent when the
 * visitor submitted before the response write finished.
 */
export async function listResponsesForSessions(
  sessionIds: string[],
): Promise<{ byId: Record<string, StoredResponse>; bySession: Record<string, StoredResponse> }> {
  const byId: Record<string, StoredResponse> = {};
  const bySession: Record<string, StoredResponse> = {};
  if (sessionIds.length === 0) return { byId, bySession };

  // Query.equal accepts a list, but keep batches small enough for the URL.
  const unique = [...new Set(sessionIds)];
  for (let i = 0; i < unique.length; i += 25) {
    const batch = unique.slice(i, i + 25);
    const page = await tables.listRows({
      databaseId: DATABASE_ID,
      tableId: TABLES.responses,
      queries: [Query.equal("sessionId", batch), Query.limit(100)],
    });
    for (const row of page.rows) {
      const parsed = toResponse(row as Record<string, unknown> & { $id: string; $createdAt: string });
      byId[parsed.id] = parsed;
      bySession[parsed.sessionId] = parsed;
    }
  }

  return { byId, bySession };
}
