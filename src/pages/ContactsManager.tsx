import { useCallback, useEffect, useMemo, useState } from "react";
import type { Question } from "../types";
import { formatAnswer } from "../engine/formatAnswer";
import {
  type StoredContactRequest,
  deleteContactRequest,
  listContactRequests,
  setContactHandled,
} from "../lib/repo/contacts";
import { type StoredResponse, listResponsesForSessions } from "../lib/repo/responses";

interface Props {
  /** Used to label answers with their question text. */
  questions: Question[];
}

type Filter = "open" | "handled" | "all";

function formatDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

/** mailto: for an email, tel: for anything that looks like a phone number. */
function contactHref(contact: string): string | null {
  const v = contact.trim();
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return `mailto:${v}`;
  if (/^[+\d][\d\s()-]{5,}$/.test(v)) return `tel:${v.replace(/[\s()-]/g, "")}`;
  return null;
}

/**
 * Help requests submitted from the results page, with the answers that produced
 * them. Loads its own data rather than going through `useData`: these rows are
 * editors-only, so fetching them anywhere the public pages run would just
 * produce 401s.
 */
export function ContactsManager({ questions }: Props) {
  const [requests, setRequests] = useState<StoredContactRequest[]>([]);
  const [responses, setResponses] = useState<{
    byId: Record<string, StoredResponse>;
    bySession: Record<string, StoredResponse>;
  }>({ byId: {}, bySession: {} });
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("open");
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const rows = await listContactRequests();
      setRequests(rows);
      setResponses(await listResponsesForSessions(rows.map((r) => r.sessionId)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load help requests.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const openCount = requests.filter((r) => !r.handled).length;

  const visible = useMemo(
    () =>
      requests.filter((r) =>
        filter === "all" ? true : filter === "open" ? !r.handled : r.handled,
      ),
    [requests, filter],
  );

  /** Prefer the exact response row; fall back to the session link. */
  function responseFor(req: StoredContactRequest): StoredResponse | undefined {
    return (
      (req.responseId ? responses.byId[req.responseId] : undefined) ??
      responses.bySession[req.sessionId]
    );
  }

  async function toggleHandled(req: StoredContactRequest) {
    setBusyId(req.id);
    setError(null);
    // Optimistic: the toggle should feel instant while working through a list.
    setRequests((rs) =>
      rs.map((r) => (r.id === req.id ? { ...r, handled: !r.handled } : r)),
    );
    try {
      await setContactHandled(req.id, !req.handled);
    } catch (err) {
      setRequests((rs) =>
        rs.map((r) => (r.id === req.id ? { ...r, handled: req.handled } : r)),
      );
      setError(err instanceof Error ? err.message : "Could not update the request.");
    } finally {
      setBusyId(null);
    }
  }

  async function remove(req: StoredContactRequest) {
    if (
      !window.confirm(
        `Delete the request from ${req.name}?\n\nThis removes their contact details ` +
          "permanently. The wizard answers stay in the responses table.",
      )
    )
      return;

    setBusyId(req.id);
    try {
      await deleteContactRequest(req.id);
      setRequests((rs) => rs.filter((r) => r.id !== req.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete the request.");
    } finally {
      setBusyId(null);
    }
  }

  if (loading) return <p className="app-status">Loading help requests…</p>;

  return (
    <div className="admin-params">
      <p className="results-sub">
        People who asked for help designing their process, newest first. Each request is
        linked to the answers that produced it.
      </p>

      {error && <p className="app-status app-error">{error}</p>}

      <div className="admin-actions">
        <div className="admin-tabs admin-filter-tabs">
          {(["open", "handled", "all"] as Filter[]).map((f) => (
            <button
              key={f}
              type="button"
              className={`btn ${filter === f ? "btn-secondary" : "btn-ghost"}`}
              onClick={() => setFilter(f)}
            >
              {f === "open" ? "Open" : f === "handled" ? "Handled" : "All"}
              {f === "open" && openCount > 0 && <span className="admin-badge">{openCount}</span>}
            </button>
          ))}
        </div>
        <span className="admin-count">
          {requests.length} total · {openCount} awaiting reply
        </span>
        <button type="button" className="btn btn-ghost" onClick={() => void load()}>
          Reload
        </button>
      </div>

      {visible.length === 0 ? (
        <p className="all-recs-empty">
          {filter === "open"
            ? "No open requests — everything has been handled."
            : filter === "handled"
              ? "Nothing marked handled yet."
              : "No help requests yet."}
        </p>
      ) : (
        <ul className="admin-request-list">
          {visible.map((req) => {
            const response = responseFor(req);
            const href = contactHref(req.contact);
            const isOpen = expanded === req.id;

            return (
              <li
                key={req.id}
                className={`admin-param-group admin-request${req.handled ? " admin-request-done" : ""}`}
              >
                <div className="admin-card-head">
                  <h3 className="admin-section-title">
                    {req.name}
                    {req.handled && <span className="admin-tag admin-tag-any">handled</span>}
                  </h3>
                  <div className="admin-card-actions">
                    <button
                      type="button"
                      className="btn btn-ghost"
                      disabled={busyId === req.id}
                      onClick={() => void toggleHandled(req)}
                    >
                      {req.handled ? "Mark as open" : "Mark as handled"}
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost admin-delete"
                      disabled={busyId === req.id}
                      onClick={() => void remove(req)}
                    >
                      Delete
                    </button>
                  </div>
                </div>

                <p className="admin-request-meta">
                  {href ? <a href={href}>{req.contact}</a> : <span>{req.contact}</span>}
                  <span className="admin-request-date">{formatDate(req.createdAt)}</span>
                </p>

                {response ? (
                  <>
                    <button
                      type="button"
                      className="link-button"
                      onClick={() => setExpanded(isOpen ? null : req.id)}
                    >
                      {isOpen ? "Hide their answers" : "Show their answers"}
                    </button>

                    {isOpen && (
                      <div className="admin-request-detail">
                        <dl className="admin-answer-list">
                          {questions
                            .filter((q) => response.answers[q.id] !== undefined)
                            .map((q) => (
                              <div key={q.id} className="admin-answer-row">
                                <dt>{q.title}</dt>
                                <dd>{formatAnswer(q, response.answers[q.id])}</dd>
                              </div>
                            ))}
                          {/* Answers to questions that have since been deleted or
                              renamed still matter to whoever replies. */}
                          {Object.keys(response.answers)
                            .filter((id) => !questions.some((q) => q.id === id))
                            .map((id) => (
                              <div key={id} className="admin-answer-row">
                                <dt>
                                  <code>{id}</code> <span className="rec-form-any">removed question</span>
                                </dt>
                                <dd>{formatAnswer(undefined, response.answers[id])}</dd>
                              </div>
                            ))}
                        </dl>

                        {response.matched.length > 0 && (
                          <>
                            <h4 className="admin-section-title">
                              Recommendations they were shown
                            </h4>
                            <ul className="admin-matched-list">
                              {response.matched.map((name, i) => (
                                <li key={i}>{name}</li>
                              ))}
                            </ul>
                          </>
                        )}
                      </div>
                    )}
                  </>
                ) : (
                  <p className="admin-param-hint">
                    No saved answers found for this request. The response write may have
                    failed, or the row was deleted.
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
