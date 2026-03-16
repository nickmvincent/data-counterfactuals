---
order: 1
title: "Introducing Data Counterfactuals"
summary: "A shared launch post and site memo arguing that many questions about value, selection, privacy, poisoning, and data leverage are really questions about what changes when training data change."
date: '2026-03-14T00:00:00.000Z'
visibility: public
type: shared_memo
---

This is a short "memo" meant to explain the datacounterfactuals.org project/website. I'll also post on Substack as an archived blog post.

I found myself using the phrase "data counterfactuals" a *lot* while teaching about data valuation, algorithmic collective action, scaling, selection, poisoning, privacy, unlearning, causality, and related topics. Students and colleagues would ask some version of: is "data counterfactuals" an actual term, or just your phrase for a bunch of neighboring ideas?

Variations of the term appear across the related data valuation and data attribution literature. Work on "datamodels" from [Ilyas et al.](https://proceedings.mlr.press/v162/ilyas22a.html) uses the term "dataset counterfactuals", and this [talk](https://simons.berkeley.edu/talks/andrew-ilyas-stanford-university-2025-04-03) from Ilyas uses the term "data counterfactuals" directly. Earlier work from Koh and Liang on influence functions frames their work as, "we ask the counterfactual: what would happen
if we did not have this training point, or if the values of this
training point were changed slightly?"

The first draft of this website was an attempt to convert my whiteboard scribblings into an interactive web-app, but then I also decided some additional writing on the topic could be useful.

A single "data counterfactual" explores some variant of the question: **what happens when our training data change?** One change = one counterfactual scenario.

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

One reason I keep coming back to this frame is that it lets me easily connect topics like Shapley values and data strikes. In a lot of ML work, the counterfactual is analytical: remove a point, reweight a group, estimate an influence score, fit a scaling curve. But some of the counterfactuals I care most about are social and strategic. Data strikes, boycotts, contribution campaigns, and bargaining efforts try to change what data the world actually produces, or what data an AI developer can access on acceptable terms.

When people can withhold, redirect, or condition the supply of data, "what if the data were different?" is itself a core governance question.

A simple strike simulator makes the connection concrete. Pick a subset of data to withhold, retrain or approximate retraining, and compare the result to the baseline world. Run that one point at a time and you are close to leave-one-out. Run it over many coalitions and you get the raw material that Shapley-style methods aggregate over. Run it across different scales or groups and you start learning something about leverage, substitution, and bargaining power. The same scaffold can support both technical measurement and collective-action questions.

This becomes especially concrete in systems built from user-generated content. Questions about provenance, licensing, and contribution are not side issues there; they help determine which training rows are legally, socially, or politically available in the first place.

## The grid view

The site's main "interactive explorer" is a grid. Imagine possible training sets as rows and possible evaluation slices as columns. Each cell records what happens if we train on that row and evaluate on that column.

Of course, nobody is literally filling out this giant spreadsheet. The grid is a teaching model, not a claim about how practitioners store or compute things. Its job is simpler: make the comparisons visible. Which training world changed? Where did the effect land at evaluation time? How big was it?

On the site, a few interface choices make that picture more explicit. The selected row tells you which training world you are currently inspecting; the focus chips tell you which point or group the current question is about. In advanced mode, the explorer also distinguishes Operator view from the untouched Real world or reference grid, and it lets you layer on toy data poisoning or DP-ish noise without pretending those edits are the whole story.

Once that picture is in view, a bunch of literatures that usually live in separate boxes start to sit nearer to one another:

- **Value and attribution** methods ask how much a point or group mattered: leave-one-out, group leave-one-out, influence functions, TracIn, representer points, and semivalues such as Data Shapley, Banzhaf value, and Beta Shapley.
- **Selection, acquisition, and compression** methods ask which data to keep, label, augment, or synthesize: active learning, experimental design, selection and coresets, curriculum learning, data augmentation, dataset distillation, and dataset condensation.
- **Robustness, privacy, and repair** methods ask what happens when data is corrupted, hidden, repaired, or made harder to observe: data poisoning, backdoor attacks, adversarial training, membership inference, differential privacy, machine unlearning, and fairness via data interventions such as reweighing.
- **Dynamics and diagnostics** ask what training behavior reveals about examples: training dynamics, data cartography, data maps, and forgetting events.
- **Causal and adaptive perspectives** ask how to identify effects or learn data policies: causality, meta-learning-based reweighting or valuation, and other methods that learn which rows to prefer.
- **Collective action and leverage** asks what happens when people or institutions intentionally change the data-generating process itself: strikes, contribution campaigns, bargaining, provenance demands, licensing disputes, and other efforts to shift AI operators toward less favorable rows.

I do not think these projects collapse into one master formalism. I do think the shared comparison structure makes them easier to line up.

## Some limitations

In some cases, we can literally directly connect two literatures. For instance, running a large number of data strike experiments will give us a bunch of output data that can directly enable us to also compute certain scaling laws or Shapley values.

Some related concepts require a more complex model than the simple "grid" presented in our explorer here. Training dynamics and curriculum learning care about order, not just set membership. Active learning and experimental design care about policies for acquiring the next point. Multi-stage pipelines care about sequence and stage boundaries. Privacy, memorization, poisoning, backdoor work, and adversarial training usually need a more detailed state space than one scalar in each cell. Meta-learning learns policies over rows rather than merely comparing fixed rows. Model collapse asks what happens when more and more rows are synthetic outputs of previous models. Strategic or performative settings care about feedback loops in which deploying the model changes the future data-generating process.

So I do not mean "data counterfactuals" as a master equation. I mean it more as a handle: a way to keep a family of comparisons in view without losing track of where the family resemblance ends.

## Why I'm building the site

Mostly, I wanted a place where I could put the argument once and then build around it. If you are reading this on Substack, the site adds a toy explorer, a collections page, and a more technical companion note on [formalisms](https://datacounterfactuals.org/memo/formalisms).

Feedback welcome!
