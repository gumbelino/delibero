// Walks the decision tree (tree.csv) against the user's answers and collects
// the candidate templates, with the nodes that nominated each one.
//
// A node is "reached" when its parent is reached (root nodes always qualify)
// AND the answer to its question matches the node's `match` expression. Every
// reached node with a `recommend` value nominates that template.

import type { Answers, AnswerValue, TreeNode, TreeReason } from "../types";

const COMPARISON_RE = /^(ratio)?\s*(>=|<=|>|<|=)\s*(-?\d+(?:\.\d+)?)$/;

/** Ratio used by `ratio<...` style matches on numberPair answers. */
function ratioOf(answer: Record<string, number>): number {
  const reached = answer.reached ?? 0;
  const participating = answer.participating ?? 0;
  return reached > 0 ? participating / reached : 0;
}

function isPresent(answer: AnswerValue | undefined): boolean {
  if (answer == null) return false;
  if (Array.isArray(answer)) return answer.length > 0;
  if (typeof answer === "object") return Object.keys(answer).length > 0;
  return answer !== "";
}

/** Evaluate one node's `match` expression against the relevant answer. */
export function evalMatch(match: string, answer: AnswerValue | undefined): boolean {
  if (match === "" ) return false;
  if (match === "any") return isPresent(answer);
  if (answer == null) return false;

  const cmp = COMPARISON_RE.exec(match);
  if (cmp) {
    const [, ratioFlag, op, targetStr] = cmp;
    const target = Number(targetStr);
    let value: number;
    if (ratioFlag) {
      if (typeof answer !== "object" || Array.isArray(answer)) return false;
      value = ratioOf(answer);
    } else if (typeof answer === "string") {
      value = Number(answer);
      if (Number.isNaN(value)) return false;
    } else {
      return false;
    }
    switch (op) {
      case ">=": return value >= target;
      case "<=": return value <= target;
      case ">": return value > target;
      case "<": return value < target;
      case "=": return value === target;
    }
  }

  // Exact / membership match.
  if (Array.isArray(answer)) return answer.includes(match);
  if (typeof answer === "string") return answer === match;
  return false;
}

/**
 * Return the candidate templates, mapped to the tree nodes that nominated them.
 * If no node nominates anything, returns null so the caller can fall back to
 * "all templates are candidates".
 */
export function findCandidates(
  tree: TreeNode[],
  answers: Answers,
): Map<string, TreeReason[]> | null {
  const byId = new Map(tree.map((n) => [n.nodeId, n]));
  const memo = new Map<string, boolean>();

  function reached(node: TreeNode, seen: Set<string>): boolean {
    const cached = memo.get(node.nodeId);
    if (cached !== undefined) return cached;
    if (seen.has(node.nodeId)) return false; // cycle guard
    seen.add(node.nodeId);

    let parentReached = true;
    if (node.parentId !== "") {
      const parent = byId.get(node.parentId);
      parentReached = parent ? reached(parent, seen) : false;
    }
    const result = parentReached && evalMatch(node.match, answers[node.questionId]);
    memo.set(node.nodeId, result);
    return result;
  }

  const candidates = new Map<string, TreeReason[]>();
  for (const node of tree) {
    if (!node.recommend) continue;
    if (!reached(node, new Set())) continue;
    const reason: TreeReason = {
      nodeId: node.nodeId,
      questionId: node.questionId,
      match: node.match,
    };
    const existing = candidates.get(node.recommend);
    if (existing) existing.push(reason);
    else candidates.set(node.recommend, [reason]);
  }

  return candidates.size > 0 ? candidates : null;
}
