---
title: Data Counterfactuals
description: "An interactive explainer for the core data counterfactuals idea: what changes when the training data changes?"
eyebrow: Interactive explainer
lede: "Many data-centric methods in machine learning can be understood as asking one broad question: what changes if the training data changes?"
intro:
  - |
    I started using the phrase while teaching about data valuation, algorithmic collective action, and related topics. There was no single reference to hand people, so this site is an attempt to build one.
  - |
    Part of the motivation is pedagogical, but part of it is political as well: once training data stop looking like a hidden background blob, it becomes easier to ask who is supplying them, who is exposed to them, and who gets leverage when they change.
method_families:
  - title: Value and attribution
    body: Leave-one-out, influence functions, TracIn, and Shapley-style methods all ask, in different ways, which points or groups are doing the work.
  - title: Selection and compression
    body: Active learning, coresets, curriculum learning, and dataset distillation ask which rows are worth keeping, labeling, or synthesizing.
  - title: Robustness, privacy, and repair
    body: Poisoning, privacy interventions, and some fairness-by-data methods all study what happens when the training data are corrupted, hidden, repaired, or reweighted.
  - title: Strategic collective action
    body: Data strikes, contribution campaigns, and bargaining interventions change the data-generating process itself. They are not just analytical transformations of a dataset; they are sociotechnical conflicts over power, consent, and leverage.
reading_paths:
  - title: Read the main memo
    href: /memo/data-counterfactuals
    body: The longer written argument behind the project.
  - title: Compare formalisms
    href: /memo/formalisms
    body: A second draft that lines up several neighboring technical framings side by side.
  - title: Open the explorer
    href: /grid
    body: A toy environment for inspecting the grid metaphor directly.
  - title: Related areas and papers
    href: /collections
    body: A compact shelf of neighboring literatures, representative papers, and quick context.
figures:
  leave_one_out:
    label: Leave-one-out toy example
    caption: Here the lower row leaves out B. The largest drop lands on evaluation point B, which is the intuition many attribution methods are trying to formalize.
  grid:
    label: Toy world with four observations
    caption: Rows are possible training sets. Columns are evaluation slices. The interesting thing is usually the difference between nearby cells or rows.
---

## The smallest useful move

The simplest data counterfactual is leave-one-out: compare a training world that includes one point with the nearby world in which that point is removed. From there you can ask the same question about groups, fixed-size subsets, synthetic replacements, corrupted examples, withheld data, or coordinated withdrawal.

In that sense, a **data counterfactual** is just a concrete what-if question about the data used to train a model.

## A grid for seeing the space

The site uses a simple teaching model: imagine possible training sets as rows and possible evaluation slices as columns. Each cell stores the performance you would observe for that train-eval pairing.

Real systems do not literally enumerate this whole grid. The point of the metaphor is to make comparisons visible: which row changed, where the effect landed, and how large the difference was.

## What the idea helps connect

The framing is intentionally broad. It can pull together data valuation, scaling, selection, dataset distillation, poisoning, some forms of privacy analysis, some fairness interventions, and strategic collective action around data.

I am not claiming those fields are formally identical. I am claiming they often become easier to compare once you view them as different ways of changing the training data and comparing the outcome.

That comparison should not make the differences disappear. In some cases the “data change” is a technical intervention inside an optimization pipeline. In others it is a dispute over labor, governance, privacy, or institutional power.

## How to read the site

The pages are arranged more like an essay with appendices than a landing page. Start wherever matches the question you already have, then move outward.
