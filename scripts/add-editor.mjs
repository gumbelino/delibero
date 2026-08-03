#!/usr/bin/env node
/**
 * Grants a user permission to edit the knowledge base by adding them to the
 * `editors` team. Run this for each researcher who needs access to /admin.
 *
 * The user must already exist (Appwrite console → Auth → Users → Create user).
 * Adding a membership from a server SDK takes effect immediately — no email
 * invitation is sent, so this works without SMTP configured.
 *
 *   node scripts/add-editor.mjs someone@example.com
 */

import { Client, Teams, Users, Query } from "node-appwrite";
import dotenv from "dotenv";

dotenv.config({ path: [".env.local", ".env"] });

const email = process.argv[2];
const endpoint = process.env.APPWRITE_ENDPOINT ?? "https://fra.cloud.appwrite.io/v1";
const projectId = process.env.APPWRITE_PROJECT_ID;
const apiKey = process.env.APPWRITE_API_KEY;
const EDITORS_TEAM_ID = "editors";

if (!email) {
  console.error("Usage: node scripts/add-editor.mjs <email>");
  process.exit(1);
}
if (!projectId || !apiKey) {
  console.error("Missing APPWRITE_PROJECT_ID or APPWRITE_API_KEY (see .env.example).");
  process.exit(1);
}

const client = new Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey);
const teams = new Teams(client);
const users = new Users(client);

async function main() {
  const found = await users.list({ queries: [Query.equal("email", email)] });
  if (found.total === 0) {
    console.error(
      `No user with email ${email}.\n` +
        "Create them first: Appwrite console → Auth → Users → Create user.",
    );
    process.exit(1);
  }

  const user = found.users[0];
  const members = await teams.listMemberships({ teamId: EDITORS_TEAM_ID });
  if (members.memberships.some((m) => m.userId === user.$id)) {
    console.log(`${email} is already an editor.`);
    return;
  }

  await teams.createMembership({
    teamId: EDITORS_TEAM_ID,
    userId: user.$id,
    roles: ["editor"],
  });
  console.log(`${email} can now edit the knowledge base at /admin.`);
}

main().catch((err) => {
  console.error("Failed:", err?.message ?? err);
  process.exit(1);
});
