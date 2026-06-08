import { useState } from "react";
import type { Recommendation, Answers } from "../../types";
import { QUESTIONS } from "../../data/questions";
import { buildWhy } from "../../engine/rationale";

interface Props {
  rec: Recommendation;
  answers: Answers;
}

/** Collapsible "why was this recommended to me?" explanation. */
export function WhyExpander({ rec, answers }: Props) {
  const [open, setOpen] = useState(false);
  const why = buildWhy(rec, QUESTIONS, answers);

  return (
    <div className="why">
      <button
        type="button"
        className="why-toggle"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        {open ? "Hide reasoning" : "Why was this recommended to me?"}
      </button>

      {open && (
        <div className="why-body">
          {why.nominations.length > 0 && (
            <>
              <h4 className="why-heading">From your answers</h4>
              <ul className="why-list">
                {why.nominations.map((line, i) => (
                  <li key={i}>{line}</li>
                ))}
              </ul>
            </>
          )}
          <h4 className="why-heading">From your priorities</h4>
          <ul className="why-list">
            {why.principles.map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>
          <p className="why-score">
            Priority-alignment score: <strong>{rec.score}</strong>
          </p>
        </div>
      )}
    </div>
  );
}
