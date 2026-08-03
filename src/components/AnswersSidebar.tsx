import type { Question } from "../types";
import { useWizard } from "../state/wizardStore";
import { formatAnswer } from "../engine/formatAnswer";

interface Props {
  /** Active questions in display order, supplied by the data layer. */
  questions: Question[];
}

/** Shows all questions at all times. Clicking one jumps back to that step. */
export function AnswersSidebar({ questions: all }: Props) {
  const { step, answers, showResults, goTo } = useWizard();

  const questions = all.filter((q) => q.type !== "info");

  return (
    <aside className="sidebar">
      <h2 className="sidebar-title">Your answers</h2>
      <ul className="sidebar-list">
        {questions.map((q) => {
          const index = all.indexOf(q);
          const isCurrent = !showResults && index === step;
          const given = answers[q.id];
          return (
            <li key={q.id} className={isCurrent ? "sidebar-item sidebar-item-current" : "sidebar-item"}>
              <button type="button" className="sidebar-edit" onClick={() => goTo(index)}>
                <span className="sidebar-q">{q.title}</span>
                <span className="sidebar-a">
                  {given === undefined ? <em>Not answered yet</em> : formatAnswer(q, given)}
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
