# DPDT — Deliberation Process Design Tool

A guided web app helping government officials and practitioners design a deliberative process. Users answer a questionnaire one question at a time (previous answers visible and editable in a sidebar) and receive ranked, traceable recommendations from a library of 5 deliberation design templates. Every recommendation explains *why* it was suggested, tracing back to the user's own answers and priorities.

## Decisions

- **Stack:** React + Vite + TypeScript, static bundle deployed on Netlify.
- **No backend in v1.** All state lives in the browser. Results export to JSON or print to PDF. Firebase is deferred to v2.
- **No hardcoded weights.** The only weights in the system come from the user's ranking of the 5 deliberative principles. Templates declare which principles they support; the ranking decides how much those count.
- **Non-technical editability is a hard requirement.** Both data files (`templates.csv`, `tree.csv`) are plain one-concept-per-row CSVs that a researcher edits in Excel without touching code.
- **One stylesheet, no inline styles.** All CSS is in `src/styles.css`. Components use `className` only — no `style={{...}}` props, no CSS-in-JS, no per-component CSS files.

## How recommendations work

```
answers ──(tree.csv)──▶ candidate templates ──(user's principle ranking)──▶ ranked + explained
```

1. **Decision tree (`public/data/tree.csv`)** — one row per node. Each row is evaluated against answers; matching leaf nodes nominate a candidate template. If nothing matches, all 5 templates become candidates (graceful fallback).
2. **Ranking (`src/engine/rank.ts`)** — candidates are scored by alignment with the user's principle ranking. Rank #1 principle contributes the most weight, #5 the least. No other numbers.
3. **Traceability (`src/engine/rationale.ts`)** — each recommendation shows which tree rule nominated it and which of the user's top-ranked principles it supports.

## Project structure

```
public/data/
  templates.csv       5 recommendation templates (name, description, supports_principles, citations)
  tree.csv            Decision tree: one row = one node
src/
  styles.css          THE single global stylesheet
  types.ts            All shared TypeScript types
  data/
    questions.ts      Questionnaire definition (sequence, types, options, help text)
    content.ts        IAP2 spectrum, scaling tensions, citations map
  engine/
    csv.ts            CSV loader/parser (papaparse)
    tree.ts           Walks tree.csv against answers → candidate templates
    rank.ts           Ranks candidates using only the user's principle ranking
    rationale.ts      Builds human-readable "why?" explanations
    recommend.ts      Orchestrates: answers → candidates → ranked + explained
    engine.test.ts    15 unit tests covering the full pipeline
  state/
    wizardStore.ts    Zustand store: current step, answers, showResults
    useData.ts        Loads the two CSVs on mount
  components/
    Wizard.tsx        One-question-at-a-time shell with segment progress bar
    AnswersSidebar.tsx  Previous answers, click any to edit (jumps back to that step)
    questions/
      QuestionView.tsx  Dispatcher: routes to the right renderer by question type
      SingleSelect.tsx
      MultiSelect.tsx
      NonLinearScale.tsx  Discrete slider over the non-linear participant scale
      RankedChoice.tsx    Move-up/down ranked ordering of the 5 principles
      NumberPair.tsx      Engagement calculator (reached vs. participating, shows ratio)
      InfoPanel.tsx       Educational panel with no answer collected (scaling trade-offs)
    results/
      Results.tsx       Ranked recommendation cards, recomputes on every render
      WhyExpander.tsx   Collapsible traceability explanation per recommendation
      ExportButton.tsx  Downloads JSON and triggers window.print()
docs/
  v1.md, prd.md, notes.md, ...   Source specifications and reference papers
```

## Question sequence

Defined as data in `src/data/questions.ts` — reordering is a one-line array edit:

1. `priorities` (rank) — rank the 5 principles; this is the sole source of weights
2. `participants` (scale) — non-linear: 20, 100, 500, 1k, 10k, 50k, 100k
3. `scale-tradeoffs` (info) — educational panel on the 4 scaling tensions; no answer
4. `engagement-depth` (single) — IAP2 Spectrum (Inform → Empower)
5. `diversity` (multi) — demographic groups to reach
6. `stages-focus` (multi) — the 9 deliberation stages to strengthen
7. `modes` (single) — face-to-face / online / hybrid
8. `engagement-calc` (numberPair) — people reached vs. participating
9. `criteria` (single) — self-selection vs. sortition
10. `resources` (multi) — budget / staff / online tool

## Editing the knowledge base (no code required)

**`public/data/templates.csv`** — one row per template. `supports_principles` is a semicolon-separated list of principle names (`Inclusion`, `Equality`, `Plurality`, `Authenticity`, `Reflection`). This is the only link between a template and the ranking.

**`public/data/tree.csv`** — one row per node. `match` supports: exact option value, `any`, threshold (`>=10000`, `<1000`), or `ratio<0.1` (for the engagement calculator). `parent_id` is blank for root nodes. A node is reached only when its parent is also reached.

The seed data in both files are **placeholders derived from the spec** and need review and refinement by the research team.

## Commands

```bash
npm run dev      # local dev server
npm run build    # type-check + production build → dist/
npm run preview  # serve production build locally
npm run test     # 15 engine unit tests
```

## Deployment

Netlify. `netlify.toml` is configured: `npm run build`, publish `dist/`, SPA fallback to `index.html`. Connect the GitHub repo in the Netlify dashboard for continuous deployment on every push to `main`.
