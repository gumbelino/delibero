import { useState } from "react";
import type { Answers } from "../../types";

interface Props {
  answers: Answers;
}

export function ContactForm({ answers }: Props) {
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [sent, setSent] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const subject = encodeURIComponent("delibero – Request for help");
    const body = encodeURIComponent(
      `Name: ${name}\nContact: ${contact}\n\nAnswers:\n${JSON.stringify(answers, null, 2)}`,
    );
    window.location.href = `mailto:delibero@uzh.ch?subject=${subject}&body=${body}`;
    setSent(true);
  };

  if (sent) {
    return (
      <div className="contact-confirm">
        <p>Your email client should have opened. We will be in touch soon.</p>
      </div>
    );
  }

  return (
    <form className="contact-form" onSubmit={handleSubmit}>
      <div className="contact-field">
        <label className="contact-label" htmlFor="contact-name">
          Your name
        </label>
        <input
          id="contact-name"
          type="text"
          className="contact-input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>
      <div className="contact-field">
        <label className="contact-label" htmlFor="contact-info">
          Email or phone number
        </label>
        <input
          id="contact-info"
          type="text"
          className="contact-input"
          value={contact}
          onChange={(e) => setContact(e.target.value)}
          required
        />
      </div>
      <button type="submit" className="btn btn-primary">
        Request help
      </button>
    </form>
  );
}
