# Database overview

The delibero backend is a single **Appwrite Cloud** project. Everything the app reads at runtime lives here — there is no offline or file-based fallback.

| | |
|---|---|
| Project | `delibero` |
| Region | Frankfurt (`https://fra.cloud.appwrite.io/v1`) |
| Database | `delibero` |
| Tables | `recommendations`, `dimensions`, `parameters`, `questions`, `responses`, `contacts` |

The free plan allows **one database per project**, which is why all six tables share `delibero`. A separate staging environment therefore needs its own Appwrite project, not a second database.

> **Schema is code.** `scripts/setup-appwrite.mjs` is the source of truth: it creates the database, tables, columns, indexes, permissions, and the `editors` team, and is safe to re-run. Change the schema there and re-run it rather than clicking in the Appwrite console, so another environment can be rebuilt exactly.

---

## The core idea

Three tables describe *how the tool is configured*, and one holds the content:

```
questions ──▶ answers ──(dimensions × recommendations)──▶ matched recommendations
```

A **dimension** is a way of classifying a recommendation (Size, Level, Stage…). Its allowed values are **parameters**. A **question** is attached to a dimension, and its answer options *are* that dimension's parameters.

That single link is the reason the tool stays consistent: editing the values of "Size" changes both the options a user picks from and the tags available on recommendations, so a question can never offer an answer that no recommendation can be tagged with.

Admins edit all four tables at `/admin` with no deploy step.

---

## `recommendations` — 21 rows

The library of process-design recommendations.

| Column | Type | Notes |
|---|---|---|
| `name` | string(256), required | Card title and page heading |
| `description` | text | One-line summary, shown on cards |
| `pros` / `cons` | text | Trade-offs, shown on cards |
| `body` | text | Long-form Markdown, shown **only** on the recommendation's own page |
| `size`, `level`, `mode`, `criteria`, `stage`, `principles` | string(256) | Dimension values: `any`, one value, or a comma-separated list |
| `tags` | text | JSON map of *admin-created* dimension key → value |

**Indexes:** `idx_name` (key on `name`), `idx_search` (fulltext on `name`, `description`).

### Why dimension values are split across two shapes

The six seeded dimensions have real, indexed columns. Dimensions an admin creates later land in the JSON `tags` blob instead. Without that, every new dimension would require a schema migration — an admin action would need a developer.

`src/lib/repo/recommendations.ts` merges both into a single `dims` map on read and splits them again on write, so nothing else in the codebase knows the difference. Treat `RecommendationRow.dims` as the only interface.

### Long text uses `text`, not sized strings

Appwrite backs a sized string with an inline `VARCHAR`, and MariaDB caps a row at roughly 65 KB. At 4 bytes per character for UTF-8, a single 16,000-character field consumes the entire row budget. `description`, `pros`, `cons`, `body` and `tags` are therefore `text` columns, which are stored off-row. Adding a new **sized** column to this table risks hitting that ceiling; prefer `text` for anything long.

---

## `dimensions` — 8 rows

The classification axes themselves.

| Column | Type | Notes |
|---|---|---|
| `key` | string(64), required | Immutable slug; the key inside `recommendations.dims` |
| `label` | string(256), required | Display name; freely editable |
| `description` | text | Admin-facing explanation |
| `matching` | boolean, default `false` | `true` = filters results; `false` = descriptive tag only |
| `order` | integer, default `0` | Display order |

**Indexes:** `idx_order` (key), `idx_unique_key` (unique on `key`).

Seeded: `size`, `level`, `mode`, `criteria` (matching) and `stage`, `principles`, `diversity`, `resources` (tags).

A dimension does **not** record which question feeds it. That link lives on the question, so the two can never disagree.

---

## `parameters` — 45 rows

The allowed values of each dimension. One row per value.

| Column | Type | Notes |
|---|---|---|
| `dimension` | string(32), required | Owning dimension's `key` |
| `value` | string(64), required | Immutable slug written into recommendations and answers |
| `label` | string(256), required | What users see as the answer option |
| `description` | string(1000) | Longer explanation under the option |
| `group` | string(128) | Optional heading grouping options (e.g. "Age") |
| `color` | string(32) | Optional hex colour, used by ranked-choice questions |
| `order` | integer, default `0` | Order within the dimension |

**Indexes:** `idx_dimension_order` (key), `idx_unique_value` (**unique** on `dimension` + `value`).

`value` is immutable because recommendations reference it by slug; renaming it would orphan every tag. Editing `label` is the supported way to fix wording. Deleting a dimension cascades to its parameters, but leaves recommendation tags intact — recreating the dimension with the same key makes them live again.

---

## `questions` — 7 rows

The questionnaire. Editable at `/admin` → Questions; there is no `questions.ts`.

| Column | Type | Notes |
|---|---|---|
| `key` | string(64), required | Immutable question id — **answers are stored under it** |
| `type` | string(32), required | `single`, `multi`, `rank`, `numberPair`, `info` |
| `title` | string(512), required | The question text |
| `help` | text | Guidance under the title |
| `dimension` | string(64) | Dimension supplying the options; empty for `info` / `numberPair` |
| `order` | integer, default `0` | Position in the wizard |
| `enabled` | boolean, default `true` | Unticking hides a question without deleting answers |
| `citation` | string(64) | Citation key (see `content.ts`) |
| `infoKey` | string(64) | Info-panel content key (see `content.ts`) |
| `fields` | text | JSON `{key,label}[]` for `numberPair` |

**Indexes:** `idx_order` (key), `idx_unique_key` (unique on `key`).

Questions store no options of their own — they are resolved from the attached dimension by `withOptions()` in `src/lib/repo/questions.ts`.

### The safety rule in matching

A dimension constrains results **only** when all three hold: it is flagged `matching`, an *enabled* question is attached to it, and the user answered that question. Any other state is treated as "no constraint" rather than "matches nothing".

Without that rule, an admin who flags a dimension for matching but forgets to attach a question would silently empty the results page, with no error anywhere to explain it. `src/engine/match.test.ts` covers each case.

---

## `responses` — 0 rows

One row per completed wizard run, written anonymously for research analysis.

| Column | Type | Notes |
|---|---|---|
| `sessionId` | string(64), required | Random per-run id |
| `answers` | text, required | JSON of the full answer set |
| `matched` | text | JSON array of matched recommendation names |
| `completed` | boolean, default `false` | Reserved for partial runs |

**Index:** `idx_session` (key on `sessionId`).

Answers are a JSON blob rather than typed columns deliberately: the questionnaire is admin-editable, so a typed schema would need a migration every time a researcher adds a question. The cost is that analysis has to parse JSON rather than query columns.

Writes are fire-and-forget in `src/lib/repo/responses.ts` — a failed write never interrupts a user's session.

---

## `contacts` — help requests

One row per "Request help" submission on the results page.

| Column | Type | Notes |
|---|---|---|
| `name` | string(256), required | Submitted name |
| `contact` | string(256), required | Email address **or** phone number — free text by design |
| `sessionId` | string(64), required | The wizard run this came from; always set |
| `responseId` | string(64) | Row id of that run's `responses` row, when available |
| `handled` | boolean, default `false` | For the team to track follow-up |

**Indexes:** `idx_session` (key on `sessionId`), `idx_handled` (key on `handled`).

### Two links, on purpose

`responseId` points at the exact `responses` row, which is what you want when reading a request. But the response is written when the results page renders, and a fast visitor can submit the form before that write lands — so `responseId` may be empty.

`sessionId` is generated up front and written to both tables, so the link always survives. Query `responses` by `sessionId` when `responseId` is blank.

```
contacts.responseId → responses.$id          exact, usually present
contacts.sessionId  → responses.sessionId    always present
```

Unlike the analytics write in `responses.ts`, a failed contact write is **shown to the visitor** and leaves their typed details in place to retry. Somebody asking to be contacted must never be told it succeeded when it did not.

### Reading them

`/admin` → **Help requests** lists them newest first, with the answers and matched recommendations behind each one, an Open/Handled/All filter, a handled toggle, and delete. The `handled` flag is the team's own follow-up state; nothing sets it automatically.

That tab loads `contacts` and `responses` directly rather than through `useData`, because both are editors-only — fetching them where the public pages run would only produce 401s.

### No notification is sent

Submitting writes a row and nothing else. Nobody is emailed, so somebody has to check the Help requests tab. An Appwrite Function on the `contacts` create event would be the natural place to add alerting.

This replaced an earlier `mailto:` link that opened the visitor's own email client.

---

## Permissions

Enforced by Appwrite server-side. The admin UI's sign-in gate is convenience only; it is not what protects the data.

| Table | Read | Create / Update / Delete |
|---|---|---|
| `recommendations` | anyone | `team:editors` |
| `dimensions` | anyone | `team:editors` |
| `parameters` | anyone | `team:editors` |
| `questions` | anyone | `team:editors` |
| `responses` | **`team:editors` only** | create: **anyone** · update/delete: `team:editors` |
| `contacts` | **`team:editors` only** | create: **anyone** · update/delete: `team:editors` |
| `access_requests` | **`team:editors`** + the requester | create: **any signed-in user** · update/delete: `team:editors` |

Row-level security is off everywhere except `access_requests`, where it is on so a requester can read back their own row; these table-level rules are otherwise the whole model.

`responses` and `contacts` are inverted on purpose: any visitor may submit, but nobody can read anyone else's. `contacts` holds personal data — names and email addresses or phone numbers — so this matters more there than anywhere else in the schema. Verified by test: an anonymous client can list recommendations and is refused on both `responses` and `contacts`.

### Accounts

Anyone may sign up at `/admin`. A new account joins no team, so Appwrite rejects its writes and the app shows the "request access" screen. From there they file a request, and an editor approves it at `/admin` → **Manage admins**. See [`admins.md`](admins.md) for that flow and its two prerequisites.

The CLI grant still exists and is the way to create the *first* editor, before anyone can approve anyone:

```bash
npm run appwrite:add-editor <email>
```

This adds the user to the `editors` team with the `editor` and `owner` roles, and takes effect immediately (no email invitation, so no SMTP needed). Verified by test: a fresh account gets 0 memberships, is refused on writes to `questions`, `recommendations` and `dimensions`, and can still read the public knowledge base.

---

## `access_requests` — who is waiting for edit access

One row per person who signed up and asked to become an editor.

| Column | Type | Notes |
|---|---|---|
| `userId` | string(64), required | The requester's Appwrite account id |
| `email` | string(256), required | Copied from the account, so the queue is readable without the Users API |
| `name` | string(256) | Account name, when they gave one |
| `status` | string(16), default `pending` | `pending` → `approved` or `declined` |

**Indexes:** `idx_user` (key on `userId`), `idx_status` (key on `status`).

**Why this table exists at all.** Listing accounts is a server-only Appwrite API — a browser holding an editor's session cannot enumerate users. Without a record written at the moment somebody asks, the admin area has no way to know that anyone is waiting.

---

## Seeding and environments

`public/data/*` are **script input only** — the app never fetches them.

```bash
npm run appwrite:setup   # create/update schema (idempotent)
npm run appwrite:seed    # import the seed files into empty tables
```

`seed` skips tables that already contain rows. To re-seed deliberately:

```bash
# Replace the vocabulary and questionnaire, leaving curated recommendations alone
npm run appwrite:seed -- --force --only=dimensions,parameters,questions
```

Always scope `--force` with `--only`; unscoped, it clears **every** table including `recommendations`.

| File | Seeds |
|---|---|
| `recommendations.csv` | `recommendations` |
| `parameters.json` | `dimensions` + `parameters` |
| `questions.json` | `questions` |

The seed data is a **placeholder derived from the spec** and still needs review by the research team.

---

## Connecting

| Variable | Used by | Value |
|---|---|---|
| `VITE_APPWRITE_ENDPOINT` | browser | `https://fra.cloud.appwrite.io/v1` |
| `VITE_APPWRITE_PROJECT_ID` | browser | `delibero` |
| `VITE_APPWRITE_DATABASE_ID` | browser | `delibero` |
| `APPWRITE_API_KEY` | scripts only | server key — **never** in the browser or the host's env |

Vite inlines the `VITE_*` values at build time, so changing one requires a redeploy. They are not secrets: Appwrite's security comes from the table permissions above and from the project's registered Web platforms.

Two things live outside the repo and are easy to forget:

1. **Web platforms** — every host that serves the app (`localhost`, the production domain) must be registered in the Appwrite console, or the browser is blocked by CORS. There is no Firebase equivalent of this step.
2. **Host env vars** — the three `VITE_*` values must exist wherever the site is built.

`pingAppwrite()` runs once on startup in dev and logs a clear message naming the hostname to register if the connection fails.

---

## Notes for Firebase users

| Firebase | Appwrite here |
|---|---|
| Firestore collection | Table |
| Document | Row |
| `firestore.rules` | Table permissions, set in `setup-appwrite.mjs` |
| Custom claims / roles | Teams (`editors`) |
| Admin SDK service account | Server API key (`APPWRITE_API_KEY`) |
| Offline persistence | **None** — the app errors rather than serving stale data |

Appwrite's `Databases` API (collections/documents) is the legacy interface. This project uses **`TablesDB`** (tables/rows), the current one. They are not interchangeable — code written against `Databases` cannot read these tables, which is worth knowing when following older tutorials.
