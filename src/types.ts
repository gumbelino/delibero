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
  /** Appwrite row id. Absent for questions loaded from the bundled JSON. */
  rowId?: string;
  /** Stable slug; answers are keyed by this, so it is immutable once saved. */
  id: string;
  type: QuestionType;
  /** Position in the wizard. */
  order: number;
  /**
   * Dimension supplying this question's options. Empty for `info` and
   * `numberPair`, which collect no option-based answer.
   */
  dimension?: DimensionId;
  /** Unticking hides a question without deleting it or its answers. */
  enabled: boolean;
  title: string;
  /** Optional helper text shown beneath the title. */
  help?: string;
  /** Options for rank/single/multi questions. */
  options?: QuestionOption[];
  /** Labels for the two fields of a numberPair question. */
  fields?: { key: string; label: string }[];
  /** Citation key for the whole question. */
  citation?: string;
  /** Rich educational content key for `info` questions (see content.ts). */
  infoKey?: string;
}

/**
 * A single answer. Shape depends on the question type:
 * - rank:       string[] (ordered option values, best first)
 * - single:     string (selected option value)
 * - multi:      string[] (selected option values)
 * - numberPair: Record<string, number>
 */
export type AnswerValue = string | string[] | Record<string, number> | number;

export type Answers = Record<string, AnswerValue>;

/**
 * A dimension key, e.g. "size" or an admin-created one like "duration".
 * Not a closed union — admins define new dimensions at runtime.
 */
export type DimensionId = string;

/** A row from recommendations.csv (or the Appwrite `recommendations` table). */
export interface RecommendationRow {
  /** Appwrite row id. Absent for rows parsed from CSV that have never been saved. */
  id?: string;
  name: string;
  description: string;
  pros: string;
  cons: string;
  /**
   * Long-form Markdown, shown only on the recommendation's own page — never on
   * cards. Optional; most recommendations have none.
   */
  body: string;
  /**
   * Values per dimension, keyed by dimension key. Each holds `any`, a single
   * value, or a comma-separated list. A dimension absent from this map is
   * treated as `any`.
   *
   * This is a map rather than fixed fields so that adding a dimension needs no
   * type change, no database migration, and no code change.
   */
  dims: Record<DimensionId, string>;
}

/**
 * A dimension admins can create, rename, or delete. Seeded dimensions have no
 * special status — the seed set is a starting point, not a protected core — but
 * deleting one that a question asks for leaves that question with no options,
 * so the editor warns first.
 */
export interface DimensionDef {
  id?: string;
  /** Stable slug used as the key in `RecommendationRow.dims`. Immutable. */
  key: DimensionId;
  label: string;
  description?: string;
  /**
   * When true, this dimension filters which recommendations a user is shown.
   * When false it is a descriptive tag only (like stage / principles).
   */
  matching: boolean;
  order: number;
}

/** One allowed value of a dimension, stored in the Appwrite `parameters` table. */
export interface Parameter {
  id?: string;
  dimension: DimensionId;
  /** Stable slug written into recommendation rows and answers, e.g. "small". */
  value: string;
  /** Shown to users as the answer option, and to admins as the value's name. */
  label: string;
  description?: string;
  /** Optional heading that groups options within a question (e.g. "Age"). */
  group?: string;
  /** Optional hex colour, used by ranked-choice questions. */
  color?: string;
  /** Sort position within the dimension. */
  order: number;
}

/** Parameter values grouped by the dimension they belong to. */
export type ParameterSet = Record<DimensionId, Parameter[]>;

export type AccessRequestStatus = "pending" | "approved" | "declined";

/** Someone who created an account and asked to be made an editor. */
export interface AccessRequest {
  id: string;
  userId: string;
  email: string;
  name?: string;
  status: AccessRequestStatus;
  createdAt?: string;
}

/** A member of the `editors` team, as the browser sees them. */
export interface Editor {
  membershipId: string;
  userId: string;
  email: string;
  name: string;
  roles: string[];
  joinedAt?: string;
}

/** A recommendation matched against user answers. */
export interface MatchedRecommendation {
  row: RecommendationRow;
  /** Human-readable attribution, e.g. "size: small" */
  matchedOn: string;
}
