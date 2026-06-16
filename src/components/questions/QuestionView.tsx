import type { Question, AnswerValue } from "../../types";
import { CITATIONS, IAP2_URL } from "../../data/content";
import { SingleSelect } from "./SingleSelect";
import { MultiSelect } from "./MultiSelect";
import { NonLinearScale } from "./NonLinearScale";
import { RankedChoice } from "./RankedChoice";
import { NumberPair } from "./NumberPair";
import { InfoPanel } from "./InfoPanel";

interface Props {
  question: Question;
  value: AnswerValue | undefined;
  onChange: (value: AnswerValue) => void;
}

/** Dispatches to the renderer for the question's type. */
export function QuestionView({ question, value, onChange }: Props) {
  return (
    <section className="question">
      <h2 className="question-title">{question.title}</h2>
      {question.help && <p className="question-help">{question.help}</p>}

      {question.type === "single" && (
        <SingleSelect question={question} value={value as string} onChange={onChange} />
      )}
      {question.type === "multi" && (
        <MultiSelect question={question} value={value as string[]} onChange={onChange} />
      )}
      {question.type === "scale" && (
        <NonLinearScale question={question} value={value as string} onChange={onChange} />
      )}
      {question.type === "rank" && (
        <RankedChoice question={question} value={value as string[]} onChange={onChange} />
      )}
      {question.type === "numberPair" && (
        <NumberPair
          question={question}
          value={value as Record<string, number>}
          onChange={onChange}
        />
      )}
      {question.type === "info" && <InfoPanel question={question} />}

      {question.citation && CITATIONS[question.citation] && (
        <p className="question-cite">
          {question.citation === "iap2" ? (
            <a href={IAP2_URL} target="_blank" rel="noopener noreferrer">
              {CITATIONS[question.citation]}
            </a>
          ) : (
            CITATIONS[question.citation]
          )}
        </p>
      )}
    </section>
  );
}
