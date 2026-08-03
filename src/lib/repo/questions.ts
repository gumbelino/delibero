// Read/write access to the `questions` table — the questionnaire itself.
//
// A question does not store its own options. It names a `dimension`, and the
// options are that dimension's values from the `parameters` table. That keeps
// one vocabulary per concept: editing "Size" values changes both the question
// the user sees and the tags available on recommendations.

import { tables, DATABASE_ID, TABLES, ID, Query } from "../appwrite";
import type { Parameter, ParameterSet, Question, QuestionType } from "../../types";

const TYPES: QuestionType[] = ["single", "multi", "rank", "numberPair", "info"];

/** Types whose answers come from the attached dimension's values. */
export const OPTION_TYPES: QuestionType[] = ["single", "multi", "rank"];

export const TYPE_LABELS: Record<QuestionType, string> = {
  single: "Single choice",
  multi: "Multiple choice",
  rank: "Ranked choice",
  numberPair: "Two numbers",
  info: "Information panel (no answer)",
};

type Row = Record<string, unknown> & { $id: string };

function parseFields(raw: unknown): { key: string; label: string }[] | undefined {
  if (typeof raw !== "string" || !raw.trim()) return undefined;
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as { key: string; label: string }[]) : undefined;
  } catch {
    return undefined;
  }
}

function toQuestion(row: Row): Question {
  const type = String(row.type) as QuestionType;
  return {
    rowId: row.$id,
    id: String(row.key ?? "").trim(),
    type: TYPES.includes(type) ? type : "single",
    order: Number(row.order ?? 0),
    dimension: String(row.dimension ?? "").trim() || undefined,
    enabled: row.enabled !== false,
    title: String(row.title ?? "").trim(),
    help: String(row.help ?? "").trim() || undefined,
    citation: String(row.citation ?? "").trim() || undefined,
    infoKey: String(row.infoKey ?? "").trim() || undefined,
    budgetInput: Boolean(row.budgetInput),
    fields: parseFields(row.fields),
  };
}

function toPayload(q: Question) {
  return {
    key: q.id.trim(),
    type: q.type,
    order: q.order,
    dimension: q.dimension ?? "",
    enabled: q.enabled,
    title: q.title.trim(),
    help: q.help ?? "",
    citation: q.citation ?? "",
    infoKey: q.infoKey ?? "",
    budgetInput: Boolean(q.budgetInput),
    fields: q.fields ? JSON.stringify(q.fields) : "",
  };
}

export async function listQuestions(): Promise<Question[]> {
  const page = await tables.listRows({
    databaseId: DATABASE_ID,
    tableId: TABLES.questions,
    queries: [Query.limit(100), Query.orderAsc("order")],
  });
  return (page.rows as Row[]).map(toQuestion);
}

export async function createQuestion(q: Question): Promise<Question> {
  const row = await tables.createRow({
    databaseId: DATABASE_ID,
    tableId: TABLES.questions,
    rowId: ID.unique(),
    data: toPayload(q),
  });
  return toQuestion(row as Row);
}

export async function updateQuestion(rowId: string, q: Question): Promise<Question> {
  const row = await tables.updateRow({
    databaseId: DATABASE_ID,
    tableId: TABLES.questions,
    rowId,
    data: toPayload(q),
  });
  return toQuestion(row as Row);
}

export async function deleteQuestion(rowId: string): Promise<void> {
  await tables.deleteRow({
    databaseId: DATABASE_ID,
    tableId: TABLES.questions,
    rowId,
  });
}

/** Persist a whole reordering in one pass. */
export async function saveQuestionOrder(questions: Question[]): Promise<void> {
  await Promise.all(
    questions.map((q, i) =>
      q.rowId
        ? tables.updateRow({
            databaseId: DATABASE_ID,
            tableId: TABLES.questions,
            rowId: q.rowId,
            data: { order: i },
          })
        : Promise.resolve(),
    ),
  );
}

function toOption(p: Parameter) {
  return {
    value: p.value,
    label: p.label || p.value,
    description: p.description,
    group: p.group,
    color: p.color,
  };
}

/**
 * Resolve each question's options from its dimension's values. Questions are
 * stored without options so that a vocabulary lives in exactly one place.
 */
export function withOptions(questions: Question[], parameters: ParameterSet): Question[] {
  return questions.map((q) => {
    if (!q.dimension || !OPTION_TYPES.includes(q.type)) return q;
    return { ...q, options: (parameters[q.dimension] ?? []).map(toOption) };
  });
}

/** The questions the wizard should actually render, in order. */
export function activeQuestions(questions: Question[]): Question[] {
  return questions.filter((q) => q.enabled).sort((a, b) => a.order - b.order);
}
