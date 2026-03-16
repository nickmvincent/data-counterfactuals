---
title: Data Counterfactuals
description: "An interactive explainer for a unifying frame across valuation, scaling, selection, poisoning, privacy, and collective action."
eyebrow: Interactive explainer
lede: "A site built around one stubborn question: what would change if the training data were different?"
intro:
  - |
    The project grew out of classroom discussions about data valuation, algorithmic collective action, scaling, selection, poisoning, and neighboring topics. Students kept asking for one clean place to point when these areas started to blur together, so this site tries to provide that.
  - |
    The main introduction is written to do two jobs at once: it is the soft-launch post and the standing memo for the project. The explorer, collections page, and formalisms note are companion pieces around that central argument.
method_families:
  - title: Value and attribution
    body: Leave-one-out, influence functions, TracIn, and Shapley-style methods can all be read as different ways of aggregating over slices of the same train/eval grid.
  - title: Scaling and selection
    body: Scaling laws, active learning, coresets, curriculum learning, and dataset distillation ask how performance changes as we move through different rows, add data, or choose which examples to keep.
  - title: Robustness, privacy, and repair
    body: Poisoning, privacy interventions, and some fairness-by-data methods explore nearby counterfactuals in which training data are corrupted, hidden, repaired, or reweighted.
  - title: Collective action and leverage
    body: Data strikes, contribution campaigns, and bargaining interventions try to push AI operators toward less favorable rows by changing what data the world actually produces.
reading_paths:
  - title: Read the launch memo
    href: /memo/data-counterfactuals
    body: The shared post-and-memo version of the argument behind the project.
  - title: Open the explorer
    href: /grid
    body: A toy environment for moving around the grid and inspecting the train/eval metaphor directly.
  - title: Try the 3D view
    href: /advanced.html
    body: A rougher, more game-like take that treats new data generation like extending the grid.
  - title: Compare formalisms
    href: /memo/formalisms
    body: A more technical, web-only companion that lines up neighboring formalisms side by side.
  - title: Related areas and papers
    href: /collections
    body: A compact shelf of neighboring literatures, representative papers, and quick context.
figures:
  leave_one_out:
    label: Leave-one-out toy example
    caption: With four toy data objects A, B, C, and D, the lower row leaves out B. The sharp drop on evaluation slice B is the kind of local contrast many attribution methods try to summarize.
  grid:
    label: Toy world with four observations
    caption: Imagine every possible training set as a row and every evaluation slice as a column. The payoff of the metaphor is in comparing nearby cells, rows, and paths through the grid.
---

## The smallest useful move

The pitch starts from a simple thought experiment: imagine a massive grid where every possible training set is a row, every possible evaluation set is a column, and each cell records the performance for that train/eval pairing. In practice it helps to shrink the picture first and imagine just four data objects: A, B, C, and D. Those could be single observations in a toy example, or four large datasets we are considering mixing.

Once that grid is in view, the smallest useful counterfactual is leave-one-out: compare a row that includes one point with the nearby row in which that point is missing. From there the same logic extends to groups, fixed-size subsets, synthetic replacements, corrupted examples, withheld data, or coordinated withdrawal.

In that sense, a **data counterfactual** is just a concrete version of the question: what changes when the training data change?

## A grid for seeing the space

If we could fill in the whole grid, ideas from across different subfields start to show up in one place. Data values become summaries over particular slices, scaling patterns emerge as we move down rows with more or different data, and selection problems become questions about which rows are worth visiting.

Real systems do not literally enumerate this whole object, and this site does not pretend otherwise. The toy grid is there to make the comparisons visible: which training world changed, where the effect landed at evaluation time, and how large the difference was.

That same picture also helps with interventions that are not just analytical. Collective action around data can be understood as changing which rows are available or attractive to an AI operator in the first place.

## What the idea helps connect

I think this frame is useful because it connects conversations that often happen in silos. The privacy person thinking about differential privacy, the ML person running ablations, and the labor person thinking about data leverage are often exploring different neighborhoods of the same conceptual space.

That does not mean the projects are formally identical. Some techniques only explore counterfactuals over data that already exist: subsets, reweightings, filtering, or held-out removals. Others try to change what data the world produces in the first place, which is part of why collective action matters so much.

The site includes a still-rough, somewhat game-like view that leans into this distinction by treating new data generation more like extending a board than selecting from a fixed table. It is intentionally provisional, but it points toward the part of the framework that feels most useful for leverage, governance, and bargaining questions.

## How to read the site

The site is closer to an interactive research note than a polished landing page. If you want the shared launch-post version of the argument, start with the main memo. If you want the visual intuition, open the explorer and move around the grid. If you want the more experimental angle on how new data get produced, try the 3D view. The formalisms note is there as a more technical web companion rather than required reading for the introduction.

The implementation is still early, so it is best treated as a working model rather than a finished explainer. My hope is that it offers a cleaner mental model for why *what if the data were different?* keeps showing up across so many lines of work.
