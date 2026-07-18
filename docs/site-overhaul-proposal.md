# Data Counterfactuals site overhaul proposal

Status: superseded by `docs/site-overhaul-spec.md`
Scope: product structure, interaction design, content migration, and implementation plan
Hard constraint: do not delete existing Markdown content; the final spec archives it outside the runtime

> This proposal has been refined through the completed decision questionnaire. The implementation-ready contract is now in [`docs/site-overhaul-spec.md`](./site-overhaul-spec.md).

## Recommendation

Rebuild `datacounterfactuals.org` as a focused two-page product:

1. **Counterfactual Lab (`/`)** — one integrated, game-like explorer where the grid and graph are two views of the same data-counterfactual world.
2. **Reading Map (`/collections`)** — a concise, Semble-backed summary of the collection, organized as a set of curated starting points rather than a comprehensive textbook.

Written material should gradually move to an external digital garden. Existing Markdown remains in the repository as durable source material and an editorial archive, even after a post is revised, merged with other posts, or redirected to an external canonical version.

The overhaul should reduce the site's job from "explorer + textbook + course + bibliography + project directory" to two promises:

- **Understand the grid/graph idea by manipulating it.**
- **Find the most useful adjacent reading.**

## Product principles

### One object, two views

The grid and graph should not feel like separate tools. They are two projections of the same state:

- a training world
- an evaluation world
- a score rule
- one or more focus data objects
- a counterfactual operation

Changing a selection in one view must immediately make sense in the other. A user should be able to move from a highlighted grid comparison to the corresponding graph edge or path without rebuilding the example.

### Interaction before exposition

The homepage should open directly into a legible toy world, with a short prompt and one obvious action. Longer definitions, caveats, formulas, and method notes should appear contextually in drawers or expandable panels instead of preceding the explorer as an essay.

### A game, not a gamified dashboard

The experience should use small challenges, prediction, reveal, and progression, but avoid points, streaks, badges, or account state. The motivating loop is:

1. See a world.
2. Receive a concrete counterfactual question.
3. Predict which move or comparison answers it.
4. Make the move in the grid or graph.
5. Reveal the result and its interpretation boundary.
6. Switch views to see the same comparison represented differently.

### Preserve source material

The site may stop rendering a Markdown file without deleting it. Moving writing off-site is a publishing decision, not a repository cleanup operation.

## Target information architecture

| Destination | Purpose | Primary content |
| --- | --- | --- |
| `/` | Interactive visual explanation | Integrated grid/graph lab, guided scenarios, free play, contextual glossary and inspector |
| `/collections` | Curated reading summary | Semble themes, "start here" papers, short collection descriptions, links into Semble or paper sources |
| External digital garden | Revised long-form writing | Merged and edited essays, glossary/book chapters, open-book structure over time |
| External project links | Follow-up and provenance | GitHub, discussion venues, original Substack posts |

The primary navigation should contain only two internal destinations: **Explore** and **Reading**. **Writing**, **GitHub**, and any discussion link may appear as clearly external links.

## Page 1: Counterfactual Lab

### Core experience

The homepage should be a dedicated full-width lab rather than a memo with an embedded tool.

Recommended page structure:

1. **Compact orientation**
   - Title: "What changes when the data changes?"
   - One-sentence definition of a data counterfactual.
   - Primary action: "Start with one removal."
   - Secondary action: "Explore freely."

2. **Shared scene bar**
   - Current training world
   - Current evaluation world
   - Score rule
   - Focus object or coalition
   - Share/reset actions

3. **Main stage**
   - Grid and graph tabs, segmented control, or a smooth view transition
   - Both views consume the same state
   - View switching does not navigate to another page

4. **Challenge and interpretation rail**
   - Current question
   - Prediction prompt
   - Step-by-step move
   - Result
   - "What this supports" and "What this does not establish"

5. **Context drawers**
   - Concepts/glossary
   - Formula or evidence-cell inspector
   - Display and metric settings
   - Shareable state

On small screens, the challenge panel should lead, followed by the active visualization and then the result. The full matrix can use a focused-window or selected-neighborhood mode rather than forcing the desktop grid into a narrow viewport.

### Recommended scenarios

Launch with a small set of authored scenarios that reuse the current mathematical and interaction capabilities:

| Scenario | Question | Grid expression | Graph expression |
| --- | --- | --- | --- |
| One removal | What changes if object B is removed from training? | Compare two cells in one evaluation column | Traverse one deletion edge |
| Evaluation shift | What changes when the model is judged on a different slice? | Move across columns in one training row | Keep the node fixed and change the evaluation slice |
| Coalition strike | What happens when a group withholds data? | Compare a full row with a group-removal row | Follow a multi-edge removal path |
| Attribution sweep | How much does B contribute across possible contexts? | Highlight the cells used by a Shapley-style quantity | Highlight every edge that adds B |
| Scaling | How do outcomes change with training-set size? | Aggregate rows by subset size | Highlight and summarize graph layers |

The existing privacy, poisoning, unlearning, budget, and richer valuation modes should remain available in **Free play** or an **Advanced** drawer. They should not all compete for attention in the first-run experience.

### First-run path

A first-time visitor should be able to complete this sequence in roughly three minutes:

1. Start with train `ABC`, eval `ABC`, focus `B`.
2. Predict whether removing `B` increases or decreases the selected score.
3. Select the comparison in the grid.
4. Reveal the delta and interpretation boundary.
5. Switch to graph view and see the same move as an edge.
6. Try a coalition or evaluation-side move.
7. Leave with a shareable URL or open the Reading Map.

### Visual direction

The visual language should feel like an instrument or scientific toy:

- one strong central stage
- restrained surrounding chrome
- persistent color semantics for training, evaluation, focus, and comparison worlds
- animated continuity between selected grid cells and graph nodes/edges
- concise labels in the stage; details in the interpretation rail
- clear distinction between observed toy scores and claims that require additional assumptions

The 3D viewer should not be a primary surface in the first overhaul. It can remain in source control as an experiment and be reconsidered only if it clarifies a concept that the integrated 2D views cannot.

## Page 2: Reading Map

Keep `/collections` as the stable second route, but simplify its product role and presentation.

### Recommended structure

1. **Short framing**
   - What the collection covers
   - How Semble is used
   - A clear "curated starting map, not exhaustive bibliography" statement

2. **Start here**
   - Five to eight papers spanning technical and institutional perspectives
   - One sentence explaining why each is a useful entry point

3. **Theme map**
   - Core themes first
   - Related themes second
   - Each theme shows a short description, one to three exemplar papers, and a count
   - Expand on demand for the full collection

4. **Live collection link**
   - Link to the public Semble collection/profile for people who want the complete, current shelf
   - Display last refresh date and whether the build used live or cached data when that information is available

The page should summarize the collection rather than reproduce every available metadata field. Semble remains the source of truth for membership and curation.

## Writing and Markdown migration policy

### Repository contract

During and after the overhaul:

- Do not delete or rename files under `src/content/memos/` or `src/content/pages/`.
- Do not overwrite an original memo with a newly consolidated essay.
- Preserve original frontmatter, prose, citations, and publication context.
- Add migration metadata only when an external destination actually exists.
- Keep original Substack posts live.
- Treat external digital-garden posts as revised editions that may merge several source posts.

### Proposed migration metadata

Extend memo frontmatter later with optional fields such as:

```yaml
migration_status: planned # local, planned, external, or merged
canonical_url: https://example.com/revised-post
source_urls:
  - https://original-substack-post.example
superseded_by: revised-data-counterfactuals
```

Add a small migration manifest mapping each local slug to:

- its retained Markdown source
- any original external publication
- its revised digital-garden destination
- whether several local or Substack posts were merged
- redirect readiness

The manifest should drive redirects and external writing links. Redirects must not be enabled until their destination exists.

### Consolidating overlapping posts

The digital garden should favor revised synthesis over one-to-one copying. A useful editorial workflow is:

1. Identify two or more posts making substantially the same argument.
2. Preserve all originals.
3. Define the durable claim or chapter those posts were reaching toward.
4. Merge and rewrite them as one stronger garden essay.
5. Add a short provenance note linking the original posts.
6. Map each legacy site URL to the revised destination.

This supports the longer-term "open book" direction without requiring the current site to become the book.

## Legacy URL plan

The end state should preserve inbound links while presenting only two primary internal pages.

| Current route | End-state behavior |
| --- | --- |
| `/` | New integrated Counterfactual Lab |
| `/grid` | Permanent redirect to `/?view=grid`, preserving compatible explorer state |
| `/graph` | Permanent redirect to `/?view=graph`, preserving compatible explorer state |
| `/collections` | Remains the Reading Map |
| `/memo` | Redirect to the external digital-garden writing index once it exists |
| `/memo/:slug` | Remain local until mapped; then redirect to the specific revised or merged external post |
| `/glossary` | Redirect to `/?drawer=glossary` or to a digital-garden glossary chapter |
| `/api-explorer` | Redirect to `/?drawer=inspect` after the inspector is integrated |
| `/advanced.html` | Remove from navigation; keep source until a deliberate retain/retire decision |
| `/discussions` | Replace with external footer links; redirect only after a stable destination is chosen |

During transition, the site can be a **two-page primary experience** while unmigrated legacy routes remain directly accessible but unlisted. The strict two-page public end state arrives only after all legacy content has a safe destination.

## Technical implementation

The current repository already has much of the difficult foundation:

- a shared grid/graph URL-state format in `src/lib/explorer-game-state.js`
- shared subset and scoring logic in `src/lib/counterfactual-math.js`
- named grid concepts and evidence-cell plans in `src/lib/grid-concept-planner.js`
- graph missions and grid walkthrough behavior
- a Semble-backed collection loader with a local cache

The main technical task is to make shared state a first-class in-page model instead of synchronizing two separate page-level applications through links.

### Proposed component shape

```text
src/pages/index.astro
└── CounterfactualLab
    ├── SceneBar
    ├── ScenarioPanel
    ├── ViewSwitcher
    │   ├── GridView
    │   └── GraphView
    ├── InterpretationPanel
    └── LabDrawers
        ├── Glossary
        ├── Inspector
        └── AdvancedControls
```

Recommended refactor:

1. Create one `CounterfactualLab` state owner.
2. Extract presentational `GridView` and `GraphView` components from the current self-contained explorers.
3. Extend shared URL state with `view`, `scenario`, and `step`.
4. Move scenario definitions into a small typed data module.
5. Keep mathematical functions pure and independently tested.
6. Migrate the large page-specific style blocks into shared lab styles incrementally.
7. Convert `/grid` and `/graph` to compatibility routes only after feature parity is verified.

### State model

At minimum, the shared lab state should include:

```text
view
scenario
step
count
metric
mode/lens
trainSet
evalSet
focusSet
k
prediction
```

Only state needed to reconstruct or share an example belongs in the URL. Temporary UI state such as open drawers or hover targets can remain local unless a deep link is useful.

### Content preservation check

Before changing routing, add a small automated check that asserts the current baseline Markdown files still exist. This makes the no-deletion requirement executable rather than relying only on convention.

## Delivery plan

### Phase 0: Lock the contract

- Record the baseline list of Markdown files.
- Add a content-preservation test.
- Define the two-page route map.
- Define optional migration metadata without applying redirects.
- Capture current grid, graph, and collections behavior in tests.

Exit condition: the repository will fail verification if an existing Markdown source disappears.

### Phase 1: Build the shared lab core

- Introduce the shared in-page state owner.
- Extract grid and graph views without materially redesigning them.
- Preserve current URL sharing and cross-view state.
- Add an in-page view switch.
- Keep `/grid` and `/graph` working during the refactor.

Exit condition: one page can switch between grid and graph with no state loss, and existing explorer tests still pass.

### Phase 2: Add the game-like experience

- Add the first-run removal scenario.
- Add the five recommended scenario definitions.
- Add prediction/reveal and interpretation boundaries.
- Simplify controls into basic and advanced layers.
- Add mobile-focused visualization behavior.
- Make the lab the homepage.

Exit condition: a new visitor can complete one guided scenario and understand its grid and graph representations without reading a memo first.

### Phase 3: Focus the Reading Map

- Retitle and simplify `/collections`.
- Add "Start here" exemplars.
- Add collection summaries and collapsed full shelves.
- Keep Semble live/cache behavior and current sorting guarantees.
- Reduce navigation to the two internal destinations.

Exit condition: the second page gives a useful overview before exposing the full bibliography.

### Phase 4: Migrate writing gradually

- Choose or confirm the digital-garden base URL.
- Inventory local memos and relevant Substack posts by argument.
- Select the first consolidation cluster.
- Publish one revised garden essay.
- Add migration metadata and redirects for only that cluster.
- Repeat incrementally.

Exit condition: each redirected local route has a verified external destination, while every original Markdown file remains in the repository.

### Phase 5: Compatibility and cleanup

- Add verified legacy redirects.
- Integrate glossary and API-inspector functions into the lab.
- Remove obsolete routes from navigation and generated sitemaps.
- Decide whether the 3D viewer remains an unlisted experiment or is retired from production.
- Run accessibility, responsive, performance, and link checks.

Exit condition: the site's primary and indexed experience consists of the lab and reading map, with no broken inbound links.

## Acceptance criteria

### Product

- The top navigation has exactly two internal links.
- The homepage opens into an interactive state without requiring an essay-length preface.
- Grid and graph operate as views of one shared world.
- At least five guided scenarios are available.
- A user can predict, act, reveal, and switch views in the first scenario.
- The Reading Map provides a short curated path before the full Semble shelf.

### Content

- Every Markdown file present before the overhaul is still present afterward.
- No local memo redirects before its external replacement is published and verified.
- Original Substack links remain recorded.
- Merged garden essays record which originals they revise.
- Unmigrated writing remains accessible during the transition, even if unlisted.

### Technical

- Shared explorer state survives view switching and page reloads.
- Existing compatible `/grid` and `/graph` links continue to resolve.
- All mathematical unit tests continue to pass.
- Core first-run and cross-view flows have end-to-end coverage.
- Semble refresh and cache-only builds both continue to work.
- The default scene stays responsive at the current small toy sizes.
- The lab supports keyboard operation and reduced-motion preferences.

## Non-goals

- Building a complete online textbook or course platform
- Migrating every memo before launching the new explorer
- Deleting repository content after external publication
- Treating the reading map as an exhaustive literature review
- Making the 3D viewer central to the product
- Adding accounts, persistent scores, badges, or social game mechanics
- Claiming that the toy grid establishes privacy, legal rights, economic value, or real-world causality by itself

## Proposed backlog

1. **Create the two-page site shell**
   - Make `/` the integrated lab and retain `/collections` as the Reading Map.
   - Reduce primary navigation to Explore and Reading.

2. **Unify grid and graph state**
   - Refactor the current explorers into two views driven by one in-page state owner.
   - Preserve shareable URLs and current mathematical behavior.

3. **Design and build guided counterfactual scenarios**
   - Start with removal, evaluation shift, coalition strike, attribution sweep, and scaling.
   - Add prediction, reveal, and interpretation-boundary steps.

4. **Simplify the Semble collection page**
   - Add a "Start here" shelf, theme summaries, exemplars, and expandable full lists.
   - Keep Semble as the source of truth.

5. **Add a non-destructive writing migration system**
   - Preserve all Markdown.
   - Add optional external-canonical metadata and a redirect manifest.
   - Enable redirects only after external posts exist.

6. **Consolidate overlapping Substack posts in the digital garden**
   - Inventory arguments, choose the first cluster, merge and revise it, preserve provenance, and map legacy routes.

7. **Retire secondary public pages carefully**
   - Integrate glossary and inspector functions into the lab.
   - Unlist or redirect legacy pages without breaking inbound links.
   - Make a separate decision about the 3D prototype.

## Decisions that can wait

The proposal does not require these choices before Phase 1:

- the final digital-garden platform or base URL
- whether the external writing index is called "Writing," "Garden," or "Book"
- whether the integrated view switch is a tab, morph, or side-by-side comparison
- whether the 3D viewer has a future role
- which overlapping Substack cluster is migrated first

Those decisions should be made with a working shared lab prototype and a concrete first essay cluster in hand.
