import { useState } from "react";
import { useAuth } from "../state/authStore";
import { isAppwriteConfigured } from "../lib/appwrite";

/**
 * Sign-in and sign-up for the admin area.
 *
 * Anyone may create an account, but a new account has no edit rights: it
 * belongs to no team, so Appwrite rejects its writes and the app shows the
 * "request access" screen. Editing requires an administrator to add the account
 * to the editors team.
 */
export function AdminLogin() {
  const login = useAuth((s) => s.login);
  const register = useAuth((s) => s.register);
  const error = useAuth((s) => s.error);

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const signup = mode === "signup";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (signup) await register(name.trim() || email, email, password);
      else await login(email, password);
    } catch {
      // The store holds the message; nothing else to do here.
    } finally {
      setBusy(false);
    }
  }

  if (!isAppwriteConfigured) {
    return (
      <div className="admin-login">
        <h2 className="results-title">Admin</h2>
        <p className="app-status app-error">
          Appwrite is not configured. Set <code>VITE_APPWRITE_ENDPOINT</code>{" "}
          and <code>VITE_APPWRITE_PROJECT_ID</code> (see{" "}
          <code>.env.example</code>) to enable editing.
        </p>
      </div>
    );
  }

  return (
    <div className="admin-login">
      <h2 className="results-title">
        {signup ? "Create an account" : "Admin sign-in"}
      </h2>
      <p className="results-sub">
        {signup
          ? "Accounts start without editing rights. After signing up you can request access from the system administrator."
          : "Editing the knowledge base requires an editor account."}
      </p>

      <form className="admin-login-form" onSubmit={submit}>
        {signup && (
          <label className="rec-form-field">
            <span className="rec-form-label">Name</span>
            <input
              type="text"
              className="rec-form-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
            />
          </label>
        )}

        <label className="rec-form-field">
          <span className="rec-form-label">Email</span>
          <input
            type="email"
            className="rec-form-input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="username"
            required
          />
        </label>

        <label className="rec-form-field">
          <span className="rec-form-label">Password</span>
          <input
            type="password"
            className="rec-form-input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={signup ? "new-password" : "current-password"}
            minLength={8}
            required
          />
          {signup && (
            <span className="admin-param-hint">At least 8 characters.</span>
          )}
        </label>

        {error && <p className="app-status app-error">{error}</p>}

        <button type="submit" className="btn btn-primary" disabled={busy}>
          {busy ? "Working…" : signup ? "Create account" : "Sign in"}
        </button>
      </form>

      <p className="admin-login-switch">
        {signup ? "Already have an account?" : "No account yet?"}{" "}
        <button
          type="button"
          className="link-button"
          onClick={() => setMode(signup ? "signin" : "signup")}
        >
          {signup ? "Sign in" : "Create account"}
        </button>
      </p>
    </div>
  );
}
