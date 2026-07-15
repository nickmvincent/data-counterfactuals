---
order: 2
title: "When the Column Changes"
summary: "Evaluation data as a data counterfactual: how a holdout point can change measurement, confidence, or decisions even when it never trains the model."
date: "2026-05-13T00:00:00.000Z"
visibility: public
type: shared_memo
---

Most data counterfactuals start as row moves. We hold the evaluation target fixed, change the training data, and ask how the model changes:

$$
f(D_T, D_E) \rightarrow f(D_T \setminus z, D_E)
$$

That is the right first picture for influence, leave-one-out attribution, many data valuation methods, unlearning baselines, data strikes, and data selection. But the grid has always had another axis. Columns are evaluation worlds. A trusted evaluation set is not just a passive measuring stick. It is a data product, a governance institution, and sometimes the scarce object in the market.

The column-side question is:

$$
f(D_T, D_E) \rightarrow f(D_T, D_E \cup z)
$$

Training counterfactuals ask how model behavior changes when the training world changes. Evaluation counterfactuals ask how our measurement, confidence, or decision changes when the evaluation world changes.

## Why the column is not free

It is tempting to treat $D_E$ as a fixed background object. In a toy paper, that is often fine. In a foundation-model setting, it is a major assumption.

Evaluation data have to be selected, labeled, protected, governed, and interpreted. A holdout set can lose value if it is leaked into training. A benchmark can lose value if the label process is weak. A private eval can gain value precisely because it remains unavailable for training. And an evaluator can matter because the evaluation is independent, not because the data point directly improves a model.

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

## Three scores, not one score

It helps to separate the scalar values before combining them:

$$
S_T(z) = \text{training-side value}
$$

$$
S_E(z) = \text{evaluation-side value}
$$

$$
S_G(z) = \text{governance/trust value}
$$

Then an application-specific score might combine them:

$$
S(z)=\lambda_T S_T(z)+\lambda_E S_E(z)+\lambda_G S_G(z)
$$

The warning is simple: not every scalar data value is a training-data attribution score. Some data change the model. Some data change the measurement. Some data change whether the measurement should be trusted.

## Secure holdouts as a small explorable

A minimal holdout story needs only four objects: A, B, C, and D.

- A and B are trainable.
- C is reserved for a trusted holdout.
- D is leaked, so it cannot credibly enter eval.
- A buyer chooses between two models based on the holdout.

Now C can be valuable even if it never trains the model. Its value comes from the decision it changes: which model gets selected, whether deployment is delayed, or whether a claim survives an independent check. D can look valuable as training data but worthless or harmful as eval data because the trust state is broken.

That is why the grid explorer now includes an **Eval value** mode. It keeps the row fixed and moves across columns. This does not make evaluation value fully solved, but it gives the site a concrete starting point for teaching the distinction.

## Why Beta Shapley belongs here

Beta Shapley can also be read through this lens. Instead of treating it as just another semivalue, we can ask:

> Is this object valuable in a small-data counterfactual, even if its marginal contribution to a massive already-trained model is invisible?

That interpretation matters for markets and course materials. It gives a clean bridge from trillion-token invisibility to low-cardinality dataset value: smaller coalitions can reveal value that disappears under the average effect of a huge corpus.

## Course-note version

For teaching, the whole extension can be compressed into one question:

> Is the data object changing the model, changing the measurement, or changing trust in the measurement?

The first answer points to row moves. The second points to column moves. The third points to governance or institution moves. A lightweight course can reuse the same grid for all three instead of introducing a new formalism every week.
