---
title: Data Counterfactuals
description: "An interactive explainer for asking what changes when training data, evaluation data, data rights, or trust institutions change."
lede: "What changes when the data world, evaluation world, or trust institution changes?"
reading_paths:
  - title: Read the launch memo
    href: /memo/data-counterfactuals
    body: More on the motivation for this site
  - title: When the column changes
    href: /memo/evaluation-counterfactuals
    body: A short memo on evaluation data, secure holdouts, use rights, and trust as first-class counterfactual objects.
  - title: Open the glossary
    href: /glossary
    body: Quick definitions for the recurring terms without leaving the main thread for long.
  - title: Open the grid explorer
    href: /grid
    body: Explore row moves, column moves, and coupled train/eval comparisons directly.
  - title: Follow the lightweight course path
    href: /memo/loose-syllabus
    body: A suggested reading-and-explorable sequence for using the site as open course material without a heavy LMS.
  - title: Compare formalisms
    href: /memo/formalisms
    body: A more technical companion that lines up neighboring formalisms side by side. Currently very WIP.
  - title: Related work
    href: /collections
    body: A dynamic, non-exhaustive set of related areas and readings, updated via Semble.so.
figures:
  leave_one_out:
    label: Leave-one-out toy example
    caption: With four toy data objects A, B, C, and D, the lower row leaves out B. The sharp drop on evaluation slice B is the kind of local contrast many attribution methods try to summarize.
  grid:
    label: Toy world with four observations
    caption: Imagine every possible training set as a row and every evaluation slice as a column. Row moves ask what changed in training; column moves ask what changed in measurement.
---
