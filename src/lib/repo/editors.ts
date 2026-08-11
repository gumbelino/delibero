// The `editors` team, seen from the browser.
//
// Reading and removing memberships work fine from a client SDK. *Adding* one
// does not: `teams.createMembership` from a browser can only invite — an email,
// an unconfirmed membership, a link to click — because Appwrite will not attach
// an account to a team without that account's consent.
//
// Approving therefore goes through the `approve-editor` function, which runs
// server-side and adds the member outright. See functions/approve-editor and
// docs/admins.md.
//
// Removing still requires the acting user to hold the `owner` role in the team;
// scripts/add-editor.mjs grants it.

import { Functions, Teams } from "appwrite";
import { client, EDITORS_TEAM_ID, FUNCTIONS } from "../appwrite";
import type { Editor } from "../../types";

const teams = new Teams(client);
const functions = new Functions(client);

/**
 * Note on the blanks: Appwrite's "membership privacy" project setting strips
 * `userName`, `userEmail` and `userPhone` from this response, leaving only the
 * ids and dates. The caller fills those in from the access request that
 * produced the membership, so the list stays readable either way.
 */
export async function listEditors(): Promise<Editor[]> {
  const list = await teams.listMemberships({ teamId: EDITORS_TEAM_ID });
  return list.memberships.map((m) => ({
    membershipId: m.$id,
    userId: m.userId,
    email: m.userEmail ?? "",
    name: m.userName ?? "",
    roles: m.roles,
    joinedAt: m.joined || m.$createdAt,
  }));
}

/**
 * Grant editor access by approving a pending request. Returns once the person
 * is a member — there is nothing for them to accept.
 *
 * The function is the authority on what happens; this only unwraps its reply.
 * Appwrite reports a failed *execution* through `responseStatusCode`, not by
 * throwing, so a non-2xx has to be turned into an error by hand or a failure
 * would read as success.
 */
export async function approveEditor(requestId: string): Promise<{ warning?: string }> {
  const execution = await functions.createExecution({
    functionId: FUNCTIONS.approveEditor,
    body: JSON.stringify({ requestId }),
    async: false,
  });

  if (execution.status === "failed") {
    throw new Error(
      "The approve-editor function crashed. Check its logs in the Appwrite console.",
    );
  }

  let payload: { ok?: boolean; message?: string; warning?: string } = {};
  try {
    payload = JSON.parse(execution.responseBody || "{}");
  } catch {
    throw new Error("The approve-editor function returned something unreadable.");
  }

  if (execution.responseStatusCode >= 400 || payload.ok === false) {
    throw new Error(payload.message ?? "Could not grant access.");
  }

  return { warning: payload.warning };
}

export async function removeEditor(membershipId: string): Promise<void> {
  await teams.deleteMembership({ teamId: EDITORS_TEAM_ID, membershipId });
}
