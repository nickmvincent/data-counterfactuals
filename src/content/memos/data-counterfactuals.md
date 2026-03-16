---
order: 1
title: "Introducing Data Counterfactuals"
summary: "A shared launch post and site memo arguing that many questions about value, selection, privacy, poisoning, and data leverage are really questions about what changes when training data change."
date: '2026-03-14T00:00:00.000Z'
visibility: public
type: shared_memo
---

This piece is doing two jobs at once. It is the soft-launch post for the site, and it is also the memo I want to keep pointing people to when I try to explain the project.

I started using the phrase while teaching about data valuation, algorithmic collective action, scaling, selection, poisoning, and related topics. Students would ask some version of: is "data counterfactuals" an actual term, or just your phrase for a bunch of neighboring ideas? I never had a good one-link answer. That is part of why this site exists.

Across those conversations I kept coming back to the same question: **what changes if the training data change?**

If we remove one example, add more data, pick a different subset, replace real examples with synthetic ones, corrupt the data, reweight groups, or ask whether a point was in the training set at all, model behavior changes in some way. Many literatures in modern ML are, at root, studying one of those comparisons.

That is the sense in which I use the phrase **data counterfactual**: a "what if" question about the data used to train a model.

## The smallest useful example

Start with a toy world containing just four data objects: A, B, C, and D. Train once on all four. Then train again after removing B. If the second model gets worse on tasks that depend on B, that nearby comparison tells us something about B's role in the original model.

That is the smallest useful data counterfactual. From there the same logic extends to groups, fixed-size subsets, synthetic replacements, corrupted examples, withheld data, or coordinated withdrawal. I do not mean that every field runs the same procedure. I mean that many of them are built around nearby training-world comparisons and then disagree about how to summarize those comparisons.

## Why this matters for data leverage

One reason I keep coming back to this frame is that it lets me talk about Shapley values and data strikes in the same breath without pretending they are the same project. In a lot of ML work, the counterfactual is analytical: remove a point, reweight a group, estimate an influence score, fit a scaling curve. But some of the counterfactuals I care most about are social and strategic. Data strikes, boycotts, contribution campaigns, and bargaining efforts try to change what data the world actually produces, or what data an AI developer can access on acceptable terms.

Once people can withhold, redirect, or condition the supply of data, "what if the data were different?" stops being only a measurement question. It becomes a governance question.

A simple strike simulator makes the connection concrete. Pick a subset of data to withhold, retrain or approximate retraining, and compare the result to the baseline world. Run that one point at a time and you are close to leave-one-out. Run it over many coalitions and you get the raw material that Shapley-style methods aggregate over. Run it across different scales or groups and you start learning something about leverage, substitution, and bargaining power. The same scaffold can support both technical measurement and collective-action questions.

## The grid view

The site's main teaching picture is a grid. Imagine possible training sets as rows and possible evaluation slices as columns. Each cell records what happens if we train on that row and evaluate on that column.

Of course, nobody is literally filling out this giant spreadsheet. The grid is a teaching model, not a claim about how practitioners store or compute things. Its job is simpler: make the comparisons visible. Which training world changed? Where did the effect land at evaluation time? How big was it?

Once that picture is in view, a bunch of literatures that usually live in separate boxes start to sit nearer to one another:

- **Value and attribution** methods ask how much a point or group mattered: leave-one-out, influence functions, Shapley-style valuation, TracIn, representer points.
- **Selection and compression** methods ask which data to keep, label, or synthesize: active learning, coresets, curriculum learning, dataset distillation.
- **Robustness, privacy, and repair** methods ask what happens when data is corrupted, hidden, repaired, or made harder to observe: poisoning, membership inference, differential privacy, fairness-by-data interventions.
- **Collective action and leverage** asks what happens when people or institutions intentionally change the data-generating process itself: strikes, contribution campaigns, bargaining, and other efforts to shift AI operators toward less favorable rows.

I do not think these projects collapse into one master formalism. I do think the shared comparison structure makes them easier to line up.

## Where the frame stretches

The frame also flattens things it should not flatten. Training dynamics and curriculum learning care about order, not just set membership. Active learning cares about policies for acquiring the next point. Multi-stage pipelines care about sequence and stage boundaries. Privacy, memorization, poisoning, and backdoor work usually need a more detailed state space than one scalar in each cell. Strategic or performative settings care about feedback loops in which deploying the model changes the future data-generating process.

So I do not mean "data counterfactuals" as a master equation. I mean it more as a handle: a way to keep a family of comparisons in view without losing track of where the family resemblance ends.

## Why I'm building the site

Mostly, I wanted a place where I could put the argument once and then build around it. If you are reading this on Substack, the site adds a toy explorer, a collections page, and a more technical companion note on [formalisms](https://datacounterfactuals.org/memo/formalisms). If you are reading this on the site, think of this page as the blog-post version of the project: the part before the diagrams and controls take over.

The site is still rough. I do not think it is ready yet as a polished general-audience explainer. But it has already helped me explain why the question *what if the data were different?* keeps resurfacing across valuation, scaling, privacy, robustness, and data leverage.

Feedback welcome. I'm especially interested in where this frame clarifies a literature, where it flattens something important, and where it suggests better ways of thinking about data leverage, bargaining, and governance.
