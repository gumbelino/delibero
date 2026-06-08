import type { Question } from "../../types";

interface Props {
  question: Question;
  value: Record<string, number> | undefined;
  onChange: (value: Record<string, number>) => void;
}

export function NumberPair({ question, value, onChange }: Props) {
  const current = value ?? {};
  const fields = question.fields ?? [];

  const setField = (key: string, raw: string) => {
    const num = raw === "" ? 0 : Number(raw);
    onChange({ ...current, [key]: Number.isNaN(num) ? 0 : num });
  };

  const reached = current.reached ?? 0;
  const participating = current.participating ?? 0;
  const ratio = reached > 0 ? participating / reached : 0;

  return (
    <div className="numberpair">
      <div className="numberpair-fields">
        {fields.map((f) => (
          <label key={f.key} className="numberpair-field">
            <span className="numberpair-label">{f.label}</span>
            <input
              className="numberpair-input"
              type="number"
              min={0}
              inputMode="numeric"
              value={current[f.key] ?? ""}
              onChange={(e) => setField(f.key, e.target.value)}
            />
          </label>
        ))}
      </div>
      {reached > 0 && (
        <p className="numberpair-ratio">
          Conversion: <strong>{(ratio * 100).toFixed(1)}%</strong> of those reached take part.
        </p>
      )}
    </div>
  );
}
