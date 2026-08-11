// Appwrite Cloud client. Everything that talks to the database goes through here.
//
// The app degrades gracefully: if the env vars below are absent (a fresh clone,
// or a preview build without secrets), `isAppwriteConfigured` is false and the
// data layer falls back to the bundled CSV. Nothing here throws at import time.

import { Client, Account, TablesDB, ID, Query, Permission, Role } from "appwrite";

const endpoint = import.meta.env.VITE_APPWRITE_ENDPOINT ?? "";
const projectId = import.meta.env.VITE_APPWRITE_PROJECT_ID ?? "";

export const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID ?? "delibero";

/** Table (collection) ids — kept in sync with scripts/setup-appwrite.mjs. */
export const TABLES = {
  recommendations: "recommendations",
  dimensions: "dimensions",
  questions: "questions",
  parameters: "parameters",
  responses: "responses",
  contacts: "contacts",
  accessRequests: "access_requests",
} as const;

/** Team whose members may edit the knowledge base. */
export const EDITORS_TEAM_ID = "editors";

/**
 * Server-side functions. Ids must match what the Appwrite console calls them —
 * unlike tables, nothing in this repo provisions them; see docs/admins.md.
 */
export const FUNCTIONS = {
  approveEditor: import.meta.env.VITE_APPWRITE_APPROVE_FN ?? "approve-editor",
} as const;

export const isAppwriteConfigured = Boolean(endpoint && projectId);

const client = new Client();
if (isAppwriteConfigured) {
  client.setEndpoint(endpoint).setProject(projectId);
}

export const account = new Account(client);
export const tables = new TablesDB(client);

/**
 * Connectivity check against the Appwrite backend, run once at startup in dev.
 * Catches the two setup mistakes that otherwise surface as confusing failures
 * much later: missing env vars, and a domain that has not been registered as a
 * Web platform (which fails CORS). Logs only — never blocks the app.
 */
export function pingAppwrite(): void {
  if (!isAppwriteConfigured) {
    console.warn(
      "[appwrite] Not configured — the app is running on the bundled CSV/JSON. " +
        "Set VITE_APPWRITE_ENDPOINT and VITE_APPWRITE_PROJECT_ID in .env.local.",
    );
    return;
  }

  client
    .ping()
    .then(() => console.info(`[appwrite] Connected to project "${projectId}" at ${endpoint}`))
    .catch((err: unknown) => {
      console.error(
        `[appwrite] Ping failed for project "${projectId}". If this is a CORS error, add ` +
          `"${window.location.hostname}" as a Web platform in the Appwrite console.`,
        err,
      );
    });
}

export { client, ID, Query, Permission, Role };
