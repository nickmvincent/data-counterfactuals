# Data Counterfactuals design rules

Status: living design contract
Last updated: 2026-07-17

This document describes the design decisions and implementation constraints currently in force. Edit the rules here when the desired direction changes; future interface work should update the implementation to match.

The primary implementation sources are:

- `src/styles/site.css` for shared tokens, navigation, footer, and accessibility defaults;
- `src/styles/lab.css` for the desktop Counterfactual Lab;
- `src/pages/index.astro` for the mobile lab summary;
- `src/pages/collections.astro` for the Reading Map;
- `docs/site-overhaul-spec.md` for the broader product contract.

## 1. Product boundaries

1. The public site has two content routes: `/` for the Counterfactual Lab and `/collections` for the Reading Map.
2. The Lab is an interactive visual instrument, not a long-form article.
3. The Reading Map is a curated, non-exhaustive list of starting points, not a curriculum or a complete bibliography.
4. Long-form writing lives externally and must be labeled as external.
5. Retired content routes return normal 404 responses. They are not redirected or linked in the primary interface.
6. The site has no accounts, scores, streaks, badges, behavioral analytics, or gated tutorial progression.
7. Lab state is shared through validated JSON import/export, not URL state.

## 2. Visual direction

1. The site should feel like a scientific instrument or experimental visualization tool.
2. The visualization is the dominant object. Navigation, controls, borders, and explanatory copy are supporting chrome.
3. Prefer one clear visual hierarchy over several competing promotional sections.
4. Use dense technical detail inside controls and inspectors, but keep page-level orientation concise.
5. Avoid ornamental sections after the primary experience. The Lab intentionally has no `lab-afterword`.
6. Avoid card grids when a continuous instrument surface, list, or simple section boundary communicates the structure.
7. The visual system is dark, low-glare, grid-backed, and restrained. Bright colors indicate state or interaction rather than decoration.

## 3. Page titles and eyebrows

An **eyebrow** is a small uppercase label placed immediately above a page title.

1. Page-level decorative eyebrows are not used on the mobile Lab summary or Reading Map.
2. Functional micro-labels are allowed inside the instrument when they identify a control, state, measurement, or panel.
3. Micro-labels use the `.instrument-label` treatment: monospace, uppercase, `0.65rem`, strong tracking, and muted color.
4. Do not use a functional micro-label merely to add atmosphere.
5. Page titles should be large enough to establish hierarchy but should not dominate an entire viewport or push the primary experience below the fold.
6. Page titles use tight line-height and negative tracking, but must remain readable and must not clip descenders.

### Current title scales

| Surface | Current scale | Guardrail |
| --- | --- | --- |
| Desktop Lab | `clamp(2.4rem, 4.2vw, 4.75rem)` | Never larger than 76px |
| Mobile Lab summary | `clamp(2.5rem, 8.5vw, 3.5rem)` | Never larger than 56px |
| Reading Map, desktop | `clamp(3.5rem, 8vw, 6.5rem)` | Current implementation exception: larger than the Lab cap |
| Reading Map, narrow | `clamp(3rem, 11vw, 4.75rem)` | Never larger than 76px |

### Known exception to resolve

The desktop Lab still places `Counterfactual instrument / v1` above its title. It uses the functional micro-label style but behaves visually like a page eyebrow. Keep, remove, or rewrite this line by editing this rule explicitly.

## 4. Typography and copy

1. Use the system sans-serif stack for prose and headings. Use the system monospace stack for measurements, indexes, state labels, and technical metadata.
2. Body copy is normally `1rem` or smaller. Introductory copy may reach `1.2rem` on desktop.
3. Supporting copy uses `--muted`; metadata uses `--faint`. Primary headings and actions use `--ink`.
4. Pair technical language with a short plain-language action when a concept first appears.
5. Prefer sentence case. Reserve uppercase for compact navigation and functional micro-labels.
6. Avoid long explanatory prose on the homepage. Definitions, formulas, limitations, and method details belong in the explainer, inspector, or controls.
7. Do not repeat boilerplate such as “Part of the datacounterfactuals.org reading lists” for every collection.
8. Internal links use a right arrow when direction is helpful. External links use `↗` and accessible text that makes their external destination clear.
9. The shared footer scope statement is: “A public experimental visualization tool and non-exhaustive paper list showing how cross-cutting data counterfactuals are.”

## 5. Layout and responsive behavior

1. The minimum supported document width is 320px.
2. Global header, footer, and desktop Lab content use a maximum width of 1500px with 20px side gutters.
3. The Reading Map uses a maximum width of 1180px.
4. Narrow layouts use 14px side gutters.
5. Horizontal document overflow is not allowed at supported widths.
6. Important content must not depend on a fixed viewport height.

### Breakpoints

| Width | Current behavior |
| --- | --- |
| Above 1180px | Full Lab columns and complete resource HUD |
| 900–1180px | Narrower Lab inspector, four-column scenario deck, reduced HUD detail |
| 899px and below | Interactive Lab is removed from layout; static mobile summary is shown |
| 820px and below | Reading Map becomes one column and uses narrow gutters |
| 720px and below | External header links are hidden; footer becomes a grid |
| 520px and below | Reading Map index and title rows stack |
| 500px and below | Mobile grid and graph examples stack vertically |

## 6. Counterfactual Lab

1. Grid and graph are two views of the same state; switching views must not reset the comparison.
2. The default scenario is one removal: train `ABC`, compare with train `AC`, evaluate on `ABC`, and focus on `B`.
3. The main visual stage must remain the largest part of the instrument.
4. Controls should resemble instrument controls, not marketing cards.
5. A first visit may show a dismissible explainer. Dismissal is remembered locally.
6. Visitors can manipulate the Lab immediately; the explainer is not a gate.
7. Canvas interactions require equivalent keyboard and screen-reader controls in the inspector.
8. Workload displays must distinguish measured values, estimates, and unavailable browser measurements.
9. The interface exposes no arbitrary object-count maximum, but may switch among exact, windowed, and aggregate representations as the state space grows.
10. The Lab ends after the scenario deck. Project framing and outbound reading links belong in the shared footer or navigation, not a Lab afterword.
11. A persistent instrument top bar switches between Guided and Explore modes.
12. Guided mode keeps the scenario deck visible and animates the construction of World A and World B after a scenario is chosen; this walkthrough never gates direct manipulation.
13. Explore mode resets scenario evidence, hides the scenario deck, and shows an A/B assignment toggle for cell selection.
14. Explore mode computes all selected A × B pairings, classifies their counterfactual structure, and labels any truncated detail list separately from the exact aggregate counts.
15. Explore mode lists every supported technical concept family with a native progress bar, the closest valid instance, and exact missing-cell requirements by World A, World B, or either set.
16. Concept readiness is determined from explicit evidence templates, not label matching or a qualitative similarity score.
17. Full-lattice concept planning is exact through eight data objects. Concepts that exceed the exact planner’s guardrail are labeled unavailable rather than sampled implicitly; local concepts remain usable.
18. Empirical scenes preserve the source metric, units, direction, and published precision; they do not translate observed values into a toy score.
19. Empirical scenes distinguish observed worlds from unmeasured worlds. Missing cells remain visibly unmeasured and are never interpolated or populated with invented values.
20. Every empirical scene names the model and intervention, states what was held fixed, links to the exact source table and available code, and marks whether the intervention affects training, inference-time access, or evaluation.
21. Published aggregate values may seed the grid and graph only when the corresponding row-level observations are also inspectable in the interface.

## 7. Mobile Lab summary

1. Below 900px, do not initialize the full interactive Lab.
2. Show a static explanation of the baseline and changed worlds plus both equivalent visual forms: grid and graph.
3. The summary must clearly say that the full visual Lab is best on desktop.
4. The mobile title has no eyebrow.
5. The grid and graph remain side by side when space permits and stack below 500px.
6. The mobile page must remain useful without JavaScript.

## 8. Reading Map

1. Semble is the source of truth for collection membership and ordering metadata.
2. The page is a projection of that data, presented as non-exhaustive starting points.
3. Visitors can order the index alphabetically or by literal connection to the data-counterfactual framing.
4. Collection notes explain the research area directly and omit repeated site-membership boilerplate.
5. Paper titles should describe the paper, never an intermediary browser-check page.
6. Prefer a stable publisher, proceedings, DOI, author, Semantic Scholar, or Google Scholar destination when the original link is unreliable.
7. The Reading Map title has no eyebrow.

## 9. Color and surface tokens

| Token | Current value | Intended use |
| --- | --- | --- |
| `--ground` | `#07110d` | Page background |
| `--ground-raised` | `#0a1711` | Slightly raised surfaces |
| `--panel` | `#0d1e16` | Panels and controls |
| `--panel-strong` | `#11261c` | Emphasized panels |
| `--ink` | `#e8f2ed` | Primary text |
| `--muted` | `#93aa9f` | Supporting text |
| `--faint` | `#657b71` | Metadata and low-priority labels |
| `--mint` | `#8ee6bd` | Primary interaction and active state |
| `--coral` | `#ff8d6b` | Changed or comparison state |
| `--yellow` | `#ffe88c` | Focus and keyboard focus ring |
| `--purple` | `#d68cff` | Additional scenario/state accent |

Color cannot be the only signal for meaning. Pair it with text, shape, position, stroke, or an accessible label.

## 10. Controls and accessibility

1. Primary and secondary buttons have a minimum height of 40px.
2. Keyboard focus uses a visible 3px yellow outline with a 3px offset.
3. Semantic headings, regions, navigation labels, button names, and image descriptions are required.
4. Interactive canvas operations require DOM control equivalents.
5. Respect `prefers-reduced-motion` by effectively disabling animation and smooth scrolling.
6. Touch targets must remain usable without hover.
7. External-link indicators must not be hidden from the accessible name unless the accessible label already states that the link is external.
8. All supported viewports must be checked for text clipping and horizontal overflow.

## 11. Review checklist

Before accepting a visual change, check:

- Does the visualization remain the dominant object?
- Is the page title within the scale guardrail and visibly subordinate to the primary experience?
- Did a decorative eyebrow or redundant overline get introduced?
- Can the copy be shorter without losing the comparison being explained?
- Does the page work at 320px, the relevant breakpoint, and a wide desktop viewport?
- Is there any horizontal overflow, clipped text, or control collision?
- Are state changes understandable without relying on color alone?
- Can the same action be completed by keyboard and assistive technology?
- Does reduced-motion mode preserve the meaning of the interaction?
- Are internal and external destinations labeled consistently?
- Does the change preserve the two-page product boundary?

When a deliberate exception is needed, add it to this document with the reason and the surface it affects.
