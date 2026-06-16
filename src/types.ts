// Shared domain types for the Deliberation Process Design Tool.

/** The five deliberative principles the user ranks. */
export type PrincipleId =
  | "Inclusion"
  | "Equality"
  | "Plurality"
  | "Authenticity"
  | "Reflection";

/** The kinds of questions the wizard can render. */
export type QuestionType =
  | "rank" // ranked-choice ordering of options
  | "scale" // a single value from a non-linear scale
  | "single" // pick exactly one option
  | "multi" // pick any number of options
  | "numberPair" // two numbers (engagement calculator)
  | "info"; // educational panel, no answer collected

export interface QuestionOption {
  /** Stable value stored in the answer (also used for tree matching). */
  value: string;
  /** Human-readable label shown to the user. */
  label: string;
  /** Optional longer explanation rendered under the label. */
  description?: string;
  /** Optional citation key (see content.ts CITATIONS). */
  citation?: string;
  /** Optional group heading for grouped multi-select questions. */
  group?: string;
  /** Optional color (hex) for ranked-choice goal items. */
  color?: string;
}

export interface Question {
  id: string;
  type: QuestionType;
  title: string;
  /** Optional helper text shown beneath the title. */
  help?: string;
  /** Options for rank/scale/single/multi questions. */
  options?: QuestionOption[];
  /** Labels for the two fields of a numberPair question. */
  fields?: { key: string; label: string }[];
  /** Citation key for the whole question. */
  citation?: string;
  /** Rich educational content key for `info` questions (see content.ts). */
  infoKey?: string;
  /** If true, render an optional CHF budget number input alongside the options. */
  budgetInput?: boolean;
}

/**
 * A single answer. Shape depends on the question type:
 * - rank:       string[] (ordered option values, best first)
 * - scale:      string (selected option value)
 * - single:     string (selected option value)
 * - multi:      string[] (selected option values)
 * - numberPair: Record<string, number>
 * - number:     plain number (e.g. optional budget field)
 */
export type AnswerValue = string | string[] | Record<string, number> | number;

export type Answers = Record<string, AnswerValue>;

/** A recommendation template, loaded from templates.csv. */
export interface Template {
  id: string;
  name: string;
  description: string;
  /** Principles this template supports, in plain names. The only link to ranking. */
  supportsPrinciples: PrincipleId[];
  /** Citation keys, e.g. ["24"]. */
  citations: string[];
}

/** A single node/branch of the decision tree, loaded from tree.csv. */
export interface TreeNode {
  nodeId: string;
  /** Empty string for root nodes. */
  parentId: string;
  /** The question whose answer this node tests. */
  questionId: string;
  /** Match expression: exact option value, "any", or a threshold like ">=1000". */
  match: string;
  /** Template id to recommend when this node is reached (may be empty). */
  recommend: string;
}

/** Why a principle contributed weight to a template's score. */
export interface PrincipleContribution {
  principle: PrincipleId;
  /** 1 = highest priority. */
  rank: number;
  /** Weight contributed (derived purely from the user's ranking). */
  weight: number;
}

/** Why a tree path nominated a template. */
export interface TreeReason {
  nodeId: string;
  questionId: string;
  match: string;
}

/** A scored, explained recommendation produced by the engine. */
export interface Recommendation {
  template: Template;
  /** Total weight = sum of contributing principle weights. */
  score: number;
  /** Tree nodes that nominated this template. */
  nominatedBy: TreeReason[];
  /** Ranked-principle contributions that produced the score. */
  contributions: PrincipleContribution[];
}
