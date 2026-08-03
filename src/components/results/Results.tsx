import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCircleQuestion } from "@fortawesome/free-solid-svg-icons";
import type { DimensionDef, Question, RecommendationRow } from "../../types";
import { useWizard } from "../../state/wizardStore";
import { matchRecommendations } from "../../engine/match";
import { isAppwriteConfigured } from "../../lib/appwrite";
import { newSessionId, saveResponse } from "../../lib/repo/responses";
import { ContactForm } from "./ContactForm";

interface Props {
  recommendations: RecommendationRow[];
  /** Which dimensions constrain the results; admin-configurable at runtime. */
  dimensions: DimensionDef[];
  /** Needed to resolve which question feeds each matching dimension. */
  questions: Question[];
}

export function Results({ recommendations, dimensions, questions }: Props) {
  const navigate = useNavigate();
  const { answers, back, reset } = useWizard();
  const [contactVisible, setContactVisible] = useState(true);

  const matched = matchRecommendations(
    recommendations,
    answers as Record<string, unknown>,
    dimensions,
    questions,
  );

  // One id per visit to the results screen, generated before the write so a
  // help request can reference the run even if the write is still in flight.
  const sessionId = useRef(newSessionId());
  const [responseId, setResponseId] = useState<string | null>(null);

  // Record the completed run once, for research analysis. Anonymous, fire and
  // forget — a failed write never surfaces to the user.
  const saved = useRef(false);
  useEffect(() => {
    if (saved.current || !isAppwriteConfigured) return;
    saved.current = true;
    void saveResponse({
      sessionId: sessionId.current,
      answers,
      matched,
      completed: true,
    }).then(setResponseId);
    // Intentionally runs only on first render of the results screen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="results">
      {contactVisible && (
        <div className="contact-card">
          <button
            type="button"
            className="contact-card-close"
            aria-label="Dismiss"
            onClick={() => setContactVisible(false)}
          >
            ×
          </button>
          <p className="contact-card-title">Would you like help designing your process?</p>
          <p className="contact-card-sub">
            A team of researchers and deliberation designers will get in touch.
          </p>
          <ContactForm sessionId={sessionId.current} responseId={responseId} />
        </div>
      )}

      <header className="results-header">
        <div>
          <h2 className="results-title">Your process design</h2>
          <p className="results-sub">
            Based on your answers, here are some considerations for your deliberative process.
          </p>
        </div>
        {!contactVisible && (
          <button
            type="button"
            className="contact-restore-btn"
            aria-label="Get help designing your process"
            title="Get help designing your process"
            onClick={() => setContactVisible(true)}
          >
            <FontAwesomeIcon icon={faCircleQuestion} />
          </button>
        )}
      </header>

      {matched.length > 0 && (
        <ol className="results-list">
          {matched.map(({ row, matchedOn }, i) => (
            <li key={row.id ?? i} className="rec-card">
              <div className="rec-head">
                <span className="rec-rank">{i + 1}</span>
                <h3 className="rec-name">
                  {row.id ? (
                    <Link className="rec-link" to={`/recommendations/${row.id}`}>
                      {row.name}
                    </Link>
                  ) : (
                    row.name
                  )}
                </h3>
              </div>
              <p className="rec-desc">{row.description}</p>
              {row.pros && (
                <div className="rec-pros">
                  <strong>Pros</strong>
                  <p>{row.pros}</p>
                </div>
              )}
              {row.cons && (
                <div className="rec-cons">
                  <strong>Cons</strong>
                  <p>{row.cons}</p>
                </div>
              )}
              <p className="rec-because">Because you selected: {matchedOn}</p>
            </li>
          ))}
        </ol>
      )}

      <div className="results-actions no-print">
        <button type="button" className="btn btn-ghost" onClick={back}>
          Back to questions
        </button>
        <div className="results-actions-right">
          <button type="button" className="btn btn-ghost" onClick={reset}>
            Start over
          </button>
          <button type="button" className="btn btn-primary" onClick={() => navigate("/recommendations")}>
            See all recommendations
          </button>
        </div>
      </div>
    </div>
  );
}
