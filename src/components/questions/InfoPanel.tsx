import type { Question } from "../../types";
import { INFO_PANELS, CITATIONS } from "../../data/content";

interface Props {
  question: Question;
}

/** Educational panel (e.g. the scaling trade-offs). Collects no answer. */
export function InfoPanel({ question }: Props) {
  const panel = question.infoKey ? INFO_PANELS[question.infoKey] : undefined;
  if (!panel) return null;

  return (
    <div className="info">
      <p className="info-intro">{panel.intro}</p>
      <ul className="info-list">
        {panel.items.map((item) => (
          <li key={item.title} className="info-item">
            <h3 className="info-item-title">{item.title}</h3>
            <p className="info-item-body">{item.body}</p>
            {item.citation && CITATIONS[item.citation] && (
              <p className="info-item-cite">{CITATIONS[item.citation]}</p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
