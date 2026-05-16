---
title: Grid explorer
description: Interactive toy explorer for selecting data-counterfactual worlds and computing subset-based valuation quantities.
quick_tips:
  - Rows are training worlds and columns are evaluation slices; that is the core mental model for the whole page.
  - Explore mode lets you select evidence cells freely; Compute mode walks through the cells needed for one named quantity.
  - The grid is strongest for subset-world quantities. Privacy, poisoning, synthetic data, and training-dynamics methods need extra structure.
companion_links:
  - title: Read the main memo for the broader argument
    href: /
  - title: Read the formalism memo for the method map
    href: /memo/formalisms
  - title: Read the evaluation-side memo
    href: /memo/evaluation-counterfactuals
  - title: Open the glossary for fast definitions
    href: /glossary
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
        Keep the formalism memo or glossary nearby if you want the longer framing or a quick definition while you click through the presets.
---

## What are we simulating?

We imagine an AI operator is training some machine learning model on different slices of data. There is a small set of data objects to choose between, named `A`, `B`, `C`, `D`, and so on. The operator will train a model on some slice of training data (e.g., A, B, and C) and then evaluate on a set of data (e.g., just A and B). The same object can be imagined as trainable data, evaluation data, both, reserved for a secure holdout, or unavailable.

## How do I read the grid?

Rows show different training scenarios. Columns are evaluation scenarios. One cell means: train on the row world, then evaluate on the column slice.

## How do I use this page?

Use Explore when you want to click around and build a set of evidence cells yourself. Use Compute when you want to ask for one quantity and see the exact cells that define it.

## What questions can I ask here?

For now: direct cell reading, leave-one-out, evaluation value, group leave-one-out, pair interaction, Shapley value, Banzhaf value, Beta Shapley, row-size scaling, eval-size scaling, diagonal scaling, budgeted subset scans, and a simple unlearning reference comparison.

## What else could fit this grid?

Several nearby methods still fit the same subset-world picture. Good next candidates include strike curves from the full dataset down to smaller retained worlds, acquisition curves from a seed set upward, regret against the full-data row, composition-stratified scaling, Owen-style group values, sampled or truncated Shapley approximations, and simple datamodel-style response surfaces fit over the grid.

Some of these would only need new formulas over cells we already display. Others would need new controls: group partitions for Owen values, budgets for coreset scans, sampling rules for Monte Carlo Shapley, or a small regression view for datamodels.

## What does not fit cleanly yet?

Some important methods live nearby but are not fully represented by this fixed subset grid. True influence functions need gradients, Hessians, and an optimizer. Differential privacy is a guarantee over release distributions and all adjacent worlds, not just a few visible cells. Poisoning needs a threat model, feasible perturbations, and an adversarial objective. Dataset distillation and condensation search over synthetic data, not only observed subsets. Active learning and experimental design need a candidate pool, label model, and acquisition policy. Curriculum learning, forgetting events, and data cartography depend on training order and trajectories. Membership inference needs an attacker and observation model.

So the grid can be a diagnostic baseline for those families, but it should not pretend to certify or replace the full method.
