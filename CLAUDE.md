# delibero — Deliberation Process Design Tool

A guided web app helping government officials and practitioners design a deliberative process. Users answer a questionnaire one question at a time (previous answers visible and editable in a sidebar) and receive matched, explained recommendations from a library of process-design recommendations.

## Decisions

- **Stack:** React + Vite + TypeScript, static bundle deployed on Appwrite Sites.
- **Backend: Appwrite Cloud, and only Appwrite.** The knowledge base and anonymous wizard responses live in Appwrite. There is no offline fallback: if Appwrite is unreachable the app shows an error rather than serving a stale bundled copy, which would hide an outage from an editor who had just saved. The files under `public/data` are seed input for the setup scripts only.
- **Non-technical editability is a hard requirement.** Researchers edit recommendations, the questionnaire, and dimension vocabularies at `/admin` (signed in), or in Excel via `recommendations.csv` for a bulk re-seed. The questionnaire is data, not code — there is no `questions.ts`.
- **Sign-up verifies the email address, and verifying *is* the access request.** A new account gets an Appwrite verification email; confirming it writes the `access_requests` row automatically, so becoming an editor is one action, not two. Editors predating this keep working and get a resend prompt on `/admin`.
- **Anyone may sign up; nobody gets edit rights by default.** A new account belongs to no team, so Appwrite rejects its writes and the app shows a "request access" screen, where they can file a request. An editor approves it at `/admin` → Manage admins; the CLI (`npm run appwrite:add-editor`) creates the first editor, before anyone exists to approve anyone. See `docs/admins.md`.
- **Schema is code.** `scripts/setup-appwrite.mjs` provisions the database, tables, columns, indexes, and permissions. Change the schema there and re-run it — do not click in the Appwrite console.
- **One stylesheet, no inline styles.** All CSS is in `src/styles.css`. Components use `className` only — no `style={{...}}` props, no CSS-in-JS, no per-component CSS files.

## How recommendations work

```
questions ──▶ answers ──(dimensions × recommendations)──▶ matched recommendations
```

Each question is attached to a **dimension**, and its answer options *are* that dimension's values. One vocabulary per concept: editing the values of "Size" changes both the options users pick from and the tags available on recommendations, so the two can never drift apart.

**Matching (`src/engine/match.ts`)** — dimensions are data, not code. Each recommendation declares, per dimension, which values it applies to (`any`, one value, or a comma-separated list). A dimension constrains the results only when it is flagged `matching`, has an **enabled question attached to it**, and that question is answered — otherwise it is skipped, so a half-configured dimension can never empty the results page. Matched rows are shown with the reason they were surfaced.

## Project structure

```
functions/
  approve-editor/      Appwrite Function: grants editor access server-side (see docs/admins.md)
scripts/
  setup-appwrite.mjs   Provisions the Appwrite schema (source of truth). Idempotent.
  seed-appwrite.mjs    Imports the files below into Appwrite. One-time.
public/data/
  recommendations.csv  Recommendation seed rows (script input only)
  parameters.json      Seed dimensions + their values (script input only)
  questions.json       Seed questionnaire (script input only)
src/
  lib/
    appwrite.ts       Appwrite client, table ids, isAppwriteConfigured
    repo/             One module per table: recommendations, dimensions, questions, parameters, responses, contacts, accessRequests; plus editors.ts (the Appwrite `editors` team)
  styles.css          THE single global stylesheet
  types.ts            All shared TypeScript types
  data/
    content.ts        Scaling tensions, citations map, info-panel copy
  engine/
    csv.ts            CSV export for the admin builder (papaparse)
    markdown.ts       Safe Markdown subset renderer for recommendation bodies
    match.ts          Matches recommendations.csv rows against the user's answers
    questions.ts      The "disabled question = deleted" rule (active questions, live dimensions)
    formatAnswer.ts   Renders an answer value as a readable phrase (used by the sidebar)
  state/
    wizardStore.ts    Zustand store: current step, answers, showResults
    authStore.ts      Zustand store: admin session + editors-team membership
    useData.ts        Loads the knowledge base (Appwrite, falling back to files)
  pages/
    AdminBuilder.tsx  Admin shell + tab bar
    AdminsManager.tsx Manage admins: editors team + access-request queue
    RequestAccess.tsx Where a signed-in non-editor asks for access
  components/
    RecForm.tsx       Create/edit form for one recommendation (admin + inline page editor)
    Wizard.tsx        One-question-at-a-time shell with segment progress bar
    AnswersSidebar.tsx  Previous answers, click any to edit (jumps back to that step)
    questions/
      QuestionView.tsx  Dispatcher: routes to the right renderer by question type
      SingleSelect.tsx
      MultiSelect.tsx
      RankedChoice.tsx    Move-up/down ranked ordering of the 5 principles
      NumberPair.tsx      Engagement calculator (reached vs. participating, shows ratio)
      InfoPanel.tsx       Educational panel with no answer collected (scaling trade-offs)
    results/
      Results.tsx       Matched recommendation cards, recomputes on every render
docs/
  v1.md, prd.md, notes.md, ...   Source specifications and reference papers
```

## Question sequence

Stored in the `questions` table and editable at `/admin` → Questions, so this list is a snapshot rather than a definition. Seeded order:

1. `participants` (single → `size`) — deliberation size
2. `engagement-depth` (single → `level`) — IAP2 spectrum
3. `modes` (single → `mode`) — face-to-face / online / hybrid
4. `criteria` (single → `criteria`) — self-selection vs. sortition
5. `diversity` (multi → `diversity`) — demographic groups to reach
6. `resources` (multi → `resources`) — budget / staff / platform
7. `priorities` (rank → `principles`) — rank the 5 principles

## Editing the knowledge base (no code required)

Sign in at **`/admin`**. Anyone can create an account there, but editing requires membership of the `editors` team. Five tabs:

- **Recommendations** — create/edit/delete rows. Saves to Appwrite immediately; live for everyone with no deploy. The optional **body** field takes Markdown via a toolbar editor and appears only on the recommendation's own page, never on cards.
- **Questions** — reorder, reword, retype, enable/disable, add, and delete questions, and choose which dimension supplies each one's options. A question's id is immutable once saved, because answers are stored under it. Disabling beats deleting when a question may come back: **a disabled question is a lazy delete** — outside this tab it does not exist. It is not asked, not counted in the progress bar, not shown in the sidebar, does not drive its dimension, and its matching dimension disappears from the recommendation form and filters (`src/engine/questions.ts`).
- **Parameters** — the dimensions themselves and their allowed values.
- **Manage admins** — the `editors` team and the queue of people asking to join it. Approving grants access immediately, via the `approve-editor` Appwrite Function: a browser SDK can only *invite* someone to a team, so the membership write happens server-side. Removing stays client-side and needs the `owner` role. `docs/admins.md` has the whole flow and the one-time console setup.
- **Help requests** — people who asked to be contacted, with the answers that produced the request, an open/handled filter, and a handled toggle. Loads its own data (editors-only tables, so not part of `useData`). Admins can create new dimensions (e.g. "Duration"), decide per dimension whether it filters results or is a descriptive tag, and add values to any of them. Slugs are immutable once saved (recommendations reference them by slug); edit the label instead. Every dimension can be renamed, re-flagged, and deleted — the seeded six have no special status. Deleting one that a question asks for would leave that question with no options, so the confirm dialog names those questions (including disabled ones) first.

A recommendation holds, per dimension, `any` / one value / a comma-separated list. It is shown when the user's answer fits every *matching* dimension.

The seed data is a **placeholder derived from the spec** and needs review and refinement by the research team.

## Appwrite

```
Database `delibero`
  recommendations  public read · editors team write
  dimensions       public read · editors team write   (the parameter types themselves)
  questions        public read · editors team write   (the questionnaire)
  parameters       public read · editors team write   (allowed values per dimension)
  responses        anyone create · editors team read  (one row per completed wizard run)
  contacts         anyone create · editors team read  (one row per "Request help" submission)
  access_requests  signed-in create · editors team read  (who is waiting for edit access)
```

**Why recommendations have no per-dimension columns.** Admins create dimensions at runtime, so a column per dimension would mean a schema migration per admin action. The six seeded dimensions keep real indexed columns (they map 1:1 to the CSV); anything an admin adds is stored in a JSON `tags` column. `src/lib/repo/recommendations.ts` merges both into `RecommendationRow.dims` on read and splits them on write, so no other file knows the difference.

Every recommendation has its own page at `/recommendations/:id` (the Appwrite row id), reached by clicking a recommendation's card anywhere it appears. A signed-in editor gets an **Edit** button there and edits in place, using the same `RecForm` as `/admin`; everyone else sees a read-only page. The button is UX only — Appwrite rejects the write for anyone outside the `editors` team.

**Rendering bodies.** `src/engine/markdown.ts` implements a deliberately small Markdown subset instead of pulling in a parser plus a sanitizer. It escapes input first and emits a fixed tag set, so authored content cannot inject markup; `javascript:` and `data:` URLs are dropped. Its output is the only thing passed to `dangerouslySetInnerHTML`, and the rules are covered by `markdown.test.ts`.

Responses store `answers` and `matched` as JSON strings, so changing the questionnaire never requires a schema migration.

A help request in `contacts` is managed at `/admin` → Help requests, and links to its run twice — by `responseId` (exact) and by `sessionId` (always set, in case the response write had not finished). Submitting sends no notification; requests are read from the Appwrite console. See `docs/database.md`.

Access lives in `src/lib/`: `appwrite.ts` (client) and `repo/*.ts` (one module per table). Nothing else in the app talks to Appwrite directly.

## Commands

```bash
npm run dev             # local dev server
npm run build           # type-check + production build → dist/
npm run preview         # serve production build locally
npm run test            # vitest — covers the matching engine
npm run appwrite:setup  # provision database, tables, indexes, permissions (idempotent)
npm run appwrite:seed   # import recommendations.csv + parameters.json (--force to replace)
npm run appwrite:add-editor <email>   # create the first editor (also tops up an existing one with the owner role)
npm run appwrite:test-email <email>   # send one real email through the project's SMTP (see docs/smtp.md)
```

## Deployment

**Appwrite Sites**, in the same project as the database. The `approve-editor` Function deploys from the same repo and the same push (root directory `functions/approve-editor`), configured once in the console. Pushing to `main` rebuilds and publishes; GitHub Actions (`.github/workflows/ci.yml`) type-checks, tests and builds in parallel but does not gate the deploy.

Build settings, environment variables, the required SPA fallback file, and the Web-platform registration are documented in `docs/deployment.md`. Two things bite if missed: **fallback file must be `index.html`** (or deep links 404) and the **domain must be registered as a Web platform** (or every database read fails CORS).

