# Data Counterfactuals site overhaul specification

Status: implementation-ready specification
Version: 1.0
Date: 2026-07-16
Owner: Nick Vincent
Implementation repository: `data-counterfactuals`
Writing repository: sibling `nickmvincent.com` monorepo

This specification converts the completed site-overhaul questionnaire into a concrete product, design, engineering, migration, verification, and release contract.

## 1. Outcome

Launch `datacounterfactuals.org` as a strict two-page site:

1. `/` — **Counterfactual Lab**, a desktop-first visual instrument that represents the same data-counterfactual state as an interactive grid or graph.
2. `/collections` — **Reading Map**, a minimal Semble-backed display of the current Data Counterfactuals collections.

No other project content pages, explorer routes, memo routes, glossary routes, API tools, discussion pages, or 3D prototypes will remain publicly available at launch.

The homepage must teach this idea within roughly three minutes:

> A data counterfactual compares an initial world with another scenario in which data, access to data, or the surrounding real world changes. This frame connects technical computer-science questions with applied economic and social questions.

The experience should feel like a scientific or game-system instrument: visually rich, responsive, precise, and exploratory, without scores, accounts, achievements, or forced tutorial steps.

## 2. Decision precedence and resolved ambiguities

The questionnaire contains a few apparent conflicts. They are resolved as follows.

### 2.1 Two pages versus retained content

The deployed site will have two public content pages. Existing authored Markdown will not be rendered, indexed, redirected, or treated as a compatibility layer.

The original instruction not to delete Markdown still applies. At cutover, current authored Markdown will move into a non-runtime archive inside this repository. It will be preserved verbatim and protected by a manifest/checksum test.

This achieves both goals:

- the deployed product and runtime remain lean;
- no authored Markdown content is destroyed.

### 2.2 No legacy support

“No legacy” means:

- no `/grid` or `/graph` compatibility pages;
- no `/memo` or `/memo/:slug` pages;
- no `/glossary`, `/api-explorer`, `/discussions`, or `/advanced.html`;
- no legacy redirects;
- no legacy entries in navigation or the sitemap;
- old URLs return the host’s normal not-found response.

The site will use ordinary external links to new writing. It will not create one-to-one redirects from old memos to future posts.

### 2.3 Guided versus open exploration

The Lab has two explicit modes in a persistent instrument top bar:

- **Guided** shows the scenario deck. Choosing a scene animates the selection of
  the relevant visual marks while the inspector constructs World A, constructs
  World B, and interprets their comparison.
- **Explore** resets the Lab to an empty selection. A second persistent control
  chooses whether clicked cells are added to the World A set or World B set.
  The inspector computes every A × B pairing and classifies the supported
  training, evaluation, corruption, or joint counterfactual structures.

Guided mode is not a gate: visitors may change selections directly, switch
views, or move to Explore at any time. The site does not track scenario
completion or turn the walkthrough into a score, streak, or analytics event.

### 2.4 Sharing versus no URL state

Explorer state will not be encoded in the URL in version 1.

“Share explorer states” means:

- export the current state as formatted JSON;
- copy or save that JSON;
- paste it into another browser or machine;
- restore the same validated state.

### 2.5 Analytics conflict

The specific “No analytics” answer takes precedence over the earlier generic launch-success checkbox.

The application will include:

- no analytics library;
- no custom event collection;
- no cookies for behavioral measurement;
- no scenario-completion telemetry.

Cloudflare may retain its normal operational request/deployment metrics. Those are infrastructure metrics, not product analytics.

### 2.6 No maximum versus finite browser resources

The interface will expose no arbitrary fixed object-count maximum. It cannot, however, fully enumerate an indefinitely growing subset space.

For \(n\) data objects:

- possible training worlds: \(2^n\);
- possible evaluation worlds: \(2^n\);
- possible grid cells: \(4^n\);
- subset-lattice edges: \(n2^{n-1}\).

The lab will therefore select an exact, windowed, or aggregate representation based on estimated workload. It will never imply that an enormous space was fully computed when it was sampled or summarized.

### 2.7 Resource-monitor accuracy

Browsers do not provide reliable cross-browser CPU utilization, GPU utilization, or total tab-memory APIs.

The instrument will show:

- measured frame/render time;
- measured visible-mark count;
- selected rendering backend;
- measured application-buffer allocations where known;
- estimated full-space size and memory cost;
- browser-provided memory only when a supported API is available.

Every estimate will be labeled as an estimate. Unsupported measurements will show “Unavailable,” not a fabricated number.

## 3. Audiences and copy model

The site has a mixed audience with no single primary audience:

- technical researchers and practitioners;
- students and intelligent newcomers;
- economists, policy researchers, and governance audiences;
- people interested in data rights, data leverage, and collective action.

The copy system should therefore use two registers together:

1. **Plain-language action:** “Remove B from training.”
2. **Technical or applied interpretation:** “A leave-one-out comparison; the same structure can represent an ablation or a one-member data strike.”

Technical terms should not be removed, but they should be paired with a short plain-language description the first time they appear in a state or scenario.

Long explanatory prose does not belong on the homepage. Definitions, formulas, and limits belong in the explainer modal, glossary drawer, or inspector.

## 4. Public information architecture

### 4.1 Header

The shared header contains:

- brand link: `Data Counterfactuals` → `/`;
- internal link: `Lab` → `/`;
- internal link: `Reading` → `/collections`;
- external link: `Writing ↗`;
- external link: `GitHub ↗`.

Only `Lab` and `Reading` count as internal navigation.

The default external writing label is **Writing**. Its URL is configured in one site-level constant. The expected destination is the public output of the sibling `nickmvincent.com` digital-garden pipeline. The owner may replace the exact URL before launch without changing the information architecture.

### 4.2 Footer

The footer is compact and contains:

- Writing;
- GitHub;
- Semble profile;
- a one-line scope statement;
- no repeated multi-column site map.

### 4.3 Sitemap and canonical URLs

The generated sitemap contains exactly:

- `https://datacounterfactuals.org/`
- `https://datacounterfactuals.org/collections`

Canonical URLs point to those same URLs.

Old content routes are omitted rather than redirected.

## 5. Page 1: Counterfactual Lab

### 5.1 Page structure

Desktop layout:

```text
┌─────────────────────────────────────────────────────────────┐
│ Header: brand / Lab / Reading / Writing ↗ / GitHub ↗       │
├─────────────────────────────────────────────────────────────┤
│ Instrument bar: Guided / Explore     [World A / World B]   │
├─────────────────────────────────────────────────────────────┤
│ Scenario title and world-change ribbon        Resource HUD │
│ Baseline → external change → data state → operator → result│
├─────────────────────────────────────────────────────────────┤
│ Scenario presets │     Main visual stage     │ Inspector   │
│                  │  Grid ↔ animated ↔ Graph  │ / glossary  │
├─────────────────────────────────────────────────────────────┤
│ State controls / JSON import-export / display controls     │
└─────────────────────────────────────────────────────────────┘
```

The main stage dominates the viewport. The surrounding controls should resemble instrument controls rather than a stack of article cards.

### 5.2 Initial state

The default state is the **One removal** scenario:

- objects: `A`, `B`, `C`;
- baseline train: `ABC`;
- counterfactual train: `AC`;
- evaluation: `ABC`;
- focus: `B`;
- score: normalized coverage;
- initial view: grid;
- selected evidence: the baseline `f(ABC, ABC)` cell only;
- active prompt: select the second world needed to isolate removing `B`.

The page must be useful before any input.

The initial application mode is **Guided**. Entering **Explore** clears the
scenario-specific evidence and opens empty World A and World B cell sets.

### 5.3 Optional explainer modal

On a first desktop visit, open a dismissible explainer modal. Remember dismissal locally.

The modal contains three concise sections:

1. **Worlds:** each grid cell is one training/evaluation world.
2. **Changes:** data can change because of outside events, access decisions, adversarial acts, or operator choices.
3. **Two views:** the grid compares scores across train/eval worlds; the graph shows moves between data worlds.

Actions:

- `Open the first scenario`;
- `Explore freely`;
- `Close`.

The modal:

- does not lock the page;
- does not require interaction in a particular order;
- does not record completion;
- can be reopened from a `How it works` control.

### 5.4 World-change ribbon

Every scenario is described by a six-stage ribbon:

1. **Initial world**
2. **Real-world event or choice**
3. **External data/access consequence**
4. **Internal operator transformation**
5. **Train/eval comparison**
6. **Observed toy result**

Not every scenario uses every stage. An unused stage remains visible but is labeled “No change.”

Examples:

- a data strike changes stages 2 and 3;
- modeler-driven data selection changes stage 4;
- an evaluation shift changes the evaluation side of stage 5;
- scaling defines a family of stage-5 comparisons.

This ribbon is the primary answer to the requested epistemic framing:

> Initial world → changed real world → data-record or access changes caused by external choices → data-record changes caused by internal choices → measured result.

### 5.5 Interpretation panel

The inspector provides the same six fields for every active comparison:

- **Initial world**
- **Counterfactual world**
- **Intervention**
- **Conditions held fixed**
- **What changed in the toy result**
- **What this does not establish**

The final field must explicitly distinguish the visualization from claims about:

- legal rights;
- privacy guarantees;
- intrinsic or moral value;
- economic bargaining power;
- feasibility at production scale;
- causal effects outside the defined toy protocol.

### 5.6 Grid view

The grid encodes:

- rows: training/data worlds;
- columns: evaluation worlds;
- cells: a score under one train/eval pairing;
- selected cells: evidence used by the active comparison;
- row transitions: training/data-world changes;
- column transitions: evaluation-world changes.

Interaction:

- click a cell to select it;
- in Guided mode, the selected cells are evidence for the active scene;
- in Explore mode, the active A/B control assigns the cell to one set and a
  cell belongs to at most one set;
- click a row/column label to focus it;
- select two or more worlds to compare;
- hover/focus to preview relationships;
- use the inspector to read the literal comparison and formula;
- use keyboard controls for all selection actions.

Explore results enumerate the Cartesian product of the selected World A and
World B sets. Exact counts cover every pairing; long detail lists may show only
the largest score changes as long as that sampling is explicit. The resulting
labels describe comparison structure under the configured toy score and must
not be phrased as causal conclusions about a trained model or outside world.

The Explore inspector also runs a concept-requirement planner. Each technical
concept is a family of valid evidence templates over World A, World B, or either
set. The planner enumerates candidate instances, scores each template by the
fraction of required cells already selected, accepts a globally swapped A/B
orientation when the formula permits it, and reports the closest instance.
Ready concepts expose the computed toy result and formula. Partial concepts
show an accessible progress bar plus the exact cells still needed in World A,
World B, or either set. A user-confirmed action may add those missing cells.

The initial catalog covers leave-one-out, group leave-one-out, evaluation-set
value, pair interaction, Data Shapley, Banzhaf value, Beta Shapley, adjacent
training/evaluation/diagonal scaling steps, budgeted subset scans,
exact-retrain references, and neighboring-world sensitivity. Full-lattice
templates are exact through eight data objects; above that threshold they are
explicitly unavailable rather than silently sampled. Local two- and four-cell
concepts remain available.

The grid must not allocate or retain a complete matrix when a score can be calculated on demand.

### 5.7 Graph view

The graph encodes:

- nodes: training/data worlds;
- edges: one allowed transformation;
- layers: subset size or transformation depth;
- active evaluation world: a fixed scoring lens;
- node display: score under the active evaluation lens;
- highlighted edge/path: active comparison.

Edge kinds:

- add;
- remove;
- withdraw/access loss;
- reserve for evaluation;
- poison/corrupt;
- replace;
- select;
- unlearn/audit reference.

Color alone cannot distinguish edge kinds. Use labels, line styles, or glyphs as well.

### 5.8 Grid-to-graph transition

The grid and graph are two views of one state. Switching view triggers a subtle continuity animation.

Grid → graph:

1. Keep the selected evaluation column visible as a persistent “eval lens.”
2. De-emphasize non-selected columns.
3. Detach row labels/world markers into graph nodes.
4. Reposition nodes into subset/transformation layers.
5. Connect allowed single-step transformations.
6. Carry selected scores to their endpoint nodes.
7. Carry the selected delta to the highlighted edge or path.

Graph → grid performs the inverse mapping.

Animation contract:

- default duration: 480–650 ms;
- no looping or decorative idle animation;
- only the selected comparison and a bounded number of nearby marks animate individually;
- large spaces aggregate before transitioning;
- `prefers-reduced-motion: reduce` replaces movement with an immediate state-preserving view change and a short opacity transition.

A literal morph of every grid cell into a node is not required and would be conceptually wrong: graph nodes correspond primarily to training/data worlds, not train/eval cells.

### 5.9 Scenario presets

Scenarios are named state presets, not locked missions. Selecting one updates the world-change ribbon, state, selected evidence, explanatory copy, and suitable view.

Each scenario declares an expected comparison. The interface asks the visitor to select the world or worlds needed to make that comparison.

When the selected evidence matches:

- show a neutral `Comparison matched` acknowledgement;
- reveal the delta and full interpretation;
- do not award points;
- do not prevent other selections;
- do not record completion;
- allow the visitor to keep exploring immediately.

The scenario may always be reset to its initial anchor state.

#### Scenario A: One removal

Question:

> Which two worlds show what changes when B is removed from training?

State:

- objects: `A B C`;
- baseline train: `ABC`;
- counterfactual train: `AC`;
- eval: `ABC`;
- focus: `B`;
- origin: external choice or modeler ablation;
- operation: remove;
- metric: normalized coverage.

Grid expression:

- compare `f(ABC, ABC)` with `f(AC, ABC)`.

Graph expression:

- one deletion edge from `ABC` to `AC`.

#### Scenario B: Evaluation shift

Question:

> Which two worlds show what changes when C becomes part of evaluation rather than training?

State:

- objects: `A B C`;
- train fixed: `AB`;
- baseline eval: `AB`;
- counterfactual eval: `ABC`;
- focus: `C`;
- origin: evaluator or governance decision;
- operation: add/reserve for evaluation;
- metric: normalized coverage.

Grid expression:

- compare `f(AB, AB)` with `f(AB, ABC)`.

Graph expression:

- selected training node remains fixed;
- the eval lens changes from `AB` to `ABC`;
- node scores update without implying a training transition.

#### Scenario C: Coalition strike

Question:

> Which comparison represents B and C withholding their data together?

State:

- objects: `A B C D`;
- baseline train: `ABCD`;
- counterfactual train: `AD`;
- eval: `ABCD`;
- focus coalition: `BC`;
- origin: external collective action;
- operation: withdraw;
- metric: normalized coverage.

Grid expression:

- compare `f(ABCD, ABCD)` with `f(AD, ABCD)`.

Graph expression:

- highlight a two-edge removal path;
- allow the user to inspect both possible orderings;
- explain that the coalition comparison concerns endpoints, while path order can matter in richer training protocols.

#### Scenario D: Scaling

Question:

> How does average score change as the training world grows?

State:

- objects: `A B C D E`;
- eval: `ABCDE`;
- family: every training subset;
- origin: internal modeler experiment;
- operation: vary retained training-set size;
- metric: normalized coverage.

Grid expression:

- group rows by subset size \(k\);
- compute the average of the active evaluation column for each \(k\).

Graph expression:

- group/highlight graph layers by subset size;
- show layer averages.

This scenario compares a family of worlds rather than only two endpoints.

#### Scenario E: Poisoning

Question:

> Which worlds isolate the effect of changing B into a corrupted training record?

State:

- objects: `A B C`;
- baseline train: clean `ABC`;
- counterfactual train: `AB*C`, where `B*` is the corrupted variant of `B`;
- eval: clean `ABC`;
- focus: `B`;
- origin: adversarial or external intervention;
- operation: corrupt/replace;
- metric: `toy-poisoned-coverage`.

Toy score:

```text
clean coverage against eval
minus an explicit poison penalty for corrupted eval-relevant objects
clamped to [0, 1]
```

The exact penalty is visible in the inspector and JSON configuration.

Grid expression:

- compare the clean and corrupted training worlds in the same evaluation column.

Graph expression:

- use a corruption edge, visually distinct from add/remove edges.

The panel must say that this is a threat-model illustration, not a realistic poisoning benchmark.

#### Scenario F: Unlearning audit

Question:

> What reference world should an unlearning result be compared with?

State:

- objects: `A B C D`;
- original train: `ABCD`;
- deletion request: `B`;
- exact retrain reference: `ACD`;
- eval: `ABCD`;
- optional candidate-unlearned score: configured separately;
- origin: external deletion request plus internal operator response;
- operation: unlearn/audit;
- metric: normalized coverage or selected advanced metric.

Grid expression:

- highlight the original and exact-retrain reference cells;
- show a candidate-unlearned score as an overlay, not as a fabricated training row.

Graph expression:

- solid removal edge to the exact-retrain reference;
- dashed audit comparison for the candidate unlearned result.

The scenario teaches the reference comparison. It does not claim to implement a production unlearning algorithm.

#### Scenario G: Budgeted selection

Question:

> With room for only two training objects, which retained world scores highest?

State:

- objects: `A B C D E`;
- budget: \(k=2\);
- eval: `ACE`;
- origin: internal modeler choice;
- operation: select;
- metric: weighted coverage;
- default weights:
  - `A: 0.32`
  - `B: 0.05`
  - `C: 0.26`
  - `D: 0.12`
  - `E: 0.25`

Grid expression:

- inspect all size-2 training rows in the active eval column;
- highlight the highest-scoring row.

Graph expression:

- highlight the \(k=2\) layer;
- emphasize the selected node.

### 5.10 Free play

Free play exposes:

- object count and labels;
- train/eval worlds;
- focus object or coalition;
- transformation type;
- metric;
- selected evidence;
- exact/windowed/aggregate display mode when available;
- poison penalty;
- budget \(k\);
- candidate unlearning result;
- display and animation controls.

Advanced controls remain collapsed by default.

### 5.11 Score functions

Version 1 includes:

1. **Normalized coverage**

   ```text
   |train ∩ eval| / |eval|
   ```

2. **Jaccard overlap**

   ```text
   |train ∩ eval| / |train ∪ eval|
   ```

3. **Raw overlap**

   ```text
   |train ∩ eval|
   ```

4. **Weighted coverage**

   ```text
   sum(weight(x) for x in train ∩ eval)
   / sum(weight(x) for x in eval)
   ```

5. **Toy poisoned coverage**

   A transparent extension of normalized coverage with an explicit corruption penalty.

The score system is extensible, but every score function must provide:

- a stable ID;
- a human-readable name;
- a formula/description;
- a domain/range;
- deterministic evaluation;
- serialization support;
- tests.

### 5.12 JSON import and export

The state-sharing contract is JSON, not URL parameters.

Schema identifier:

```text
data-counterfactuals/lab-state
```

Version 1 example:

```json
{
  "schema": "data-counterfactuals/lab-state",
  "version": 1,
  "view": "grid",
  "scenario": "one-removal",
  "objects": [
    { "id": "A", "label": "A", "weight": 1 },
    { "id": "B", "label": "B", "weight": 1 },
    { "id": "C", "label": "C", "weight": 1 }
  ],
  "baseline": {
    "train": ["A", "B", "C"],
    "eval": ["A", "B", "C"]
  },
  "counterfactual": {
    "train": ["A", "C"],
    "eval": ["A", "B", "C"]
  },
  "operation": {
    "origin": "external",
    "kind": "remove",
    "targets": ["B"]
  },
  "focus": ["B"],
  "metric": {
    "id": "coverage",
    "parameters": {}
  },
  "selection": {
    "worldIds": [],
    "evidence": []
  },
  "advanced": {
    "budget": null,
    "poisonPenalty": 0.15,
    "candidateUnlearnedScore": null
  },
  "display": {
    "numbers": true,
    "resourceHud": true,
    "reducedMotionOverride": null
  }
}
```

Import behavior:

- paste JSON into an import dialog;
- parse without executing code;
- validate schema and version;
- reject duplicate object IDs or references to missing objects;
- reject non-finite numeric values;
- show field-specific validation errors;
- do not partially apply invalid state;
- ignore unknown optional fields only when version compatibility allows it;
- require explicit confirmation before replacing the active state.

Export behavior:

- emit schema version 1;
- use stable key ordering;
- pretty-print with two-space indentation;
- include all state needed to recreate the scene;
- exclude hover, temporary animation, and open/closed drawer state;
- provide `Copy configuration`;
- provide `Download JSON` if it can be implemented without additional infrastructure.

Local persistence:

- autosave the last valid state in `localStorage`;
- provide `Reset to default`;
- recover safely from invalid or old local state;
- never send saved state off-device.

### 5.13 Workload tiers

The renderer chooses a tier from derived workload, not a fixed object-count dropdown maximum.

#### Exact tier

Use when:

- training/eval world count is at most 256;
- potential grid cells are at most 65,536;
- graph nodes/edges remain below renderer mark limits.

Behavior:

- all rows/columns/nodes are available;
- values are computed lazily or cached;
- no requirement to allocate a dense matrix.

#### Windowed tier

Use when:

- full enumeration is conceptually possible but complete rendering is too expensive;
- world count is at most 16,384;
- visible work can stay under approximately 20,000 marks.

Behavior:

- grid virtualizes rows and columns;
- graph renders selected neighborhoods, active paths, and layer summaries;
- formulas compute visible/selected values on demand;
- the UI explains that the full space exists but is not all drawn at once.

#### Aggregate tier

Use when:

- world count exceeds 16,384;
- exact enumeration would exceed safety thresholds;
- calculated buffer cost is excessive.

Behavior:

- do not enumerate the full grid or graph;
- show analytic counts using `BigInt` or scientific notation;
- show selected paths, sampled worlds, and subset-size aggregates;
- label sampled/aggregate results;
- prevent controls from triggering accidental full enumeration.

The thresholds are initial engineering defaults and may be tuned after benchmarks. Tuning must not change the semantic distinction among exact, windowed, and aggregate modes.

### 5.14 Resource HUD

The top-right instrument HUD shows:

- render mode: `Exact`, `Windowed`, or `Aggregate`;
- rendering backend;
- data objects;
- possible training worlds;
- possible grid cells;
- visible marks;
- latest render/frame time;
- estimated application-buffer memory;
- tab memory when supported, otherwise `Unavailable`.

Expanded help explains:

- which values are measured;
- which values are estimated;
- that browser GPU utilization is unavailable;
- why representation changes as the space grows.

The HUD must not claim to show real GPU percentage or cross-browser total memory.

### 5.15 Desktop and mobile behavior

#### Desktop

The interactive lab is supported on desktop-class viewports and pointer/keyboard input.

Target interactive viewport:

- minimum supported interactive width: 900 CSS pixels;
- recommended: 1200 CSS pixels or more.

#### Mobile and narrow screens

The interactive instrument is not presented.

Instead, show a polished static summary:

- baseline world;
- changed data/access world;
- a small grid comparison;
- the equivalent graph edge;
- a concise explanation that the full lab works best on desktop;
- links to Reading and Writing.

The static visual:

- is inline SVG or semantic HTML;
- has an accessible text equivalent;
- does not load the heavy lab renderer;
- remains responsive down to 320 CSS pixels.

The Reading Map remains fully functional on mobile.

## 6. Page 2: Reading Map

### 6.1 Purpose

The Reading Map is a minimal public projection of the Semble collections. It is not a course, taxonomy essay, or “start here” curriculum.

### 6.2 Source of truth

Semble owns:

- collection membership;
- collection titles;
- paper cards and manual notes;
- priority tags.

Local structured content owns only stable presentation copy:

- page title;
- one short introductory paragraph;
- interface labels;
- empty/error states.

There are no locally maintained per-collection essays.

### 6.3 Public Semble destination

The verified public profile URL is:

```text
https://semble.so/profile/nickmvincent.bsky.social
```

The Reading Map links to this profile as `Open in Semble ↗`.

### 6.4 Collection display

Use the configured `dc:` namespace for ingestion, but do not display the prefix.

Display the current Semble collection titles as-is after namespace stripping. Do not regroup, rename, or divide them into local “core” and “related” taxonomies.

Collections are sorted alphabetically for deterministic minimal presentation unless Semble exposes an explicit stable order in the future.

Each collection row shows:

- collection title;
- paper count;
- up to three exemplar papers;
- `View all` expansion when more papers exist.

Paper order:

1. ascending `priority:n` tag;
2. descending year;
3. title for deterministic ties.

Each paper shows only:

- title;
- authors;
- year;
- venue when available;
- primary source link.

Do not show:

- abstracts by default;
- metadata-provenance badges;
- semantic-scholar and Google Scholar utility links unless no primary link exists;
- local editorial annotations;
- a “Start here” shelf.

### 6.5 Page framing

Header content:

- `Reading Map`;
- one sentence explaining that collections are curated in Semble;
- total collection and paper counts;
- last updated date;
- `Open in Semble ↗`.

Show only the last updated date. Do not expose network/cache policy to ordinary readers.

### 6.6 Failure modes

Network-first build:

- refresh from live Semble;
- write/update the local cache;
- fail the production release if live refresh is required and cannot complete.

Cache-only build:

- render from the committed or available cache;
- pass automated verification.

Public empty state:

> The reading collections are temporarily unavailable.

Do not expose stack traces, configuration values, or internal cache paths.

## 7. Writing and content migration

### 7.1 Writing destination

The sibling `nickmvincent.com` monorepo is the writing system of record.

Its existing workflow already provides:

- Markdown under `content/writing/`;
- long posts, short posts, notes, and drafts;
- references and backlinks;
- canonical/mirror metadata;
- Substack import;
- Leaflet and Standard.site publishing;
- generated garden pages;
- a distribution ledger.

The site overhaul will integrate with that workflow through external links only. This repository will not duplicate the garden renderer or publishing state.

### 7.2 Launch dependency

The strict two-page launch does not require:

- a replacement post for every old memo;
- a complete overlap inventory;
- a first consolidation cluster;
- one-to-one provenance mappings;
- redirects from old memo URLs.

Future writing may synthesize or revisit the old material as new posts. Those are new editorial artifacts, not required “replacement pages.”

### 7.3 External writing label and URL

Default label:

```text
Writing
```

The public URL is owner-configured before cutover. The expected family of destinations is the existing public garden/Data Leverage output generated by the sibling repository.

The build must not ship with a placeholder URL.

### 7.4 Markdown archive contract

At cutover, move every current authored Markdown file under `src/content/memos/` and `src/content/pages/` into:

```text
archive/site-v1/content/memos/
archive/site-v1/content/pages/
```

Files to preserve:

```text
src/content/memos/data-counterfactuals.md
src/content/memos/evaluation-counterfactuals.md
src/content/memos/formalisms.md
src/content/memos/glossary.md
src/content/memos/loose-syllabus.md
src/content/pages/api-explorer.md
src/content/pages/collections.md
src/content/pages/discussions.md
src/content/pages/graph.md
src/content/pages/grid.md
```

Use repository-aware moves so Git records renames where possible.

Create:

```text
archive/site-v1/manifest.json
archive/site-v1/README.md
```

The manifest records:

- original path;
- archived path;
- SHA-256 at cutover;
- cutover date;
- previous public route where applicable.

The archive README states:

- the content is historical source material;
- it is intentionally excluded from the Astro runtime;
- it is not a compatibility site;
- future writing lives in the sibling writing repository.

### 7.5 Preservation test

Add an automated test that:

- loads the archive manifest;
- confirms every declared file exists;
- recomputes each checksum;
- fails if archived content is deleted or silently changed.

If a historical file ever needs correction, update it through an explicit archival-change process that changes both the file and manifest in one reviewed commit.

### 7.6 Glossary

The old glossary route is retired.

A concise, structured subset of definitions is copied into the lab’s glossary drawer. This is runtime interface content, not a rendered legacy memo.

Initial terms:

- data counterfactual;
- training world;
- evaluation world;
- leave-one-out;
- data strike;
- data poisoning;
- data selection;
- scaling;
- machine unlearning;
- reference world.

The archived Markdown glossary remains unchanged.

## 8. Technical architecture

### 8.1 Retained platform

Retain:

- Astro for static site generation and page shells;
- Preact for the interactive lab;
- Cloudflare Pages deployment;
- Semble/PDS content loading and cache behavior;
- existing citation/metadata resolution where still needed by the Reading Map.

### 8.2 Rewrite boundary

Rewrite the explorer stack:

- page-level explorer architecture;
- state model;
- grid renderer;
- graph renderer;
- scenario system;
- import/export;
- view transition;
- controls and visual design.

The rewrite does not require needlessly reimplementing mathematically correct pure helpers. Existing functions may be reused only when:

- their semantics match the new model;
- they do not constrain the new architecture;
- they are covered by new tests.

Before removing old math behavior, preserve reference fixtures for:

- subset enumeration;
- overlap metrics;
- row removal;
- evaluation addition;
- scaling buckets;
- budget scans.

### 8.3 Proposed file layout

```text
src/
  pages/
    index.astro
    collections.astro
  layouts/
    Site.astro
  components/
    SiteNav.astro
    SiteFooter.astro
  lab/
    CounterfactualLab.tsx
    config/
      schema.ts
      import-export.ts
    content/
      glossary.ts
      copy.ts
    model/
      objects.ts
      worlds.ts
      transitions.ts
      metrics.ts
      workload.ts
    scenarios/
      index.ts
      one-removal.ts
      evaluation-shift.ts
      coalition-strike.ts
      scaling.ts
      poisoning.ts
      unlearning.ts
      budget-selection.ts
    state/
      reducer.ts
      selectors.ts
      defaults.ts
    render/
      LabStage.tsx
      grid-renderer.ts
      graph-renderer.ts
      morph.ts
      geometry.ts
    components/
      ExplainerModal.tsx
      ScenarioTray.tsx
      WorldChangeRibbon.tsx
      Inspector.tsx
      ResourceHud.tsx
      StateControls.tsx
      JsonDialog.tsx
      MobileSummary.tsx
  reading/
    ReadingMap.astro
    reading-map.ts
archive/
  site-v1/
```

The exact naming may change, but the boundaries must remain:

- pure model;
- state/reducer;
- rendering;
- scenarios;
- content/copy;
- configuration;
- Semble reading projection.

### 8.4 State model

Use one reducer/state machine as the only owner of lab state.

Required state:

- current view;
- selected scenario;
- objects and variants;
- baseline train/eval world;
- counterfactual train/eval world;
- operation origin/kind/targets;
- focus set;
- metric and parameters;
- selected evidence;
- advanced scenario parameters;
- display settings;
- workload tier;
- import/export status.

Derived state:

- available worlds;
- scores;
- deltas;
- graph nodes/edges;
- grid geometry;
- morph mapping;
- resource estimates;
- interpretation copy.

Derived values must not be duplicated as mutable state.

### 8.5 Rendering approach

Use a hybrid renderer:

- DOM for controls, labels, dialogs, inspector, and semantic summaries;
- Canvas 2D for dense visual marks and transitions;
- DOM/SVG overlays for important labels and focusable selected elements;
- no WebGL requirement for version 1;
- add WebGL only if benchmarks demonstrate a material need.

Reasons:

- reliable current-major-browser support;
- lower dependency and complexity cost;
- sufficient performance with virtualization and aggregate tiers;
- easier accessible overlay and text rendering;
- one coordinate system for the grid/graph transition.

The renderer must:

- avoid per-frame Preact state updates;
- use `requestAnimationFrame`;
- cache stable geometry;
- cancel stale animation work;
- respect reduced motion;
- release large buffers when states change;
- avoid global mutable simulation state.

### 8.6 Browser support

Interactive desktop lab:

- latest two stable versions of Chrome;
- latest two stable versions of Edge;
- latest two stable versions of Firefox;
- latest two stable versions of Safari.

Mobile summary and Reading Map:

- latest two stable iOS Safari versions;
- latest two stable Android Chrome versions.

The lab may show a fallback message when required Canvas or browser features are unavailable.

### 8.7 Accessibility baseline

The project will not claim formal WCAG conformance in version 1, but accessibility checks are release-blocking.

Required behavior:

- every control keyboard operable;
- clear native focus indication;
- dialogs trap and restore focus correctly;
- no meaning conveyed only by color;
- selected worlds and comparison available as text;
- canvas has an accessible name and live selected-state summary;
- formulas and result values available outside canvas;
- reduced-motion support;
- static mobile visual has text equivalent;
- automated scans report no critical or serious issues on either page.

The full combinatorial grid does not need a screen-reader mirror containing every possible cell. The accessible representation must cover the selected comparison, current scenario, available actions, and resulting values.

### 8.8 Security and privacy

- no arbitrary code execution from imported JSON;
- validate all imported state;
- do not inject imported labels as raw HTML;
- no custom analytics;
- no secrets in client code;
- external links use appropriate `rel` attributes;
- Semble build failures do not leak environment values;
- localStorage contains only non-sensitive toy configuration.

## 9. Route retirement and cleanup

At cutover, remove the public route implementations for:

```text
src/pages/grid.astro
src/pages/graph.astro
src/pages/api-explorer.astro
src/pages/advanced.html.astro
src/pages/discussions.astro
src/pages/glossary.astro
src/pages/memo.astro
src/pages/memo/[slug].astro
src/pages/memo/data-counterfactuals.astro
```

Remove obsolete runtime components and helpers only after their behavior has either:

- moved into the new lab;
- been preserved as a test fixture;
- been explicitly retired.

Likely retirement candidates include:

- current standalone explorer page shells;
- current memo rendering stack;
- memo embed system;
- old navigation sections;
- standalone API explorer UI;
- 3D viewer code and Three.js dependency if no remaining code uses it.

Do not delete unrelated user work merely because it is currently uncommitted. Implementation must reconcile the existing dirty worktree before changing overlapping files.

## 10. Verification

### 10.1 Unit tests

Required:

- object/world validation;
- transition application;
- every score function;
- every scenario fixture;
- grid and graph derived-state equivalence;
- exact/windowed/aggregate tier selection;
- workload estimates;
- JSON schema validation;
- JSON export/import round trip;
- version mismatch behavior;
- corruption and unlearning special states;
- reduced-motion transition path;
- archive manifest/checksum verification.

### 10.2 End-to-end tests

Required desktop tests:

1. Homepage loads the default one-removal state.
2. Explainer modal can be dismissed and reopened.
3. Selected grid evidence produces the expected comparison.
4. Switching to graph preserves all state.
5. The selected comparison becomes the expected edge/path.
6. Switching back preserves state.
7. All seven scenario presets load.
8. JSON export can be copied.
9. Exported JSON can restore the same state in a fresh context.
10. Invalid JSON is rejected without modifying state.
11. Resource HUD reports the correct tier and estimate labels.
12. Reading Map renders from cache.
13. Collection expansion reveals all papers.

Required mobile tests:

1. Homepage shows the static summary rather than the interactive renderer.
2. Static summary is readable at 320 px.
3. Reading Map remains functional.

Required route tests:

- `/` returns the lab;
- `/collections` returns the Reading Map;
- each retired legacy route returns not found;
- the sitemap contains only the two canonical pages.

### 10.3 Semble verification

Release-blocking:

```bash
npm run build:refresh
npm run build:offline
```

Both must succeed before production deployment.

### 10.4 Accessibility verification

Required:

- automated accessibility scan for both pages;
- keyboard-only smoke test for lab controls;
- keyboard-only modal and JSON dialog test;
- reduced-motion test;
- canvas selected-state text test;
- mobile static-summary text-equivalent test.

No critical or serious automated issue may remain without an explicit owner waiver.

### 10.5 Responsive verification

Capture and inspect at:

- 320 × 700;
- 390 × 844;
- 900 × 800;
- 1280 × 800;
- 1440 × 1000.

At widths below 900 px, the lab renderer must not initialize.

### 10.6 Performance verification

There is no fixed bundle-size or timing budget for version 1.

The performance check is still mandatory and must report:

- initial JavaScript transferred;
- hydration time;
- default-scene render time;
- grid/graph transition frame times;
- long tasks;
- allocated renderer buffers;
- tier selected for representative large states.

Benchmark states:

- default three-object exact scene;
- eight-object exact boundary scene;
- twelve-object windowed scene;
- twenty-object aggregate scene.

Release blockers:

- page crash;
- runaway allocation;
- main-thread lock longer than five seconds;
- failure to enter aggregate mode;
- transition or controls becoming unusable;
- lab renderer loading on mobile.

Other performance results are reviewed by the owner rather than compared with a hard numeric threshold.

### 10.7 Browser verification

Automated Chromium coverage remains the primary CI path.

Before release, manually smoke test:

- Chrome;
- Firefox;
- Safari.

Check:

- initial render;
- scenario switch;
- grid/graph transition;
- JSON export/import;
- resource HUD fallback labels;
- Reading Map expansion.

## 11. Success evaluation without analytics

Because the application collects no behavioral analytics, product success is evaluated through owner review and lightweight usability sessions.

Recommended usability sample:

- two technical users;
- two policy/economics users;
- two intelligent newcomers.

Tasks:

1. Explain what a data counterfactual is after using the site.
2. Identify the two worlds used in the removal scenario.
3. Explain how the grid comparison appears in the graph.
4. Switch views without losing the active state.
5. Open the Reading Map and find one relevant collection.
6. Export a configuration and restore it in a fresh browser context.

Launch target:

- at least five of six participants complete tasks 2–6 without facilitator intervention;
- at least four of six articulate both a technical and an applied/social use of the frame;
- no participant mistakes the toy score for a privacy, legal, or economic guarantee after reading the interpretation panel.

This usability work may happen immediately before or shortly after launch, but owner review remains the release authority.

## 12. Implementation sequence

### Phase 0: Preserve and fixture

- Reconcile the current dirty worktree.
- Record reference outputs for existing mathematical behavior.
- Add the archive manifest generator/test.
- Freeze the public route contract.
- Add the new spec-derived test skeleton.

Exit:

- current authored Markdown has a verified preservation path;
- old math semantics needed by the rewrite are captured.

### Phase 1: New model and state

- Implement the object/world/transition model.
- Implement score functions.
- Implement scenarios.
- Implement reducer and selectors.
- Implement JSON schema/import/export.
- Implement workload tier selection.

Exit:

- unit tests pass without a visual renderer.

### Phase 2: Instrument renderer

- Build the main stage.
- Implement exact grid and graph geometry.
- Implement windowed and aggregate representations.
- Implement selection and inspector.
- Implement resource HUD.
- Implement animated view transition.
- Implement reduced-motion behavior.

Exit:

- all seven scenarios are inspectable in grid and graph views.

### Phase 3: Product shell and mobile

- Build new shared layout/navigation/footer.
- Add optional explainer modal.
- Add world-change ribbon and glossary.
- Add mobile static summary.
- Add desktop-width gating.
- Complete the instrument-like visual identity.

Exit:

- homepage experience is complete at supported widths.

### Phase 4: Reading Map

- Simplify collection loading/presentation.
- Remove local core/related regrouping.
- Add three-paper collapsed previews.
- Add updated date and Semble profile link.
- Verify live and cache-only builds.

Exit:

- `/collections` matches the minimal Semble projection contract.

### Phase 5: Strict two-page cutover

- Move authored Markdown to `archive/site-v1/`.
- Generate and verify the archive manifest.
- Remove legacy route implementations.
- Remove obsolete runtime code and dependencies.
- Ensure the sitemap contains two pages.
- Update README and deployment documentation.

Exit:

- only `/` and `/collections` are public content pages;
- archive checks pass;
- retired routes return not found.

### Phase 6: Verification and owner review

- Run unit and end-to-end suites.
- Run Semble live and offline builds.
- Run accessibility and responsive checks.
- Generate performance report.
- Smoke test Chrome, Firefox, and Safari.
- Present local production build to the owner.

Exit:

- owner approves the exact build intended for production.

### Phase 7: Direct production release

The questionnaire specifies direct production deployment rather than a hosted preview/staging release.

Release procedure:

1. Confirm a clean, committed implementation state.
2. Record the previous known-good production commit.
3. Run all release-blocking verification.
4. Run the project’s production deployment command.
5. Verify `/` and `/collections` on the public domain.
6. Verify representative retired routes return not found.
7. Verify the Semble updated date and profile link.

Deployment requires a separate explicit instruction at release time. This specification does not itself authorize a deployment.

## 13. Rollback

Rollback target:

- the previous known-good production commit recorded before deployment.

Preferred rollback procedure:

1. Create a clean temporary worktree at the known-good commit.
2. Install locked dependencies.
3. run the same verified production deployment command from that worktree.
4. Confirm the old public version is restored.
5. Leave the active development worktree unchanged for diagnosis.

Do not use a destructive reset of the active dirty worktree as the rollback mechanism.

## 14. Definition of done

The overhaul is complete when all of the following are true.

### Product

- `/` is the new Counterfactual Lab.
- `/collections` is the minimal Semble Reading Map.
- there are no other public project content routes.
- the homepage communicates the broad technical and social concept.
- seven scenario presets are available.
- the default state is one removal.
- grid and graph share one state and transition with continuity.
- the explainer is optional and non-gating.
- JSON export/import recreates state.
- the workload monitor is honest about measured and estimated signals.
- mobile shows the static summary instead of loading the lab.

### Content

- all ten current authored Markdown files remain in the repository.
- archived Markdown is checksum-protected.
- no archived memo is rendered publicly.
- glossary concepts needed by the lab exist as structured runtime copy.
- Writing links to the owner-selected public garden destination.

### Reading

- Semble titles are not locally reclassified.
- each collection shows up to three papers before expansion.
- the public Semble profile link is present.
- last updated date is present.
- live and cache-only builds pass.

### Engineering

- the new explorer state/render stack is in place.
- the old standalone explorer/memo stack is removed when unused.
- all required unit and end-to-end tests pass.
- accessibility checks pass or have explicit owner waivers.
- responsive checks pass.
- performance report is reviewed.
- Chrome, Firefox, and Safari smoke tests pass.

### Release

- owner approves the local production build.
- production deployment succeeds.
- public verification succeeds.
- the previous known-good commit and rollback procedure are recorded.

## 15. Remaining owner-supplied inputs

Only one input is required before code cutover:

1. **Final public Writing URL**
   - Default label: `Writing`.
   - The URL must point to the chosen public output of the sibling garden.

The following are intentionally post-launch editorial tasks, not blockers:

- inventory overlapping Substack and local posts;
- select a first consolidation cluster;
- write new garden posts;
- choose post-level canonical/indexing policy;
- decide whether new posts acknowledge older memo drafts.

The Semble public destination is no longer unresolved:

```text
https://semble.so/profile/nickmvincent.bsky.social
```

## 16. Explicit non-goals

- preserving old public routes;
- redirecting old memo URLs;
- maintaining a local textbook or syllabus;
- making the archived Markdown buildable;
- adding application analytics;
- adding accounts, badges, scores, or progress tracking;
- implementing a production poisoning benchmark;
- implementing a production machine-unlearning algorithm;
- claiming actual browser GPU utilization;
- fully enumerating arbitrarily large subset spaces;
- supporting the interactive lab on mobile in version 1;
- deploying before a separate explicit release instruction.
