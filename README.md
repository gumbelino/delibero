# DPDT — Deliberation Process Design Tool

A guided web app that helps government officials and practitioners design a deliberative
process. Users answer a short questionnaire (one question at a time, with previous answers
visible and editable) and receive **ranked, fully traceable recommendations** drawn from a
set of deliberation design templates. Every recommendation explains *why* it was suggested,
tracing back to the user's own answers and priorities.

- **Stack:** React + Vite + TypeScript, built to a static bundle.
- **Hosting:** Netlify (static). No backend in v1 — all state lives in the browser; results
  are exportable as JSON or printed to PDF.
- **Design principle:** *no hidden scoring.* The only weights in the system come from the
  user's own ranking of the five deliberative principles.

## Getting started

```bash
npm install
npm run dev      # local dev server (http://localhost:5173)
npm run build    # type-check + production build into dist/
npm run preview  # serve the production build locally
npm run test     # run the recommendation-engine unit tests
```

## Deploy (Netlify)

`netlify.toml` is already configured (`npm run build` → publish `dist/`, with an SPA
redirect). Connect the repo in Netlify, or run `netlify deploy --prod` with the CLI.

## How recommendations work

```
your answers ──(tree.csv)──▶ candidate templates ──(your principle ranking)──▶ ranked + explained
```

1. **Decision tree (`public/data/tree.csv`)** decides which templates are *candidates*.
2. **Ranking** orders the candidates by how well they support the principles you ranked
   highest. A principle's weight is simply its rank position (1st = highest). Nothing else
   is weighted — there are no magic numbers.
3. **Traceability** — each recommendation shows the tree rule that nominated it and the
   ranked principles it supports ("Why was this recommended to me?").

## Editing the recommendations (no code required)

Both data files live in `public/data/` and are plain CSVs you can edit in Excel or any
spreadsheet. Re-deploy (or just reload in dev) to see changes.

### `templates.csv` — the recommendation library

One row per template:

| column                | meaning                                                                 |
| --------------------- | ----------------------------------------------------------------------- |
| `id`                  | Stable identifier used by `tree.csv` (no spaces).                        |
| `name`                | Display name.                                                           |
| `description`         | Shown on the recommendation card. Wrap in quotes if it contains commas. |
| `supports_principles` | Principles the template supports, separated by `;`. **This is the only link to ranking.** Use exactly: `Inclusion`, `Equality`, `Plurality`, `Authenticity`, `Reflection`. |
| `citations`           | Citation keys separated by `;` (e.g. `24`). Optional.                   |

### `tree.csv` — the decision tree (one row = one node)

Read each row as a sentence:

> *"Starting from `parent_id` (blank = a root), if the answer to `question_id` matches
> `match`, enter this node; if `recommend` is filled in, recommend that template."*

| column        | meaning                                                                       |
| ------------- | ----------------------------------------------------------------------------- |
| `node_id`     | Unique id for this node.                                                       |
| `parent_id`   | Blank for a root node, or the `node_id` of a node that must be reached first.  |
| `question_id` | Which question's answer this node tests (see list below).                      |
| `match`       | How the answer must match (see below).                                         |
| `recommend`   | A template `id` to recommend when reached. Leave blank for a pure gate node.   |

**`match` can be:**

- an exact option value — e.g. `online`, `sortition`, `youth` (for multi-select questions
  this means "this option was selected");
- `any` — matches whenever the question has any answer;
- a threshold on a number — e.g. `>=10000`, `<1000`, `=500` (used with the `participants`
  scale);
- `ratio<0.1` — for the engagement calculator, compares participating ÷ reached.

If no node matches a given set of answers, **all** templates become candidates (graceful
fallback), and they are still ranked by the user's priorities.

**Question ids** available for `question_id`: `priorities`, `participants`,
`engagement-depth`, `diversity`, `stages-focus`, `modes`, `engagement-calc`, `criteria`,
`resources`. (Their option values are defined in `src/data/questions.ts`.)

> The seed `tree.csv` and `templates.csv` contain **reasonable placeholders derived from the
> project spec.** They are meant to be reviewed and refined by the research team.

## Editing the questionnaire

The questions, their order, options, and help text are data in
[`src/data/questions.ts`](src/data/questions.ts); educational content (the scaling
trade-offs, the IAP2 spectrum, citations) is in
[`src/data/content.ts`](src/data/content.ts). Reordering or adding a question is an edit to
the `QUESTIONS` array — no component changes needed.

## Project structure

```
public/data/        templates.csv, tree.csv   (researcher-editable knowledge base)
src/data/           questions.ts, content.ts  (questionnaire + educational copy)
src/engine/         csv, tree, rank, rationale, recommend (+ tests)
src/state/          wizard store + data loader
src/components/      wizard, question renderers, results, sidebar
src/styles.css      THE single global stylesheet (no inline styles anywhere)
docs/               source specifications and reference papers
```

## Roadmap (v2 ideas)

- Optional Firebase backend to store responses / contact details (the data layer is
  isolated behind `src/state/useData.ts` and the engine, so adding persistence is contained).
- Richer decision-tree authoring UI for non-technical editors.
