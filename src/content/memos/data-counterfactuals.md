---
order: 1
title: "Introducing Data Counterfactuals"
summary: "A shared launch post and site memo arguing that many questions about value, selection, privacy, poisoning, and data leverage are really questions about what changes when training data change."
date: '2026-03-14T00:00:00.000Z'
visibility: public
type: shared_memo
homepageSections: 3
---

This is a short memo meant to explain the datacounterfactuals.org project and website. It will be cross-posted on the Data Leverage Substack. The site exists to:

- show how cross-cutting the idea of data counterfactuals is (cutting across data valuation, algorithmic collective action, data scaling, data selection, data poisoning, privacy, unlearning, and more)
- make certain data counterfactual measurements easier to understand
- illustrate connections between technical and social data-centric work

A quick piece of context: the data counterfactuals site is part of a broader effort to create informative websites that externalize memos, spreadsheets, and insights that are relevant to various data and AI policy initiatives and discussions. Other projects include a list of data licensing and preference signaling mechanisms (datalicenses.org), napkin math about training data (exploringai.org), and a few more in the works (including a rework of datalevers.org). Of all these sites, the Data Counterfactuals site is, at present, a bit less broadly interesting; the focus here is more on trying to convince people who already might have an interest in data valuation, bargaining, data-centric approaches to privacy, and neighboring topics about connections between different computing research areas. The long-term goal is to make even this site broadly accessible, but in short: if it doesn't seem too interesting yet, consider checking out the other sites listed above.

There are many reasons we might want to understand how a specific piece of data impacts an AI model. Perhaps we want to inspect particularly valuable data, pay people based on the impact of their data (though this is a tricky endeavor!), or check data for errors. Or perhaps a group of people want to withhold data for bargaining or protest. This web project grew out of discussions on data valuation, algorithmic collective action, data scaling, data selection, data poisoning, privacy, unlearning, and neighboring topics. Counterfactual questions about how data might change are foundational to all these areas, and so understanding various questions in terms of data counterfactuals can be practically and academically useful.


## What is a data counterfactual?

A **data counterfactual** is a scenario in which the AI training data for a model changes in some way. Often, we are interested in comparing two counterfactual scenarios to understand the impact of some change on AI capabilities.

Consider this thought experiment: imagine you are going to train a machine learning model on a very small dataset: let's say the dataset has just four units of data (or, if it seems to implausible that we'd ever want to do this, we can imagine it's a big dataset with distinct bundlede subsets). Now imagine a grid where every possible combinaton of training objects appears as a row, every possible evaluation set appears as a column, and each cell records the performance a given train/eval pairing. For our very small example with just four data objects, we can call them A, B, C, and D. (Again, these could literally map to 4 single observations in a toy example, or map to four large datasets we are considering mixing.)

With this grid in mind, we can explore the most basic useful data counterfactual, "leave-one-out". By comparing a row that includes one point with the nearby row in which that point is missing, we can understand the impact (in a causal sense) or adding or removing that point. By computing the difference between these two cells, we can learn how much a given data point helped or hurt our model. From there the same logic can be extended to groups of removing or addding data points, weighting data points, replacing data with other synthetic data, corrupting certain examples, or coordinated withdrawal.

(Very simply, we imagine training an LLM with a bunch of fiction books, science articles, and social media posts. If we train a second LLM without the science articles and compare the performance, we are exploring the "no science articles" data counterfactual.

## Why the grid visualization/metaphor is useful

By considering the giant grid of "all training sets" and "all evaluation sets", ideas from across different subfields start to show up in one place. Various ways of defining data value can be understood as summaries over different columns, rows, and slices. We can understand data scaling patterns (how models get better as we get more data). Data selection problems become questions about which rows are worth visiting. As we will see in the full explorer, we can even begin to understand complex privacy interventions, poisoning attacks, and other types of counterfactuals. The grid connects technical, economic, and social data-centric work. Data markets and data-related collective action can be understood as changing which rows are available or attractive to an AI operator in the first place.

In real life, we often cannot actually compute the cell values for this whole grid. For this reason, there are active research agendas seeking to more efficiently estimate certain data values. These approaches can be thought of as sampling from this giant grid.

The grid is just one way to display the underlying notion of trying "list out all the data counterfactuals". We might also create a graph/network representation, where nodes are training data possibilities and edges show interventions (e.g., dropping a point). We have a WIP version of a "graph view on data counterfactuals" here as well.

## What the idea helps connect

To reiterate: the data counterfactuls concept, whether displayed as a grid, graph, or otherwise, is useful because it connects conversations that often happen in silos. A group of researchers, all with slightly different interests -- perhaps one cares about data value estimation for economic applications, another about differential privacy, another about data ablations for performance outcomes, and yet another is a labor advocate thinking about data leverage -- are all actually exploring neighborhoods of the same conceptual space.

Of course, with this site we are not trying to claim these projects are all formally identical. There are many details that make the tasks and concepts different in important ways. Very critically, it is very important to understand the distinction between techniques that only explore counterfactuals over data that already exist versus approaches that try to change the data available to an AI operator versus approaches that try to the change the world itself.

## Some backstory

I found myself using the phrase "data counterfactuals" very frequently while teaching about data valuation, algorithmic collective action, and data scaling. I also found myself drawing various forms of the counterfactual grid, but in a much messier fashion. Students and colleagues would ask some version of: is "data counterfactuals" an actual field, area, or official term? Or is this just a convenient phrase for a bunch of neighboring ideas?

Variations of the term appear across the related data valuation and data attribution literature. In early work from Koh and Liang on influence functions, the authors frame their work like so: "we ask the counterfactual: what would happen if we did not have this training point, or if the values of this training point were changed slightly?" This work was influential in supporting a large body of follow up work that considers other data counterfactuals (touching on, for instance, Shapley values, groups of data, and more). Research on "datamodels" from [Ilyas et al.](https://proceedings.mlr.press/v162/ilyas22a.html) uses the term "dataset counterfactuals", and this [talk](https://simons.berkeley.edu/talks/andrew-ilyas-stanford-university-2025-04-03) from Ilyas uses the term "data counterfactuals" directly. 

So in short -- it is a term that has been used, but it currently isn't the case that every work or technique that explores "data counterfactual scenarios" always bills itself as a "data counterfactual" paper.

A single "data counterfactual" explores some variant of the question: **what happens when the (training) data change?** Training is in parentheses here because we'll mostly focus on training, but we can also consider counterfactual changes to data that's used in other parts of the AI development process, and counterfactuals about what data is available to retrieve at runtime.

For now, let's say this: one change to data gives us one counterfactual scenario. Often we want to compare one or more different counterfactuals to learn something about the data (e.g., discover a data point that's very influential).

When we're training a machine learning model, all of the following "interventions" can cause model behavior to change:

- add more data
- pick a different subset of training data
- choose different data to collect or label
- replace real examples with synthetic, augmented, distilled, or condensed ones
- corrupt, poison, or backdoor the data
- reweight groups or later remove points through unlearning

Many topics of interest in modern ML study one of those comparisons. And, what we want to argue with this post/project is this: many topics that are not literally about computing leave-one-out counterfactuals or similar can still be understood in relation to data counterfactuals.

## A small example

Consider a toy world containing just four data objects: A, B, C, and D. We train a model on all four data objects. Then we train again after removing B. If the second model gets worse on tasks that depend on B, that nearby comparison tells us something about B's role in the original model. (However, that single comparison is not conclusive; we will still have many open questions about combinatorial interactions with other data points, model multiplicity, and other sources of variance.)

A single leave-one-out experiment is the smallest useful data counterfactual. From there the same logic extends to group leave-one-out, fixed-size subsets, synthetic replacements, corrupted examples, withheld data, or coordinated withdrawal. Data Shapley and related semivalues such as Banzhaf value and Beta Shapley aggregate many nearby comparisons rather than trusting any single row pair, while machine unlearning asks how to move from one row to another efficiently after a removal request.

## Why this matters for data leverage

One reason I keep coming back to this frame is that it helps us easily connect topics like Shapley values and data strikes. In ML, we often want to ask questions about removing a point, reweighting a group, estimating an influence score, fitting a scaling curve, etc. with the purpose of understanding our data and model. But counterfactuals can also be induced by strategic actors. Data strikes, boycotts, contribution campaigns, and bargaining efforts try to change what data the world actually produces, or what data an AI developer can access on acceptable terms.

When people can withhold, redirect, or condition the supply of data, data counterfactual measurement directly maps to governance power! In other words, the kind of experiments we'd want to run if we're just an ML researcher trying to make our model better (via data selection or other data-centric approaches) are the same experiments we'd want to run if we're trying to organize data-related collective action or set up an efficient data market. If we had a shared bank of results from such an experiment, those results would be useful to actors with a wide variety of interests and goals! Furthermore, this frame also makes it very clear where questions about provenance, licensing, and contribution governance directly determine which training rows are legally, socially, or politically available in the first place.

## The grid view

The site's main "interactive explorer" is a grid. The grid shows possible training sets as rows and possible evaluation slices as columns. Each cell records what happens if we train on that row and evaluate on that column.

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
