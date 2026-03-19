---
title: Grid explorer
description: Interactive toy explorer for comparing training-data counterfactuals.
quick_tips:
  - Rows are training worlds and columns are evaluation slices; that is the core mental model for the whole page.
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

## What are we simulating?

A tiny toy universe of data slices named `A`, `B`, `C`, `D`, and so on.

## How do I read one cell?

Rows are training worlds. Columns are evaluation slices. One cell means: train on the row world, then evaluate on the column slice.

## How do I use this page?

Pick a question family and a cell score, then click a row, column, or cell to anchor the pair you want to inspect.

## What questions can I ask here?

Direct cell reading, leave-one-out, group leave-one-out, Shapley-style values, scaling, toy privacy, toy unlearning, and toy poisoning.
