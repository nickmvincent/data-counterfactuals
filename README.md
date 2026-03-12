# Data Counterfactuals

Standalone Astro + Preact repo for `datacounterfactuals.org`.

## What's here

- Site source in `src/`
- Memo content in `content/data-counterfactuals/memos/`
- Paper collections in `content/shared-references/paper-collections/`
- A curated bibliography slice in `content/shared-references/bibtex-entries/`
- Semble migration notes in `docs/semble-migration.md`

## Semble-backed bibliography

If you set `SEMBLE_PROFILE_IDENTIFIER` or `SEMBLE_COLLECTION_AT_URIS`, the build will pull paper collections and bibliography metadata from public Semble collections at build time.

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
