import { useState } from "react";
import { saveContactRequest } from "../../lib/repo/contacts";

interface Props {
  /** Identifies this wizard run; always available. */
  sessionId: string;
  /**
   * Row id of this run's saved response. Null while that write is still in
   * flight, or if it failed — the request is still saved either way, linked by
   * `sessionId`.
   */
  responseId: string | null;
}

export function ContactForm({ sessionId, responseId }: Props) {
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await saveContactRequest({
        name,
        contact,
        sessionId,
        responseId: responseId ?? undefined,
      });
      setSent(true);
    } catch (err) {
      // The visitor expects to be contacted, so a failure must be visible and
      // must leave their typed details in place to retry.
      setError(
        err instanceof Error
          ? `Could not send your request: ${err.message}`
          : "Could not send your request. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <div className="contact-confirm">
        <p>
          Thank you — your request has been received, along with the answers you gave.
          The team will get in touch using the details you provided.
        </p>
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
          autoComplete="name"
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

      {error && <p className="app-status app-error">{error}</p>}

      <button type="submit" className="btn btn-primary" disabled={busy}>
        {busy ? "Sending…" : "Request help"}
      </button>
    </form>
  );
}
