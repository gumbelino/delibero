import { QUESTIONS } from "../data/questions";
import { useWizard } from "../state/wizardStore";
import { QuestionView } from "./questions/QuestionView";

/** The one-question-at-a-time wizard shell: progress, the question, and nav. */
export function Wizard() {
  const { step, answers, setAnswer, next, back } = useWizard();
  const question = QUESTIONS[step];
  const total = QUESTIONS.length;
  const isFirst = step === 0;
  const isLast = step === total - 1;

  return (
    <div className="wizard">
      <div className="wizard-progress">
        <div className="wizard-progress-bar" role="progressbar" aria-valuenow={step + 1} aria-valuemin={1} aria-valuemax={total}>
          {QUESTIONS.map((q, i) => (
            <span
              key={q.id}
              className={i <= step ? "wizard-progress-seg wizard-progress-seg-on" : "wizard-progress-seg"}
            />
          ))}
        </div>
        <p className="wizard-progress-label">
          Question {step + 1} of {total}
        </p>
      </div>

      <QuestionView
        question={question}
        value={answers[question.id]}
        onChange={(value) => setAnswer(question.id, value)}
      />

      <div className="wizard-nav">
        {!isFirst && (
          <button type="button" className="btn btn-ghost" onClick={back}>
            Back
          </button>
        )}
        <button type="button" className="btn btn-primary" onClick={next}>
          {isLast ? "See recommendations" : "Next"}
        </button>
      </div>
    </div>
  );
}
