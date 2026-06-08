import { useEffect } from "react";
import type { Question } from "../../types";

interface Props {
  question: Question;
  value: string | undefined;
  onChange: (value: string) => void;
}

/**
 * A discrete slider over the question's options. The options themselves encode
 * the non-linear scale (20, 100, 500, 1000, 10k, ...), so each slider step is
 * one option regardless of the numeric gap between them.
 */
export function NonLinearScale({ question, value, onChange }: Props) {
  const options = question.options ?? [];
  const index = Math.max(0, options.findIndex((o) => o.value === value));

  // Guarantee a sensible default answer so downstream rules have a value.
  useEffect(() => {
    if (value === undefined && options.length > 0) {
      onChange(options[0].value);
    }
  }, [value, options, onChange]);

  if (options.length === 0) return null;

  return (
    <div className="scale">
      <input
        className="scale-range"
        type="range"
        min={0}
        max={options.length - 1}
        step={1}
        value={index}
        aria-label={question.title}
        aria-valuetext={options[index]?.label}
        onChange={(e) => onChange(options[Number(e.target.value)].value)}
      />
      <div className="scale-ticks">
        {options.map((opt, i) => (
          <button
            key={opt.value}
            type="button"
            className={i === index ? "scale-tick scale-tick-active" : "scale-tick"}
            onClick={() => onChange(opt.value)}
          >
            {opt.label}
          </button>
        ))}
      </div>
      <p className="scale-current">
        Selected: <strong>{options[index]?.label}</strong> participants
      </p>
    </div>
  );
}
