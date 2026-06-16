import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCircleQuestion } from "@fortawesome/free-solid-svg-icons";
import type { Template, TreeNode, RecommendationRow } from "../../types";
import { useWizard } from "../../state/wizardStore";
import { matchRecommendations } from "../../engine/match";
import { ContactForm } from "./ContactForm";

interface Props {
  templates: Template[];
  tree: TreeNode[];
  recommendations: RecommendationRow[];
}

export function Results({ templates: _templates, tree: _tree, recommendations }: Props) {
  const navigate = useNavigate();
  const { answers, back, reset } = useWizard();
  const [contactVisible, setContactVisible] = useState(true);

  const matched = matchRecommendations(recommendations, answers as Record<string, unknown>);

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
          <ContactForm answers={answers} />
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
            <li key={i} className="rec-card">
              <div className="rec-head">
                <span className="rec-rank">{i + 1}</span>
                <h3 className="rec-name">{row.name}</h3>
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
