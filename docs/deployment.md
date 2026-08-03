# Deployment

The app is a static Vite bundle hosted on **Appwrite Sites**, in the same Appwrite project as the database. Pushing to `main` rebuilds and publishes it.

```
push to main ──▶ GitHub Actions (verify)   type-check · tests · build
             └─▶ Appwrite Sites (deploy)   npm ci · npm run build · publish dist/
```

The two run independently. Actions is the safety net that tells you a push was broken; Appwrite Sites is what actually ships. A red CI run does **not** block the deploy — see [Caveats](#caveats).

---

## One-time setup

### 1. Connect GitHub to Appwrite

Console → **Sites** → *Create site* → *Connect Git repository*. The first time, this installs the Appwrite GitHub app; grant it access to `gumbelino/delibero`.

This step cannot be scripted — it is an OAuth app installation.

### 2. Site settings

| Setting | Value |
|---|---|
| Framework | **Vite** |
| Branch | `main` |
| Root directory | `./` |
| Install command | `npm ci` |
| Build command | `npm run build` |
| Output directory | `dist` |
| **Fallback file** | **`index.html`** |

**The fallback file is the one that breaks things if missed.** React Router handles `/admin`, `/recommendations` and `/recommendations/:id` in the browser. Without a fallback, those URLs 404 on a hard refresh or when a link is shared — the site appears to work until someone sends a colleague a deep link. It replaces the SPA redirect that used to live in `netlify.toml`.

### 3. Environment variables

Add under the site's **Settings → Environment variables**:

| Variable | Value |
|---|---|
| `VITE_APPWRITE_ENDPOINT` | `https://fra.cloud.appwrite.io/v1` |
| `VITE_APPWRITE_PROJECT_ID` | `delibero` |
| `VITE_APPWRITE_DATABASE_ID` | `delibero` |

Vite inlines these **at build time**, so changing one requires a redeploy, not just a restart.

Never add `APPWRITE_API_KEY` here. It is a full-admin server key used only by the local setup scripts; the site does not need it and adding it would ship it in a build environment unnecessarily.

### 4. Register the domain as a Web platform

Console → **Overview → Add platform → Web**, hostname = the site's domain (e.g. `delibero.appwrite.network`, plus any custom domain).

Appwrite blocks browser requests from unregistered origins. Skip this and the deployed site loads but every database read fails with a CORS error — the app will show "Could not load the recommendation data". `localhost` is already registered for development.

---

## Routine deploys

Push to `main`. Appwrite Sites rebuilds automatically and publishes when the build succeeds; a failed build leaves the previous deployment live.

Pull requests get no preview deployment on the current plan. CI still runs on them.

---

## Caveats

**CI does not gate the deploy.** Appwrite Sites reacts to the push, not to the Actions result, so a commit that fails tests still deploys if it compiles. Treat a red CI run as a signal to fix forward. Gating properly would mean moving deployment into Actions (build, then push with the Appwrite CLI), which trades the built-in Git integration for a stored API key.

**Changing env vars needs a redeploy.** They are compile-time constants in the bundle.

**Schema changes are not deployed.** `scripts/setup-appwrite.mjs` is run manually from a machine holding the API key. The database is shared by all environments, so a schema change takes effect for the live site immediately — before the code that uses it ships. Prefer additive changes, and run the script *before* merging code that depends on them.

**One database per project on the free plan.** A staging environment therefore needs a second Appwrite project, with its own schema run and its own seed. There is currently no staging.

---

## Migrating off Netlify

The repo previously deployed to Netlify; `netlify.toml` has been removed. To finish the switch:

1. Confirm the Appwrite Sites deployment works, including a hard refresh on `/admin`.
2. Point any custom domain at Appwrite (console → the site → **Domains**).
3. Delete the Netlify site, or at least disconnect it from the repo, so two hosts do not serve different versions of the app.

Leaving the Netlify site connected is the main risk here: it keeps building from `main` without the `VITE_APPWRITE_*` variables, so it would serve a copy that cannot reach the database.
