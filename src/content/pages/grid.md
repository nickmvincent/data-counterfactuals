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

We imagine an AI operator is training some machine learning model on different slices of data. There is a small set of data objects to choose between, named `A`, `B`, `C`, `D`, and so on. The operator will train a model on some slice of training data (e.g., A, B, and C) and then evaluate on a set of data (e.g., just A and B).

## How do I read one cell?

Rows show different training scenarios. Columns are evaluation scenarios. One cell means: train on the row world, then evaluate on the column slice.

## How do I use this page?

Pick a question family and a cell score, then use the method-specific controls (clicking on the grid, clicking buttons below) to explore different data counterfactual measurements in that question family.

## What questions can I ask here?

For now: direct cell reading, leave-one-out, group leave-one-out, Shapley-style values, scaling, toy privacy, toy unlearning, and toy poisoning.
