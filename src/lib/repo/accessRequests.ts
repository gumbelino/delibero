// Read/write access to the `access_requests` table — people who have created an
// account and asked to become editors.
//
// This table exists only because listing users is a server-only Appwrite API:
// a browser holding an editor's session cannot enumerate accounts, so the queue
// has to be recorded as data at the moment someone asks.

import { tables, DATABASE_ID, TABLES, ID, Query, Permission, Role } from "../appwrite";
import type { AccessRequest, AccessRequestStatus } from "../../types";

type Row = Record<string, unknown> & { $id: string; $createdAt?: string };

const STATUSES: AccessRequestStatus[] = ["pending", "approved", "declined"];

function toRequest(row: Row): AccessRequest {
  const status = String(row.status ?? "pending") as AccessRequestStatus;
  return {
    id: row.$id,
    userId: String(row.userId ?? ""),
    email: String(row.email ?? ""),
    name: String(row.name ?? "").trim() || undefined,
    status: STATUSES.includes(status) ? status : "pending",
    createdAt: row.$createdAt ? String(row.$createdAt) : undefined,
  };
}

/**
 * File a request. The row is readable by the requester as well as by editors,
 * so the "waiting for approval" screen can tell them it was recorded.
 */
export async function createAccessRequest(user: {
  id: string;
  email: string;
  name?: string;
}): Promise<AccessRequest> {
  const row = await tables.createRow({
    databaseId: DATABASE_ID,
    tableId: TABLES.accessRequests,
    rowId: ID.unique(),
    data: {
      userId: user.id,
      email: user.email,
      name: user.name ?? "",
      status: "pending",
    },
    permissions: [Permission.read(Role.user(user.id))],
  });
  return toRequest(row as Row);
}

/** Every request, newest first. Editors only — the table's read is team-scoped. */
export async function listAccessRequests(): Promise<AccessRequest[]> {
  const page = await tables.listRows({
    databaseId: DATABASE_ID,
    tableId: TABLES.accessRequests,
    queries: [Query.limit(200), Query.orderDesc("$createdAt")],
  });
  return (page.rows as Row[]).map(toRequest);
}

/**
 * The signed-in user's own requests. Returns nothing for an editor whose row
 * was deleted, which is fine — they no longer need it.
 */
export async function listMyAccessRequests(userId: string): Promise<AccessRequest[]> {
  const page = await tables.listRows({
    databaseId: DATABASE_ID,
    tableId: TABLES.accessRequests,
    queries: [Query.equal("userId", userId), Query.limit(10)],
  });
  return (page.rows as Row[]).map(toRequest);
}

export async function setAccessRequestStatus(
  id: string,
  status: AccessRequestStatus,
): Promise<AccessRequest> {
  const row = await tables.updateRow({
    databaseId: DATABASE_ID,
    tableId: TABLES.accessRequests,
    rowId: id,
    data: { status },
  });
  return toRequest(row as Row);
}

export async function deleteAccessRequest(id: string): Promise<void> {
  await tables.deleteRow({
    databaseId: DATABASE_ID,
    tableId: TABLES.accessRequests,
    rowId: id,
  });
}
