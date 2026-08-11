import { useCallback, useEffect, useRef, useState } from "react";
import type { AccessRequest } from "../types";
import { createAccessRequest, listMyAccessRequests } from "../lib/repo/accessRequests";
import { useAuth } from "../state/authStore";

interface Props {
  user: { id: string; email: string; name: string; emailVerified: boolean };
  onSignOut: () => void;
}

/**
 * Where a signed-in account with no edit rights lands — the state every
 * self-registered account starts in.
 *
 * There is one thing to do here: confirm the email address. The access request
 * files itself the moment that succeeds, because a signed-in account on this
 * screen has already said what it wants by being here — making them press a
 * second button only adds a way to get stuck halfway.
 *
 * The request matters because listing accounts is a server-only Appwrite API:
 * without a row written here, the admin area has no way to know anyone is
 * waiting.
 */
export function RequestAccess({ user, onSignOut }: Props) {
  const sendVerification = useAuth((s) => s.sendVerification);
  const init = useAuth((s) => s.init);
  const [existing, setExisting] = useState<AccessRequest | null>(null);
  const [checking, setChecking] = useState(true);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Guards the auto-file effect against a second run — React may re-invoke it,
  // and a duplicate row would show up as a duplicate request in the queue.
  const filing = useRef(false);

  const load = useCallback(async () => {
    try {
      const mine = await listMyAccessRequests(user.id);
      setExisting(mine[0] ?? null);
    } catch {
      // Not being able to read back an old request is not worth an error
      // screen — the effect below simply files a new one.
      setExisting(null);
    } finally {
      setChecking(false);
    }
  }, [user.id]);

  useEffect(() => {
    void load();
  }, [load]);

  // The emailed link is confirmed in whichever tab opened it, leaving this one
  // holding a stale "unverified". Re-check when it regains focus, rather than
  // asking the reader to tell us what already happened.
  useEffect(() => {
    if (user.emailVerified) return;
    const recheck = () => void init();
    window.addEventListener("focus", recheck);
    return () => window.removeEventListener("focus", recheck);
  }, [user.emailVerified, init]);

  // Confirming the address *is* the request. A declined one is not re-filed on
  // its own — that would put it straight back in the queue an editor just
  // cleared — so it gets a button instead.
  useEffect(() => {
    if (checking || !user.emailVerified || existing || filing.current) return;
    filing.current = true;
    void file();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checking, user.emailVerified, existing]);

  async function file() {
    setBusy(true);
    setError(null);
    try {
      setExisting(
        await createAccessRequest({ id: user.id, email: user.email, name: user.name }),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send the request.");
      filing.current = false;
    } finally {
      setBusy(false);
    }
  }

  async function resend() {
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

  const signOut = (
    <div className="results-actions">
      <button type="button" className="btn btn-ghost" onClick={onSignOut}>
        Sign out
      </button>
    </div>
  );

  // Step one and only: prove the address is yours. An editor approving a
  // request is trusting the address it names.
  if (!user.emailVerified) {
    return (
      <div className="admin-login">
        <h2 className="results-title">Confirm your email</h2>
        <p className="results-sub">
          We sent a link to <strong>{user.email}</strong>. Open it and your request for
          editor access goes to the research team automatically.
        </p>
        {sent && (
          <p className="app-status admin-notice">
            Sent again. Check your spam folder if it does not arrive.
          </p>
        )}
        {error && <p className="app-status app-error">{error}</p>}
        <div className="results-actions">
          <button
            type="button"
            className="btn btn-primary"
            disabled={busy}
            onClick={() => void resend()}
          >
            {busy ? "Sending…" : "Resend the email"}
          </button>
        </div>
        {signOut}
      </div>
    );
  }

  if (existing?.status === "declined") {
    return (
      <div className="admin-login">
        <h2 className="results-title">Access required</h2>
        <p className="results-sub">
          You are signed in as <strong>{user.email}</strong>. An earlier request for
          editor access was declined — you can ask again if something has changed.
        </p>
        {error && <p className="app-status app-error">{error}</p>}
        <div className="results-actions">
          <button
            type="button"
            className="btn btn-primary"
            disabled={busy}
            onClick={() => void file()}
          >
            {busy ? "Sending…" : "Ask again"}
          </button>
        </div>
        {signOut}
      </div>
    );
  }

  const pending = Boolean(existing);

  return (
    <div className="admin-login">
      <h2 className="results-title">
        {pending ? "Waiting for approval" : "Access required"}
      </h2>
      <p className="results-sub">
        You are signed in as <strong>{user.email}</strong>.{" "}
        {checking || busy
          ? "Sending your request for editor access…"
          : pending
            ? "Your request for editor access has been sent."
            : "Your request for editor access could not be sent."}
      </p>

      {pending && (
        <p className="results-sub">
          An editor reviews it and, once they approve, you will get an email
          invitation. Open it and you can start editing.
        </p>
      )}

      {error && <p className="app-status app-error">{error}</p>}

      {!pending && !checking && !busy && (
        <div className="results-actions">
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => void file()}
          >
            Try again
          </button>
        </div>
      )}

      {signOut}
    </div>
  );
}
