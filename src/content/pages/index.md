---
title: Data Counterfactuals
description: "An interactive explainer for a unifying frame across valuation, scaling, selection, poisoning, privacy, and collective action."
eyebrow: Interactive explainer
lede: "What might change in an AI model if its training data changes?"
reading_paths:
  - title: Read the launch memo
    href: /memo/data-counterfactuals
    body: More on the motivation for this site
  - title: Open the glossary
    href: /glossary
    body: Quick definitions for the recurring terms without leaving the main thread for long.
  - title: Open the grid explorer
    href: /grid
    body: Explore the data counterfactuals "grid" framing directly.
  - title: Compare formalisms
    href: /memo/formalisms
    body: A more technical companion that lines up neighboring formalisms side by side. Currently very WIP.
  - title: Related areas and papers
    href: /collections
    body: A dynamic, non-exhaustive set of related areas and readings, updated via Semble.so.
figures:
  leave_one_out:
    label: Leave-one-out toy example
    caption: With four toy data objects A, B, C, and D, the lower row leaves out B. The sharp drop on evaluation slice B is the kind of local contrast many attribution methods try to summarize.
  grid:
    label: Toy world with four observations
    caption: Imagine every possible training set as a row and every evaluation slice as a column. The payoff of the metaphor is in comparing nearby cells, rows, and paths through the grid.
---
