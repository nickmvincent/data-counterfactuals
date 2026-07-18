---
order: 3
title: "Loose Syllabus"
summary: "A lightweight open-course path through the site: readings, explorer prompts, and a few extension weeks."
date: "2026-04-03T00:00:00.000Z"
visibility: public
type: shared_memo
---

This is intentionally loose. The goal is to make the site usable as open course material without turning it into a full course platform. Each week has two readings and one simple site activity: read the relevant memo, use the grid or graph for a few minutes, and write down one counterfactual question that the formalism makes easier to ask.

> **Draft status:** The initial draft of this reading path was generated with AI assistance from the project's existing memos, explorers, and bibliography. It has not yet received final editorial or pedagogical review.

## A short route through the site

If you want a shorter introduction before using the weekly syllabus:

1. Read [Introducing Data Counterfactuals](/). For one comparison, name the intervention, reference world, outcome, and conditions held fixed.
2. Open the [grid](/grid). Make one row move and one column move, then explain what each difference means.
3. Open the [graph](/graph). Fix an evaluation slice, trace a path between training worlds, and distinguish a local edge from the whole path.
4. Read [Formalisms](/memo/formalisms). Compare two method families: what do they share, and which assumptions keep them distinct?
5. Browse the [paper collection](/collections). Choose one technical paper and one institutional or economic paper. Write a short synthesis that names both a connection and a claim the comparison does not support.

## Week 1. Local data counterfactuals first

- Koh and Liang (2017), [Understanding Black-box Predictions via Influence Functions](https://proceedings.mlr.press/v70/koh17a.html)
- Ilyas et al. (2022), [Datamodels: Understanding Predictions with Data and Data with Predictions](https://proceedings.mlr.press/v162/ilyas22a.html)
- Site activity: open the grid in Explore and LOO modes; compare one selected cell to its nearest row neighbor.

## Week 2. From influence to contribution accounting

- Jia et al. (2019), [Efficient Task-Specific Data Valuation for Nearest Neighbor Algorithms](https://www.research-collection.ethz.ch/handle/20.500.11850/395887)
- Ghorbani and Zou (2019), [Data Shapley: Equitable Valuation of Data for Machine Learning](https://proceedings.mlr.press/v97/ghorbani19c.html)
- Site activity: compare Shapley, Banzhaf, and Beta Shapley on the same evaluation column.

## Week 3. More data, less data, and the shape of scaling

- Kaplan et al. (2020), [Scaling Laws for Neural Language Models](https://arxiv.org/abs/2001.08361)
- Paul, Ganguli, and Dziugaite (2021), [Deep Learning on a Data Diet: Finding Important Examples Early in Training](https://proceedings.neurips.cc/paper/2021/hash/ac56f8fe9eea3e4a365f29f0f1957c55-Abstract.html)
- Site activity: use Scaling mode and describe what is lost when many rows collapse into one curve.

## Week 4. Diagnosing datasets and synthesizing stand-ins

- Swayamdipta et al. (2020), [Dataset Cartography: Mapping and Diagnosing Datasets with Training Dynamics](https://aclanthology.org/2020.emnlp-main.746/)
- Wang et al. (2018), [Dataset Distillation](https://openreview.net/forum?id=Sy4lojC9tm)
- Site activity: write one row move that removes data and one row move that replaces data.

## Week 5. Privacy as a neighboring-world guarantee

- Dwork (2006), [Differential Privacy](https://doi.org/10.1007/11787006_1)
- Shokri et al. (2017), [Membership Inference Attacks Against Machine Learning Models](https://ieeexplore.ieee.org/document/7958568)
- Site activity: use DP mode and inspect how one adjacent-row gap becomes a toy noise scale.

## Week 6. Deletion, forgetting, and unlearning

- Ginart et al. (2019), [Making AI Forget You: Data Deletion in Machine Learning](https://papers.nips.cc/paper/8611-making-ai-forget-you-data-deletion-in-machine-learning)
- Bourtoule et al. (2021), [Machine Unlearning](https://ieeexplore.ieee.org/document/9519428)
- Site activity: use Unlearning mode and explain why the retrain reference matters.

## Week 7. Adversarial data interventions

- Biggio, Nelson, and Laskov (2012), [Poisoning Attacks against Support Vector Machines](https://icml.cc/2012/papers/880.pdf)
- Gu, Dolan-Gavitt, and Garg (2019), [BadNets: Evaluating Backdooring Attacks on Deep Neural Networks](https://ieeexplore.ieee.org/document/8685687)
- Site activity: use Poison mode and compare the reference grid to the operator view.

## Week 8. Provenance, corpus construction, and dependency

- Vincent et al. (2019), [Measuring the Importance of User-Generated Content to Search Engines](https://ojs.aaai.org/index.php/ICWSM/article/view/3248)
- Dodge et al. (2021), [Documenting Large Webtext Corpora: A Case Study on the Colossal Clean Crawled Corpus](https://aclanthology.org/2021.emnlp-main.98/)
- Site activity: write one example where provenance changes which row is legally available.

## Week 9. Data leverage and collective action

- Vincent et al. (2021), [Data Leverage: A Framework for Empowering the Public in its Relationship with Technology Companies](https://www.microsoft.com/en-us/research/publication/data-leverage-a-framework-for-empowering-the-public-in-its-relationship-with-technology-companies/)
- Hardt et al. (2023), [Algorithmic Collective Action in Machine Learning](https://proceedings.mlr.press/v202/hardt23a.html)
- Site activity: use Group LOO mode and write down the coalition move in grid notation.

## Week 10. Why any of this might matter economically

- Arrieta-Ibarra et al. (2018), [Should We Treat Data as Labor? Moving Beyond "Free"](https://www.aeaweb.org/articles?id=10.1257%2Fpandp.20181003)
- Jones and Tonetti (2020), [Nonrivalry and the Economics of Data](https://www.aeaweb.org/articles?id=10.1257%2Faer.20191330)
- Site activity: split one object's value into training-side, evaluation-side, and trust-side value.

## Week 11. Evaluation data and secure holdouts

- Data Counterfactuals memo, [When the Column Changes](/memo/evaluation-counterfactuals)
- Srivastava et al. (2023), [Beyond the Imitation Game: Quantifying and extrapolating the capabilities of language models](https://arxiv.org/abs/2206.04615)
- Site activity: use Eval value mode and compare a column move to a row move on the same selected cell.

## Week 12. Trust institutions and data rights

- Mitchell et al. (2019), [Model Cards for Model Reporting](https://dl.acm.org/doi/10.1145/3287560.3287596)
- Gebru et al. (2021), [Datasheets for Datasets](https://doi.org/10.1145/3458723)
- Site activity: define a rights state for A, B, C, and D: trainable, evaluable, both, reserved, or unavailable.
