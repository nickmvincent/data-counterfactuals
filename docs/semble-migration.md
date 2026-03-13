# Semble Migration

This site now loads bibliography data from public Semble collections at build time.

## Content model

Use Semble collections for the reading-list structure.

- One Semble collection = one site collection on `/collections`
- Collection name = site title
- Collection description = site summary text
- Membership in a Semble collection = paper belongs to that reading list

Use the note attached to each URL card for structured bibliography metadata.

## Note schema

Put YAML frontmatter at the top of the card note. The site reads these fields:

```md
---
citation_key: koh2017understanding
entry_type: inproceedings
title: Understanding Black-box Predictions via Influence Functions
authors:
  - Pang Wei Koh
  - Percy Liang
year: "2017"
venue: Proceedings of the 34th International Conference on Machine Learning (ICML)
doi: 10.48550/arXiv.1703.04730
tags:
  - influence-functions
  - interpretability
  - priority:1
semantic_scholar_url: https://www.semanticscholar.org/paper/...
google_scholar_url: https://scholar.google.com/...
---
Optional note body here. If `abstract` is omitted above, this body is used as the abstract/summary.
```

If a field is missing, the loader falls back to Semble card metadata when possible.

## Build-time config

The repo now supports two layers of Semble config:

1. Checked-in public defaults in `semble.config.json`
2. Optional per-machine overrides via environment variables or `.env.local`

Set one of these in either place:

- `SEMBLE_PROFILE_IDENTIFIER`
  Example: `nickmvincent.bsky.social`
  The build loads every public collection for that profile.
- `SEMBLE_COLLECTION_AT_URIS`
  Comma-separated `at://...` URIs for an explicit allowlist of collections.

Optional filters:

- `SEMBLE_COLLECTION_NAME_PREFIX`
  Only collections whose names start with this prefix are included. The prefix is stripped from the displayed title.
- `SEMBLE_API_BASE`
  Defaults to `https://api.semble.so`.
- `SEMBLE_CACHE_PATH`
  Defaults to `tmp/semble-cache.json`.
- `SEMBLE_CACHE_POLICY`
  Defaults to `network-first`. Other useful values are `refresh` and `cache-only`.

If you use `SEMBLE_PROFILE_IDENTIFIER`, you do not need to maintain a second list of collection names in the repo. The site imports every public collection for that profile unless you deliberately narrow the source with `SEMBLE_COLLECTION_AT_URIS` or `SEMBLE_COLLECTION_NAME_PREFIX`.

## Local cache

Successful Semble fetches write a normalized JSON snapshot to `tmp/semble-cache.json` by default.

That cache file includes:

- `collections`
- `references`
- `generated_at`
- `stats`

This is useful for two things:

1. Offline dev: `SEMBLE_CACHE_POLICY=cache-only` loads from the local snapshot without touching the network.
2. Research/agent workflows: agents can read the current collection membership and paper metadata directly from the cache JSON.

Examples:

```bash
# Inspect the resolved Semble source and cache
npm run semble:status

# Inspect or reorganize Semble collections from this repo
npm run semble:manage -- list-collections
npm run semble:manage -- show-collection 1
npm run semble:manage -- update-collection 1 --name "Data Governance"
npm run semble:manage -- move-card --from 1 --to 2 --card 3

# Refresh the cache from live Semble data
npm run build:refresh

# Use the cached snapshot while offline
npm run dev:offline
```

## Ongoing workflow

1. Edit papers, tags, and collection membership in Semble.
2. Keep the repo default source in `semble.config.json`, and only use env vars when you need local overrides.
3. Run `npm run build:refresh` to update the local cache snapshot after live Semble edits.
4. Use plain `npm run dev` / `npm run build` for normal work. They will use the configured source and fall back to cache if the live fetch fails.
5. Use `npm run dev:offline` or `npm run build:offline` when you want deterministic cache-only work for travel, CI debugging, or AI agents.
6. Rebuild and redeploy this site whenever you want those Semble edits reflected here.

The repo-local markdown bibliography and paper-collection files have been removed so Semble stays the only source of truth.

## Taxonomy guidance

Semble collections are the best place to model the visible reading lists.

Use note `tags` for cross-cutting taxonomy that can span multiple collections, such as:

- `foundational`
- `data-governance`
- `priority:1`
- `ml-methods`

The loader also adds a synthetic `collection:<slug>` tag for every Semble collection membership, so existing tag-based grouping can keep working during migration.
