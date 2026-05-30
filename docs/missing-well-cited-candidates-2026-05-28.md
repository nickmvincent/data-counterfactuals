# Missing Well-Cited Paper Candidates

Date: 2026-05-28

Basis: exact-title diff against `tmp/semble-cache.json` generated at `2026-05-28T23:15:53.149Z`, plus source-page spot checks and rough OpenAlex cited-by counts fetched on 2026-05-28. Citation counts are directional only.

## Strong Adds

These are the most obvious missing anchors relative to the current shelves.

| Shelf | Candidate | Signal | Why it is obvious |
| --- | --- | ---: | --- |
| active learning | [Deep Bayesian Active Learning with Image Data](https://proceedings.mlr.press/v70/gal17a.html), Gal, Islam, Ghahramani, ICML 2017 | ~579 | Deep-learning active learning anchor; the current shelf jumps from classic AL to BADGE without this bridge. |
| augmentation and curriculum | [Improved Regularization of Convolutional Neural Networks with Cutout](https://arxiv.org/abs/1708.04552), DeVries, Taylor, arXiv 2017 | ~2,721 | Basic data-augmentation primitive, especially natural beside mixup, CutMix, AutoAugment, and RandAugment. |
| augmentation and curriculum | [Manifold Mixup: Better Representations by Interpolating Hidden States](https://proceedings.mlr.press/v97/verma19a.html), Verma et al., ICML 2019 | ~477 | Direct follow-on to mixup and a good representation-level augmentation bridge. |
| data provenance and source attribution | [Data Statements for Natural Language Processing](https://aclanthology.org/Q18-1041.pdf), Bender, Friedman, TACL 2018 | ~796 | Dataset documentation anchor that pairs naturally with Datasheets for Datasets. |
| data provenance and source attribution | [Model Cards for Model Reporting](https://research.google/pubs/pub48120/), Mitchell et al., FAccT 2019 | ~1,614 | Model-side documentation anchor; useful counterpart to dataset/source documentation. |
| distillation | [FitNets: Hints for Thin Deep Nets](https://arxiv.org/abs/1412.6550), Romero et al., ICLR 2015 | ~2,033 | Canonical knowledge-distillation follow-up after Hinton et al.; the current shelf is too thin without it. |
| fairness via data interventions | [Fairness Through Awareness](https://research.ibm.com/publications/fairness-through-awareness), Dwork et al., ITCS 2012 | ~3,331 | Foundational fairness objective that explains several later data/intervention ideas. |
| fairness via data interventions | [Equality of Opportunity in Supervised Learning](https://papers.neurips.cc/paper/6374-equality-of-opportunity-in-supervised-learning), Hardt, Price, Srebro, NeurIPS 2016 | ~1,915 | Canonical post-processing/intervention paper; very visible omission from this shelf. |
| membership inference | [The Secret Sharer](https://www.usenix.org/conference/usenixsecurity19/presentation/carlini), Carlini et al., USENIX Security 2019 | ~505 | Memorization/extraction anchor between membership inference and training-data exposure. |
| membership inference | [Comprehensive Privacy Analysis of Deep Learning](https://arxiv.org/abs/1812.00910), Nasr, Shokri, Houmansadr, IEEE S&P 2019 | ~1,536 | Major white-box inference/privacy attack paper; complements Shokri and Carlini. |
| poisoning | [Poison Frogs! Targeted Clean-Label Poisoning Attacks on Neural Networks](https://papers.neurips.cc/paper/7849-poison-frogs-targeted-clean-label-poisoning-attacks-on-neural-networks), Shafahi et al., NeurIPS 2018 | ~249 OpenAlex, third-party pages report higher | Clean-label poisoning anchor; highly relevant to scraped-data threat models. |
| poisoning | [How To Backdoor Federated Learning](https://proceedings.mlr.press/v108/bagdasaryan20a), Bagdasaryan et al., AISTATS 2020 | ~705 | Obvious federated/model-poisoning bridge; current poisoning shelf is mostly centralized/data-level. |
| training dynamics | [A Closer Look at Memorization in Deep Networks](https://arxiv.org/abs/1706.05394), Arpit et al., ICML 2017 | ~654 | Canonical memorization/training-dynamics bridge before example forgetting and data cartography. |
| training dynamics | [Understanding Deep Learning Requires Rethinking Generalization](https://research.google/pubs/pub45820), Zhang et al., ICLR 2017 | ~1,091 | Foundational random-label/memorization result; belongs beside training dynamics and scaling/generalization. |
| user-generated content | [The Pile: An 800GB Dataset of Diverse Text for Language Modeling](https://arxiv.org/abs/2101.00027), Gao et al., arXiv 2020 | ~484 | Web/text-corpus anchor; obvious next to C4, LAION, Wiki-40B, and documentation work. |
| user-generated content | [Deduplicating Training Data Makes Language Models Better](https://aclanthology.org/2022.acl-long.577/), Lee et al., ACL 2022 | ~252 | Directly about data curation quality and repeated web text; strong bridge to memorization/source attribution. |

## Add If Broadening

These are very well-cited, but the fit depends on how broad the shelf should be.

| Shelf | Candidate | Signal | Fit note |
| --- | --- | ---: | --- |
| meta-learning | [Model-Agnostic Meta-Learning for Fast Adaptation of Deep Networks](https://proceedings.mlr.press/v70/finn17a), Finn, Abbeel, Levine, ICML 2017 | ~5,772 | If `meta-learning` means meta-learning generally, this is mandatory. If it means learned data curation/reweighting, it may be too broad. |
| scaling laws / user-generated content | [Language Models are Few-Shot Learners](https://proceedings.neurips.cc/paper_files/paper/2020/hash/1457c0d6bfcb4967418bfb8ac142f64a-Abstract.html), Brown et al., NeurIPS 2020 | ~3,029 | Obvious scaling/data-scale anchor, but it may make the shelf feel more like general LLM scaling unless framed around web-corpus scale and contamination. |
| data provenance / user-generated content | [On the Dangers of Stochastic Parrots](https://dl.acm.org/doi/10.1145/3442188.3445922), Bender et al., FAccT 2021 | not reliably fetched | Very visible data/documentation/curation critique. Good fit if the shelf includes sociotechnical dataset risk, weaker if it stays strictly source-attribution methods. |
| causality | [Elements of Causal Inference](http://www.oapen.org/search?identifier=1004045), Peters, Janzing, Scholkopf, 2017 | ~824 | Strong modern causal-learning anchor, but the current causality shelf is already foundations-heavy. |
| causality | Causal Inference in Statistics: A Primer, Pearl, Glymour, Jewell, 2016 | ~1,318 | Good pedagogical anchor, but may duplicate Pearl's `Causality` unless the shelf is meant to be teachable rather than minimal. |

## Lower-Priority But Plausible

- [BatchBALD: Efficient and Diverse Batch Acquisition for Deep Bayesian Active Learning](https://arxiv.org/abs/1906.08158), Kirsch, van Amersfoort, Gal, 2019: good if expanding active learning beyond one deep Bayesian anchor.
- [Born Again Neural Networks](https://arxiv.org/abs/1805.04770), Furlanello et al., 2018: good distillation follow-up after FitNets.
- [Data Cards: Purposeful and Transparent Dataset Documentation for Responsible AI](https://dl.acm.org/doi/10.1145/3531146.3533231), Pushkarna et al., FAccT 2022: newer and useful, but less canonical than Datasheets/Data Statements/Model Cards.
- [Machine Unlearning: A Survey](https://dl.acm.org/doi/10.1145/3603620), Xu et al., ACM Computing Surveys 2023: good survey candidate, though the unlearning shelf already has a solid primary-paper spine.
- [CCNet: Extracting High Quality Monolingual Datasets from Web Crawl Data](https://arxiv.org/abs/1911.00359), Wenzek et al., 2019: good web-corpus cleaning bridge if user-generated content becomes a curation shelf.

## Fastest Balancing Move

For collection balance, the highest-impact additions would be:

1. Add `Deep Bayesian Active Learning with Image Data` to `active learning`.
2. Add `Cutout` and `Manifold Mixup` to `augmentation and curriculum`.
3. Add `Data Statements` and `Model Cards` to `data provenance and source attribution`.
4. Add `FitNets` to `distillation`.
5. Add `Fairness Through Awareness` and `Equality of Opportunity` to `fairness via data interventions`.
6. Add `Poison Frogs` and `How To Backdoor Federated Learning` to `poisoning`.
7. Add `A Closer Look at Memorization` and `Rethinking Generalization` to `training dynamics`.
8. Add `The Pile` and `Deduplicating Training Data Makes Language Models Better` to `user-generated content`.
