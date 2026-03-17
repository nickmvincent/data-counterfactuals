---
order: 3
title: "Glossary"
summary: "Working definitions for the key terms used across the memo, explorer, and related areas and papers page."
date: "2026-03-12T00:00:00.000Z"
visibility: public
type: glossary
---

Use this when you want a quick definition without leaving the thread of the argument. The entries are short on purpose: enough to keep the site legible without turning the glossary into a second, heavier memo.

These are working definitions for this project. They are meant to make the site easier to navigate, not to settle contested terminology across the entire literature.

## Terms

### Active learning

Choosing which data points to label next under a limited labeling budget. In grid language, it is a strategy for deciding which rows become available for training. Example link: [Settles (2009)](https://burrsettles.com/pub/settles.activelearning.pdf).

### Adversarial training

Training on adversarially perturbed examples so the model becomes more robust to those attacks at test time. In grid terms, it deliberately changes the training row to improve performance under hostile evaluation slices. Example link: [Madry et al. (2018)](https://arxiv.org/abs/1706.06083).

### Backdoor attack

A type of data poisoning where a trigger pattern causes the model to misclassify inputs containing that trigger, while behaving normally otherwise. Example link: [Gu et al. (2019)](https://arxiv.org/abs/1708.06733).

### Bargaining

Negotiation over data supply, access, compensation, or terms of use between data creators and AI operators. In this project, bargaining matters because it can change which training rows are feasible, affordable, or politically acceptable. Example link: [Vincent et al. (2021)](https://www.microsoft.com/en-us/research/publication/data-leverage-a-framework-for-empowering-the-public-in-its-relationship-with-technology-companies/).

### Banzhaf value

Another rule for valuing data points by asking how much they help across many possible subsets. Compared with Shapley-style methods, it uses a simpler averaging rule over those subsets. Example link: [Wang and Jia (2023)](https://proceedings.mlr.press/v206/wang23e.html).

### Beta Shapley

A version of Data Shapley that puts more or less emphasis on different subset sizes. In grid terms, it changes which kinds of row comparisons matter most when you assign value to data. Example link: [Kwon and Zou (2022)](https://proceedings.mlr.press/v151/kwon22a.html).

### Coreset

A small subset of training data that approximates training on the full dataset. The goal is to find a much smaller row in the grid that lands in roughly the same performance region. Example link: [Sener and Savarese (2018)](https://openreview.net/forum?id=H1aIuk-RW).

### Contribution campaign

Coordinated effort to add, label, or redirect data so model behavior shifts in a desired direction. It is the constructive counterpart to a data strike: a move toward more favorable rows rather than less favorable ones. Example link: [Vincent et al. (2019)](https://dl.acm.org/doi/10.1145/3308558.3313742).

### Curriculum learning

Training on examples in a meaningful order, often from easy to hard. It changes how you move through the grid over time, not just which row you end on. Example link: [Bengio et al. (2009)](https://dl.acm.org/doi/10.1145/1553374.1553380).

### Data augmentation

Creating synthetic variations of training data such as crops, rotations, or noise. It effectively adds nearby rows to the grid. Example link: [Zhang et al. (2018)](https://arxiv.org/abs/1710.09412).

### Data cartography

Mapping examples by training dynamics such as confidence and variability. The resulting plots are often called data maps. They help surface easy, ambiguous, or potentially mislabeled regions of a dataset. Example link: [Swayamdipta et al. (2020)](https://aclanthology.org/2020.emnlp-main.746/).

### Data maps

Plots from data cartography that place examples according to training dynamics like confidence and variability. Example link: [Swayamdipta et al. (2020)](https://aclanthology.org/2020.emnlp-main.746/).

### Data counterfactual

A project-level umbrella term for "what if" questions about training data. What would happen to model performance if we trained on different data? The grid visualization is a teaching model for organizing those questions, not something we literally enumerate in real systems. This usage is inspired by the broader counterfactual tradition, but it is not meant as a claim that this phrase is already a standard textbook term in ML. Example links: the [main memo](/memo/data-counterfactuals) and [Pearl (2009)](https://doi.org/10.1017/CBO9780511803161).

### Data leverage

The power that data creators have over AI systems by virtue of controlling training data. Performance drops from withholding or degrading data are one source of leverage, but coordination, substitutability, and bargaining position also matter. Example link: [Vincent et al. (2021)](https://www.microsoft.com/en-us/research/publication/data-leverage-a-framework-for-empowering-the-public-in-its-relationship-with-technology-companies/).

### Data poisoning

Deliberately corrupting training data to cause targeted model failures. Expands the grid dramatically; every possible perturbation creates new rows with potentially different outcomes. Example link: [Biggio et al. (2012)](https://arxiv.org/abs/1206.6389).

### Data Shapley

A method for assigning value to each training point based on its average marginal contribution across all possible subsets. Borrowed from cooperative game theory. Computationally expensive but theoretically principled. Example link: [Ghorbani and Zou (2019)](https://proceedings.mlr.press/v97/ghorbani19c.html).

### Data strike

Coordinated withholding of data by creators to reduce model performance and exert leverage over AI operators. A strategic move to a less favorable row in the grid. Example link: [Vincent et al. (2019)](https://dl.acm.org/doi/10.1145/3308558.3313742).

### Dataset distillation

Learning a tiny synthetic training set that produces similar downstream behavior to a much larger real dataset. In grid terms, it tries to replace a large row neighborhood with a compact synthetic stand-in. Example link: [Wang et al. (2018)](https://openreview.net/forum?id=Sy4lojC9tm).

### Dataset condensation

Often used nearly interchangeably with dataset distillation: compressing a large dataset into a much smaller synthetic or carefully selected one that preserves downstream behavior as much as possible. Example link: [Wang et al. (2018)](https://openreview.net/forum?id=Sy4lojC9tm).

### Differential privacy

A mathematical privacy guarantee saying that an algorithm's output should not change much when any one data point is added or removed. In this project's terms, it limits how distinguishable neighboring training rows are from the outside; it does not directly guarantee good utility or broad robustness. Example link: [Dwork (2006)](https://www.microsoft.com/en-us/research/publication/differential-privacy/).

### Evaluation set

The data used to measure model performance. In the grid, each column represents one possible evaluation point or slice. Example link: the [grid](/grid).

### Experimental design

Choosing which data to collect, label, or test so the resulting evidence is maximally informative under a budget. It overlaps with active learning, but the emphasis is often on information gain, uncertainty reduction, or causal identification rather than only downstream accuracy. Example link: [Settles (2009)](https://burrsettles.com/pub/settles.activelearning.pdf).

### Forgetting event

A moment during training when an example flips from correctly classified to incorrectly classified. Many forgetting events can signal hard, noisy, or atypical data points. Example link: [Toneva et al. (2019)](https://www.microsoft.com/en-us/research/publication/an-empirical-study-of-example-forgetting-during-deep-neural-network-learning/).

### Influence function

A technique for estimating how much a single training example affects a model's predictions, without retraining. Approximates what would happen if you removed or upweighted that point. Example link: [Koh and Liang (2017)](https://proceedings.mlr.press/v70/koh17a.html).

### Leave-one-out

The simplest data counterfactual: compare performance with and without a single data point. In the grid, this means comparing two rows that differ by exactly one point. Example link: [Wang and Jia (2023)](https://proceedings.mlr.press/v206/wang23e.html).

### Machine unlearning

Efficiently updating a model as if a data point was never in the training set, moving from one row to another without full retraining. Example link: [Bourtoule et al. (2021)](https://arxiv.org/abs/1912.03817).

### Membership inference

Trying to determine whether a specific example was in a model's training set by exploiting differences between seen and unseen data. Example link: [Carlini et al. (2022)](https://arxiv.org/abs/2112.03570).

### Memorization

When a model retains unusually specific information about parts of its training data, sometimes including rare or sensitive details. Memorization can coexist with genuine generalization, but it raises the risk of extraction or privacy leakage. Example link: [Carlini et al. (2021)](https://www.usenix.org/conference/usenixsecurity21/presentation/carlini-extracting).

### Representer point

A training example flagged as especially helpful for explaining a prediction. It plays a role similar to influence functions, but comes from a different mathematical route. Example link: [Yeh et al. (2018)](https://proceedings.neurips.cc/paper/2018/hash/8a7129b8f3edd95b7d969dfc2c8e9d9d-Abstract.html).

### Reweighing

A fairness-oriented preprocessing method that changes how much different examples or groups count during training. In grid language, it changes the row before learning starts. Example link: [Kamiran and Calders (2012)](https://link.springer.com/article/10.1007/s10115-011-0463-8).

### Scaling law

An empirical relationship describing how model performance changes with data size, model size, or compute. In the grid metaphor, data scaling laws look like summaries over rows grouped by size, but the broader literature is not limited to data alone. Example link: [Kaplan et al. (2020)](https://arxiv.org/abs/2001.08361).

### Training set

The data used to train a model. In the grid, each row represents one possible training set. Example link: the [grid](/grid).

### TracIn

A training-data attribution method that estimates which examples were influential by tracking gradient similarity across training checkpoints. It is another way of asking which parts of the row most affected a prediction or outcome, but with a different approximation strategy from classical influence functions. Example link: [Pruthi et al. (2020)](https://arxiv.org/abs/2002.08484).
