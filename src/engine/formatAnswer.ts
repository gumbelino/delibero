import type { Answers, Question } from "../types";

function optionLabel(question: Question | undefined, value: string): string {
  const opt = question?.options?.find((o) => o.value === value);
  return opt?.label ?? value;
}

/** Render the user's answer to a question as a readable phrase. */
export function formatAnswer(question: Question | undefined, answer: Answers[string]): string {
  if (answer == null) return "—";
  if (typeof answer === "number") return String(answer);
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
