import { useMemo } from "react";
import type { Template, TreeNode } from "../../types";
import { QUESTIONS } from "../../data/questions";
import { CITATIONS } from "../../data/content";
import { useWizard } from "../../state/wizardStore";
import { recommend } from "../../engine/recommend";
import { WhyExpander } from "./WhyExpander";
import { ExportButton } from "./ExportButton";

interface Props {
  templates: Template[];
  tree: TreeNode[];
}

export function Results({ templates, tree }: Props) {
  const { answers, back, reset } = useWizard();

  const recommendations = useMemo(
    () => recommend(templates, tree, answers),
    [templates, tree, answers],
  );

  return (
    <div className="results">
      <header className="results-header">
        <h2 className="results-title">Your recommended process designs</h2>
        <p className="results-sub">
          Ranked by how well each design fits your answers and the priorities you set. Every
          recommendation can be traced back to your choices.
        </p>
      </header>

      <ol className="results-list">
        {recommendations.map((rec, i) => (
          <li key={rec.template.id} className="rec-card">
            <div className="rec-head">
              <span className="rec-rank">{i + 1}</span>
              <h3 className="rec-name">{rec.template.name}</h3>
            </div>
            <p className="rec-desc">{rec.template.description}</p>
            <div className="rec-principles">
              {rec.template.supportsPrinciples.map((p) => (
                <span key={p} className="rec-tag">
                  {p}
                </span>
              ))}
            </div>
            {rec.template.citations.length > 0 && (
              <p className="rec-cite">
                {rec.template.citations
                  .map((c) => CITATIONS[c] ?? `[${c}]`)
                  .join(" ")}
              </p>
            )}
            <WhyExpander rec={rec} answers={answers} />
          </li>
        ))}
      </ol>

      <div className="results-actions no-print">
        <button type="button" className="btn btn-ghost" onClick={back}>
          Back to questions
        </button>
        <ExportButton answers={answers} questions={QUESTIONS} recommendations={recommendations} />
        <button type="button" className="btn btn-ghost" onClick={reset}>
          Start over
        </button>
      </div>
    </div>
  );
}
