---
title: "Exploring Data Counterfactuals"
slug: data-counterfactuals
summary: "Many data-centric techniques in machine learning can be unified under the concept of 'data counterfactuals': how does changing data  affect model outcomes."
date: '2024-01-01T00:00:00.000Z'
visibility: public
type: shared_memo
---

Short memo from [Nick Vincent](https://www.nickmvincent.com/); ping him for any suggestions or complaints regarding this site!

This page is meant to provide an interactive explainer for the broad concept of "data counterfactuals". This is a concept that I found referring to a bunch when teaching about data valuation, algorithmic collective action, etc. As I referenced the idea repeatedly, in several different contexts students asked me something along the lines of: "is this 'data counterfactuals' like an actual term, in a textbook, or something?" Upon reflection and inspection, I realized that indeed, there was a not a go-to reference for what I think is an important and useful unifying concept. Thus, I created the first draft of this website, which includes the short memo you're reading and an interactive illustration of a toy exploration of data counterfactuals.

In short, data valuation, data scaling, data selection, data poisoning, nascent algorithmic collective action (ACA), and even some concepts in the privacy literature (like differential privacy) and in the data-centric ML literature (like data augmentation) all touch on a shared idea: exploring what happens when we hold our training choices fixed or somewhat fixed and change the data we train on. Many methods seek to answer "what if the data was different", or "what if we had picked these data instead of those?" or "what if the world produced different data altogether?"

Data valuation techniques often tell us how a relevant metric (e.g. test loss) would change if a data point (or groups of points) was missing/added/upweighted/downweighted. Data scaling tells us what would happen is our training data size was 10x-ed or 1/10. Data selection tries to tell us which data points we should pick from a given set. Data poisoning tells us what will happen when data is manipulated. Algorithmic collective action is focused on strategic behaviour by people that cause data to change. And some privacy concepts like differential privacy and data-centric ML concepts like augmentation involve intentionally modifying data to promote some outcome (more privacy, better performance).

A key distinction runs through this space. Some techniques explore counterfactual choices over the data that already exist -- choosing subsets, reweighting, making synthetic perturbations. Others try to act on, or incentivize, people so that the world itself changes. The latter camp manufactures *real* counterfactuals. In both cases the we can explore potential impact in the same way: by comparing two different "worlds" that differ in their data.

Here's the idea: Imagine enumerating every possible training set as the rows of a grid and every possible evaluation set as the columns. To make this tractable for a toy visualization, as we'll see below, perhaps just start by imagining we have 4 observations or 4 big groups of observation, A, B, C, and D. Each cell stores the performance you would observe if you trained on that row and tested on that column. We could use many different evaluation metrics to add a third dimension. This giant matrix is the full landscape of data counterfactuals.

If we see the space this way, a lot of ideas fall into place as even more clearly related to each other:

- Observation- and group-level values, Shapley values, Beta Shapley, and related notions are all aggregations over carefully chosen slices of that grid.
- We can understand what any valuation method is "really doing" by tracing how it walks the grid, which makes it easier to relate Beta Shapley, vanilla Shapley, leave-one-out, etc.
- Data scaling laws become simple regressions on the averages across the rows grouped by size
- Data selection and data leverage interventions—data strikes, boycotts, targeted contributions—are paths that move us to different rows and therefore different outcomes.

Critically, any strategic behavior by data creators (strike, contribution campaign, etc.) can be understood as movement within this grid. Similarly, strategic behavior by data consumers (selection, weighting, etc.) is also movement within this grid.

Data strikes lower performance by nudging AI operators toward less favorable rows. Data poisoning does the same (although to tell the full story of data poisoning we need a much, much bigger grid to account for all possible poisoning perturbations, i.e. an explosion of possible worlds).

This same view also clarifies how strikes or poisoning impact evaluation, which runs into the "unknown unknowns" problem in ML evaluation writ large. If we only evaluate on a few slices of the columns, we may miss important shifts in performance that occur on other slices. This is especially true if the data change is strategic, i.e. if data creators are trying to influence outcomes in a way that evades detection.

The grid also can help us to start reasoning about the costs of data valuation on seller side or buyer side. "Unveiling" the grid—actually measuring enough cells to run a Shapley calculation or a scaling-law fit—is often the dominant expense in data valuation, so we can reason about when the marginal benefit of better accounting beats the marginal cost of more evaluations. Likewise, the metaphor helps us price the work required to "generate" new parts of the grid. We might think of it as a board game where you drop fresh tiles to build the world: each new tile represents data labor, annotation, or incentive design, and the grid tells us whether that tile changes downstream outcomes enough to justify the effort (indeed, we are working on exactly this kind of "data labor board game" concept for future release, see a preview in the "Experiment" section of this website).

Finally, the grid metaphor also helps us see connections to privacy interventions. Differential privacy can be seen as a way to limit how much any one data point can move you around the grid. Data augmentation can be seen as a way to fill in more of the grid with synthetic data points, which may help smooth out performance across rows and columns.

Feedback welcome! I'm hopeful to iterate on this (and open to contribution -- if there's interest, let's make this an OSS project!) to help make the connections between technical data-centric work and collective action / data leverage / safety / responsible AI work clearer and more accessible.


It will also be helpful to further connect with the formal definitions from a variety of literature including:

- specific results re: influence functions for LLMs
- active learning
- coresets
- experimental design
- causal inference
- curriculum learning
- machine unlearning
- adversarial training
- fairness interventions that operate via data

At the bottom of this page, we have started to collect a non-comprehensive list of relevant references that touch on data counterfactuals in some way -- more to come here!