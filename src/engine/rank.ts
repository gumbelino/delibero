// Ranks candidate templates using ONLY the user's priority ranking as weights.
//
// Each principle's weight is its inverse rank position: with five principles,
// the one ranked #1 is worth 5, #2 worth 4, ... #5 worth 1. A template's score
// is the sum of the weights of the principles it supports. There are no other
// numbers in the scoring — every weight traces back to a choice the user made.

import type { PrincipleContribution, PrincipleId, Template } from "../types";

export interface RankedTemplate {
  template: Template;
  score: number;
  contributions: PrincipleContribution[];
}

/** Map each ranked principle to {rank (1-based), weight}. */
export function principleWeights(
  ranking: string[] | undefined,
): Map<PrincipleId, { rank: number; weight: number }> {
  const map = new Map<PrincipleId, { rank: number; weight: number }>();
  if (!ranking || ranking.length === 0) return map;
  const n = ranking.length;
  ranking.forEach((principle, index) => {
    map.set(principle as PrincipleId, { rank: index + 1, weight: n - index });
  });
  return map;
}

/**
 * Score and sort candidate templates by alignment with the user's ranking.
 * Ties are broken by template name for stable, deterministic output.
 */
export function rankTemplates(
  candidates: Template[],
  ranking: string[] | undefined,
): RankedTemplate[] {
  const weights = principleWeights(ranking);

  const scored: RankedTemplate[] = candidates.map((template) => {
    const contributions: PrincipleContribution[] = [];
    let score = 0;
    for (const principle of template.supportsPrinciples) {
      const w = weights.get(principle);
      // If there is no ranking yet, every supported principle counts as 1 so
      // templates still order by breadth of support (neutral fallback).
      const weight = w ? w.weight : 1;
      const rank = w ? w.rank : 0;
      score += weight;
      contributions.push({ principle, rank, weight });
    }
    contributions.sort((a, b) => b.weight - a.weight);
    return { template, score, contributions };
  });

  scored.sort((a, b) => b.score - a.score || a.template.name.localeCompare(b.template.name));
  return scored;
}
