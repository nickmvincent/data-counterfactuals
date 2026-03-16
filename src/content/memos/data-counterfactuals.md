---
order: 1
title: "Introducing Data Counterfactuals"
summary: "A shared launch post and site memo arguing that many questions about value, selection, privacy, poisoning, and data leverage are really questions about what changes when training data change."
date: '2026-03-14T00:00:00.000Z'
visibility: public
type: shared_memo
---

This is a short "memo" meant to explain the datacounterfactuals.org project/website. I'll also post on Substack as an archived blog post.

I found myself using the phrase "data counterfactuals" a *lot* while teaching about data valuation, algorithmic collective action, scaling, selection, poisoning, and related topics. Students and colleagues would ask some version of: is "data counterfactuals" an actual term, or just your phrase for a bunch of neighboring ideas? I never had a good "canonical reference" or one-link answer, so I made this site. (Work on "datamodels" from [Ilyas et al.](https://proceedings.mlr.press/v162/ilyas22a.html) use the term "dataset counterfactuals", and this [talk](https://simons.berkeley.edu/talks/andrew-ilyas-stanford-university-2025-04-03) from Ilyas uses the term directly).

The first draft was an attempt to convert my whiteboard scribblings into an interactive web-app, but then I also decided some additional writing on the topic could be useful.

A single "data counterfactual" explores some variant of the question: **what happens when our training data change?** One change = one counterfactual scenario.

When we're training a machine learning model, all of the following "interventions" can cause model behavior to change:

- add more data
- pick a different subset of training data
- replace real examples with synthetic ones
- corrupt the data
- reweight group

Many topics of interest in modern ML study one of those comparisons. And, what I want to argue with this post/project, many topics that are not literally about computing leaveo-one-out counterfactuals or similar can still be understood in relation to data counterfactuals.

## The smallest useful example

Consider a toy world containing just four data objects: A, B, C, and D. We train a model on all four data objects. Then we train again after removing B. If the second model gets worse on tasks that depend on B, that nearby comparison tells us something about B's role in the original model. (However, that single comparison is not conclusive; we will still have many open questions about the combinatorial interactions with other data points, the of model multiplicity and sources of variance, etc).

A single leave-one-out experiment is the smallest useful data counterfactual. From there the same logic extends to groups, fixed-size subsets, synthetic replacements, corrupted examples, withheld data, or coordinated withdrawal.

## Why this matters for data leverage

One reason I keep coming back to this frame is that it lets me easily connect topics like Shapley values and data strikes. In a lot of ML work, the counterfactual is analytical: remove a point, reweight a group, estimate an influence score, fit a scaling curve. But some of the counterfactuals I care most about are social and strategic. Data strikes, boycotts, contribution campaigns, and bargaining efforts try to change what data the world actually produces, or what data an AI developer can access on acceptable terms.

When people can withhold, redirect, or condition the supply of data, "what if the data were different?" it itself a core governance question.

A simple strike simulator makes the connection concrete. Pick a subset of data to withhold, retrain or approximate retraining, and compare the result to the baseline world. Run that one point at a time and you are close to leave-one-out. Run it over many coalitions and you get the raw material that Shapley-style methods aggregate over. Run it across different scales or groups and you start learning something about leverage, substitution, and bargaining power. The same scaffold can support both technical measurement and collective-action questions.

## The grid view

The site's main "interactive explorer" is a grid. Imagine possible training sets as rows and possible evaluation slices as columns. Each cell records what happens if we train on that row and evaluate on that column.

Of course, nobody is literally filling out this giant spreadsheet. The grid is a teaching model, not a claim about how practitioners store or compute things. Its job is simpler: make the comparisons visible. Which training world changed? Where did the effect land at evaluation time? How big was it?

Once that picture is in view, a bunch of literatures that usually live in separate boxes start to sit nearer to one another:

- **Value and attribution** methods ask how much a point or group mattered: leave-one-out, influence functions, Shapley-style valuation, TracIn, representer points.
- **Selection and compression** methods ask which data to keep, label, or synthesize: active learning, coresets, curriculum learning, dataset distillation.
- **Robustness, privacy, and repair** methods ask what happens when data is corrupted, hidden, repaired, or made harder to observe: poisoning, membership inference, differential privacy, fairness-by-data interventions.
- **Collective action and leverage** asks what happens when people or institutions intentionally change the data-generating process itself: strikes, contribution campaigns, bargaining, and other efforts to shift AI operators toward less favorable rows.

I do not think these projects collapse into one master formalism. I do think the shared comparison structure makes them easier to line up.

## Some limitations

In some cases, we can literally directly connect two literatures. For instance, running a large number of data strike experiments will give us a bunch of output data that can directly enable us to also compute certain scaling laws or Shapley values.

Some related concepts require a more complex model than the simple "grid" presented in our explorer here. Training dynamics and curriculum learning care about order, not just set membership. Active learning cares about policies for acquiring the next point. Multi-stage pipelines care about sequence and stage boundaries. Privacy, memorization, poisoning, and backdoor work usually need a more detailed state space than one scalar in each cell. Strategic or performative settings care about feedback loops in which deploying the model changes the future data-generating process.

So I do not mean "data counterfactuals" as a master equation. I mean it more as a handle: a way to keep a family of comparisons in view without losing track of where the family resemblance ends.

## Why I'm building the site

Mostly, I wanted a place where I could put the argument once and then build around it. If you are reading this on Substack, the site adds a toy explorer, a collections page, and a more technical companion note on [formalisms](https://datacounterfactuals.org/memo/formalisms). If you are reading this on the site, think of this page as the blog-post version of the project: the part before the diagrams and controls take over.

Feedback welcome!
