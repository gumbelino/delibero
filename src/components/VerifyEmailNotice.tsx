import { useState } from "react";
import { useAuth } from "../state/authStore";

/**
 * A nudge for an editor whose email address was never confirmed.
 *
 * Verification is part of signing up now, but accounts created before that —
 * or straight from the Appwrite console — never went through it. This does not
 * block anything: their access came from the editors team, and revoking it over
 * an unconfirmed address would lock out the very people who grant access.
 */
export function VerifyEmailNotice({ email }: { email: string }) {
  const sendVerification = useAuth((s) => s.sendVerification);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send() {
    setBusy(true);
    setError(null);
    try {
      await sendVerification();
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send the email.");
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <p className="app-status admin-notice no-print">
        Verification email sent to <strong>{email}</strong>. Open the link to confirm
        the address.
      </p>
    );
  }

  return (
    <p className="app-status admin-notice no-print">
      <strong>{email}</strong> has not been confirmed.{" "}
      <button
        type="button"
        className="link-button"
        disabled={busy}
        onClick={() => void send()}
      >
        {busy ? "Sending…" : "Send the verification email"}
      </button>
      {error && <span className="app-error"> {error}</span>}
    </p>
  );
}
