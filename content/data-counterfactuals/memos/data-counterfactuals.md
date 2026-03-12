---
title: "Exploring Data Counterfactuals"
slug: data-counterfactuals
summary: "Many data-centric techniques in machine learning can be unified under the concept of 'data counterfactuals': how does changing data  affect model outcomes."
date: '2024-01-01T00:00:00.000Z'
visibility: public
type: shared_memo
---

Short memo from [Nick Vincent](https://www.nickmvincent.com/); ping him for any suggestions or complaints regarding this site!

This page is meant to provide an interactive explainer for the broad concept of "data counterfactuals". This is a concept that I found myself referring to repeatedly when teaching about data valuation, algorithmic collective action, and related topics. In several different contexts, students asked some version of: "is this 'data counterfactuals' thing an actual textbook term, or just your phrase for it?" That question made me realize there was no single go-to reference for what I think is an important unifying idea. So this site is an attempt to build one.

The core question is simple: **what changes if the training data changes?**

What if we remove one example? Add more data? Pick a different subset? Replace real examples with synthetic ones? Corrupt the data? Reweight groups differently? Ask whether a given point was in the training set at all? Many methods in modern ML are really asking one of these questions, even when they come from very different literatures.

That is the sense in which I use the phrase **data counterfactual**: a "what if" question about the data used to train a model.

This framing is broad on purpose. It pulls together data valuation, scaling, selection, dataset distillation, poisoning, some forms of privacy analysis, some fairness interventions, and strategic collective action around data. I am not claiming those fields are formally identical. I am claiming they often become easier to compare once you view them as different ways of changing the training data and comparing the outcome.

One way to organize the space is to sort methods into a few rough buckets:

- **Value and attribution** methods ask how much a point or group mattered: leave-one-out, influence functions, Shapley-style valuation, TracIn, representer points.
- **Selection and compression** methods ask which data to keep, label, or synthesize: active learning, coresets, curriculum learning, dataset distillation.
- **Robustness and security** methods ask what happens when data is corrupted, repaired, masked, or withheld: poisoning, privacy interventions, fairness-by-data interventions.
- **Strategic and social** methods ask what happens when people or institutions intentionally change the data-generating process itself: strikes, contribution campaigns, bargaining, leverage.

A key distinction runs through this space. Some techniques explore counterfactual choices over the data that already exist -- choosing subsets, reweighting, repairing, distilling, or making synthetic perturbations. Others try to act on, or incentivize, people so that the world itself changes. The latter camp manufactures *real* counterfactuals. In both cases we can explore potential impact in the same way: by comparing two different "worlds" that differ in their data.

Here is the teaching model that the site uses. Imagine enumerating possible training sets as the rows of a grid and possible evaluation slices as the columns. To make this tractable, picture a toy world with just four observations or groups of observations: A, B, C, and D. Each cell stores the performance you would observe if you trained on that row and evaluated on that column. We could use different metrics as an additional dimension. This is not a claim that real systems literally build the whole grid; it is a conceptual scaffold for seeing the space of training-data what-ifs more clearly.

If we see the space this way, a lot of ideas fall into place as even more clearly related to each other:

- Observation- and group-level values, Shapley values, Beta Shapley, and related notions are all aggregations over carefully chosen slices of that grid.
- We can understand what any valuation method is "really doing" by tracing how it walks the grid, which makes it easier to relate Beta Shapley, vanilla Shapley, leave-one-out, etc.
- Data scaling laws become simple regressions on the averages across the rows grouped by size
- Dataset distillation and condensation become attempts to jump to a tiny synthetic row that still produces roughly the same downstream behavior as a much larger one.
- Data selection and data leverage interventions—data strikes, boycotts, targeted contributions—are paths that move us to different rows and therefore different outcomes.
- Training-dynamics methods like forgetting events, data maps, TracIn, or representer points become different ways of measuring which examples or regions of the row are actually doing the work.

Critically, any strategic behavior by data creators (strike, contribution campaign, etc.) can be understood as movement within this grid. Similarly, strategic behavior by data consumers (selection, weighting, etc.) is also movement within this grid.

Data strikes lower performance by nudging AI operators toward less favorable rows. Data poisoning does the same (although to tell the full story of data poisoning we need a much, much bigger grid to account for all possible poisoning perturbations, i.e. an explosion of possible worlds).

This same view also clarifies how strikes or poisoning impact evaluation, which runs into the "unknown unknowns" problem in ML evaluation writ large. If we only evaluate on a few slices of the columns, we may miss important shifts in performance that occur on other slices. This is especially true if the data change is strategic, i.e. if data creators are trying to influence outcomes in a way that evades detection.

The grid also can help us to start reasoning about the costs of data valuation on seller side or buyer side. "Unveiling" the grid—actually measuring enough cells to run a Shapley calculation or a scaling-law fit—is often the dominant expense in data valuation, so we can reason about when the marginal benefit of better accounting beats the marginal cost of more evaluations. Likewise, the metaphor helps us price the work required to "generate" new parts of the grid. We might think of it as a board game where you drop fresh tiles to build the world: each new tile represents data labor, annotation, or incentive design, and the grid tells us whether that tile changes downstream outcomes enough to justify the effort (indeed, we are working on exactly this kind of "data labor board game" concept for future release, see a preview in the "Experiment" section of this website).

Finally, the grid metaphor also helps us see connections to privacy and fairness interventions. Differential privacy can be seen as a way to limit how much any one data point can move you around the grid. Membership inference asks whether a point was in the row at all. Data augmentation can be seen as a way to fill in more of the grid with synthetic nearby data points, while dataset distillation asks whether a tiny synthetic set can replace a larger region of the grid altogether. Fairness-by-data methods, similarly, can be understood as repairing or reweighting rows before training so that the model lands in a different behavioral region.

Feedback welcome! I'm hopeful to iterate on this (and open to contribution -- if there's interest, let's make this an OSS project!) to help make the connections between technical data-centric work and collective action / data leverage / safety / responsible AI work clearer and more accessible.


It will also be helpful to further connect with the formal definitions from a variety of literature including:

- specific results re: influence functions for LLMs
- semivalue-style valuation methods (Beta Shapley, Banzhaf, etc.)
- active learning
- coresets
- dataset distillation / condensation
- experimental design
- causal inference
- curriculum learning
- training-dynamics diagnostics (forgetting events, data maps, representer points)
- membership inference
- machine unlearning
- adversarial training
- fairness interventions that operate via data

At the bottom of this page, we have started to collect a non-comprehensive list of relevant references that touch on data counterfactuals in some way -- more to come here!
