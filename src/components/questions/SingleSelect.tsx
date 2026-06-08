import type { Question } from "../../types";

interface Props {
  question: Question;
  value: string | undefined;
  onChange: (value: string) => void;
}

export function SingleSelect({ question, value, onChange }: Props) {
  return (
    <div className="options options-stack" role="radiogroup" aria-label={question.title}>
      {question.options?.map((opt) => {
        const selected = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={selected}
            className={selected ? "option option-selected" : "option"}
            onClick={() => onChange(opt.value)}
          >
            <span className="option-label">{opt.label}</span>
            {opt.description && <span className="option-desc">{opt.description}</span>}
          </button>
        );
      })}
    </div>
  );
}
