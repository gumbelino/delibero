import { useEffect } from "react";
import type { Question } from "../../types";

interface Props {
  question: Question;
  value: string[] | undefined;
  onChange: (value: string[]) => void;
}

/**
 * Ranked-choice ordering via move up / move down controls (keyboard-accessible
 * and simpler than drag-and-drop). The answer is the ordered list of option
 * values, best first.
 */
export function RankedChoice({ question, value, onChange }: Props) {
  const options = question.options ?? [];
  const defaultOrder = options.map((o) => o.value);
  const order = value ?? defaultOrder;

  // Persist the default order so the engine has a ranking even if untouched.
  useEffect(() => {
    if (value === undefined && defaultOrder.length > 0) {
      onChange(defaultOrder);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const labelOf = (val: string) => options.find((o) => o.value === val)?.label ?? val;
  const descOf = (val: string) => options.find((o) => o.value === val)?.description;

  const move = (from: number, to: number) => {
    if (to < 0 || to >= order.length) return;
    const next = [...order];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    onChange(next);
  };

  return (
    <ol className="ranked">
      {order.map((val, i) => (
        <li key={val} className="ranked-item">
          <span className="ranked-rank" aria-hidden="true">
            {i + 1}
          </span>
          <span className="ranked-body">
            <span className="option-label">{labelOf(val)}</span>
            {descOf(val) && <span className="option-desc">{descOf(val)}</span>}
          </span>
          <span className="ranked-controls">
            <button
              type="button"
              className="ranked-move"
              aria-label={`Move ${labelOf(val)} up`}
              disabled={i === 0}
              onClick={() => move(i, i - 1)}
            >
              ↑
            </button>
            <button
              type="button"
              className="ranked-move"
              aria-label={`Move ${labelOf(val)} down`}
              disabled={i === order.length - 1}
              onClick={() => move(i, i + 1)}
            >
              ↓
            </button>
          </span>
        </li>
      ))}
    </ol>
  );
}
