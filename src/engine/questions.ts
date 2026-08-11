// The single definition of "which questions count".
//
// A disabled question is treated as deleted everywhere outside the questions
// editor: it is not asked, not listed in the sidebar, does not drive a
// dimension, and its dimension is not offered when tagging a recommendation.
// Disabling is a lazy delete, kept so a question can come back with its id —
// and therefore its stored answers — intact.
//
// Deliberately free of Appwrite imports so the matching engine stays pure.

import type { Question } from "../types";

/** The questions the wizard should actually render, in order. */
export function activeQuestions(questions: Question[]): Question[] {
  return questions.filter((q) => q.enabled).sort((a, b) => a.order - b.order);
}

/** The enabled question attached to a dimension, if there is one. */
export function questionForDimension(
  questions: Question[],
  key: string,
): Question | undefined {
  return questions.find((q) => q.enabled && q.dimension === key);
}

/**
 * Dimensions worth tagging a recommendation with. A *matching* dimension whose
 * question is disabled (or was never attached) can never narrow the results —
 * `matchRecommendations` skips it — so offering its values as options would
 * invite editors to tag rows against a dead vocabulary. Descriptive "tag only"
 * dimensions have no question by design and are always offered.
 */
export function taggableDimensions<T extends { key: string; matching: boolean }>(
  dimensions: T[],
  questions: Question[],
): T[] {
  return dimensions.filter((d) => !d.matching || questionForDimension(questions, d.key));
}
