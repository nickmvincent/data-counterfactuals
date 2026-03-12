# Data Counterfactuals

Standalone Astro + Preact repo for `datacounterfactuals.org`.

## What's here

- Site source in `src/`
- Authored page content in `src/content/pages/`
- Memo content in `src/content/memos/`
- Semble migration notes in `docs/semble-migration.md`

## Semble-backed bibliography

Semble is now the source of truth for bibliography data and reading-list membership.

Set `SEMBLE_PROFILE_IDENTIFIER` or `SEMBLE_COLLECTION_AT_URIS` in your build environment and the site will pull paper collections and bibliography metadata from public Semble collections at build time.

If those env vars are missing, the site will fail fast rather than falling back to repo-local bibliography files.

After you edit papers, tags, or collections in Semble, update the site here by rebuilding and redeploying.

For example:

```bash
SEMBLE_PROFILE_IDENTIFIER=your-handle.bsky.social npm run build
```

Successful Semble loads also write a local snapshot to `tmp/semble-cache.json`. That gives you an offline fallback during dev and a machine-readable paper inventory for later agent workflows.

Useful cache modes:

```bash
# Force a fresh snapshot from Semble
SEMBLE_PROFILE_IDENTIFIER=your-handle.bsky.social SEMBLE_CACHE_POLICY=refresh npm run build

# Work entirely from the last local snapshot
SEMBLE_PROFILE_IDENTIFIER=your-handle.bsky.social SEMBLE_CACHE_POLICY=cache-only npm run dev
```

## Local dev

```bash
npm install
SEMBLE_PROFILE_IDENTIFIER=your-handle.bsky.social npm run dev
```

## Build

```bash
SEMBLE_PROFILE_IDENTIFIER=your-handle.bsky.social npm run build
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
