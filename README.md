# delibero — Deliberation Process Design Tool

A guided web app that helps government officials and practitioners design a deliberative process. Users answer a questionnaire one question at a time, with previous answers visible and editable in a sidebar, and receive matched recommendations that explain *why* they were surfaced.

- **Stack:** React + Vite + TypeScript, built to a static bundle.
- **Backend:** Appwrite Cloud — the knowledge base, the questionnaire itself, and anonymous responses.
- **Hosting:** Appwrite Sites, deployed from `main`.
- **Design principle:** *nothing is hidden in code.* Recommendations, questions, and the vocabularies behind them are data that researchers edit in the browser.

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in the Appwrite values
npm run dev                  # http://localhost:5173
```

| Command | |
|---|---|
| `npm run dev` | local dev server |
| `npm run build` | type-check + production build into `dist/` |
| `npm run preview` | serve the production build locally |
| `npm run test` | unit tests (matching engine, Markdown renderer) |
| `npm run appwrite:setup` | create/update the database schema — idempotent |
| `npm run appwrite:seed` | import the seed files into empty tables |
| `npm run appwrite:add-editor <email>` | grant an existing user edit access |

The app reads exclusively from Appwrite. Without `VITE_APPWRITE_*` set it shows an error rather than falling back to bundled data, so a misconfigured deploy is obvious rather than silently stale.

## How recommendations work

```
questions ──▶ answers ──(dimensions × recommendations)──▶ matched recommendations
```

A **dimension** is a way of classifying a recommendation (Size, Level, Mode, Stage…). Its allowed values are **parameters**. Each **question** is attached to a dimension, and its answer options *are* that dimension's values — so a question can never offer an answer that no recommendation can be tagged with.

A recommendation declares, per dimension, which values it applies to: `any`, one value, or a comma-separated list. It is shown when the user's answers fit every *matching* dimension.

A dimension narrows results only when it is flagged for matching, has an enabled question attached, and that question was answered. Anything else is treated as "no constraint", so a half-configured dimension can never silently empty the results page.

## Editing the content (no code required)

Sign in at **`/admin`**. Anyone can create an account, but editing requires membership of the `editors` team — grant it with `npm run appwrite:add-editor <email>`. Everything saves immediately and is live for everyone; there is no deploy step.

| Tab | |
|---|---|
| **Recommendations** | Create, edit, delete. Includes an optional Markdown **body** shown only on the recommendation's own page. |
| **Questions** | Reorder, reword, retype, enable/disable, add, delete; choose which dimension supplies each one's options. |
| **Parameters** | The dimensions themselves and their allowed values. |

Slugs (a dimension's `key`, a value's `value`, a question's `id`) are immutable once saved, because recommendations and stored answers reference them. Labels are freely editable — that covers the common case of fixing wording.

Each recommendation also has its own page at `/recommendations/:id`.

## Project structure

```
scripts/            setup / seed / add-editor  (schema is code, idempotent)
public/data/        seed CSV + JSON  (script input only — never fetched at runtime)
src/lib/            appwrite client + one repo module per table
src/engine/         match, markdown, csv export (+ tests)
src/state/          wizard store, auth store, data loader
src/components/     wizard, question renderers, results, sidebar, rich text editor
src/pages/          landing, wizard, recommendations, recommendation, admin
src/styles.css      THE single global stylesheet (no inline styles anywhere)
docs/               specifications, database and deployment reference
```

## Documentation

- [`docs/database.md`](docs/database.md) — schema, permissions, seeding, and the reasoning behind the data model
- [`docs/deployment.md`](docs/deployment.md) — CI/CD, build settings, and the two settings that break the site if missed
- [`CLAUDE.md`](CLAUDE.md) — working notes and conventions for this codebase

The seed knowledge base is a **placeholder derived from the project spec** and still needs review by the research team.
