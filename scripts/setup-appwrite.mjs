#!/usr/bin/env node
/**
 * Provisions the Appwrite Cloud backend for delibero: database, tables, columns,
 * indexes, permissions, and the `editors` team.
 *
 * This is the source of truth for the schema — prefer editing this file and
 * re-running it over clicking in the Appwrite console, so a second environment
 * (staging, a colleague's project) can be recreated exactly.
 *
 * Idempotent: existing resources are left alone, missing ones are created.
 *
 *   APPWRITE_ENDPOINT=https://fra.cloud.appwrite.io/v1 \
 *   APPWRITE_PROJECT_ID=... APPWRITE_API_KEY=... node scripts/setup-appwrite.mjs
 */

import { Client, TablesDB, Teams, Permission, Role, TablesDBIndexType } from "node-appwrite";
import dotenv from "dotenv";

// .env.local first so it wins, matching Vite's precedence.
dotenv.config({ path: [".env.local", ".env"] });

const endpoint = process.env.APPWRITE_ENDPOINT ?? "https://fra.cloud.appwrite.io/v1";
const projectId = process.env.APPWRITE_PROJECT_ID;
const apiKey = process.env.APPWRITE_API_KEY;
const databaseId = process.env.APPWRITE_DATABASE_ID ?? "delibero";
const EDITORS_TEAM_ID = "editors";

if (!projectId || !apiKey) {
  console.error(
    "Missing APPWRITE_PROJECT_ID or APPWRITE_API_KEY.\n" +
      "Create a server API key in the Appwrite console (Overview → Integrations → API keys)\n" +
      "with scopes: databases.read, databases.write, tables.read, tables.write,\n" +
      "collections.read, collections.write, attributes.read, attributes.write,\n" +
      "indexes.read, indexes.write, documents.read, documents.write, teams.read, teams.write.\n" +
      "Then put them in .env.local (not committed).",
  );
  process.exit(1);
}

const client = new Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey);
const tablesDB = new TablesDB(client);
const teams = new Teams(client);

/** Run `fn`, ignoring the "already exists" conflict so the script can re-run. */
async function ensure(label, fn) {
  try {
    await fn();
    console.log(`  + ${label}`);
  } catch (err) {
    if (err?.code === 409) {
      console.log(`  = ${label} (exists)`);
      return;
    }
    throw err;
  }
}

/**
 * Like `ensure`, but checks for the resource first instead of relying on a 409.
 * Needed for databases and tables: on plan-limited accounts Appwrite evaluates
 * the quota *before* the name conflict, so re-creating an existing resource
 * fails with "maximum number reached" rather than a conflict.
 */
async function ensureExists(label, get, create) {
  try {
    await get();
    console.log(`  = ${label} (exists)`);
    return;
  } catch (err) {
    if (err?.code !== 404) throw err;
  }
  await create();
  console.log(`  + ${label}`);
}

/* ---- Schema -------------------------------------------------------------- */

const editorWrite = [
  Permission.read(Role.any()),
  Permission.create(Role.team(EDITORS_TEAM_ID)),
  Permission.update(Role.team(EDITORS_TEAM_ID)),
  Permission.delete(Role.team(EDITORS_TEAM_ID)),
];

const TABLES = [
  {
    id: "recommendations",
    name: "Recommendations",
    // Public read: the wizard fetches these anonymously.
    permissions: editorWrite,
    columns: [
      { key: "name", type: "string", size: 256, required: true },
      // Long prose uses `text` (stored off-row) so the sized columns below keep
      // room to grow; a few 4000-char varchars would consume the whole row.
      { key: "description", type: "text", required: false },
      { key: "size", type: "string", size: 256, required: false, xdefault: "any" },
      { key: "level", type: "string", size: 256, required: false, xdefault: "any" },
      { key: "mode", type: "string", size: 256, required: false, xdefault: "any" },
      { key: "criteria", type: "string", size: 256, required: false, xdefault: "any" },
      { key: "stage", type: "string", size: 256, required: false },
      { key: "principles", type: "string", size: 256, required: false, xdefault: "any" },
      { key: "pros", type: "text", required: false },
      { key: "cons", type: "text", required: false },
      // Long-form Markdown shown only on the recommendation's own page.
      { key: "body", type: "text", required: false },
      // JSON map of admin-created dimension key → value list. The six seeded
      // dimensions keep real columns above (indexed, and 1:1 with the CSV);
      // anything an admin adds later lands here, so a new dimension never
      // requires a schema migration.
      { key: "tags", type: "text", required: false },
    ],
    indexes: [
      { key: "idx_name", type: TablesDBIndexType.Key, columns: ["name"] },
      { key: "idx_search", type: TablesDBIndexType.Fulltext, columns: ["name", "description"] },
    ],
  },
  {
    id: "dimensions",
    name: "Dimensions",
    permissions: editorWrite,
    columns: [
      { key: "key", type: "string", size: 64, required: true },
      { key: "label", type: "string", size: 256, required: true },
      { key: "description", type: "text", required: false },
      // Whether this dimension filters results or is a descriptive tag only.
      { key: "matching", type: "boolean", required: false, xdefault: false },
      { key: "order", type: "integer", required: false, xdefault: 0 },
      // Seeded dimensions the questionnaire references by key; not deletable.
      { key: "builtin", type: "boolean", required: false, xdefault: false },
    ],
    indexes: [
      { key: "idx_order", type: TablesDBIndexType.Key, columns: ["order"] },
      { key: "idx_unique_key", type: TablesDBIndexType.Unique, columns: ["key"] },
    ],
  },
  {
    id: "parameters",
    name: "Parameters",
    permissions: editorWrite,
    columns: [
      { key: "dimension", type: "string", size: 32, required: true },
      { key: "value", type: "string", size: 64, required: true },
      { key: "label", type: "string", size: 256, required: true },
      { key: "description", type: "string", size: 1000, required: false },
      // Presentation of this value when rendered as a question option.
      { key: "group", type: "string", size: 128, required: false },
      { key: "color", type: "string", size: 32, required: false },
      { key: "order", type: "integer", required: false, xdefault: 0 },
    ],
    indexes: [
      { key: "idx_dimension_order", type: TablesDBIndexType.Key, columns: ["dimension", "order"] },
      { key: "idx_unique_value", type: TablesDBIndexType.Unique, columns: ["dimension", "value"] },
    ],
  },
  {
    id: "questions",
    name: "Questions",
    permissions: editorWrite,
    columns: [
      // Answers are keyed by this slug, so it is immutable once saved.
      { key: "key", type: "string", size: 64, required: true },
      { key: "type", type: "string", size: 32, required: true },
      { key: "title", type: "string", size: 512, required: true },
      { key: "help", type: "text", required: false },
      // Dimension supplying this question's options. Empty for info/numberPair.
      { key: "dimension", type: "string", size: 64, required: false },
      { key: "order", type: "integer", required: false, xdefault: 0 },
      { key: "enabled", type: "boolean", required: false, xdefault: true },
      { key: "citation", type: "string", size: 64, required: false },
      { key: "infoKey", type: "string", size: 64, required: false },
      { key: "budgetInput", type: "boolean", required: false, xdefault: false },
      // JSON array of {key,label} for numberPair questions.
      { key: "fields", type: "text", required: false },
    ],
    indexes: [
      { key: "idx_order", type: TablesDBIndexType.Key, columns: ["order"] },
      { key: "idx_unique_key", type: TablesDBIndexType.Unique, columns: ["key"] },
    ],
  },
  {
    id: "contacts",
    name: "Help requests",
    // Same shape as responses: a visitor may submit one but can never read any
    // back. These rows hold personal contact details, so read is editors-only.
    permissions: [
      Permission.create(Role.any()),
      Permission.read(Role.team(EDITORS_TEAM_ID)),
      Permission.update(Role.team(EDITORS_TEAM_ID)),
      Permission.delete(Role.team(EDITORS_TEAM_ID)),
    ],
    columns: [
      { key: "name", type: "string", size: 256, required: true },
      // Free text: the form accepts an email address or a phone number.
      { key: "contact", type: "string", size: 256, required: true },
      // Row id of the `responses` row for the run this request came from.
      // May be empty if the response write had not finished when they submitted.
      { key: "responseId", type: "string", size: 64, required: false },
      // Always set, so a request can be tied to its run even without responseId.
      { key: "sessionId", type: "string", size: 64, required: true },
      { key: "handled", type: "boolean", required: false, xdefault: false },
    ],
    indexes: [
      { key: "idx_session", type: TablesDBIndexType.Key, columns: ["sessionId"] },
      { key: "idx_handled", type: TablesDBIndexType.Key, columns: ["handled"] },
    ],
  },
  {
    id: "responses",
    name: "Responses",
    // Anonymous visitors may submit a run but cannot read anything back;
    // only editors can list responses for analysis.
    permissions: [
      Permission.create(Role.any()),
      Permission.read(Role.team(EDITORS_TEAM_ID)),
      Permission.update(Role.team(EDITORS_TEAM_ID)),
      Permission.delete(Role.team(EDITORS_TEAM_ID)),
    ],
    columns: [
      { key: "sessionId", type: "string", size: 64, required: true },
      // JSON blobs: the questionnaire changes shape often, and a schema
      // migration per question change would be untenable for the research team.
      // `text` rather than a sized string — a large varchar is stored inline and
      // would blow the table's row-size limit on its own.
      { key: "answers", type: "text", required: true },
      { key: "matched", type: "text", required: false },
      { key: "completed", type: "boolean", required: false, xdefault: false },
    ],
    indexes: [{ key: "idx_session", type: TablesDBIndexType.Key, columns: ["sessionId"] }],
  },
];

/* ---- Provisioning -------------------------------------------------------- */

async function createColumn(tableId, col) {
  const base = { databaseId, tableId, key: col.key, required: col.required };
  // Appwrite rejects a default on a required column.
  const withDefault = col.required ? base : { ...base, xdefault: col.xdefault };

  switch (col.type) {
    case "string":
      return tablesDB.createStringColumn({ ...withDefault, size: col.size });
    case "text":
      return tablesDB.createTextColumn(withDefault);
    case "integer":
      return tablesDB.createIntegerColumn(withDefault);
    case "boolean":
      return tablesDB.createBooleanColumn(withDefault);
    default:
      throw new Error(`Unknown column type: ${col.type}`);
  }
}

/**
 * Columns are created asynchronously; an index over a still-processing column
 * fails. Poll until every column reports `available`.
 */
async function waitForColumns(tableId) {
  for (let attempt = 0; attempt < 30; attempt++) {
    const { columns } = await tablesDB.listColumns({ databaseId, tableId });
    const pending = columns.filter((c) => c.status !== "available");
    if (pending.length === 0) return;
    if (pending.some((c) => c.status === "failed")) {
      throw new Error(
        `Column(s) failed to create on ${tableId}: ${pending.map((c) => c.key).join(", ")}`,
      );
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error(`Timed out waiting for columns on ${tableId}`);
}

async function main() {
  console.log(`Appwrite: ${endpoint}\nProject:  ${projectId}\nDatabase: ${databaseId}\n`);

  console.log("Team");
  await ensure(`team "${EDITORS_TEAM_ID}"`, () =>
    teams.create({ teamId: EDITORS_TEAM_ID, name: "Editors" }),
  );

  console.log("\nDatabase");
  await ensureExists(
    `database "${databaseId}"`,
    () => tablesDB.get({ databaseId }),
    () => tablesDB.create({ databaseId, name: "delibero" }),
  );

  for (const table of TABLES) {
    console.log(`\nTable "${table.id}"`);
    await ensureExists(
      `table ${table.id}`,
      () => tablesDB.getTable({ databaseId, tableId: table.id }),
      () =>
        tablesDB.createTable({
          databaseId,
          tableId: table.id,
          name: table.name,
          permissions: table.permissions,
          rowSecurity: false,
        }),
    );

    // Skip columns that already exist rather than catching a conflict: an
    // existing table is often already at its row-size limit, and Appwrite
    // reports that limit instead of the name conflict.
    const { columns: present } = await tablesDB.listColumns({
      databaseId,
      tableId: table.id,
    });
    const presentKeys = new Set(present.map((c) => c.key));

    for (const col of table.columns) {
      if (presentKeys.has(col.key)) {
        console.log(`  = column ${col.key} (exists)`);
        continue;
      }
      await ensure(`column ${col.key} (${col.type})`, () => createColumn(table.id, col));
    }

    await waitForColumns(table.id);

    const { indexes: presentIndexes } = await tablesDB.listIndexes({
      databaseId,
      tableId: table.id,
    });
    const presentIndexKeys = new Set(presentIndexes.map((i) => i.key));

    for (const index of table.indexes) {
      if (presentIndexKeys.has(index.key)) {
        console.log(`  = index ${index.key} (exists)`);
        continue;
      }
      await ensure(`index ${index.key}`, () =>
        tablesDB.createIndex({
          databaseId,
          tableId: table.id,
          key: index.key,
          type: index.type,
          columns: index.columns,
        }),
      );
    }
  }

  console.log(
    "\nDone.\n\nNext:\n" +
      "  1. npm run appwrite:seed        # import recommendations.csv + parameters.json\n" +
      "  2. In the console: Auth → create your user, then Teams → Editors → add them\n" +
      "  3. Add the VITE_APPWRITE_* vars to .env.local and to the Appwrite Site\n",
  );
}

main().catch((err) => {
  console.error("\nSetup failed:", err?.message ?? err);
  process.exit(1);
});
