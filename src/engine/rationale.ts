// Turns a Recommendation into human-readable "why was this recommended to me?"
// text. Everything here reads straight off the same answers, questions, and
// CSV data the user already saw — there is no hidden scoring to explain.

import type { Answers, Question, Recommendation } from "../types";

const ORDINALS = ["", "1st", "2nd", "3rd", "4th", "5th", "6th", "7th"];

function optionLabel(question: Question | undefined, value: string): string {
  const opt = question?.options?.find((o) => o.value === value);
  return opt?.label ?? value;
}

/** Render the user's answer to a question as a readable phrase. */
export function formatAnswer(question: Question | undefined, answer: Answers[string]): string {
  if (answer == null) return "—";
  if (Array.isArray(answer)) {
    return answer.map((v) => optionLabel(question, v)).join(", ") || "—";
  }
  if (typeof answer === "object") {
    return Object.entries(answer)
      .map(([k, v]) => `${k}: ${v}`)
      .join(", ");
  }
  return optionLabel(question, answer);
}

export interface Why {
  /** One line per tree node that nominated this template. */
  nominations: string[];
  /** One line per ranked principle the template supports. */
  principles: string[];
}

export function buildWhy(
  rec: Recommendation,
  questions: Question[],
  answers: Answers,
): Why {
  const byId = new Map(questions.map((q) => [q.id, q]));

  const nominations = rec.nominatedBy.map((reason) => {
    const q = byId.get(reason.questionId);
    const title = q?.title ?? reason.questionId;
    const given = formatAnswer(q, answers[reason.questionId]);
    return `Your answer to “${title}” (${given}) matches the rule “${reason.match}”.`;
  });

  const principles = rec.contributions.map((c) => {
    if (c.rank > 0) {
      return `Supports ${c.principle}, which you ranked ${ORDINALS[c.rank] ?? `#${c.rank}`}.`;
    }
    return `Supports ${c.principle}.`;
  });

  return { nominations, principles };
}
