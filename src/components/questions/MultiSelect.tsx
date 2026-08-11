import type { Question } from "../../types";

interface Props {
  question: Question;
  value: string[] | undefined;
  onChange: (value: string[]) => void;
}

export function MultiSelect({ question, value, onChange }: Props) {
  const selected = value ?? [];

  const toggle = (optValue: string) => {
    if (selected.includes(optValue)) {
      onChange(selected.filter((v) => v !== optValue));
    } else {
      onChange([...selected, optValue]);
    }
  };

  const hasGroups = question.options?.some((o) => o.group);

  if (hasGroups) {
    const groups: string[] = [];
    for (const opt of question.options ?? []) {
      if (opt.group && !groups.includes(opt.group)) groups.push(opt.group);
    }

    return (
      <div className="options-grouped" role="group" aria-label={question.title}>
        {groups.map((group) => {
          const groupOpts = (question.options ?? []).filter((o) => o.group === group);
          return (
            <div key={group} className="options-group">
              <h3 className="options-group-label">{group}</h3>
              <div className="options options-wrap">
                {groupOpts.map((opt) => {
                  const isOn = selected.includes(opt.value);
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      role="checkbox"
                      aria-checked={isOn}
                      className={isOn ? "option option-chip option-selected" : "option option-chip"}
                      onClick={() => toggle(opt.value)}
                    >
                      <span className="option-label">{opt.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="options options-stack" role="group" aria-label={question.title}>
      {question.options?.map((opt) => {
        const isOn = selected.includes(opt.value);
        return (
          <button
            key={opt.value}
            type="button"
            role="checkbox"
            aria-checked={isOn}
            className={isOn ? "option option-selected" : "option"}
            onClick={() => toggle(opt.value)}
          >
            <span className="option-check" aria-hidden="true">
              {isOn ? "✓" : ""}
            </span>
            <span className="option-body">
              <span className="option-label">{opt.label}</span>
              {opt.description && <span className="option-desc">{opt.description}</span>}
            </span>
          </button>
        );
      })}
    </div>
  );
}
