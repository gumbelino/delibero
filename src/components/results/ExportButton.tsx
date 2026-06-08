import type { Answers, Question, Recommendation } from "../../types";
import { formatAnswer, buildWhy } from "../../engine/rationale";

interface Props {
  answers: Answers;
  questions: Question[];
  recommendations: Recommendation[];
}

/** Builds the exportable result object (answers + explained recommendations). */
function buildExport(answers: Answers, questions: Question[], recs: Recommendation[]) {
  return {
    generatedAt: new Date().toISOString(),
    tool: "Deliberation Process Design Tool (DPDT)",
    answers: questions
      .filter((q) => q.type !== "info")
      .map((q) => ({
        question: q.title,
        answer: answers[q.id] ?? null,
        answerText: formatAnswer(q, answers[q.id]),
      })),
    recommendations: recs.map((r, i) => {
      const why = buildWhy(r, questions, answers);
      return {
        rank: i + 1,
        id: r.template.id,
        name: r.template.name,
        description: r.template.description,
        priorityAlignmentScore: r.score,
        why: { fromAnswers: why.nominations, fromPriorities: why.principles },
      };
    }),
  };
}

export function ExportButton({ answers, questions, recommendations }: Props) {
  const downloadJson = () => {
    const data = buildExport(answers, questions, recommendations);
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "dpdt-recommendations.json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="export">
      <button type="button" className="btn btn-secondary" onClick={downloadJson}>
        Download results (JSON)
      </button>
      <button type="button" className="btn btn-secondary" onClick={() => window.print()}>
        Print / Save as PDF
      </button>
    </div>
  );
}
