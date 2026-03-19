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

- show how cross-cutting the idea of "data counterfactuals" is (to name just a few relevant topics: data valuation, algorithmic collective action, data scaling, data selection, data poisoning, privacy, unlearning)
- make certain data counterfactual measurements easier to understand
- illustrate connections between technical and social data-centric work

A quick piece of context: the Data Counterfactuals site is part of a broader effort to create informative websites that externalize memos, spreadsheets, and insights that are relevant to various data and AI policy initiatives and discussions. Other projects include a list of data licensing and preference signaling mechanisms (datalicenses.org), napkin math about training data (exploringai.org), and a few more in the works (including a rework of datalevers.org). Of all these sites, Data Counterfactuals is, at present, a bit less broadly interesting than the others; the focus here is on trying to convince people who already might have an interest in data valuation, bargaining, data-centric approaches to privacy, and neighboring topics about undervalued connections between different computing research areas. A long-term goal is to make this site broadly accessible, but in short: if it doesn't seem too interesting yet, consider checking out the other sites listed above.

There are many reasons we might want to understand how a specific piece of data impacts an AI model. Perhaps we want to inspect particularly valuable data, pay people based on the impact of their data (though this is a tricky endeavor!), or check data for errors. Or perhaps a group of people want to withhold data for bargaining or protest. This web project grew out of discussions on data valuation, algorithmic collective action, data scaling, data selection, data poisoning, privacy, unlearning, and neighboring topics. Counterfactual questions about how data might change are foundational to all these areas, and so understanding various questions in terms of data counterfactuals can be practically and academically useful.

## What is a data counterfactual?

A **data counterfactual** is a scenario in which the AI training data for a model changes in some way. Often, we are interested in comparing two counterfactual scenarios to understand the impact of some change on AI capabilities.

Consider this thought experiment: imagine you are going to train a machine learning model on a very small dataset: let's say the dataset has just four units of data (or, if it seems implausible that we'd ever want to do this, we can imagine it's a big dataset with distinct bundled subsets). Now imagine a grid where every possible combination of training objects appears as a row, every possible evaluation set appears as a column, and each cell records the performance for a given train/eval pairing. For our very small example with just four data objects, we can call them A, B, C, and D. (Again, these could literally map to four single observations in a toy example, or map to four large datasets we are considering mixing.)

With this grid in mind, we can explore the most basic useful data counterfactual, "leave-one-out". By comparing a row that includes one point with the nearby row in which that point is missing, we can understand the impact (in a causal sense) of adding or removing that point. By computing the difference between these two cells, we can learn how much a given data point helped or hurt our model. From there the same logic can be extended to groups of points, weighting data points, replacing data with other synthetic data, corrupting certain examples, or coordinated withdrawal.

Very simply, we can imagine training an LLM with a bunch of fiction books, science articles, and social media posts. If we train a second LLM without the science articles and compare the performance, we are exploring the "no science articles" data counterfactual.

## Why this matters for data leverage

This frame helps us connect topics like Shapley values and data strikes. In ML, we often want to ask questions about removing a point, reweighting a group, estimating an influence score, fitting a scaling curve, etc. with the purpose of understanding our data and model. But counterfactuals can also be induced by strategic actors. Data strikes, boycotts, contribution campaigns, and bargaining efforts try to change what data the world actually produces, or what data an AI developer can access on acceptable terms.

When people can withhold, redirect, or condition the supply of data, data counterfactual measurement directly maps to governance power! In other words, the kind of experiments we'd want to run if we're just an ML researcher trying to make our model better (via data selection or other data-centric approaches) are the same experiments we'd want to run if we're trying to organize data-related collective action or set up an efficient data market. If we had a shared bank of results from such an experiment, those results would be useful to actors with a wide variety of interests and goals! Furthermore, this frame also makes it very clear where questions about provenance, licensing, and contribution governance directly determine which training rows are legally, socially, or politically available in the first place.

## The grid view

The site's main "interactive explorer" is a grid. The grid shows possible training sets as rows and possible evaluation slices as columns. Each cell records what happens if we train on that row and evaluate on that column.

Of course, nobody can completely fill out this "giant spreadsheet" (it's too computationally expensive). The grid can still be useful as a teaching model (and again, not a claim about how practitioners store or compute things).

Once that picture is in view, various literatures that usually live in separate boxes start to sit nearer to one another. Most notably, we can see the direct connection between valuation and attribution methods and collective action simulations. Collective action and leverage experiments typically ask what happens when people or institutions intentionally change the data-generating process itself: strikes, contribution campaigns, bargaining, provenance demands, licensing disputes, and other efforts to shift AI operators toward less favorable rows. We can also understand how various kinds of scaling and selection methods share "building blocks" with attribution and collective action.

Critically, the counterfactual grid is conceptually useful as a baseline for areas that do not directly try to measure data counterfactuals. For instance, we can find relevant data counterfactuals that map to specific scenarios involving differential privacy, membership inference, and machine unlearning.

On this site, we maintain a larger "loosely curated examples of generally related research" that's hosted via semble.so for easy updating and commenting.

## Some backstory

I found myself using the phrase "data counterfactuals" very frequently while teaching about data valuation, algorithmic collective action, and data scaling. I also found myself drawing various forms of the counterfactual grid, but in a much messier fashion. Students and colleagues would ask some version of: is "data counterfactuals" an actual field, area, or official term? Or is this just a convenient phrase for a bunch of neighboring ideas?

Variations of the term appear across the related data valuation and data attribution literature. In early work from Koh and Liang on influence functions, the authors frame their work like so: "we ask the counterfactual: what would happen if we did not have this training point, or if the values of this training point were changed slightly?" This work was influential in supporting a large body of follow up work that considers other data counterfactuals (touching on, for instance, Shapley values, groups of data, and more). Research on "datamodels" from [Ilyas et al.](https://proceedings.mlr.press/v162/ilyas22a.html) uses the term "dataset counterfactuals", and this [talk](https://simons.berkeley.edu/talks/andrew-ilyas-stanford-university-2025-04-03) from Ilyas uses the term "data counterfactuals" directly.

So in short -- it is a term that has been used, but it currently isn't the case that every work or technique that explores "data counterfactual scenarios" always bills itself as a "data counterfactual" paper.

## Some limitations

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

## Why build this site?

Mostly, I wanted a place where I could put the argument once and then build around it. If you are reading this on Substack, the site adds a toy explorer, a collections page, and a more technical companion note on [formalisms](https://datacounterfactuals.org/memo/formalisms).

Feedback and contribution welcome!
