---
title: Data Counterfactuals
description: "An interactive explainer for a unifying frame across valuation, scaling, selection, poisoning, privacy, and collective action."
eyebrow: Interactive explainer
lede: "What might change in an AI model if its training data changes?"
intro:
  - |
    There are many reasons we might want to understand how a specific piece of data impacts an AI model. Perhaps we want to inspect particularly valuable data, pay people based on the impact of their data (though this is a tricky endeavor!), or check data for errors. Or perhaps a group of people want to withhold data for bargaining or protest. This web project grew out of discussions on data valuation, algorithmic collective action, data scaling, data selection, data poisoning, privacy, unlearning, and neighboring topics. Counterfactual questions about how data might change are foundational to all these areas, and so understanding various questions in terms of data counterfactuals can be practically and academically useful.
  - |
    This site exists to:

    - show how cross-cutting the idea of data counterfactuals is (cutting across data valuation, algorithmic collective action, data scaling, data selection, data poisoning, privacy, unlearning, and more)
    - make certain data counterfactual measurements easier to understand
    - illustrate connections between technical and social data-centric work
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
    body: A more technical, web-only companion that lines up neighboring formalisms side by side.
  - title: Related areas and papers
    href: /collections
    body: A dynamic, non-exhaustive set of related areas and readings, updated via Semble.
figures:
  leave_one_out:
    label: Leave-one-out toy example
    caption: With four toy data objects A, B, C, and D, the lower row leaves out B. The sharp drop on evaluation slice B is the kind of local contrast many attribution methods try to summarize.
  grid:
    label: Toy world with four observations
    caption: Imagine every possible training set as a row and every evaluation slice as a column. The payoff of the metaphor is in comparing nearby cells, rows, and paths through the grid.
---

## What is a data counterfactual?

A **data counterfactual** is a scenario in which the AI training data for a model changes in some way. Often, we are interested in comparing two counterfactual scenarios to understand the impact of some change on AI capabilities.

Consider this simple thought experiment: imagine you are going to train a machine learning model on a very mall dataset: let's say the dataset has just four units of data (or, if it seems to implausible that we'd ever want to do this, we can imagine it's a big dataset with distinct bundlede subsets). Now imagine a grid where every possible combinaton of training objects appears as a row, every possible evaluation set appears as a column, and each cell records the performance a given train/eval pairing. For our very small example with just four data objects, we can call them A, B, C, and D. (Again, these could literally map to 4 single observations in a toy example, or map to four large datasets we are considering mixing.)

With this grid in mind, we can explore the most basic useful data counterfactual, "leave-one-out". By comparing a row that includes one point with the nearby row in which that point is missing, we can understand the impact (in a causal sense) or adding or removing that point. By computing the difference between these two cells, we can learn how much a given data point helped or hurt our model. From there the same logic can be extended to groups of removing or addding data points, weighting data points, replacing data with other synthetic data, corrupting certain examples, or coordinated withdrawal.

(Very simply, we imagine training an LLM with a bunch of fiction books, science articles, and social media posts. If we train a second LLM without the science articles and compare the performance, we are exploring the "no science articles" data counterfactual.

## Why the grid visualization/metaphor is useful

By considering the giant grid of "all training sets" and "all evaluation sets", ideas from across different subfields start to show up in one place. Various ways of defining data value can be understood as summaries over different columns, rows, and slices. We can understand data scaling patterns (how models get better as we get more data). Data selection problems become questions about which rows are worth visiting. As we will see in the full explorer, we can even begin to understand complex privacy interventions, poisoning attacks, and other types of counterfactuals. The grid connects technical, economic, and social data-centric work. Data markets and data-related collective action can be understood as changing which rows are available or attractive to an AI operator in the first place.

In real life, we often cannot actually compute the cell values for this whole grid. For this reason, there are active research agendas seeking to more efficiently estimate certain data values. These approaches can be thought of as sampling from this giant grid.

The grid is just one way to display the underlying notion of trying "list out all the data counterfactuals". We might also create a graph/network representation, where nodes are training data possibilities and edges show interventions (e.g., dropping a point). We have a WIP version of a "graph view on data counterfactuals" here as well.

## What the idea helps connect

To reiterate: the data counterfactuls concept, whether displayed as a grid, graph, or otherwise, is useful because it connects conversations that often happen in silos. A group of researchers, all with slightly different interests -- perhaps one cares about data value estimation for economic applications, another about differential privacy, another about data ablations for performance outcomes, and yet another is a labor advocate thinking about data leverage -- are all actually exploring neighborhoods of the same conceptual space.

Of course, with this site we are not trying to claim these projects are all formally identical. Thre are many finer details that make the tasks and concepts different in important ways. And for social impacts, it is very important to understand the distinction between techniques that only explore counterfactuals over data that already exist versus approaches that try to change what data the world produces in the first place.

If you're interested: read more about the motivation and concepts in the "Memos" section, check out the grid or graph directly, or check [related works page](/collections), which is a dynamically updated "might be interesting" list of paper curated via Semble.so, an atproto project.
