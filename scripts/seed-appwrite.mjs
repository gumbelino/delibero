#!/usr/bin/env node
/**
 * One-time import of the bundled files into Appwrite:
 *   public/data/recommendations.csv → `recommendations`
 *   public/data/parameters.json     → `parameters`
 *
 * Safe to re-run: skips tables that already contain rows unless --force is
 * passed, which deletes existing rows first. Restrict --force to specific
 * tables with --only, so re-seeding the vocabulary never touches curated
 * recommendations.
 *
 *   node scripts/seed-appwrite.mjs
 *   node scripts/seed-appwrite.mjs --force --only=dimensions,parameters,questions
 */

import { readFileSync } from "node:fs";
import { Client, TablesDB, ID, Query } from "node-appwrite";
import Papa from "papaparse";
import dotenv from "dotenv";

// .env.local first so it wins, matching Vite's precedence.
dotenv.config({ path: [".env.local", ".env"] });

const endpoint = process.env.APPWRITE_ENDPOINT ?? "https://fra.cloud.appwrite.io/v1";
const projectId = process.env.APPWRITE_PROJECT_ID;
const apiKey = process.env.APPWRITE_API_KEY;
const databaseId = process.env.APPWRITE_DATABASE_ID ?? "delibero";
const force = process.argv.includes("--force");

/** Tables to touch this run; empty means all of them. */
const onlyArg = process.argv.find((a) => a.startsWith("--only="));
const only = onlyArg ? onlyArg.slice("--only=".length).split(",").map((t) => t.trim()) : [];
const selected = (table) => only.length === 0 || only.includes(table);

if (!projectId || !apiKey) {
  console.error("Missing APPWRITE_PROJECT_ID or APPWRITE_API_KEY (see .env.example).");
  process.exit(1);
}

const client = new Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey);
const tablesDB = new TablesDB(client);

const REC_FIELDS = [
  "size", "level", "mode", "criteria", "name",
  "description", "stage", "principles", "pros", "cons", "body",
];

async function rowCount(tableId) {
  const res = await tablesDB.listRows({ databaseId, tableId, queries: [Query.limit(1)] });
  return res.total;
}

async function clearTable(tableId) {
  for (;;) {
    const res = await tablesDB.listRows({ databaseId, tableId, queries: [Query.limit(100)] });
    if (res.rows.length === 0) return;
    for (const row of res.rows) {
      await tablesDB.deleteRow({ databaseId, tableId, rowId: row.$id });
    }
  }
}

/** Returns false if the table is excluded, or already has data without --force. */
async function prepare(tableId) {
  if (!selected(tableId)) {
    console.log(`  ~ ${tableId} not selected by --only — skipping`);
    return false;
  }
  const existing = await rowCount(tableId);
  if (existing === 0) return true;
  if (!force) {
    console.log(`  ! ${tableId} already has ${existing} rows — skipping (use --force to replace)`);
    return false;
  }
  console.log(`  - clearing ${existing} existing rows from ${tableId}`);
  await clearTable(tableId);
  return true;
}

async function seedRecommendations() {
  console.log('Table "recommendations"');
  if (!(await prepare("recommendations"))) return;

  const csv = readFileSync("public/data/recommendations.csv", "utf8");
  const parsed = Papa.parse(csv, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  });
  const rows = parsed.data.filter((r) => r.name?.trim());

  for (const r of rows) {
    const data = {};
    for (const f of REC_FIELDS) data[f] = String(r[f] ?? "").trim();
    await tablesDB.createRow({
      databaseId,
      tableId: "recommendations",
      rowId: ID.unique(),
      data,
    });
  }
  console.log(`  + imported ${rows.length} recommendations`);
}

function readParametersFile() {
  return JSON.parse(readFileSync("public/data/parameters.json", "utf8"));
}

async function seedDimensions() {
  console.log('\nTable "dimensions"');
  if (!(await prepare("dimensions"))) return;

  const defs = readParametersFile().dimensions ?? [];
  for (const [i, d] of defs.entries()) {
    await tablesDB.createRow({
      databaseId,
      tableId: "dimensions",
      rowId: ID.unique(),
      data: {
        key: String(d.key).trim(),
        label: String(d.label ?? d.key).trim(),
        description: String(d.description ?? "").trim(),
        matching: Boolean(d.matching),
        order: d.order ?? i,
      },
    });
  }
  console.log(`  + imported ${defs.length} dimensions`);
}

async function seedParameters() {
  console.log('\nTable "parameters"');
  if (!(await prepare("parameters"))) return;

  const raw = readParametersFile();
  const dimensions = (raw.dimensions ?? []).map((d) => d.key);
  let count = 0;

  for (const dimension of dimensions) {
    const entries = raw.values?.[dimension] ?? [];
    for (const [i, entry] of entries.entries()) {
      await tablesDB.createRow({
        databaseId,
        tableId: "parameters",
        rowId: ID.unique(),
        data: {
          dimension,
          value: String(entry.value).trim(),
          label: String(entry.label ?? entry.value).trim(),
          description: String(entry.description ?? "").trim(),
          group: String(entry.group ?? "").trim(),
          color: String(entry.color ?? "").trim(),
          order: i,
        },
      });
      count++;
    }
  }
  console.log(`  + imported ${count} parameters`);
}

async function seedQuestions() {
  console.log('\nTable "questions"');
  if (!(await prepare("questions"))) return;

  const qs = JSON.parse(readFileSync("public/data/questions.json", "utf8")).questions ?? [];
  for (const [i, q] of qs.entries()) {
    await tablesDB.createRow({
      databaseId,
      tableId: "questions",
      rowId: ID.unique(),
      data: {
        key: String(q.id).trim(),
        type: String(q.type ?? "single"),
        title: String(q.title ?? "").trim(),
        help: String(q.help ?? "").trim(),
        dimension: String(q.dimension ?? "").trim(),
        order: q.order ?? i,
        enabled: q.enabled !== false,
        citation: String(q.citation ?? "").trim(),
        infoKey: String(q.infoKey ?? "").trim(),
        fields: q.fields ? JSON.stringify(q.fields) : "",
      },
    });
  }
  console.log(`  + imported ${qs.length} questions`);
}

async function main() {
  await seedRecommendations();
  await seedDimensions();
  await seedParameters();
  await seedQuestions();
  console.log("\nDone. The app will now read from Appwrite once VITE_APPWRITE_* are set.");
}

main().catch((err) => {
  console.error("\nSeed failed:", err?.message ?? err);
  process.exit(1);
});
