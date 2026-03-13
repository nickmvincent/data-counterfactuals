# Data Counterfactuals

Data Counterfactuals is an interactive explainer, toy lab, and reading map for a simple question: what changes when the training data changes? The project is meant to make training-data questions easier to see and compare across areas like data valuation, privacy, poisoning, unlearning, and collective action.

Standalone Astro + Preact repo for `datacounterfactuals.org`.

## What's here

- Site source in `src/`
- Authored page content in `src/content/pages/`
- Memo content in `src/content/memos/`
- Semble migration notes in `docs/semble-migration.md`

## Semble-backed bibliography

Semble is now the source of truth for bibliography data and reading-list membership.

This repo now keeps the public default Semble source in `semble.config.json`, so local builds and agent runs do not need hand-written env vars just to know where the bibliography lives.

Environment variables still work, but they are now overrides rather than the only source of config. If you need a different profile, URI allowlist, or cache policy locally, copy `.env.example` to `.env.local` and fill in just the values you want to override.

You do not need to list collection names anywhere if `semble.config.json` is pointing at a profile identifier. In the current setup, the site imports all public collections for that profile unless you explicitly narrow it with `SEMBLE_COLLECTION_AT_URIS` or `SEMBLE_COLLECTION_NAME_PREFIX`.

After you edit papers, tags, or collections in Semble, update the site here by rebuilding and redeploying.

Useful commands:

```bash
npm run semble:status
npm run semble:manage -- list-collections
npm run build:refresh
npm run build
npm run build:offline
```

For collection maintenance from the terminal, `npm run semble:manage -- ...` supports listing collections, showing collection contents, renaming/updating collections, and moving cards between collections. It authenticates with:

```bash
SEMBLE_LOGIN_IDENTIFIER=your-handle.bsky.social
SEMBLE_APP_PASSWORD=xxxx-xxxx-xxxx-xxxx
SEMBLE_PDS_SERVICE=https://bsky.social
```

Successful Semble loads write a local snapshot to `tmp/semble-cache.json`. That gives you an offline fallback during dev and a machine-readable paper inventory for later agent workflows.

Recommended workflow:

```bash
# 1. See which Semble source and cache the repo will use
npm run semble:status

# 2. Refresh the local cache from live Semble data
npm run build:refresh

# 3. Normal local work
npm run dev

# 4. Offline/agent-safe work from the cached snapshot only
npm run dev:offline
# or
npm run build:offline
```

## Local dev

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
npm run preview
```

## Deploy

Cloudflare Pages is configured via `wrangler.toml`.

```bash
wrangler pages deploy dist --project-name datacounterfactuals
```

If the Pages project does not exist yet:

```bash
wrangler pages project create datacounterfactuals
```

The Cloudflare Pages project is named `datacounterfactuals`, while the GitHub repo stays `data-counterfactuals`.

## Push to GitHub

If you want to publish this as `data-counterfactuals`:

```bash
git init -b main
git add .
git commit -m "Initial standalone import"
gh repo create data-counterfactuals --source=. --remote=origin --push
```

The current site metadata assumes the GitHub repo URL will be `https://github.com/nickmvincent/data-counterfactuals`. Update `src/data/network.json` if you want a different owner or repo name.
