---
title: Data Counterfactuals
description: "An interactive explainer for a unifying frame across valuation, scaling, selection, poisoning, privacy, and collective action."
eyebrow: Interactive explainer
lede: "How might AI models if their training data changes in some way?"
intro:
  - |
    There are many reasons we might want to understand how a specific piece of data impacts an AI models. Perhaps we want to find particularly valuable data to look at it. Perhaps we want to pay people based on the impact of their data (though this is a tricky endeavor!). Perhaps we need to debug our data. Or perhaps a group of people want to withhold data for bargaining or protest. This web project grew out of discussions on data valuation, algorithmic collective action, data scaling, data selection, data poisoning, privacy, unlearning and neighboring topics. Counterfactual questions about how data might change are foundational to all these areas, and so understanding various questions in terms of data counterfactuals can be practically and academically useful.
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
  - title: Open the graph explorer
    href: /graph
    body: "Walk the subset lattice directly: nodes are training sets and edges are ablations, augmentations, or strike steps."
  - title: Compare formalisms
    href: /memo/formalisms
    body: A more technical, web-only companion that lines up neighboring formalisms side by side. WIP.
  - title: Related areas and papers
    href: /collections
    body: A compact shelf of neighboring literatures, representative papers, and quick context.
  - title: Try the 3D view
    href: /advanced.html
    body: A rougher, more game-like take that treats new data generation like extending the grid. WIP.
figures:
  leave_one_out:
    label: Leave-one-out toy example
    caption: With four toy data objects A, B, C, and D, the lower row leaves out B. The sharp drop on evaluation slice B is the kind of local contrast many attribution methods try to summarize.
  grid:
    label: Toy world with four observations
    caption: Imagine every possible training set as a row and every evaluation slice as a column. The payoff of the metaphor is in comparing nearby cells, rows, and paths through the grid.
---

## The smallest useful move

A **data counterfactual** is a scenario in which the AI training data for a model changes in some way. Often, we are interested in comparing two counterfactual scenarios to understand the impact of some change.

Consider a simple thought experiment: imagine you are going to train a machine learning model on a small dataset (or, you can imagine it's a big dataset with distinct subsets). Now imagine a grid where every possible training set appears as a row, every possible evaluation set appears as a column, and each cell records the performance for that train/eval pairing. In practice it helps to shrink the picture first and imagine a small grid, for instance with just four data objects that we can call A, B, C, and D. (Again, these could literally map to 4 single observations in a toy example, or map to four large datasets we are considering mixing.)

With this grid in mind, we can use the grid to explore the smallest useful counterfactual, leave-one-out: we compare a row that includes one point with the nearby row in which that point is missing. By computing the difference between these two cells, we can learn how much a given data point helped or hurt our model. From there the same logic can be extended to groups of data points, fixed-size subsets, synthetic replacements, corrupted examples, withheld data, or coordinated withdrawal.

(Very simply, we imagine training an LLM with a bunch of fiction books, science articles, and social media posts. If we train a second LLM without the science articles and compare the performance, we are exploring the "no science articles" data counterfactual).

## A grid for seeing the space

By considering the giant grid of "all training sets" and "all evaluationsets", ideas from across different subfields start to show up in one place. Various ways of defining data value can be understood as summaries over different columns, rows, and slices. We can undeerstand data scaling patterns (how models get better as we get more data). Data selection problems become questions about which rows are worth visiting. As we will see in the full explorer, we can even begin to understand complex privacy interventions, poisoning attacks, and other types of counterfactuals.

In real life, we oftentimes cannot actually compute the cell values for this whole grid. For this reason, there are active research agendas seeking to more effiicently estimate certain data values. These approaches can be thought of as sampling from this giant grid.

Finally, a key reason why I think presenting the data counterfactuals grid is useful is because it connects technical, economic, and social data-centric work. Data markets and data-related collective action can be understood as changing which rows are available or attractive to an AI operator in the first place.

## What the idea helps connect

I think this frame is useful because it connects conversations that often happen in silos. Someone interested in differential privacy, an ML researcher running ablations, and a labor advocate thinking about data leverage are often exploring different neighborhoods of the same conceptual space.

That does not mean the projects are all formally identical. One major distinction is that some techniques only explore counterfactuals over data that already exist: subsets, reweightings, filtering, or held-out removals. Others try to change what data the world produces in the first place, which is part of why collective action matters so much. And many minor distinctions exist.

If you want the running map of adjacent methods, areas, and papers, head to the [related works page](/collections). It is updated dynamically via Semble, an atproto project, so this intro page does not need its own hand-maintained method-family list.