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

Set one of these:

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
# Refresh the cache from live Semble data
SEMBLE_PROFILE_IDENTIFIER=nickmvincent.bsky.social SEMBLE_CACHE_POLICY=refresh npm run build

# Use the cached snapshot while offline
SEMBLE_PROFILE_IDENTIFIER=nickmvincent.bsky.social SEMBLE_CACHE_POLICY=cache-only npm run dev
```

## Ongoing workflow

1. Edit papers, tags, and collection membership in Semble.
2. Keep the build env pointed at Semble with `SEMBLE_PROFILE_IDENTIFIER` or `SEMBLE_COLLECTION_AT_URIS`.
3. Run a normal build/dev session, or use `SEMBLE_CACHE_POLICY=refresh`, to update the local cache snapshot.
4. Rebuild and redeploy this site whenever you want those Semble edits reflected here.

The repo-local markdown bibliography and paper-collection files have been removed so Semble stays the only source of truth.

## Taxonomy guidance

Semble collections are the best place to model the visible reading lists.

Use note `tags` for cross-cutting taxonomy that can span multiple collections, such as:

- `foundational`
- `data-governance`
- `priority:1`
- `ml-methods`

The loader also adds a synthetic `collection:<slug>` tag for every Semble collection membership, so existing tag-based grouping can keep working during migration.
