---
order: 1
title: "Introducing Data Counterfactuals"
summary: "A shared launch post and site memo arguing that many questions about value, selection, privacy, poisoning, and data leverage are really questions about what changes when training data change."
date: '2026-03-14T00:00:00.000Z'
visibility: public
type: shared_memo
---

This is a short "memo" meant to explain the datacounterfactuals.org project and website. It will be cross-posted on the Data Leverage Substack.

There are many reasons we might want to understand how a specific piece of data impacts an AI model. Perhaps we want to find particularly valuable data to look at it. Perhaps we want to pay people based on the impact of their data (though this is a tricky endeavor!). Perhaps we need to debug our data. Or perhaps a group of people want to withhold data for bargaining or protest. The datacounterfactuals project grew out of discussions on data valuation, algorithmic collective action, data scaling, data selection, data poisoning, privacy, unlearning and neighboring topics. Counterfactual questions about how data might change are foundational to all these areas, and so understanding various questions in terms of data counterfactuals can be practically and academically useful.

This site exists to:

- show how cross-cutting the idea of data counterfactuals is
- make certain data counterfactual measurements easier to understand
- illustrate connections between technical and social data-centric work

In particular, I found myself using the phrase "data counterfactuals" very frequently while teaching about data valuation, algorithmic collective action, data scaling, and related topics. Students and colleagues would ask some version of: is "data counterfactuals" an actual field, area, or official term, or just a convenient phrase for a bunch of neighboring ideas?

Variations of the term appear across the related data valuation and data attribution literature. Work on "datamodels" from [Ilyas et al.](https://proceedings.mlr.press/v162/ilyas22a.html) uses the term "dataset counterfactuals", and this [talk](https://simons.berkeley.edu/talks/andrew-ilyas-stanford-university-2025-04-03) from Ilyas uses the term "data counterfactuals" directly. In early work from Koh and Liang on influence functions, the authors state: "we ask the counterfactual: what would happen if we did not have this training point, or if the values of this training point were changed slightly?"

A single "data counterfactual" explores some variant of the question: **what happens when our training data change?** One change to our data gives us one counterfactual scenario. Often we want to compare one or more different counterfactuals to learn something about the data (e.g., discover a data point that's very influential).

When we're training a machine learning model, all of the following "interventions" can cause model behavior to change:

- add more data
- pick a different subset of training data
- choose different data to collect or label
- replace real examples with synthetic, augmented, distilled, or condensed ones
- corrupt, poison, or backdoor the data
- reweight groups or later remove points through unlearning

Many topics of interest in modern ML study one of those comparisons. And, what I want to argue with this post/project, many topics that are not literally about computing leave-one-out counterfactuals or similar can still be understood in relation to data counterfactuals.

## The smallest useful example

Consider a toy world containing just four data objects: A, B, C, and D. We train a model on all four data objects. Then we train again after removing B. If the second model gets worse on tasks that depend on B, that nearby comparison tells us something about B's role in the original model. (However, that single comparison is not conclusive; we will still have many open questions about combinatorial interactions with other data points, model multiplicity, and other sources of variance.)

A single leave-one-out experiment is the smallest useful data counterfactual. From there the same logic extends to group leave-one-out, fixed-size subsets, synthetic replacements, corrupted examples, withheld data, or coordinated withdrawal. Data Shapley and related semivalues such as Banzhaf value and Beta Shapley aggregate many nearby comparisons rather than trusting any single row pair, while machine unlearning asks how to move from one row to another efficiently after a removal request.

## Why this matters for data leverage

One reason I keep coming back to this frame is that it lets me easily connect topics like Shapley values and data strikes. In ML, we often want to ask questions about removing a point, reweighting a group, estimating an influence score, fitting a scaling curve, etc. with the purpose of just understanding our data and model. But counterfactuals can also be induced by strategic actors. Data strikes, boycotts, contribution campaigns, and bargaining efforts try to change what data the world actually produces, or what data an AI developer can access on acceptable terms.

When people can withhold, redirect, or condition the supply of data, data counterfactual measurement directly maps to governance power!

A simple strike simulator makes the connection concrete. Pick a subset of data to withhold, retrain or approximate retraining, and compare the result to the baseline world. Run that one point at a time and you are close to leave-one-out. Run it over many coalitions and you get the raw material that Shapley-style methods aggregate over. Run it across different scales or groups and you start learning something about leverage, substitution, and bargaining power. The same scaffold can support both technical measurement and collective action questions.

This becomes especially concrete in systems built from user-generated content. Questions about provenance, licensing, and contribution are not side issues there; they help determine which training rows are legally, socially, or politically available in the first place.

## The grid view

The site's main "interactive explorer" is a grid. Imagine possible training sets as rows and possible evaluation slices as columns. Each cell records what happens if we train on that row and evaluate on that column.

Of course, nobody can completely fill out this "giant spreadsheet" (it's too computationally expensive). The grid can still be useful as a teaching model (and again, not a claim about how practitioners store or compute things).

Once that picture is in view, various literatures that usually live in separate boxes start to sit nearer to one another. Most notably, we can see the direct connection between valuation and attribution methods and collective action simulations. Collective action and leverage experiments typically ask what happens when people or institutions intentionally change the data-generating process itself: strikes, contribution campaigns, bargaining, provenance demands, licensing disputes, and other efforts to shift AI operators toward less favorable rows. We can also understand how various kinds of scaling and selection methods share "building blocks" with attribution and collective action.

Critically, the counterfactual grid is conceptually useful as a baseline for areas that do not directly try to measure data counterfactuals. For instance, we can find relevant data counterfactuals that map to specific scenarios involving differential privacy, membership inference, and machine unlearning.

On this site, we maintain a larger "loosely curated examples of generally related research" that's hosted via semble.so for easy updating and commenting.

## Some limitations

In some cases, the grid helps us literally directly connect two concepts or literatures. For instance, running a large number of data strike experiments will give us a bunch of output data that can directly enable us to also compute certain scaling laws or Shapley values. That is, if we actually "fill out" the grid for a model, we can produce both valuation and collective action related results without running any more experiments!

Some related concepts require a more complex model than the simple "grid" presented in our explorer here. 

- Training dynamics and curriculum learning care about order, not just set membership. 
- Active learning and experimental design care about policies for acquiring the next point. 
- Multi-stage pipelines care much more about sequence.
- Privacy, memorization, poisoning, backdoor work, and adversarial training usually need a more detailed state space than one scalar per cell. 
- Meta-learning learns policies over rows rather than merely comparing fixed rows. 
- Model collapse asks what happens when more and more rows are synthetic outputs of previous models.
-  Strategic or performative settings care about feedback loops in which deploying the model changes the future data-generating process.

(If you're interested in adding more papers on these to the collection, or have ideas for extending the grid, please reach out!)

## Why build this site?

Mostly, I wanted a place where I could put the argument once and then build around it. If you are reading this on Substack, the site adds a toy explorer, a collections page, and a more technical companion note on [formalisms](https://datacounterfactuals.org/memo/formalisms).

Feedback and contribution welcome!
