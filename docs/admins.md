# Managing admins

Who may edit the knowledge base is decided by membership of the Appwrite
`editors` team. `/admin` → **Manage admins** is where that membership is granted
and revoked, without anyone touching a terminal or the Appwrite console.

```
signs up ──▶ verification email ──▶ confirms address
                                            │
                   request files itself ────┤
                                            ▼
                                    access_requests row (pending)
                                            │
                      editor clicks Approve │
                                            ▼
                          approve-editor function (server-side)
                                            │
                              team membership, confirmed ──▶ can edit
```

Two actions, one for each person: confirm your email, and be approved. Nothing
to accept, no second link to click.

## Email verification

Signing up sends an Appwrite verification email, and confirming it **is** the
request — the `access_requests` row is written automatically the moment the
address is verified. A signed-in account sitting on that screen has already said
what it wants by being there, and a second button would only add a way to get
stuck halfway.

Verification comes first because an editor approving a request is trusting the
address it names, so it should be one the account has proved it owns. The screen
offers a resend, and confirming lands back on `/admin` with `userId` + `secret`
in the query string.

A *declined* request is the one case that is not re-filed automatically — that
would drop it straight back into a queue an editor just cleared — so the screen
offers an "Ask again" button instead.

Verification is now the only part of this flow that depends on email delivery.
See [`smtp.md`](smtp.md).

## Why approving needs a function

Appwrite splits team management by SDK. `teams.createMembership` from a
**server** SDK adds the member outright; from a **client** SDK it can only
*invite* — an email, an unconfirmed membership, a link to click — because
Appwrite will not attach an account to a team without that account's consent.

The admin area runs entirely in the browser, so approving would have meant
sending an invitation and waiting for it to be accepted. Instead the write
happens in [`functions/approve-editor`](../functions/approve-editor/src/main.js),
which runs server-side, adds the membership directly, and marks the request
approved.

**It normally holds no secret.** Appwrite injects a scoped, single-execution API
key in the `x-appwrite-key` header at runtime, so there is no key in the bundle
or the repo. Consoles too old for that have a fallback — see "Giving it
permission to write" below.

### What guards it

1. **Execute permission.** The function is executable by `team:editors` only;
   Appwrite refuses anyone else before the code runs.
2. **The function re-checks.** It reads `x-appwrite-user-id` and confirms that
   account is in the team, so a widened permission is not on its own enough.
3. **The target comes from the database.** The caller passes a `requestId`, not
   a user id, so an editor can approve a pending request — not nominate an
   arbitrary account.
4. **Scoped key.** `teams.write` + `users.read`, and with a dynamic key, only
   for that one execution.

If the membership write fails, the request stays `pending`: a half-done approval
that reads as finished is worse than one the editor can retry.

## Setting the function up (once)

Appwrite console → **Functions → Create function → Connect a repository**:

| Setting | Value |
|---|---|
| Name / ID | `approve-editor` (any other id → set `VITE_APPWRITE_APPROVE_FN`) |
| Runtime | `node-22` (Cloud allows only `node-16.0`, `node-18.0`, `node-22`, `node-25`) |
| Repository / branch | this repo, `main` |
| Root directory | `functions/approve-editor` |
| Entrypoint | `src/main.js` |
| Build command | `npm install` |
| Execute access | **`team:editors`** — not "any" |

Pushing to `main` then deploys it the same way it deploys the site.

If a settings change is rejected with **"Invalid runtime: node-XX"**, the
function is on a runtime this Appwrite does not support — the form resubmits it
alongside whatever you were actually editing, so every save fails until the
runtime itself is corrected. Set it to `node-22` and save again.

### Giving it permission to write

The function needs `teams.write` and `users.read`. Two ways, depending on what
your console offers:

**Dynamic key (preferred, no secret).** Open the function → **Settings** tab →
**Scopes** → tick `teams.write` and `users.read`. Scopes appear only *after* the
function exists, not in the create wizard, which is the usual reason for not
finding them. Appwrite then injects a scoped key per execution.

**A function variable (fallback).** If your console has no Scopes section,
create an API key (console → Overview → Integrations → API keys) with those two
scopes, and add it to the function → **Settings → Variables** as
`APPWRITE_API_KEY`. The function uses the dynamic key when present and this
otherwise. It is a real secret — it lives only in the function's settings, never
in the repo or the bundle.

Without either, Approve fails with a message naming both options.

The function is **not** provisioned by `scripts/setup-appwrite.mjs`. That script
is the source of truth for the database schema; functions are configured in the
console, so this table is the record.

Until it exists, Approve fails with a clear error and the request stays pending.
Everything else in the tab — the queue, Decline, Remove — works without it.

## Prerequisite: editors need the `owner` role

Removing an editor is still a client-side call, and Appwrite restricts
membership writes to team owners. `scripts/add-editor.mjs` grants
`["editor", "owner"]`, and tops up anyone who predates that change:

```bash
npm run appwrite:add-editor someone@example.com   # existing editor → adds owner
```

Accounts approved through the function get both roles automatically. Run this
once per editor created before the Manage admins tab existed.

## Blank names in the editors list

Appwrite has a project-level **membership privacy** setting (console → Auth →
Security). With it on, `teams.listMemberships` returns only ids, roles and
dates — `userName`, `userEmail` and `userPhone` come back empty, which is why an
editor can show a join date but no name.

The tab compensates rather than depending on the setting: your own row is filled
from your session, and everyone else's from the `access_requests` row that let
them in. Anyone added straight from the console or the CLI has no such row, so
they stay unnamed until the privacy setting is turned off.

## What each action does

| Action | Effect |
|---|---|
| **Approve** | Grants editor access immediately. They reload `/admin` and can edit. |
| **Decline** | Marks the request `declined`. The account survives; only the request is closed. |
| **Delete** (handled list) | Forgets the request row entirely. |
| **Remove** (editors list) | Deletes the team membership. The account survives and can sign in; it just cannot edit. |

Your own row has no Remove button at all — locking the last editor out of their
own admin area would need a server API key to undo. Ask another editor.

## The first editor

Nobody can approve anyone until one editor exists, and the function refuses
callers outside the team. Create that first one from the CLI, which uses a
server API key:

```bash
npm run appwrite:add-editor you@example.com
```
