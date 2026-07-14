# Fact-check and reference audit

Date: 2026-07-09

## Scope

This audit covers the authored explanatory pages, the interactive framing material, and the Semble-backed papers collection. It checks citation metadata, link reachability, close paraphrases of cited work, and whether the interface distinguishes measured results from examples or hypotheses.

This is not a systematic literature review. A reachable link and correct metadata do not, by themselves, establish that a paper is the best source for a claim. The site now says this explicitly on the Papers page.

## Corrections made in this pass

- Replaced an unrelated DOI previously attached to *Holistic Evaluation of Language Models* with the paper's [arXiv record](https://arxiv.org/abs/2211.09110).
- Replaced the BIG-bench forum URL with its stable [arXiv record](https://arxiv.org/abs/2206.04615).
- Corrected the title of *Learning to Summarize with Human Feedback* and linked the site's post-training claims to the [NeurIPS paper](https://proceedings.neurips.cc/paper/2020/hash/1f89885d556929e98d3ef9b86448f951-Abstract.html).
- Replaced a broken course link and a dead GitHub Discussions link.
- Replaced a secondary news citation about model training data with the [primary OLMo 3 data paper](https://arxiv.org/abs/2602.12237).
- Qualified claims that treated leave-one-out retraining as automatically causal, data valuation as bargaining power, or ablation results as direct evidence about real collective action.
- Clarified that influence functions are infinitesimal approximations, that machine unlearning has exact, certified, and empirical variants, and that the evaluation weighting shown on the site is a project choice rather than a universal standard.
- Added primary references for differential privacy, certified removal, benchmark contamination, model cards, datasheets, HELM, Beta Shapley, and RLHF limitations where the prose previously lacked a sufficiently close source.

## Automated and manual results

- **Semble collection:** 149 unique references across 21 areas and 156 collection memberships. No record is missing a title, author list, year, or venue; no duplicate title or rendered URL was detected.
- **Rendered paper links:** 149 of 149 resolved. Four publisher pages returned automated-access blocks (HTTP 403) rather than missing-page responses; their identifiers and destinations were manually checked.
- **Authored-page links:** 85 of 85 external citation and resource URLs resolved after the two broken links were repaired.
- **DOI metadata:** 50 non-arXiv DOI-backed records were compared with Crossref. Forty-seven matched title, year, and author data exactly. Three matched year and authors but differed only because Crossref shortened a title or retained a chapter number: Le Métayer's *Privacy by Design*, Shapley's *A Value for n-Person Games*, and Vincent et al.'s *Data Leverage*.
- **Claim spot checks:** central descriptions were checked against the primary pages for [influence functions](https://proceedings.mlr.press/v70/koh17a.html), [Data Shapley](https://proceedings.mlr.press/v97/ghorbani19c.html), [certified removal](https://proceedings.mlr.press/v119/guo20c.html), [algorithmic collective action](https://proceedings.mlr.press/v202/hardt23a.html), [Data Leverage](https://www.microsoft.com/en-us/research/publication/data-leverage-a-framework-for-empowering-the-public-in-its-relationship-with-technology-companies/), [Beta Shapley](https://proceedings.mlr.press/v151/kwon22a.html), and the [RLHF limitations survey](https://arxiv.org/abs/2307.15217).

The machine-readable results are in `tmp/semble-audit-report.json`, `tmp/crossref-audit-report.json`, and `tmp/authored-link-audit-report.json`.

## Remaining metadata limitations

- Eighty-five collection records do not carry an explicit DOI in the local metadata. Many are arXiv papers, proceedings pages, reports, or other works for which the canonical URL is appropriate, so this is a DOI-coverage gap rather than 85 errors. DOI enrichment should be done selectively.
- Forty-six records currently use BibTeX's broad `misc` type. Export remains valid, but more specific entry types would improve bibliography quality where authoritative venue metadata is available.
- Some source-card URLs intentionally point to preprints while the rendered paper link points to a final publication. These should be normalized gradually, preferring the final archival record while retaining a usable open-access route when possible.
- The mathematical formalisms memo remains labeled as an AI-assisted draft. Its references and qualifications were checked, but it still merits domain-expert review before being treated as a formal survey.

## Possibly missing references

These are coverage recommendations, not corrections. They were identified by comparing the current shelves with canonical, highly cited anchors and by examining unusually thin collections.

### Highest-priority candidates

- **Active learning:** [Deep Bayesian Active Learning with Image Data](https://proceedings.mlr.press/v70/gal17a.html).
- **Augmentation and curriculum:** [Improved Regularization of Convolutional Neural Networks with Cutout](https://arxiv.org/abs/1708.04552) and [Manifold Mixup](https://proceedings.mlr.press/v97/verma19a.html).
- **Data provenance:** [Data Statements for Natural Language Processing](https://aclanthology.org/Q18-1041/) and [Model Cards for Model Reporting](https://research.google/pubs/model-cards-for-model-reporting/).
- **Distillation:** [FitNets](https://arxiv.org/abs/1412.6550).
- **Fairness via interventions:** [Fairness Through Awareness](https://research.ibm.com/publications/fairness-through-awareness) and [Equality of Opportunity in Supervised Learning](https://proceedings.neurips.cc/paper/2016/hash/9d2682367c3935defcb1f9e247a97c0d-Abstract.html).
- **Membership inference and memorization:** [The Secret Sharer](https://www.usenix.org/conference/usenixsecurity19/presentation/carlini) and [Comprehensive Privacy Analysis of Deep Learning](https://arxiv.org/abs/1812.00910).
- **Poisoning:** [Poison Frogs!](https://proceedings.neurips.cc/paper/2018/hash/22722a343513ed45f14905eb07621686-Abstract.html) and [How To Backdoor Federated Learning](https://proceedings.mlr.press/v108/bagdasaryan20a.html).
- **Training dynamics:** [A Closer Look at Memorization in Deep Networks](https://proceedings.mlr.press/v70/arpit17a.html) and [Understanding Deep Learning Requires Rethinking Generalization](https://research.google/pubs/understanding-deep-learning-requires-rethinking-generalization/).
- **Web and user-generated data:** [The Pile](https://arxiv.org/abs/2101.00027) and [Deduplicating Training Data Makes Language Models Better](https://aclanthology.org/2022.acl-long.577/).

### Structural gaps

- The **reinforcement learning for data valuation** shelf has one paper; **meta-learning** and **model collapse** have three each. They need either a clearer deliberately-narrow description or more coverage.
- **Semivalues** has 26 papers, while **influence** and **data minimization** each have 19. These are large enough that sub-grouping, pruning, or short synthesis notes would help readers more than further undifferentiated additions.
- Documentation and benchmark-governance sources are now cited in the explanatory pages, but not all are represented in the Semble collection. Aligning those two layers would make the site easier to audit.

## Reproduction

Run:

```sh
node tmp/semble-audit.mjs
node tmp/crossref-verify.mjs
node tmp/authored-link-audit.mjs
```

The scripts require network access. Their results should be interpreted with the limitations above; automated checks cannot replace scholarly judgment about scope, relevance, or causal interpretation.
