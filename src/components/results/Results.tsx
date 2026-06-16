import type { Template, TreeNode } from "../../types";
import { useWizard } from "../../state/wizardStore";
import { ContactForm } from "./ContactForm";

interface Props {
  templates: Template[];
  tree: TreeNode[];
}

interface PlaceholderCard {
  title: string;
  body: string;
}

function getPlaceholders(answers: Record<string, unknown>): PlaceholderCard[] {
  const cards: PlaceholderCard[] = [];

  const modes = answers["modes"] as string | undefined;
  if (modes === "face-to-face") {
    cards.push({
      title: "Face-to-face deliberation",
      body: "Face-to-face formats may cost more, but can also increase participation quality if recruitment is done carefully — in-person settings tend to foster richer discussion and stronger trust between participants.",
    });
  } else if (modes === "online") {
    cards.push({
      title: "Online deliberation",
      body: "Online formats can reach more people at lower cost and allow asynchronous participation, though maintaining deliberative quality and engagement requires careful platform design.",
    });
  } else if (modes === "hybrid") {
    cards.push({
      title: "Hybrid deliberation",
      body: "Combining online and face-to-face participation broadens reach while preserving the depth of in-person exchange — but requires extra coordination to ensure equitable participation across both modes.",
    });
  }

  const criteria = answers["criteria"] as string | undefined;
  if (criteria === "sortition") {
    cards.push({
      title: "Invited participants (sortition)",
      body: "Inviting a randomly selected sample gives you more control over the demographics of participants, which can strengthen equality — but may reduce inclusion by limiting who can take part.",
    });
  } else if (criteria === "self-selection") {
    cards.push({
      title: "Open participation (self-selection)",
      body: "Allowing anyone to participate can be more inclusive, but may reduce demographic equality. It is possible to achieve both through targeted outreach and recruitment strategies.",
    });
  }

  return cards;
}

export function Results({ templates: _templates, tree: _tree }: Props) {
  const { answers, back, reset } = useWizard();
  const placeholders = getPlaceholders(answers as Record<string, unknown>);

  return (
    <div className="results">
      <header className="results-header">
        <h2 className="results-title">Your process design</h2>
        <p className="results-sub">
          Based on your answers, here are some considerations for your deliberative process.
        </p>
      </header>

      {placeholders.length > 0 && (
        <ol className="results-list">
          {placeholders.map((card, i) => (
            <li key={i} className="rec-card">
              <div className="rec-head">
                <span className="rec-rank">{i + 1}</span>
                <h3 className="rec-name">{card.title}</h3>
              </div>
              <p className="rec-desc">{card.body}</p>
            </li>
          ))}
        </ol>
      )}

      <div className="contact-section">
        <h2 className="contact-title">Would you like help designing your process?</h2>
        <p className="contact-sub">
          Enter your details below and a team of professional researchers and deliberation
          designers will get in touch.
        </p>
        <ContactForm answers={answers} />
      </div>

      <div className="results-actions no-print">
        <button type="button" className="btn btn-ghost" onClick={back}>
          Back to questions
        </button>
        <button type="button" className="btn btn-ghost" onClick={reset}>
          Start over
        </button>
      </div>
    </div>
  );
}
