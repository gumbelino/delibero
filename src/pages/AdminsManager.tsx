import { useCallback, useEffect, useState } from "react";
import type { AccessRequest, Editor } from "../types";
import {
  deleteAccessRequest,
  listAccessRequests,
  setAccessRequestStatus,
} from "../lib/repo/accessRequests";
import { approveEditor, listEditors, removeEditor } from "../lib/repo/editors";

interface Props {
  /**
   * The signed-in account: excluded from its own Remove button, and the one
   * identity always known even when Appwrite hides membership details.
   */
  currentUser: { id: string; email: string; name: string };
}

function formatDate(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

/**
 * Who may edit the knowledge base: the current editors, and the people waiting
 * to become one.
 *
 * Approving grants access outright. It has to go through the `approve-editor`
 * function to do that — a browser SDK can only *invite* someone to a team —
 * so this is the one action here that is not a direct Appwrite call.
 */
export function AdminsManager({ currentUser }: Props) {
  const [editors, setEditors] = useState<Editor[]>([]);
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [showHandled, setShowHandled] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [members, rows] = await Promise.all([listEditors(), listAccessRequests()]);
      setEditors(members);
      setRequests(rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load the admin list.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const pending = requests.filter((r) => r.status === "pending");
  const handled = requests.filter((r) => r.status !== "pending");

  /**
   * Who an editor actually is. Appwrite returns blank name and email when
   * membership privacy is enabled for the project, so fall back to your own
   * session for your own row, then to the access request that let them in.
   */
  function identify(editor: Editor): { name: string; email: string } {
    if (editor.userId === currentUser.id) {
      return { name: currentUser.name, email: currentUser.email };
    }
    const req = requests.find((r) => r.userId === editor.userId);
    return {
      name: editor.name || req?.name || "",
      email: editor.email || req?.email || "",
    };
  }

  // Only worth explaining when something is actually missing.
  const anyHidden = editors.some((e) => !identify(e).email);

  async function approve(req: AccessRequest) {
    setBusyId(req.id);
    setError(null);
    setNotice(null);
    try {
      // The function grants access and marks the request approved in one go,
      // so there is nothing to set here — just reload and report.
      const { warning } = await approveEditor(req.id);
      setNotice(
        warning ??
          `${req.email} can edit now. Nothing for them to accept — they just need to ` +
            "reload the admin page.",
      );
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not grant access.");
    } finally {
      setBusyId(null);
    }
  }

  async function decline(req: AccessRequest) {
    if (!window.confirm(`Decline the request from ${req.email}?`)) return;
    setBusyId(req.id);
    setError(null);
    try {
      await setAccessRequestStatus(req.id, "declined");
      setRequests((rs) =>
        rs.map((r) => (r.id === req.id ? { ...r, status: "declined" as const } : r)),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update the request.");
    } finally {
      setBusyId(null);
    }
  }

  async function forget(req: AccessRequest) {
    if (!window.confirm(`Delete the record of ${req.email}'s request?`)) return;
    setBusyId(req.id);
    try {
      await deleteAccessRequest(req.id);
      setRequests((rs) => rs.filter((r) => r.id !== req.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete the request.");
    } finally {
      setBusyId(null);
    }
  }

  async function revoke(editor: Editor) {
    if (
      !window.confirm(
        `Remove ${identify(editor).email || "this editor"} from the editors team?\n\n` +
          "They keep their account and can still sign in, but lose the ability to " +
          "edit anything. They can ask for access again later.",
      )
    )
      return;

    setBusyId(editor.membershipId);
    setError(null);
    try {
      await removeEditor(editor.membershipId);
      setEditors((es) => es.filter((e) => e.membershipId !== editor.membershipId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not remove that editor.");
    } finally {
      setBusyId(null);
    }
  }

  if (loading) return <p className="app-status">Loading admins…</p>;

  return (
    <div className="admin-params">
      <p className="results-sub">
        Everyone who can edit the knowledge base, and everyone waiting to. Approving a
        request grants access immediately.
      </p>

      {error && <p className="app-status app-error">{error}</p>}
      {notice && <p className="app-status admin-notice">{notice}</p>}

      <div className="admin-actions">
        <span className="admin-count">
          {editors.length} editor{editors.length === 1 ? "" : "s"} ·{" "}
          {pending.length} awaiting approval
        </span>
        <button type="button" className="btn btn-ghost" onClick={() => void load()}>
          Reload
        </button>
      </div>

      <section className="admin-param-group">
        <h3 className="admin-section-title">
          Requests
          {pending.length > 0 && <span className="admin-badge">{pending.length}</span>}
        </h3>

        {pending.length === 0 ? (
          <p className="admin-param-empty">No one is waiting for access.</p>
        ) : (
          <ul className="admin-person-list">
            {pending.map((req) => (
              <li key={req.id} className="admin-person">
                <div className="admin-person-who">
                  <strong>{req.name || req.email}</strong>
                  {req.name && <span className="admin-person-sub">{req.email}</span>}
                  <span className="admin-person-sub">
                    Asked {formatDate(req.createdAt)}
                  </span>
                </div>
                <div className="admin-card-actions">
                  <button
                    type="button"
                    className="btn btn-approve"
                    disabled={busyId === req.id}
                    onClick={() => void approve(req)}
                  >
                    {busyId === req.id ? "Granting…" : "Approve"}
                  </button>
                  <button
                    type="button"
                    className="btn btn-decline"
                    disabled={busyId === req.id}
                    onClick={() => void decline(req)}
                  >
                    Decline
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        {handled.length > 0 && (
          <>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setShowHandled((v) => !v)}
            >
              {showHandled ? "Hide" : `Show ${handled.length} handled`}
            </button>
            {showHandled && (
              <ul className="admin-person-list">
                {handled.map((req) => (
                  <li key={req.id} className="admin-person admin-request-done">
                    <div className="admin-person-who">
                      <strong>{req.name || req.email}</strong>
                      <span className="admin-person-sub">
                        {req.status} · {formatDate(req.createdAt)}
                      </span>
                    </div>
                    <div className="admin-card-actions">
                      <button
                        type="button"
                        className="btn btn-ghost admin-delete"
                        disabled={busyId === req.id}
                        onClick={() => void forget(req)}
                      >
                        Delete
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </section>

      <section className="admin-param-group">
        <h3 className="admin-section-title">Editors</h3>

        {anyHidden && (
          <p className="admin-param-hint">
            Some names and email addresses are blank because <strong>membership
            privacy</strong> is enabled for this Appwrite project, which strips them
            from the team list. Turn it off under Auth → Security in the Appwrite
            console to show them, or leave it on — editors added through this tab are
            still identified by the request they came from.
          </p>
        )}

        {editors.length === 0 ? (
          <p className="admin-param-empty">No editors — which should be impossible here.</p>
        ) : (
          <ul className="admin-person-list">
            {editors.map((editor) => {
              const isSelf = editor.userId === currentUser.id;
              const { name, email } = identify(editor);
              return (
                <li key={editor.membershipId} className="admin-person">
                  <div className="admin-person-who">
                    <strong>
                      {name || email || (
                        <span className="admin-person-anon">Name hidden</span>
                      )}
                    </strong>
                    {name && email && <span className="admin-person-sub">{email}</span>}
                    {!name && !email && (
                      <span className="admin-person-sub">Account {editor.userId}</span>
                    )}
                    <span className="admin-person-sub">
                      Joined {formatDate(editor.joinedAt)}
                    </span>
                  </div>
                  <div className="admin-card-actions">
                    {isSelf && <span className="admin-tag admin-tag-any">you</span>}
                    {/* No Remove on your own row: revoking the last editor's
                        access would need a server API key to undo. */}
                    {!isSelf && (
                      <button
                        type="button"
                        className="btn btn-ghost admin-delete"
                        disabled={busyId === editor.membershipId}
                        onClick={() => void revoke(editor)}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
