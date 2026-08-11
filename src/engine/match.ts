import type {
  DimensionDef,
  MatchedRecommendation,
  Question,
  RecommendationRow,
} from "../types";
import { questionForDimension } from "./questions";

function fits(rowVal: string, answerVal: string): boolean {
  if (!rowVal || rowVal === "any") return true;
  return rowVal.split(",").map((v) => v.trim()).includes(answerVal);
}

/**
 * Dimensions that actually constrain the result set: flagged for matching, with
 * an enabled question attached, and that question answered.
 *
 * An admin can flag a dimension for matching and never attach a question to it,
 * disable the question, or the user may not have reached it yet. Treating any
 * of those as "matches nothing" would silently empty the results page with no
 * explanation, so they are treated as "no constraint" instead.
 */
function activeDimensions(
  dimensions: DimensionDef[],
  questions: Question[],
  answers: Record<string, unknown>,
): { dim: DimensionDef; answer: string }[] {
  const active: { dim: DimensionDef; answer: string }[] = [];

  for (const dim of dimensions) {
    if (!dim.matching) continue;

    const question = questionForDimension(questions, dim.key);
    if (!question) continue;

    const answer = answers[question.id];
    if (typeof answer !== "string" || !answer) continue;

    active.push({ dim, answer });
  }

  return active;
}

export function matchRecommendations(
  rows: RecommendationRow[],
  answers: Record<string, unknown>,
  dimensions: DimensionDef[],
  questions: Question[] = [],
): MatchedRecommendation[] {
  const active = activeDimensions(dimensions, questions, answers);
  const matched: MatchedRecommendation[] = [];

  for (const row of rows) {
    if (!active.every(({ dim, answer }) => fits(row.dims?.[dim.key] ?? "any", answer))) continue;

    // Attribute the match to the dimensions that actually narrowed it — a row
    // set to "any" everywhere was not selected *because of* the answers.
    const reasons = active
      .filter(({ dim }) => (row.dims?.[dim.key] ?? "any") !== "any")
      .map(({ dim, answer }) => `${dim.label.toLowerCase()}: ${answer}`);

    matched.push({
      row,
      matchedOn: reasons.length > 0 ? reasons.join(", ") : "your answers",
    });
  }

  return matched;
}
