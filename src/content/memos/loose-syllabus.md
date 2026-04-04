---
order: 2
title: "Loose Syllabus"
summary: "A suggested 10-week reading path through the main ideas around data counterfactuals, with two papers per week and an emphasis on sequence rather than completeness."
date: "2026-04-03T00:00:00.000Z"
visibility: public
type: shared_memo
---

This memo is not meant to be the one true canon. It is a deliberately short path through the literature for someone who wants a structured way into the area before reading the more technical [formalisms memo](/memo/formalisms).

The ordering matters more than the exact shortlist. The idea is to build a reader from "what changes when the training data change?" toward the neighboring questions that show up across valuation, scaling, diagnosis, privacy, unlearning, poisoning, provenance, and collective action.

Each week has two papers: one anchor and one bridge. As you read, keep asking the same four questions:

- What training world is changing?
- What is being held fixed?
- What outcome is being compared?
- Who gets to observe that outcome?

If you keep those questions in view, the later technical memo will feel much less like a pile of disconnected literatures.

## Week 1. Local data counterfactuals first

- Koh and Liang (2017), [Understanding Black-box Predictions via Influence Functions](https://proceedings.mlr.press/v70/koh17a.html)
- Ilyas et al. (2022), [Datamodels: Understanding Predictions with Data and Data with Predictions](https://proceedings.mlr.press/v162/ilyas22a.html)

Start with one paper that asks about the effect of a training point on a prediction, then jump to one that tries to learn many such dataset counterfactuals at once. This is the cleanest way to acquire the core reflex of the site: treat training-data changes as comparative objects rather than as background noise.

## Week 2. From influence to contribution accounting

- Jia et al. (2019), [Efficient Task-Specific Data Valuation for Nearest Neighbor Algorithms](https://www.research-collection.ethz.ch/handle/20.500.11850/395887)
- Ghorbani and Zou (2019), [Data Shapley: Equitable Valuation of Data for Machine Learning](https://proceedings.mlr.press/v97/ghorbani19c.html)

Week 1 is about local effect. Week 2 is about turning many counterfactual comparisons into a value assignment. Jia et al. is a good bridge from abstract contribution accounting to something computable, and Ghorbani and Zou makes the axiomatic game-theoretic picture explicit.

## Week 3. More data, less data, and the shape of scaling

- Kaplan et al. (2020), [Scaling Laws for Neural Language Models](https://arxiv.org/abs/2001.08361)
- Paul, Ganguli, and Dziugaite (2021), [Deep Learning on a Data Diet: Finding Important Examples Early in Training](https://proceedings.neurips.cc/paper/2021/hash/ac56f8fe9eea3e4a365f29f0f1957c55-Abstract.html)

Read these together to avoid a common mistake. Scaling papers can make it sound like the only important question is how performance moves when the dataset gets larger. Data-pruning work reminds us that *which* examples survive can matter almost as much as *how many* examples we keep.

## Week 4. Diagnosing datasets and synthesizing stand-ins

- Swayamdipta et al. (2020), [Dataset Cartography: Mapping and Diagnosing Datasets with Training Dynamics](https://aclanthology.org/2020.emnlp-main.746/)
- Wang et al. (2018), [Dataset Distillation](https://openreview.net/forum?id=Sy4lojC9tm)

These papers pair well because both ask what information the dataset is really carrying, but in different ways. Dataset cartography maps examples by how training treats them over time; dataset distillation asks whether a tiny synthetic surrogate can preserve the behavior of a much larger dataset.

## Week 5. Privacy as a neighboring-world guarantee

- Dwork (2006), [Differential Privacy](https://doi.org/10.1007/11787006_1)
- Shokri et al. (2017), [Membership Inference Attacks Against Machine Learning Models](https://ieeexplore.ieee.org/document/7958568)

This is the week where the "observer" in the formalism really matters. Differential privacy defines a bound on how distinguishable neighboring data worlds should be from the outside. Membership inference shows what it looks like when an attacker can, in fact, tell too much about whether a record was present.

## Week 6. Deletion, forgetting, and unlearning

- Ginart et al. (2019), [Making AI Forget You: Data Deletion in Machine Learning](https://papers.nips.cc/paper/8611-making-ai-forget-you-data-deletion-in-machine-learning)
- Bourtoule et al. (2021), [Machine Unlearning](https://ieeexplore.ieee.org/document/9519428)

Now move from privacy guarantees to operational deletion. Ginart et al. is a clear motivation piece for what it means to remove data after the fact. Bourtoule et al. shows a concrete systems design for making the comparison to a retrained-without-you world more computationally manageable.

## Week 7. Adversarial data interventions

- Biggio, Nelson, and Laskov (2012), [Poisoning Attacks against Support Vector Machines](https://icml.cc/2012/papers/880.pdf)
- Gu, Dolan-Gavitt, and Garg (2019), [BadNets: Evaluating Backdooring Attacks on Deep Neural Networks](https://ieeexplore.ieee.org/document/8685687)

The earlier weeks mostly treat data changes as something to measure, optimize, or constrain. This week treats them as something an adversary can weaponize. It is useful because it expands the imagination of what the transformation on the data can look like: not just deletion or reweighting, but crafted addition and corruption.

## Week 8. Provenance, corpus construction, and dependency

- Vincent et al. (2019), [Measuring the Importance of User-Generated Content to Search Engines](https://ojs.aaai.org/index.php/ICWSM/article/view/3248)
- Dodge et al. (2021), [Documenting Large Webtext Corpora: A Case Study on the Colossal Clean Crawled Corpus](https://aclanthology.org/2021.emnlp-main.98/)

This is the piece I thought was most missing on a second pass. If the project is partly about leverage over training data, it matters where that data came from, how dependent systems are on specific public substrates, and how badly we often document the composition of web-scale corpora. These papers make the jump from abstract counterfactual worlds to actual data sources, provenance problems, and documentation failures.

## Week 9. Data leverage and collective action

- Vincent et al. (2021), [Data Leverage: A Framework for Empowering the Public in its Relationship with Technology Companies](https://www.microsoft.com/en-us/research/publication/data-leverage-a-framework-for-empowering-the-public-in-its-relationship-with-technology-companies/)
- Hardt et al. (2023), [Algorithmic Collective Action in Machine Learning](https://proceedings.mlr.press/v202/hardt23a.html)

This week is where the site's social and strategic claims come into focus. The same kinds of counterfactual comparisons that matter for attribution and selection also matter for bargaining, withholding, and coordinated intervention. It should also read more concretely after the provenance week, because leverage depends not only on sensitivity to data changes but also on who can credibly supply, withdraw, or document those data in the first place.

## Week 10. Why any of this might matter economically

- Arrieta-Ibarra et al. (2018), [Should We Treat Data as Labor? Moving Beyond "Free"](https://www.aeaweb.org/articles?id=10.1257%2Fpandp.20181003)
- Jones and Tonetti (2020), [Nonrivalry and the Economics of Data](https://www.aeaweb.org/articles?id=10.1257%2Faer.20191330)

Finish with the papers that make the downstream stakes clearer. Once you have spent nine weeks looking at how model behavior depends on data, it becomes easier to read arguments about compensation, ownership, bargaining, and data markets without treating them as disconnected policy rhetoric.

## What this sequence is trying to do

The point of this syllabus is not to cover every relevant literature evenly. It is to make a particular shape visible:

- first, treat data changes as measurable counterfactual moves
- then, study ways of aggregating, pruning, diagnosing, documenting, or simulating those moves
- then, look at neighboring literatures where the same comparative object appears under different names
- finally, connect those measurements to leverage, governance, and economic questions

That is also why some perfectly good adjacent topics are not centered here. Fairness via data interventions, causality, active learning, meta-learning for example weighting, and model collapse all matter, but I think they make more sense after the sequence above has already clicked.

If you only have time for a shorter version, I would do Weeks 1, 2, 3, 5, 6, 8, and 9. That gives you the fastest route to the conceptual center of gravity for this site.

For a broader map after that, the [related areas and papers page](/collections) is the right place to wander.
