---
order: 1
title: "Introducing Data Counterfactuals"
summary: "A shared launch post and site memo arguing that many questions about value, data dividends, selection, privacy, poisoning, evaluation, and data leverage are really questions about what changes when data worlds change."
date: '2026-03-14T00:00:00.000Z'
visibility: public
type: shared_memo
---

This is a short memo meant to explain the [datacounterfactuals.org](https://datacounterfactuals.org/) project and website. It will be cross-posted on the [Data Leverage Substack](https://dataleverage.substack.com/). The site exists to:

- show how cross-cutting the idea of "data counterfactuals" is (to name just a few relevant topics: [data valuation](https://proceedings.mlr.press/v89/jia19a.html), [data dividends](https://www.datadividends.org/), [algorithmic collective action](https://proceedings.mlr.press/v202/hardt23a.html), [data scaling](https://arxiv.org/abs/2001.08361), [data selection](https://neurips.cc/virtual/2024/tutorial/99530), [data poisoning](https://arxiv.org/abs/1206.6389), [evaluation data](/memo/evaluation-counterfactuals), [privacy](https://www.microsoft.com/en-us/research/publication/differential-privacy/), [machine unlearning](https://arxiv.org/abs/1912.03817))
- make data counterfactual measurements easier to understand
- illustrate connections between technical and social data-centric work

There are many reasons we might want to understand how a specific piece of data impacts an AI system. Perhaps we want to inspect particularly valuable training data, reason about data dividends or other ways of paying people based on the impact of their data (though this is a tricky endeavor), check data for errors, or decide what should be reserved for evaluation. Or perhaps a group of people wants to withhold data for bargaining or protest. This project argues that counterfactual comparisons can help organize these questions while still leaving the technical, economic, legal, and institutional parts of each question distinct.

## What is a data counterfactual?

A **data counterfactual** is a scenario in which the data upstream of an AI system changes in some way. Often, we are interested in comparing two counterfactual scenarios to understand the impact of some change on AI capabilities.

Consider this thought experiment: imagine we are going to train a machine learning model on a dataset with four distinct units. Perhaps this is a "toy" scenario with four data points, or perhaps this is a big dataset with four distinctly bundled subsets. Now, let's imagine a grid where every possible combination of training objects appears as a row, every possible evaluation set appears as a column, and each cell records the performance for a given train/eval pairing. For our very small example with just four data objects, we can call them A, B, C, and D.

With this grid in mind, we can explore the most basic useful data counterfactual, [leave-one-out](https://proceedings.mlr.press/v70/koh17a.html). By comparing a row that includes one point with a matched row in which that point is missing, we can estimate how much that intervention changed a chosen outcome under the study's training and evaluation setup. A causal interpretation requires the training procedure, randomness, model choice, and evaluation plan to be controlled or modeled. From there the same comparison logic can be extended to groups, weights, synthetic replacements, corruptions, or coordinated withdrawal.

{{< memo-example leave-one-out-toy >}}

Very simply, we can imagine training an LLM with fiction books, science articles, and social media posts. If we train a matched second LLM without the science articles and compare prespecified outcomes, we are exploring a "no science articles" data counterfactual. Recent work on language-model data mixing explicitly studies development settings in which domains are added, removed, partitioned, or revised; for one primary example, see [Chen et al.'s Olmix framework](https://arxiv.org/abs/2602.12237).

## Training, evaluation, and trust counterfactuals

By imagining this large grid of all train-eval pairs, we can consider **row moves**, which we might formally describe like so (don't worry if this doesn't make sense yet!):

$$
f(D_T, D_E) \rightarrow f(D_T \setminus z, D_E)
$$

Here the evaluation target stays fixed while the training world changes; the trained outcome may change under the specified protocol. But we can also consider **column moves** within the grid:

$$
f(D_T, D_E) \rightarrow f(D_T, D_E \cup z)
$$

Here the trained model stays fixed while the evaluation world changes. This is an [evaluation counterfactual](/memo/evaluation-counterfactuals): the data object changes what we measure, which claims we trust, or which deployment decision we make.

And some questions are really changes to the upstream governance of data:

$$
f(D_T, D_E, G) \rightarrow f(D_T, D_E, G')
$$

Here $G$ stands for governance or trust state: a given data world might differ in licensing, evaluator independence, contamination controls, secrecy, and other facts that decide whether a train/eval comparison should count. This does not replace the original training-data frame. It adds a second layer on top of the grid.

{{< memo-example move-types >}}

## Post-training human feedback counterfactuals

There is another important pathway that does not fit perfectly inside the simple pretraining grid. In reinforcement learning-based post-training, human data can appear as demonstrations, preference rankings, critiques, rubrics, red-team traces, deployment feedback, or other signals that shape a reward model and a later policy update. In work such as [learning from human preferences](https://arxiv.org/abs/1706.03741), [summarization from human feedback](https://arxiv.org/abs/2009.01325), and [InstructGPT](https://arxiv.org/abs/2203.02155), the data object is not only "content the base model learned from." It is also a steering signal about which behavior should be reinforced.

That makes post-training data value partly sequential. A counterfactual might ask what happens if a community's preference data are removed from reward-model training, if red-team traces are reserved for evaluation instead of optimization, if a particular rubric is reweighted, or if deployment feedback is withheld until licensing or governance terms change. The same human data can have training value, evaluation value, safety value, and bargaining value depending on where it enters the pipeline.

The site now has a [human feedback value explorer](/post-training) for this flow. I think of it as a companion to the grid: the grid is still the cleanest toy picture for subset and evaluation worlds, while the post-training view is better for seeing how human data move through reward modeling, RL policy updates, auditing, and future access conditions.

## Why data counterfactuals are relevant to data leverage

This frame helps us connect topics that might seem distinct, for instance connecting [influence estimation](https://proceedings.mlr.press/v70/koh17a.html) and [Shapley values](https://proceedings.mlr.press/v97/ghorbani19c.html) with [data strikes](https://doi.org/10.1145/3308558.3313742) and data contribution campaigns. In ML, we often want to ask questions about removing a point, reweighting a group, fitting a scaling curve, etc. with the purpose of understanding our data and model. But counterfactuals can also be induced by strategic actors. Strikes, boycotts, contribution campaigns, and bargaining efforts all try to impact AI through data.

When people can withhold, redirect, or condition the supply of data, counterfactual measurements can inform analyses of [data leverage](https://www.microsoft.com/en-us/research/publication/data-leverage-a-framework-for-empowering-the-public-in-its-relationship-with-technology-companies/) and [algorithmic collective action](https://proceedings.mlr.press/v202/hardt23a.html). The inference has several links: measure technical dependence; establish feasible control; identify the operator's substitutes and outside options; model participation, coordination, and strategic response; then trace who receives any resulting surplus. Failure at any link can prevent a performance effect from becoming durable bargaining power. Some of the same ablation or contribution experiments used to understand a model can supply the first link. Provenance, [licensing](https://datalicenses.org/), contribution governance, and evaluation-use rights help determine which training rows and evaluation columns are legally, socially, or politically available.

## Why data counterfactuals are relevant to core AI

This frame is also deeply relevant to what many people would recognize as "core AI" questions. If we want to know how models improve with more data, which data are worth keeping, which examples are redundant, what happens when we swap in synthetic data, why a model fails on one slice but not another, which holdout points would change a model-selection decision, or how to remove the effect of a problematic subset, we are asking questions about what changes when the data world changes.

Data scaling, ablations, selection, influence estimation, [distillation](https://openreview.net/forum?id=Sy4lojC9tm), synthetic data substitution, privacy, poisoning, and unlearning are not the same task. They use different observers, guarantees, threat models, intervention families, and reference worlds. The grid is useful because each has a relationship to comparisons across data worlds, but the full method usually requires structure that the grid does not encode.

## The grid view

The site's main [interactive explorer](/grid) is a grid. The grid shows possible training sets as rows and possible evaluation slices as columns. Each cell records what happens if we train on that row and evaluate on that column.

Of course, nobody can completely fill out this "giant spreadsheet" (it's too computationally expensive). The grid can still be useful as a teaching model (and again, not a claim about how practitioners store or compute things).

The simplest way to use the grid is to name two main move types:

- **Row move**: same eval column, different train row. What if this data were used for training?
- **Column move**: same train row, different eval column. What if this data were used for evaluation?

As noted above, "governance moves" might also impact a large swathe of the board at once (e.g., a bunch of training data becomes illegal to use, or a bunch of eval data are proven to have been leaked).

{{< memo-example toy-grid >}}

Once that picture is in view, various literatures that usually live in separate boxes start to sit nearer to one another. Most notably, we can see the direct connection between valuation and attribution methods and collective action simulations. Collective action experiments typically ask what happens when people or institutions intentionally change the data-generating process itself: strikes, contribution campaigns, bargaining, provenance demands, licensing disputes, and other efforts to shift AI operators toward less favorable rows. We can also understand how various kinds of scaling and selection methods share "building blocks" with attribution and collective action.

Critically, the counterfactual grid is conceptually useful as a baseline for areas that do not directly try to measure data counterfactuals. For instance, we can find relevant data counterfactuals that map to specific scenarios involving differential privacy, [membership inference](https://arxiv.org/abs/2112.03570), machine unlearning, benchmark contamination, and secure holdouts.

On this site, we maintain a larger [collection of loosely related research](/collections) that's hosted via [semble.so](https://semble.so/) for easy updating and commenting.

## Some backstory

I found myself using the phrase "data counterfactuals" very frequently while teaching about data valuation, algorithmic collective action, and data scaling. I also found myself drawing various forms of the counterfactual grid, but in a much messier fashion. Students and colleagues would ask some version of: is "data counterfactuals" an actual field, area, or official term? Or is this just a convenient phrase for a bunch of neighboring ideas?

Variations of the term appear across the related data valuation and data attribution literature. In early work from Koh and Liang on influence functions, the authors frame their work like so: "we ask the counterfactual: what would happen if we did not have this training point, or if the values of this training point were changed slightly?" This work was influential in supporting a large body of follow up work that considers other data counterfactuals (touching on, for instance, Shapley values, groups of data, and more). Research on "datamodels" from [Ilyas et al.](https://proceedings.mlr.press/v162/ilyas22a.html) uses the term "dataset counterfactuals", and this [talk](https://simons.berkeley.edu/talks/andrew-ilyas-stanford-university-2025-04-03) from Ilyas uses the term "data counterfactuals" directly.

So in short -- it is a term that has been used, but it currently isn't the case that every work or technique that explores "data counterfactual scenarios" always bills itself as a "data counterfactual" paper.

A quick piece of context: Data Counterfactuals is part of a broader effort to externalize memos, reading maps, and working models relevant to data and AI policy. Other projects include a list of data licensing and preference-signaling mechanisms ([datalicenses.org](https://datalicenses.org/)), napkin math about training data ([exploringai.org](https://exploringai.org/)), and [datalevers.org](https://www.datalevers.org/). This site focuses on connections among data valuation, bargaining, evaluation, privacy, and neighboring computing research areas.

## Some limitations of the grid view

Of course, with this site we are not trying to claim these projects are all formally identical. There are many details that make the tasks and concepts different in important ways. It is important to understand the distinction between techniques that only explore counterfactuals over data that already exist, approaches that try to change the data available to an AI operator, and approaches that try to change the world itself.

In some cases, one carefully designed bank of subset experiments can support more than one analysis. Matched marginal comparisons across the required coalitions can be aggregated into Shapley-style values, while experiments across subset sizes can support subset-size response curves. Those outputs are not automatically full scaling laws, market values, or collective-action results: each interpretation still needs its own sampling design, utility definition, uncertainty analysis, and institutional assumptions.

Some related concepts require a more complex model than the simple "grid" presented in our explorer here. See more in the site's [papers collection](/collections).

- Training dynamics questions care about the specific sequence of training actions and not just set membership.
- Active learning and experimental design questions care about policies for acquiring the next point.
- Privacy, memorization, poisoning, backdoor work, and adversarial training might need a more detailed "state space" than one scalar per cell.
- Model collapse asks what happens when more and more rows are synthetic outputs of previous models.
- Strategic or performative settings care about feedback loops in which deploying the model changes the future data-generating process.

(If you're interested in adding more papers on these to the collection, or have ideas for extending the grid, please reach out!)

## An important distinction

One important distinction is between interventions over data an AI operator already has, interventions over what data an AI operator can get, and interventions over what data the world produces in the first place. Those are related, but they are not identical. Removing a point from an existing training set, bargaining over whether a platform can access future contributions, and organizing to change how people behave online can all be described in counterfactual terms, but they operate at different levels.

I think it is useful to name these as rough **types** of data counterfactuals:

- **Subset counterfactuals**: worlds over a fixed realized dataset. Here we remove, reweight, corrupt, repair, or average over subsets of data the operator already has. Leave-one-out, influence estimation, Shapley-style valuation, many unlearning baselines, and a lot of data selection work fit most naturally here.
- **Acquisition counterfactuals**: worlds in which the training set changes because new data become available, get labeled, or are intentionally contributed or withheld. Active learning, experimental design, data scaling, contribution campaigns, and bargaining over access fit more naturally in this bucket. The key question is not only "which existing point mattered?" but also "which next point or next source could move us to a better or worse row?"
- **Data-generating-process counterfactuals**: worlds in which incentives, governance, platforms, or model deployment change what data gets produced in the first place. Strategic withholding, performative effects, provenance fights, licensing disputes, and long-run shifts in online behavior belong more clearly here.

{{< memo-example counterfactual-scopes >}}

That taxonomy mostly describes training-side movement. A parallel evaluation-side taxonomy asks whether data are trainable, evaluable, both, reserved, or unavailable. The same object can have different value depending on whether it improves a model, tests a model, keeps a benchmark uncontaminated, or makes a benchmark credible to outsiders.

These labels are meant as working project language. But I think the distinction itself matters both technically and politically. Some methods only compare subsets of a fixed dataset. Others concern provenance, licensing, bargaining, and contribution governance, where the key question is which rows are available on acceptable terms. Still others involve feedback loops where deploying a model changes future behavior, and therefore changes the future data-generating process itself.

This also helps clarify an ambiguity around "adding" data. In a Shapley-style calculation, we often compare a subset $S$ to a nearby subset $S \cup \{i\}$. But if point $i$ was already one of the points in the fixed ground set under study, that is still a subset counterfactual, not yet an acquisition counterfactual in the stronger sense. Asking what happens if we acquire a genuinely new point, or gain access to a new source of data, is a different kind of move.

I think the data counterfactual frame is useful partly because it helps make these differences explicit rather than hiding them.

## Clarifying the "more out there" connections

A data ablation and a simulated data strike can instantiate the same technical subset-removal comparison. They are not the same social object: a real strike also depends on participation, coordination, rights, substitution, and institutional response. Some of the other connections in this memo need similar qualification.

One connection is to [differential privacy](https://doi.org/10.1007/11787006_1). Roughly, differential privacy bounds how distinguishable a randomized mechanism's outputs can be across adjacent datasets; it is not a guarantee about one sampled task-performance gap. [Machine unlearning](https://proceedings.mlr.press/v119/guo20c.html) also uses a removal reference world, but methods differ in whether they seek exact, certified, or empirical approximation to retraining without the removed data.

Other connections are maybe more familiar, but still useful to line up in one place. Data scaling asks what happens as we add more data. Data ablations ask what happens when we remove a subset. Selection and curation ask which rows are worth visiting in the first place. And a participant in a data market, someone arguing for data dividends, or someone involved in bargaining over data access is also asking a counterfactual question: what happens if this data are contributed, withheld, redirected, or licensed under different terms?

## Why build this site?

Mostly, I wanted a place where I could put the argument once and then build around it. The site now adds a [question-framing tool](https://datacounterfactuals.org/frame), [worked examples](https://datacounterfactuals.org/examples), a [toy explorer](https://datacounterfactuals.org/grid), a searchable [papers page](https://datacounterfactuals.org/collections), a [loose syllabus](https://datacounterfactuals.org/memo/loose-syllabus), and a more technical companion note on [formalisms](https://datacounterfactuals.org/memo/formalisms).

Feedback and contribution welcome!
