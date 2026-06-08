// Orchestrates the recommendation pipeline:
//   answers --(tree.csv)--> candidate templates --(user ranking)--> ranked + explained

import type { Answers, Recommendation, Template, TreeNode } from "../types";
import { findCandidates } from "./tree";
import { rankTemplates } from "./rank";

/** Read the priority ranking answer, if present. */
function getRanking(answers: Answers): string[] | undefined {
  const value = answers["priorities"];
  return Array.isArray(value) ? value : undefined;
}

export function recommend(
  templates: Template[],
  tree: TreeNode[],
  answers: Answers,
): Recommendation[] {
  const byId = new Map(templates.map((t) => [t.id, t]));

  // 1. Decision tree picks the candidates (falls back to all templates).
  const candidateMap = findCandidates(tree, answers);
  const candidates: Template[] = candidateMap
    ? [...candidateMap.keys()].map((id) => byId.get(id)).filter((t): t is Template => !!t)
    : templates;

  // 2. Rank candidates using only the user's principle ranking.
  const ranking = getRanking(answers);
  const ranked = rankTemplates(candidates, ranking);

  // 3. Attach the tree reasons that nominated each template.
  return ranked.map((r) => ({
    template: r.template,
    score: r.score,
    contributions: r.contributions,
    nominatedBy: candidateMap?.get(r.template.id) ?? [],
  }));
}
