import type { RecommendationRow, MatchedRecommendation } from "../types";

const SIZE_BUCKETS: Record<string, string> = {
  "20": "small",
  "100": "small",
  "500": "medium",
  "1000": "medium",
  "10000": "large",
  "50000": "large",
  "100000": "large",
};

function fits(rowVal: string, answerVal: string): boolean {
  return rowVal === "any" || rowVal === answerVal;
}

export function matchRecommendations(
  rows: RecommendationRow[],
  answers: Record<string, unknown>
): MatchedRecommendation[] {
  const participants = answers["participants"] as string | undefined;
  const size = participants ? (SIZE_BUCKETS[participants] ?? "large") : "";
  const level = (answers["engagement-depth"] as string) ?? "";
  const mode = (answers["modes"] as string) ?? "";
  const criteria = (answers["criteria"] as string) ?? "";

  const matched: MatchedRecommendation[] = [];

  for (const row of rows) {
    if (
      fits(row.size, size) &&
      fits(row.level, level) &&
      fits(row.mode, mode) &&
      fits(row.criteria, criteria)
    ) {
      const reasons: string[] = [];
      if (row.size !== "any") reasons.push(`${size} deliberation size`);
      if (row.level !== "any") reasons.push(`participation level: ${level}`);
      if (row.mode !== "any") reasons.push(`mode: ${mode}`);
      if (row.criteria !== "any") reasons.push(`criteria: ${criteria}`);
      const matchedOn = reasons.length > 0 ? reasons.join(", ") : size || level || mode || criteria || "your answers";

      matched.push({ row, matchedOn });
    }
  }

  return matched;
}
