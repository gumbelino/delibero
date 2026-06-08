// Loads and parses the researcher-editable CSV data files.

import Papa from "papaparse";
import type { Template, TreeNode, PrincipleId } from "../types";

const PRINCIPLE_SET: ReadonlySet<string> = new Set([
  "Inclusion",
  "Equality",
  "Plurality",
  "Authenticity",
  "Reflection",
]);

/** Split a semicolon-separated CSV cell into trimmed, non-empty parts. */
function splitList(cell: string | undefined): string[] {
  if (!cell) return [];
  return cell
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function parseCsv<T extends Record<string, string>>(text: string): T[] {
  const result = Papa.parse<T>(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  });
  // Papa reports malformed rows in `errors`; surface them loudly during dev.
  if (result.errors.length > 0) {
    console.warn("CSV parse warnings:", result.errors);
  }
  return result.data;
}

export function parseTemplates(text: string): Template[] {
  type Row = {
    id: string;
    name: string;
    description: string;
    supports_principles: string;
    citations: string;
  };
  return parseCsv<Row>(text)
    .filter((r) => r.id)
    .map((r) => ({
      id: r.id.trim(),
      name: (r.name ?? "").trim(),
      description: (r.description ?? "").trim(),
      supportsPrinciples: splitList(r.supports_principles).filter((p): p is PrincipleId =>
        PRINCIPLE_SET.has(p),
      ),
      citations: splitList(r.citations),
    }));
}

export function parseTree(text: string): TreeNode[] {
  type Row = {
    node_id: string;
    parent_id: string;
    question_id: string;
    match: string;
    recommend: string;
  };
  return parseCsv<Row>(text)
    .filter((r) => r.node_id)
    .map((r) => ({
      nodeId: r.node_id.trim(),
      parentId: (r.parent_id ?? "").trim(),
      questionId: (r.question_id ?? "").trim(),
      match: (r.match ?? "").trim(),
      recommend: (r.recommend ?? "").trim(),
    }));
}

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to load ${url}: ${res.status} ${res.statusText}`);
  return res.text();
}

/** Load both data files. Paths are relative to the deployed site root. */
export async function loadData(
  base = "data",
): Promise<{ templates: Template[]; tree: TreeNode[] }> {
  const [templatesText, treeText] = await Promise.all([
    fetchText(`${base}/templates.csv`),
    fetchText(`${base}/tree.csv`),
  ]);
  return {
    templates: parseTemplates(templatesText),
    tree: parseTree(treeText),
  };
}
