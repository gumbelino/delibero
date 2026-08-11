/**
 * approve-editor — grants editor access, server-side.
 *
 * This function exists for one reason: a browser cannot add anyone to an
 * Appwrite team. `teams.createMembership` behaves differently per SDK — from a
 * client it *invites* (an email, an unconfirmed membership, a link to click),
 * while from a server it adds the member outright. Approving from /admin should
 * mean access, not a pending invitation, so the write happens here.
 *
 * It holds no secret. Appwrite injects a scoped, single-execution API key in the
 * `x-appwrite-key` header; the function's own scopes (teams.write) bound what
 * that key can do.
 *
 * Request:  POST { "requestId": "<access_requests row id>" }
 * Response: { "ok": true, "userId": "..." } | { "ok": false, "message": "..." }
 */

import { Client, TablesDB, Teams, Query } from "node-appwrite";

const EDITORS_TEAM_ID = "editors";
const DATABASE_ID = process.env.APPWRITE_DATABASE_ID ?? "delibero";
const ACCESS_REQUESTS = "access_requests";

/** Roles every editor gets. `owner` is what lets them manage other editors. */
const EDITOR_ROLES = ["editor", "owner"];

export default async ({ req, res, log, error }) => {
  // Preferred: the scoped, single-execution key Appwrite injects per run, set
  // up under the function's Settings → Scopes. Older consoles have no such
  // setting, so fall back to a key stored as a function variable — same code,
  // one more secret to look after.
  const apiKey = req.headers["x-appwrite-key"] || process.env.APPWRITE_API_KEY || "";

  const client = new Client()
    .setEndpoint(process.env.APPWRITE_FUNCTION_API_ENDPOINT)
    .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
    .setKey(apiKey);

  const teams = new Teams(client);
  const tables = new TablesDB(client);

  const fail = (status, message) => {
    error(message);
    return res.json({ ok: false, message }, status);
  };

  if (!apiKey) {
    return fail(
      500,
      "No API key available. Either grant this function the teams.write and " +
        "users.read scopes (console → Functions → approve-editor → Settings → " +
        "Scopes), or add an APPWRITE_API_KEY function variable.",
    );
  }

  // Appwrite's execute permission is the real gate; this is the second lock.
  // A caller with no session, or one outside the team, must not get through
  // even if that permission is later widened by mistake.
  const callerId = req.headers["x-appwrite-user-id"];
  if (!callerId) return fail(401, "Sign in as an editor to approve requests.");

  try {
    const caller = await teams.listMemberships({
      teamId: EDITORS_TEAM_ID,
      queries: [Query.equal("userId", callerId)],
    });
    if (caller.total === 0) {
      return fail(403, "Only editors can approve access requests.");
    }
  } catch (err) {
    return fail(500, `Could not verify the caller: ${err.message}`);
  }

  let requestId;
  try {
    ({ requestId } = JSON.parse(req.bodyRaw || "{}"));
  } catch {
    return fail(400, "Expected a JSON body.");
  }
  if (!requestId) return fail(400, "Missing requestId.");

  // Read the target from the database rather than trusting the caller's body:
  // an editor may approve a request, not name an arbitrary account to promote.
  let request;
  try {
    request = await tables.getRow({
      databaseId: DATABASE_ID,
      tableId: ACCESS_REQUESTS,
      rowId: requestId,
    });
  } catch {
    return fail(404, "That access request no longer exists.");
  }

  if (request.status === "approved") {
    return res.json({ ok: true, userId: request.userId, alreadyApproved: true });
  }

  try {
    const existing = await teams.listMemberships({
      teamId: EDITORS_TEAM_ID,
      queries: [Query.equal("userId", request.userId)],
    });

    if (existing.total === 0) {
      await teams.createMembership({
        teamId: EDITORS_TEAM_ID,
        userId: request.userId,
        roles: EDITOR_ROLES,
      });
      log(`Granted editor access to ${request.email} (${request.userId}).`);
    } else {
      log(`${request.email} was already an editor; marking the request approved.`);
    }
  } catch (err) {
    // Leave the request pending: a half-done approval that reads as finished
    // is worse than one the editor can retry.
    return fail(500, `Could not grant access: ${err.message}`);
  }

  try {
    await tables.updateRow({
      databaseId: DATABASE_ID,
      tableId: ACCESS_REQUESTS,
      rowId: requestId,
      data: { status: "approved" },
    });
  } catch (err) {
    // Access was granted; only the bookkeeping failed. Say so rather than
    // reporting a failure the editor would retry pointlessly.
    return res.json(
      {
        ok: true,
        userId: request.userId,
        warning: `Access granted, but the request could not be marked approved: ${err.message}`,
      },
      200,
    );
  }

  return res.json({ ok: true, userId: request.userId });
};
