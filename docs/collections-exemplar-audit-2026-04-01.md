# Semble Collections Exemplar Audit

Date: 2026-04-01

Basis for this audit:

- Current local Semble snapshot in `tmp/semble-cache.json`
- `npm run semble:status` reports the cache was refreshed on 2026-04-01 at 19:21:41Z
- Current shelf size: 19 collections, 82 references
- Compared against `docs/collections-coverage-review-2026-03-27.md`

## Quick read

The March gap-filling work appears to have done its job. I do not think the collections are now missing an obvious exemplar paper in most categories. The bigger problem has shifted from "missing anchor paper" to "thin shelf, fuzzy scope, or noisy supporting entries."

My strongest current conclusion is:

- Most shelves now have at least one paper I would feel good pointing a newcomer to first.
- The main exceptions are not really missing papers so much as category-shape issues.
- If I were editing next, I would focus on `meta-learning`, `reinforcement learning for data valuation`, `selection and coresets`, and residual cleanup in `data dividends`.

## Category-by-category verdict

- `active learning`
  Exemplar: *Query by committee* (1992).
  Verdict: Present.
  Notes: This is a clean classical anchor, and the shelf also has the Lewis and Gale paper plus the Settles survey.

- `augmentation and curriculum`
  Exemplar: *Curriculum learning* (2009).
  Verdict: Present.
  Notes: If the intended emphasis is more on augmentation than curriculum, `mixup` is also already there and is a strong modern anchor.

- `causality`
  Exemplar: Rubin's *Estimating causal effects of treatments in randomized and nonrandomized studies* (1974).
  Verdict: Present.
  Notes: This shelf already reads like a foundations shelf rather than a starter shelf.

- `collective action`
  Exemplar: *Data Leverage* (2021), with *Algorithmic Collective Action in Machine Learning* (2023) as the clearest technical follow-on.
  Verdict: Present.
  Notes: This is a young area, so there is no single universally canonical paper, but the current shelf has the right pair of anchors.

- `data dividends`
  Exemplar: *Should We Treat Data as Labor? Moving Beyond "Free"* (2018).
  Verdict: Present.
  Notes: `Nonrivalry and the Economics of Data` is also present, so the core economics anchor is no longer missing. The remaining weakness is that the shelf still includes lower-signal policy/white-paper entries that muddy the center of gravity.

- `distillation`
  Exemplar: *Dataset Distillation* (2018).
  Verdict: Present.
  Notes: This is a small shelf, but the anchor is clear and the later condensation papers make sense as follow-ons.

- `fairness via data interventions`
  Exemplar: *Optimized Pre-Processing for Discrimination Prevention* (2017).
  Verdict: Present.
  Notes: This shelf now has both early preprocessing work and adjacent framing papers, which is enough for a clear starting point.

- `influence`
  Exemplar: *Understanding Black-box Predictions via Influence Functions* (2017).
  Verdict: Present.
  Notes: This shelf is in strong shape. It now also includes the right cautionary paper, *Influence Functions in Deep Learning Are Fragile*.

- `membership inference`
  Exemplar: *Membership Inference Attacks Against Machine Learning Models* (2017).
  Verdict: Present.
  Notes: The shelf also now has the best bridge paper on overfitting, so it no longer reads like only an attack chronology.

- `meta-learning`
  Exemplar: *Learning to Reweight Examples for Robust Deep Learning* (2018).
  Verdict: Present, but only if the intended scope is "meta-learning for example weighting / data valuation."
  Notes: The current contents support the narrow description in the collection body. But the title `meta-learning` is broader than the shelf actually is. If you want the label to stay broad, add *Model-Agnostic Meta-Learning for Fast Adaptation of Deep Networks* (2017). If you want the shelf to stay narrow, consider renaming it.

- `model collapse`
  Exemplar: *The Curse of Recursion: Training on Generated Data Makes Models Forget* (2023).
  Verdict: Present.
  Notes: This shelf is still small, but the key origin-style paper is now there.

- `poisoning`
  Exemplar: *Poisoning Attacks against Support Vector Machines* (2012).
  Verdict: Present.
  Notes: The shelf also includes `BadNets`, so both general poisoning and backdoor-style poisoning are legible.

- `reinforcement learning for data valuation`
  Exemplar: *Data Valuation using Reinforcement Learning* (2020).
  Verdict: Present.
  Notes: This shelf has its exemplar, but it is effectively a singleton shelf. That makes it fragile as a visible category. I would either add one or two close neighbors or fold it back into `meta-learning`.

- `scaling laws`
  Exemplar: *Scaling Laws for Neural Language Models* (2020).
  Verdict: Present.
  Notes: This shelf is in good shape and now also includes the key bridge paper on data pruning and scaling.

- `selection and coresets`
  Exemplar: *Coresets for Data-efficient Training of Machine Learning Models* (2020), with *Active Learning for Convolutional Neural Networks: A Core-Set Approach* (2018) as the earlier bridge.
  Verdict: Present.
  Notes: I do not think this shelf is missing its exemplar anymore. The stronger issue is that it still feels somewhat isolated from the site's core thesis. Cross-listing *Deep Learning on a Data Diet* here would help.

- `semivalues`
  Exemplar: *Data Shapley: Equitable Valuation of Data for Machine Learning* (2019), with Shapley (1953) as the conceptual origin.
  Verdict: Present.
  Notes: This shelf now has both the origin and the modern ML anchor, which was the main missing piece before.

- `training dynamics`
  Exemplar: *Dataset Cartography: Mapping and Diagnosing Datasets with Training Dynamics* (2020).
  Verdict: Present.
  Notes: This is now a coherent three-paper starter shelf. `Deep Learning on a Data Diet` is the most useful bridge to selection.

- `unlearning`
  Exemplar: *Machine Unlearning* (2021), with *Making AI Forget You* (2019) as the clearest deletion-centered bridge.
  Verdict: Present.
  Notes: This shelf is no longer missing its historical motivation paper.

- `user-generated content`
  Exemplar: *Measuring the Importance of User-Generated Content to Search Engines* (2019).
  Verdict: Present.
  Notes: `Documenting Large Webtext Corpora` is also present and helps connect the shelf to corpus construction and provenance.

## What still feels weak

These are the shelves I would still treat as live maintenance targets:

- `meta-learning`
  The issue is not absence of a good paper. It is that the shelf title is broader than the shelf contents.

- `reinforcement learning for data valuation`
  The exemplar is present, but one-paper collections tend to read as accidental rather than intentional.

- `selection and coresets`
  The anchor is present, but the shelf would benefit from one more bridge paper that makes its connection to pruning, curation, and the site's central argument more obvious.

- `data dividends`
  The anchor is present, but the surrounding entries still feel more heterogeneous and lower-signal than they should.

## Bottom line

If the question is strictly "are we missing a really good exemplar paper for each category?", my answer is mostly no. Compared with the March snapshot, the collections now look substantially better on that dimension.

If the question is "which categories still need attention?", I would prioritize:

1. Clarify `meta-learning` by either renaming it or adding a broad meta-learning anchor.
2. Decide whether `reinforcement learning for data valuation` deserves to remain its own shelf.
3. Cross-list one or two bridge papers into `selection and coresets`.
4. Clean the lower-signal entries in `data dividends` so the shelf's center of gravity is clearer.
