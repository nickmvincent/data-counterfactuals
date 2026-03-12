# Semble Migration

This site can now load bibliography data from public Semble collections at build time.

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

## Suggested migration flow

1. Create a dedicated Semble profile for the site, or use a naming prefix like `dc/` for site collections.
2. Recreate each reading list as a Semble collection with the site-ready title and description.
3. Add each paper as a URL card to the relevant collections.
4. Paste the YAML note onto each card so the site keeps authors, year, tags, DOI, and priority labels.
5. Set `SEMBLE_PROFILE_IDENTIFIER` or `SEMBLE_COLLECTION_AT_URIS` in the build environment.
6. Run the site locally and compare `/collections` against the current markdown-backed version.
7. Remove the old markdown bibliography only after the Semble-backed build matches what you want.

## Exporter script

This repo now includes a one-off exporter at `scripts/export-to-semble.js`.

Dry run:

```bash
npm run semble:export
```

That writes a plan file to `tmp/semble-export-plan.json` without touching Semble.

Publish all collections:

```bash
ATP_IDENTIFIER=your-handle.bsky.social \
ATP_APP_PASSWORD=xxxx-xxxx-xxxx-xxxx \
npm run semble:export -- --publish
```

Publish only a subset:

```bash
ATP_IDENTIFIER=your-handle.bsky.social \
ATP_APP_PASSWORD=xxxx-xxxx-xxxx-xxxx \
npm run semble:export -- --publish --collections data-leverage,data-poisoning
```

Useful flags:

- `--collection-prefix "dc/"`
  Creates Semble collections like `dc/Data Leverage & Collective Action`
- `--collections data-leverage,data-poisoning`
  Filters by local collection slug or title
- `--no-extra-fields`
  Exports only the main site fields instead of carrying over extra frontmatter like `cited_in`
- `--no-update-existing`
  Only creates missing collections/cards/links and leaves existing notes/descriptions alone

The exporter is designed to be rerunnable:

- Reuses existing Semble collections by exact name
- Reuses existing URL cards by exact URL
- Updates an attached note if the generated note text changed
- Adds missing collection links without duplicating existing ones

## Taxonomy guidance

Semble collections are the best place to model the visible reading lists.

Use note `tags` for cross-cutting taxonomy that can span multiple collections, such as:

- `foundational`
- `data-governance`
- `priority:1`
- `ml-methods`

The loader also adds a synthetic `collection:<slug>` tag for every Semble collection membership, so existing tag-based grouping can keep working during migration.
