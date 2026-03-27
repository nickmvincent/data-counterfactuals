# Semble Collections Coverage Review

Date: 2026-03-27

Basis for this review:

- Local Semble snapshot in `tmp/semble-cache.json` generated on 2026-03-27.
- Current shelf size: 18 collections, 68 references.

## Quick read

The current collection set is coherent and already does a good job of expressing the site's core claim: data counterfactuals cut across valuation, leverage, scaling, selection, privacy, and governance. The main weakness is not topic choice. It is thinness plus a few missing bridge papers.

Three cross-cutting issues stand out:

- Several shelves are starter shelves rather than stable reading lists. `model collapse` and `training dynamics` only have 2 papers each; `meta-learning`, `distillation`, `selection and coresets`, and `semivalues` only have 3 each.
- A few shelves are skewed toward recent ML papers without the older origin paper that explains why the area exists in the first place.
- Metadata quality is uneven. `data dividends` is the clearest problem: all 5 entries are effectively raw URLs with missing year/venue metadata. `collective action`, `membership inference`, `influence`, and `meta-learning` each have at least one partially structured entry.

## Highest-priority additions

### data dividends

Diagnosis:

- This is one of the site's core shelves, but it currently reads more like a folder of policy reports than a stable paper collection.
- It is missing the clearest "data as labor / who should capture value?" anchor papers.
- All current entries need metadata cleanup.

Add next:

- Arrieta-Ibarra, Goff, Jiménez-Hernández, Lanier, and Weyl (2018), [Should We Treat Data as Labor? Moving beyond "Free"](https://www.aeaweb.org/articles?id=10.1257%2Fpandp.20181003).
- Jones and Tonetti (2020), [Nonrivalry and the Economics of Data](https://www.aeaweb.org/articles?id=10.1257%2Faer.20191330).

Why:

- These give the shelf a much firmer economics and bargaining foundation.
- They also help distinguish "data dividends" from the neighboring `collective action` shelf.

### semivalues

Diagnosis:

- The shelf has strong recent ML papers, but it starts in 2019 and therefore skips both the conceptual origin and one of the clearest computational bridges.

Add next:

- Shapley (1953/1988 reprint), [A Value for n-Person Games](https://www.cambridge.org/core/books/shapley-value/value-for-nperson-games/1AA9D343DE7A87A97F69E999D329B57A).
- Jia et al. (2019), [Efficient Task-Specific Data Valuation for Nearest Neighbor Algorithms](https://www.research-collection.ethz.ch/handle/20.500.11850/395887).

Why:

- Shapley gives the shelf its conceptual anchor.
- Jia et al. gives a missing "practical computation" bridge between abstract game-theoretic valuation and usable ML methods.

### training dynamics

Diagnosis:

- The current pair of papers is good, but it leaves out the strongest bridge from training dynamics to concrete data pruning and subset selection.

Add next:

- Paul, Ganguli, and Dziugaite (2021), [Deep Learning on a Data Diet: Finding Important Examples Early in Training](https://proceedings.neurips.cc/paper/2021/hash/ac56f8fe9eea3e4a365f29f0f1957c55-Abstract.html).

Why:

- This is the clearest missing bridge between `training dynamics` and `selection and coresets`.
- It would also make sense to cross-list this paper in `selection and coresets`.

### meta-learning

Diagnosis:

- The shelf is currently "example reweighting via meta-learning," but it is missing one of the best-known data valuation papers in that lane.

Add next:

- Yoon et al. (2020), [Data Valuation using Reinforcement Learning](https://proceedings.mlr.press/v119/yoon20a.html).

Why:

- It connects valuation, reweighting, and downstream task performance more directly than the current set.
- It also gives the shelf a clearer relation to `semivalues` and `influence`.

### membership inference

Diagnosis:

- The shelf has strong attack papers, but it is missing the classic "why does membership inference work?" bridge to overfitting and generalization.

Add next:

- Yeom, Giacomelli, Fredrikson, and Jha (2017), [Privacy Risk in Machine Learning: Analyzing the Connection to Overfitting](https://arxiv.org/abs/1709.01604).

Why:

- This gives the shelf a stronger theoretical and diagnostic backbone instead of reading only as an attack chronology.

### unlearning

Diagnosis:

- The shelf has the now-standard unlearning references, but it is missing an early and still very legible deletion-centered paper.

Add next:

- Ginart, Guan, Valiant, and Zou (2019), [Making AI Forget You: Data Deletion in Machine Learning](https://papers.nips.cc/paper/8611-making-ai-forget-you-data-deletion-in-machine-learning).

Why:

- It makes the "right to be forgotten" motivation more explicit.
- It helps the shelf connect better to governance and user rights concerns elsewhere on the site.

### fairness via data interventions

Diagnosis:

- The current shelf is good on early framing, but it is light on the concrete optimization-based preprocessing line.

Add next:

- Calmon et al. (2017), [Optimized Pre-Processing for Discrimination Prevention](https://research.ibm.com/publications/optimized-pre-processing-for-discrimination-prevention).

Why:

- This gives the shelf a stronger technical intervention paper to sit beside the framing papers already present.

### scaling laws

Diagnosis:

- The current shelf covers the classic scaling-law sequence, but it understates the site's main thesis that data selection can change the scaling story.

Add next:

- Sorscher et al. (2022), [Beyond Neural Scaling Laws: Beating Power Law Scaling via Data Pruning](https://arxiv.org/abs/2206.14486).

Why:

- This is one of the best bridge papers between `scaling laws` and `selection and coresets`.
- It is unusually aligned with the site's overall argument about data-centric counterfactuals.

### influence

Diagnosis:

- The shelf is strong, but almost entirely framed around methods that work.
- It is missing the best-known cautionary paper about when influence estimates break.

Add next:

- Basu, Pope, and Feizi (2021), [Influence Functions in Deep Learning Are Fragile](https://openreview.net/forum?id=xHKVVHGDOEk).

Why:

- This would make the shelf more critical and less triumphalist.
- It is especially useful if the collections page is meant to orient newcomers rather than merely list techniques.

### user-generated content

Diagnosis:

- The shelf has a nice mix of UGC examples and provenance auditing, but it does not yet include one of the clearest papers on how web-scale text corpora are assembled and filtered.

Add next:

- Dodge et al. (2021), [Documenting Large Webtext Corpora: A Case Study on the Colossal Clean Crawled Corpus](https://aclanthology.org/2021.emnlp-main.98/).

Why:

- This paper sharpens the connection between UGC, web scraping, provenance, filtering, and downstream bias.

### model collapse

Diagnosis:

- This shelf is very small and currently starts with the label "model collapse" already stabilized.
- It would benefit from the earlier recursion framing paper that helped make the concern legible.

Add next:

- Shumailov et al. (2023), [The Curse of Recursion: Training on Generated Data Makes Models Forget](https://arxiv.org/abs/2305.17493).

Why:

- It deepens the shelf from "two model collapse papers" into a more recognizable progression from recursive training to collapse.

## Shelves that feel okay for now

These are thin, but they already have a reasonable starter canon for the site's purposes:

- `active learning`
- `augmentation and curriculum`
- `causality`
- `distillation`
- `poisoning`

`collective action` is also conceptually strong already; I would prioritize metadata cleanup and perhaps one institutional-governance paper later, rather than immediately expanding it.

## Recommended order of work

1. Clean metadata for the existing `data dividends`, `collective action`, `membership inference`, `influence`, and `meta-learning` entries.
2. Add one origin paper and one bridge paper to each of the most central thin shelves.
3. Cross-list papers that naturally connect shelves, especially:
   - Paul et al. (2021) in both `training dynamics` and `selection and coresets`
   - Sorscher et al. (2022) in both `scaling laws` and `selection and coresets`
   - Yoon et al. (2020) in both `meta-learning` and `semivalues` if you want a broader valuation shelf

## Short version

If the goal is to improve the collections quickly without making them much larger, the most leverage comes from adding:

- Arrieta-Ibarra et al. (2018)
- Jones and Tonetti (2020)
- Shapley (1953)
- Jia et al. (2019)
- Yoon et al. (2020)
- Paul et al. (2021)
- Yeom et al. (2017)
- Ginart et al. (2019)
- Calmon et al. (2017)
- Sorscher et al. (2022)
- Basu et al. (2021)
- Dodge et al. (2021)
- Shumailov et al. (2023)
