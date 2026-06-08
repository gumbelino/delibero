import { QUESTIONS } from "../data/questions";
import { useWizard } from "../state/wizardStore";
import { formatAnswer } from "../engine/rationale";

/**
 * Shows every answered question so far. Clicking one jumps back to that step
 * so the user can change it, then return.
 */
export function AnswersSidebar() {
  const { step, answers, showResults, goTo } = useWizard();

  // Show questions that collect an answer and that the user has reached.
  const answered = QUESTIONS.filter(
    (q) => q.type !== "info" && (showResults || QUESTIONS.indexOf(q) <= step),
  );

  if (answered.length === 0) {
    return (
      <aside className="sidebar">
        <h2 className="sidebar-title">Your answers</h2>
        <p className="sidebar-empty">Your answers will appear here as you go.</p>
      </aside>
    );
  }

  return (
    <aside className="sidebar">
      <h2 className="sidebar-title">Your answers</h2>
      <ul className="sidebar-list">
        {answered.map((q) => {
          const index = QUESTIONS.indexOf(q);
          const isCurrent = !showResults && index === step;
          const given = answers[q.id];
          return (
            <li key={q.id} className={isCurrent ? "sidebar-item sidebar-item-current" : "sidebar-item"}>
              <button type="button" className="sidebar-edit" onClick={() => goTo(index)}>
                <span className="sidebar-q">{q.title}</span>
                <span className="sidebar-a">
                  {given === undefined ? "Not answered yet" : formatAnswer(q, given)}
                </span>
                <span className="sidebar-change">Edit</span>
              </button>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
