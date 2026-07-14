---
order: 2
title: "When the Column Changes"
summary: "Evaluation data as a data counterfactual: how a holdout point can change measurement, confidence, or decisions even when it never trains the model."
date: "2026-05-13T00:00:00.000Z"
visibility: public
type: shared_memo
---

Most data counterfactuals start as row moves. We hold the evaluation target fixed, change the training data, and ask how the trained outcome changes under a specified protocol:

$$
f(D_T, D_E) \rightarrow f(D_T \setminus z, D_E)
$$

That is the right first picture for influence, leave-one-out attribution, many data valuation methods, unlearning baselines, data-strike simulations, and data selection. But the grid has another axis. Columns are evaluation worlds. Evaluation datasets have to be constructed and documented, and their usefulness depends on what they represent and how they are used; see [Model Cards](https://doi.org/10.1145/3287560.3287596), [Datasheets for Datasets](https://doi.org/10.1145/3458723), and [HELM](https://arxiv.org/abs/2211.09110) for complementary documentation and evaluation frameworks.

The column-side question is:

$$
f(D_T, D_E) \rightarrow f(D_T, D_E \cup z)
$$

Training counterfactuals ask how model behavior changes when the training world changes. An evaluation-world change can instead refine evidence about the same target, define a different target, or affect a decision. Those are different objects.

## Why the column is not free

It is tempting to treat $D_E$ as a fixed background object. In a toy paper, that is often fine. In a foundation-model setting, it is a major assumption.

Evaluation data have to be selected, labeled, governed, and interpreted. Exposure of benchmark data during training can compromise the resulting evaluation; this is the specific contamination problem studied, for example, by [Deng et al. (2024)](https://aclanthology.org/2024.naacl-long.482/). A label process can also be too weak for the intended construct or population. A protected evaluation can be useful because it remains independent of training, while an evaluator can matter because of the evidence they produce—not because the data directly improved an already-trained model.

So the question is not only:

> Did this data object improve the model?

It can also be:

> Did this data object change the measurement, the model-selection decision, or trust in the measurement?

## Three move types

The grid gives us a lightweight language for three related moves:

- **Row move**: same eval column, different train row. What if this object were used for training?
- **Column move**: same train row, different eval column. What if this object were used for evaluation?
- **Coupled move**: the object's role changes. What if this object is reserved for holdout instead of training?

That coupled move is the useful market-facing move. The same data object can be trainable data, eval data, both, reserved, or unavailable:

$$
z_i \in \{\text{trainable}, \text{evaluable}, \text{both}, \text{reserved}, \text{unavailable}\}
$$

The value question changes with the rights state. A data object can be valuable because it helps training, because it sharpens a test, because it stays hidden, or because its provenance makes the whole measurement more credible.

## Three evaluation questions, not one score

First, additional observations can sharpen evidence about the same construct and target population. The relevant outputs are an estimator and its uncertainty under a stated sampling model. A raw score difference after adding one observation is sample sensitivity, not automatically value.

Second, an evaluation object can define a new subgroup, capability, stress condition, population, or construct. The target has changed. Performance on that target should not be described as a refinement of the old estimate.

Third, independent evidence can change model selection, deployment, or audit action. Its value of information depends on the decision rule, loss function, prior information, and evidence model.

Training effects and governance evidence remain separate again. One concerns a fitted system under a training intervention; the other concerns provenance, independence, rights, or credibility. An application may build a combined score, but it must specify normalization and normative weights. No universal scalar follows from the grid.

The practical rule is simple: state whether the object changes a same-target estimate, changes the target, changes a decision, changes the trained system, or changes the credibility of the evidence.

## Secure holdouts as a small explorable

A minimal holdout story needs only four objects: A, B, C, and D.

- A and B are trainable.
- C is reserved for a trusted holdout.
- D is leaked, so it cannot credibly enter eval.
- A buyer chooses between two models based on the holdout.

Now C can matter even if it never trains the model. If it changes which model gets selected or whether deployment is delayed, its value is decision-specific. If it only narrows uncertainty about the same target, it supplies same-target evidence. If it covers a new capability, it defines a new target. D can help training yet be unusable as independent evaluation evidence because the trust state is broken.

That is why the grid explorer includes an **Eval value** mode. The label refers to an exploratory cell contrast: it keeps the row fixed and moves across columns. Interpreting that contrast still requires choosing among same-target estimation, target change, and decision value.

## A project-level reading of Beta Shapley

[Beta Shapley](https://proceedings.mlr.press/v151/kwon22a.html) generalizes Data Shapley by changing the weighting over coalitions. The following is a project-level interpretation of that weighting—not a result established by the paper:

> Is this object valuable in a small-data counterfactual, even if its marginal contribution to a massive already-trained model is invisible?

Smaller-coalition weighting can make contributions visible in worlds where less background data are present. Whether that is the right valuation for a market, course, or policy question is a separate normative and empirical choice.

## Course-note version

For teaching, the whole extension can be compressed into one question:

> Is the object changing the trained system, refining evidence about the same target, defining a new target, changing a decision, or changing trust in the evidence?

The first answer points to row moves. The next three point to different column-side analyses. The last points to governance or institution moves. A lightweight course can reuse the same grid while keeping those interpretations separate.
