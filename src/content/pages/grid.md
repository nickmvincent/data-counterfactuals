---
title: The grid explorer
description: Interactive toy explorer for comparing training-data counterfactuals.
eyebrow: Interactive lab
lede: This is a toy environment for comparing training-data worlds. It is small enough to inspect by eye, but rich enough to show the logic behind leave-one-out, Shapley-style comparisons, scaling summaries, and simple data edits.
quick_tips:
  - Rows are training worlds and columns are evaluation slices; that is the core mental model for the whole page.
  - The focus chips do not choose the row. They choose which point or group the current question is talking about.
  - Operator view applies toy edits like poisoning or noise; Real world snaps back to the untouched reference grid.
companion_links:
  - title: Read the main memo for the broader argument
    href: /memo/data-counterfactuals
  - title: Open the glossary for fast definitions
    href: /glossary
  - title: Try the 3D view
    href: /advanced.html
notes:
  header:
    label: Toy, not theorem
    body:
      - |
        The explorer is deliberately small. Its job is to make the comparison structure visible, not to stand in for the full complexity of real training pipelines.
  companions:
    label: Useful companions
    body:
      - |
        Keep the main memo or glossary nearby if you want the longer framing or a quick definition while you click through the presets.
---

## how to read this

We are assuming someone is training an ML model, and this explorer is about evaluating that model. The rows stand in for possible training worlds, and the columns stand in for the evaluation slices or questions we use to check how the model behaves.

Start by fixing that mental model: rows are possible training worlds and columns are evaluation slices. Once that is in place, the rest of the interface is about moving between nearby rows, nearby columns, or nearby perturbations and asking what changed. If you prefer to think in terms of nodes and edges, the graph explorer shows the same toy universe as a subset lattice instead.
