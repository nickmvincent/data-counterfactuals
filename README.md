# Data Counterfactuals

Data Counterfactuals is an interactive lab and reading map for a simple
question: what changes when data, access, or evaluation changes? The project
makes comparison worlds inspectable across areas like data valuation, privacy,
poisoning, unlearning, and collective action.

Standalone Astro + Preact repo for `datacounterfactuals.org`.

## What's here

- `/` — the desktop Counterfactual Lab, plus a static narrow-screen summary
- `/collections` — the Semble-backed Reading Map
- Lab state, scenarios, metrics, and validation in `src/lib/lab-model.js`
- Verbatim site-v1 Markdown in `archive/site-v1/content/`
- Archive checksums in `archive/site-v1/manifest.json`
- The implementation contract in `docs/site-overhaul-spec.md`
- Semble migration notes in `docs/semble-migration.md`

The public site intentionally has only two routes. Retired routes return 404
without redirects. The archived Markdown is not part of the Astro runtime and
is protected by a checksum test; future edited or merged essays can be
published through the external digital garden without changing the originals.

The external Writing link is configured once in `src/lib/site-config.js`.

## Semble-backed bibliography

Semble is now the source of truth for reading-list membership and the manual note layer, while bibliographic identity fields are resolved at build time from DOI/page metadata when available. Public collections, cards, and collection links are read directly from the configured profile's AT Protocol repository.

This repo now keeps the public default Semble source in `semble.config.json`, so local builds and agent runs do not need hand-written env vars just to know where the bibliography lives.

Environment variables still work, but they are now overrides rather than the only source of config. If you need a different profile, URI allowlist, or cache policy locally, copy `.env.example` to `.env.local` and fill in just the values you want to override.

You do not need to list collection names anywhere if `semble.config.json` is pointing at a profile identifier. In the current setup, the site imports all public collections for that profile unless you explicitly narrow it with `SEMBLE_COLLECTION_AT_URIS` or `SEMBLE_COLLECTION_NAME_PREFIX`.

After you edit papers, tags, or collections in Semble, update the site here by rebuilding and redeploying.

Useful commands:

```bash
npm run semble:status
npm run semble:manage -- list-collections
npm run build:refresh
npm run cf:deploy
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

The full lab initializes at viewport widths of 900 CSS pixels or wider. Narrow
screens receive a static, accessible explanation instead of the canvas
renderer.

## Build

```bash
npm test
npm run check
npm run lint
npm run build
npm run preview
```

For deterministic local or agent work using the checked Semble cache:

```bash
npm run build:offline
npm run test:e2e
```

## Deploy

Cloudflare Pages is configured via `wrangler.toml`.

```bash
npm run cf:deploy
```

That command first verifies that the directory-bound Wrangler identity is `nickmvincent@gmail.com`, then deploys through the pinned `personal` profile. Only after that check does it refresh the live Semble cache, build the Astro site, and deploy `dist` to the `datacounterfactuals` Pages project.

If you want the raw deploy command, it is still:

```bash
wrangler pages deploy dist --project-name datacounterfactuals --profile personal
```

If the Pages project does not exist yet:

```bash
wrangler pages project create datacounterfactuals
```

The Cloudflare Pages project is named `datacounterfactuals`, while the GitHub repo stays `data-counterfactuals`.
