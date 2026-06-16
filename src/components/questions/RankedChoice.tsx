import { useEffect, useRef, useState } from "react";
import type { Question } from "../../types";

interface Props {
  question: Question;
  value: string[] | undefined;
  onChange: (value: string[]) => void;
}

export function RankedChoice({ question, value, onChange }: Props) {
  const options = question.options ?? [];
  const allValues = options.map((o) => o.value);
  const order = value ?? allValues;

  // Persist the default order so the engine has a ranking even if untouched.
  useEffect(() => {
    if (value === undefined && allValues.length > 0) {
      onChange(allValues);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const labelOf = (val: string) => options.find((o) => o.value === val)?.label ?? val;
  const descOf  = (val: string) => options.find((o) => o.value === val)?.description;

  // Items not in `order` have been explicitly dismissed.
  const dismissed = allValues.filter((v) => !order.includes(v));

  const dismiss = (val: string) => onChange(order.filter((v) => v !== val));
  const restore = (val: string) => onChange([...order, val]);

  // ── keyboard reorder ────────────────────────────────────────────────────────
  const move = (from: number, to: number) => {
    if (to < 0 || to >= order.length) return;
    const next = [...order];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    onChange(next);
  };

  // ── drag-and-drop ───────────────────────────────────────────────────────────
  const dragFrom = useRef<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);

  const handleDragStart = (i: number) => { dragFrom.current = i; };
  const handleDragOver  = (e: React.DragEvent, i: number) => {
    e.preventDefault();
    if (dragOver !== i) setDragOver(i);
  };
  const handleDrop = (i: number) => {
    if (dragFrom.current !== null && dragFrom.current !== i) move(dragFrom.current, i);
    dragFrom.current = null;
    setDragOver(null);
  };
  const handleDragEnd = () => { dragFrom.current = null; setDragOver(null); };

  return (
    <div className="ranked-wrap">
      <ol className="ranked">
        {order.map((val, i) => (
          <li
            key={val}
            className={["ranked-item", dragOver === i ? "ranked-item-over" : ""].join(" ").trim()}
            draggable
            onDragStart={() => handleDragStart(i)}
            onDragOver={(e) => handleDragOver(e, i)}
            onDrop={() => handleDrop(i)}
            onDragEnd={handleDragEnd}
          >
            <span className="ranked-drag-handle" aria-hidden="true">⠿</span>
            <span className="ranked-rank" aria-hidden="true">{i + 1}</span>
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
              >↑</button>
              <button
                type="button"
                className="ranked-move"
                aria-label={`Move ${labelOf(val)} down`}
                disabled={i === order.length - 1}
                onClick={() => move(i, i + 1)}
              >↓</button>
              <button
                type="button"
                className="ranked-dismiss"
                aria-label={`Remove ${labelOf(val)}`}
                onClick={() => dismiss(val)}
              >✕</button>
            </span>
          </li>
        ))}
      </ol>

      {dismissed.length > 0 && (
        <div className="ranked-dismissed">
          <p className="ranked-dismissed-label">Not included</p>
          <ul className="ranked-dismissed-list">
            {dismissed.map((val) => (
              <li key={val} className="ranked-item ranked-item-dismissed">
                <span className="ranked-body">
                  <span className="option-label">{labelOf(val)}</span>
                  {descOf(val) && <span className="option-desc">{descOf(val)}</span>}
                </span>
                <button
                  type="button"
                  className="ranked-restore"
                  aria-label={`Restore ${labelOf(val)}`}
                  onClick={() => restore(val)}
                >
                  Restore
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
