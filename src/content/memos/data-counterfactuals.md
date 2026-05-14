---
order: 1
title: "Introducing Data Counterfactuals"
summary: "A shared launch post and site memo arguing that many questions about value, data dividends, selection, privacy, poisoning, evaluation, and data leverage are really questions about what changes when data worlds change."
date: '2026-03-14T00:00:00.000Z'
visibility: public
type: shared_memo
homepageSections: 3
---

This is a short memo meant to explain the [datacounterfactuals.org](https://datacounterfactuals.org/) project and website. It will be cross-posted on the [Data Leverage Substack](https://dataleverage.substack.com/). The site exists to:

- show how cross-cutting the idea of "data counterfactuals" is (to name just a few relevant topics: [data valuation](https://proceedings.mlr.press/v89/jia19a.html), [data dividends](https://www.datadividends.org/), [algorithmic collective action](https://proceedings.mlr.press/v202/hardt23a.html), [data scaling](https://arxiv.org/abs/2001.08361), [data selection](https://neurips.cc/virtual/2024/tutorial/99530), [data poisoning](https://arxiv.org/abs/1206.6389), evaluation data, [privacy](https://www.microsoft.com/en-us/research/publication/differential-privacy/), [machine unlearning](https://arxiv.org/abs/1912.03817))
- make data counterfactual measurements easier to understand
- illustrate connections between technical and social data-centric work

There are many reasons we might want to understand how a specific piece of data impacts an AI system. Perhaps we want to inspect particularly valuable training data, reason about data dividends or other ways of paying people based on the impact of their data (though this is a tricky endeavor!), check data for errors, or decide what should be reserved for evaluation. Or perhaps a group of people want to withhold data for bargaining or protest. Counterfactual questions about how data might change are foundational to many pressing issues about the impact of AI on power concentration, knowledge work, information flow, and more, and so understanding various questions in terms of data counterfactuals is both practically and academically useful.

## What is a data counterfactual?

A **data counterfactual** is a scenario in which the data world around an AI system changes in some way. In the first version of this site, that mostly meant changes to training data. The next layer is broader: the evaluation set, permitted data uses, and the institutions that make a measurement trustworthy can also change. Often, we are interested in comparing two counterfactual scenarios to understand the impact of some change on AI capabilities, measurement, or confidence.

Consider this thought experiment: imagine you are going to train a machine learning model on a very small dataset: let's say the dataset has just four units of data (or, if it seems implausible that we'd ever want to do this, we can imagine it's a big dataset with distinct bundled subsets). Now imagine a grid where every possible combination of training objects appears as a row, every possible evaluation set appears as a column, and each cell records the performance for a given train/eval pairing. For our very small example with just four data objects, we can call them A, B, C, and D. (Again, these could literally map to four single observations in a toy example, or map to four large datasets we are considering mixing.)

With this grid in mind, we can explore the most basic useful data counterfactual, "[leave-one-out](https://arxiv.org/abs/1703.04730)." By comparing a row that includes one point with the nearby row in which that point is missing, we can understand the impact (in a causal sense) of adding or removing that point. By computing the difference between these two cells, we can learn how much a given data point helped or hurt our model. From there the same logic can be extended to groups of points, weighting data points, replacing data with other synthetic data, corrupting certain examples, or coordinated withdrawal.

Very simply, we can imagine training an LLM with a bunch of fiction books, science articles, and social media posts. If we train a second LLM without the science articles and compare the performance, we are exploring the "no science articles" data counterfactual. Researchers have indeed performed such experiments, for instance at non-profit institutions like [AI2](https://arxiv.org/abs/2602.12237) and for-profit companies like [Meta](https://www.businessinsider.com/meta-ai-llama-models-training-data-ablation-2025-4).

## Training, evaluation, and trust counterfactuals

The grid also makes a second move visible. Most of the familiar examples are **row moves**:

$$
f(D_T, D_E) \rightarrow f(D_T \setminus z, D_E)
$$

Here the evaluation target stays fixed while the training world changes. But we can also ask **column moves**:

$$
f(D_T, D_E) \rightarrow f(D_T, D_E \cup z)
$$

Here the trained model stays fixed while the evaluation world changes. This is an evaluation counterfactual: the data object changes what we measure, which claims we trust, or which deployment decision we make.

And some questions are really **institution moves**:

$$
f(D_T, D_E, G) \rightarrow f(D_T, D_E, G')
$$

Here $G$ stands for governance or trust state: provenance, licensing, evaluator independence, contamination controls, label process, secrecy, and other facts that decide whether a train/eval comparison should count. This does not replace the original training-data frame. It adds a second layer: the first version of the site focuses on changes to training data; the next layer asks what changes when the evaluation set, holdout institution, or permitted data use changes.

## Why data counterfactuals are relevant to data leverage

This frame helps us connect topics that might seem distinct, for instance connecting [influence estimation](https://proceedings.mlr.press/v70/koh17a.html) and [Shapley values](https://proceedings.mlr.press/v97/ghorbani19c.html) with [data strikes](https://doi.org/10.1145/3308558.3313742) and data contribution campaigns. In ML, we often want to ask questions about removing a point, reweighting a group, fitting a scaling curve, etc. with the purpose of understanding our data and model. But counterfactuals can also be induced by strategic actors. Strikes, boycotts, contribution campaigns, and bargaining efforts all try to impact AI through data.

When people can withhold, redirect, or condition the supply of data, data counterfactual measurement directly maps to [governance power](https://www.microsoft.com/en-us/research/publication/data-leverage-a-framework-for-empowering-the-public-in-its-relationship-with-technology-companies/)! In other words, the kind of experiments we'd want to run if we're just an ML researcher trying to make our model better (via data selection or other data-centric approaches) are the same experiments we'd want to run if we're trying to organize data-related collective action, design data dividend schemes, or set up an efficient data market. If we had a shared bank of results from such an experiment, those results would be useful to actors with a wide variety of interests and goals! Furthermore, this frame also makes it very clear where questions about provenance, [licensing](https://datalicenses.org/), contribution governance, and evaluation use rights directly determine which training rows and evaluation columns are legally, socially, or politically available in the first place.

## Why data counterfactuals are relevant to core AI

This frame is not only relevant to data leverage or governance. It is also deeply relevant to what many people would recognize as "core AI" questions. If we want to know how models improve with more data, which data are worth keeping, which examples are redundant, what happens when we swap in synthetic data, why a model fails on one slice but not another, which holdout points would change a model-selection decision, or how to remove the effect of a problematic subset, we are asking questions about what changes when the data world changes.

Data scaling, ablations, selection, influence estimation, [distillation](https://openreview.net/forum?id=Sy4lojC9tm), synthetic data substitution, privacy interventions, poisoning, and unlearning are not all the same task. But they do all involve moving between nearby training worlds and measuring how model behavior shifts as we move. The point is not to collapse everything into one technique. The point is to notice that many central ML questions are already, in a practical sense, data counterfactual questions.

## The grid view

The site's main "interactive explorer" is a grid. The grid shows possible training sets as rows and possible evaluation slices as columns. Each cell records what happens if we train on that row and evaluate on that column.

Of course, nobody can completely fill out this "giant spreadsheet" (it's too computationally expensive). The grid can still be useful as a teaching model (and again, not a claim about how practitioners store or compute things).

The simplest way to use the grid is to name three move types:

- **Row move**: same eval column, different train row. What if this data were used for training?
- **Column move**: same train row, different eval column. What if this data were used for evaluation?
- **Coupled move**: a data object shifts between train and eval roles. What if this object is reserved for holdout instead of training?

Once that picture is in view, various literatures that usually live in separate boxes start to sit nearer to one another. Most notably, we can see the direct connection between valuation and attribution methods and collective action simulations. Collective action experiments typically ask what happens when people or institutions intentionally change the data-generating process itself: strikes, contribution campaigns, bargaining, provenance demands, licensing disputes, and other efforts to shift AI operators toward less favorable rows. We can also understand how various kinds of scaling and selection methods share "building blocks" with attribution and collective action.

Critically, the counterfactual grid is conceptually useful as a baseline for areas that do not directly try to measure data counterfactuals. For instance, we can find relevant data counterfactuals that map to specific scenarios involving differential privacy, [membership inference](https://arxiv.org/abs/2112.03570), machine unlearning, benchmark contamination, and secure holdouts.

On this site, we maintain a larger "loosely curated examples of generally related research" that's hosted via [semble.so](https://semble.so/) for easy updating and commenting.

## Some backstory

I found myself using the phrase "data counterfactuals" very frequently while teaching about data valuation, algorithmic collective action, and data scaling. I also found myself drawing various forms of the counterfactual grid, but in a much messier fashion. Students and colleagues would ask some version of: is "data counterfactuals" an actual field, area, or official term? Or is this just a convenient phrase for a bunch of neighboring ideas?

Variations of the term appear across the related data valuation and data attribution literature. In early work from Koh and Liang on influence functions, the authors frame their work like so: "we ask the counterfactual: what would happen if we did not have this training point, or if the values of this training point were changed slightly?" This work was influential in supporting a large body of follow up work that considers other data counterfactuals (touching on, for instance, Shapley values, groups of data, and more). Research on "datamodels" from [Ilyas et al.](https://proceedings.mlr.press/v162/ilyas22a.html) uses the term "dataset counterfactuals", and this [talk](https://simons.berkeley.edu/talks/andrew-ilyas-stanford-university-2025-04-03) from Ilyas uses the term "data counterfactuals" directly.

So in short -- it is a term that has been used, but it currently isn't the case that every work or technique that explores "data counterfactual scenarios" always bills itself as a "data counterfactual" paper.

A quick piece of context: the Data Counterfactuals site is part of a broader effort to create informative websites that externalize memos, spreadsheets, and insights that are relevant to various data and AI policy initiatives and discussions. Other projects include a list of data licensing and preference signaling mechanisms (datalicenses.org), napkin math about training data ([exploringai.org](https://exploringai.org/)), and a few more in the works (including a rework of [datalevers.org](https://www.datalevers.org/)). Of all these sites, Data Counterfactuals is, at present, a bit less broadly interesting than the others; the focus here is on trying to convince people who already might have an interest in data valuation, bargaining, data-centric approaches to privacy, and neighboring topics about undervalued connections between different computing research areas. A long-term goal is to make this site broadly accessible, but in short: if it doesn't seem too interesting yet, consider checking out the other sites listed above.

## Some limitations of the grid view

Of course, with this site we are not trying to claim these projects are all formally identical. There are many details that make the tasks and concepts different in important ways. Very critically, it is important to understand the distinction between techniques that only explore counterfactuals over data that already exist, approaches that try to change the data available to an AI operator, and approaches that try to change the world itself.

In some cases, the grid helps us directly connect two concepts or literatures. For instance, running a large number of data strike experiments will give us a bunch of output data that can directly enable us to also compute certain scaling laws or Shapley values. That is, if we actually "fill out" the grid for a model, we can produce both valuation and collective action related results without running any more experiments!

Some related concepts require a more complex model than the simple "grid" presented in our explorer here. 

- Training dynamics and curriculum learning care about the specific sequence of training actions, not just set membership. 
- Active learning and experimental design care about policies for acquiring the next point. 
- Privacy, memorization, poisoning, backdoor work, and adversarial training typically need a more detailed state space than one scalar per cell.
- Meta-learning learns policies over rows rather than merely comparing fixed rows. 
- Model collapse asks what happens when more and more rows are synthetic outputs of previous models.
- Strategic or performative settings care about feedback loops in which deploying the model changes the future data-generating process.

(If you're interested in adding more papers on these to the collection, or have ideas for extending the grid, please reach out!)

## An important distinction

One important distinction is between interventions over data an AI operator already has, interventions over what data an AI operator can get, and interventions over what data the world produces in the first place. Those are related, but they are not identical. Removing a point from an existing training set, bargaining over whether a platform can access future contributions, and organizing to change how people behave online can all be described in counterfactual terms, but they operate at different levels.

I think it is useful to name these as rough **types** of data counterfactuals:

- **Subset counterfactuals**: worlds over a fixed realized dataset. Here we remove, reweight, corrupt, repair, or average over subsets of data the operator already has. Leave-one-out, influence estimation, Shapley-style valuation, many unlearning baselines, and a lot of data selection work fit most naturally here.
- **Acquisition counterfactuals**: worlds in which the training set changes because new data become available, get labeled, or are intentionally contributed or withheld. Active learning, experimental design, data scaling, contribution campaigns, and bargaining over access fit more naturally in this bucket. The key question is not only "which existing point mattered?" but also "which next point or next source could move us to a better or worse row?"
- **Data-generating-process counterfactuals**: worlds in which incentives, governance, platforms, or model deployment change what data gets produced in the first place. Strategic withholding, performative effects, provenance fights, licensing disputes, and long-run shifts in online behavior belong more clearly here.

That taxonomy mostly describes training-side movement. A parallel evaluation-side taxonomy asks whether data are trainable, evaluable, both, reserved, or unavailable. The same object can have different value depending on whether it improves a model, tests a model, keeps a benchmark uncontaminated, or makes a benchmark credible to outsiders.

These labels are meant as working project language, not as a claim that the literature has already settled on this exact vocabulary. But I think the distinction itself matters both technically and politically. Some methods only compare subsets of a fixed dataset. Others concern provenance, licensing, bargaining, and contribution governance, where the key question is which rows are available on acceptable terms. Still others involve feedback loops where deploying a model changes future behavior, and therefore changes the future data-generating process itself.

This also helps clarify an ambiguity around "adding" data. In a Shapley-style calculation, we often compare a subset $S$ to a nearby subset $S \cup \{i\}$. But if point $i$ was already one of the points in the fixed ground set under study, that is still a subset counterfactual, not yet an acquisition counterfactual in the stronger sense. Asking what happens if we acquire a genuinely new point, or gain access to a new source of data, is a different kind of move.

I think the data counterfactual frame is useful partly because it helps make these differences explicit rather than hiding them.

## Clarifying the "more out there" connections

I think that arguing that a data ablation experiment and data strike experiment are related is pretty uncontroversial. For this particular comparison, we can get pretty formal in showing that these are the same thing. However, some of the other connections I've "promised" may not feel so obvious.

One exciting connection is to differential privacy. In a very rough sense, differential privacy asks for a guarantee that the world with one person's data and the world without that person's data do not come apart too much. That is not the same thing as standard data valuation or attribution, but it is still very naturally understood as a constraint over nearby data counterfactuals. Machine unlearning has a similarly clear connection: the task is to move from a world where some data were included to a nearby world where they were not, without retraining from scratch if possible.

Other connections are maybe more familiar, but still useful to line up in one place. Data scaling asks what happens as we add more data. Data ablations ask what happens when we remove a subset. Selection and curation ask which rows are worth visiting in the first place. And a participant in a data market, someone arguing for data dividends, or someone involved in bargaining over data access is also asking a counterfactual question: what happens if this data are contributed, withheld, redirected, or licensed under different terms?

## Why build this site?

Mostly, I wanted a place where I could put the argument once and then build around it. If you are reading this on Substack, the site adds a [toy explorer](https://datacounterfactuals.org/grid), a [collections page](https://datacounterfactuals.org/collections), a [loose syllabus](https://datacounterfactuals.org/memo/loose-syllabus), and a more technical companion note on [formalisms](https://datacounterfactuals.org/memo/formalisms).

Feedback and contribution welcome!
