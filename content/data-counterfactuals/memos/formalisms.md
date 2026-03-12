---
title: "Data Counterfactual Formalisms, Side by Side"
slug: formalisms
summary: "A draft memo lining up several tasks that fit the data counterfactuals frame: influence, valuation, active learning, distillation, unlearning, privacy, and poisoning."
date: '2026-03-12T00:00:00.000Z'
visibility: public
type: shared_memo
---

This draft tries to put several neighboring formalisms next to each other. The goal is not to collapse them into one master equation, and not to claim that these literatures are secretly interchangeable. It is to make a family resemblance easier to see while keeping the points of mismatch in view.

The common template below is deliberately lossy. Some tasks fit it neatly; others only fit after some coercion.

One minimal schematic is:

```text
D       = observed training data
A(D)    = learning algorithm applied to D
E       = evaluation target, task, or slice of interest
U(A(D), E) = whatever scalar or structured behavior we care about

T       = a transformation of the training data
D'      = T(D)
Delta_T = Compare( U(A(D'), E), U(A(D), E) )
```

Even this is more of a comparative scaffold than a unified formalism. Different literatures plug different things into `T`, `E`, `U`, and even into what counts as a meaningful comparison.

- Some vary a single point.
- Some vary a coalition, subset size, or synthetic replacement.
- Some ask for local predictive change.
- Some ask for global utility.
- Some ask whether a data point left a detectable trace at all.
- Some study helpful interventions; others study adversarial ones.

So the family resemblance is not that every task uses the same objective, or even the same notion of intervention. It is that each one asks, in its own way, what follows from changing the training data or from comparing worlds that differ in the training data.

## 1. Influence and leave-one-out

In the abstract, Koh and Liang describe influence functions as a way to "[trace a model's prediction through the learning algorithm and back to its training data](https://proceedings.mlr.press/v70/koh17a.html)."

For the data-counterfactual view, the discrete version is the easiest place to start:

```text
Delta_i(x) = ell(x; A(D \ {z_i})) - ell(x; A(D))
```

This asks what changes for test point `x` when training point `z_i` is removed.

The classical influence-function version turns that deletion into an infinitesimal upweighting problem:

```text
I_up,loss(z_i, x) = d/dε ell(x; A(D, weight(z_i) + ε)) evaluated at ε = 0
```

The important thing is not the exact approximation scheme. It is the object being compared: nearby training worlds that differ in the weight of one example.

## 2. Data valuation and Shapley-style methods

In the abstract, Jia et al. say they study the problem of "[data valuation by utilizing the Shapley value](https://proceedings.mlr.press/v89/jia19a.html)."

Here the intervention is not just one deletion. It is every coalition `S` that may or may not contain point `i`:

```text
phi_i
  = sum over S subset of D \ {i}
      [ |S|! (n - |S| - 1)! / n! ] * ( U(A(S ∪ {i}), E) - U(A(S), E) )
```

This is still a data counterfactual, but the comparison is averaged over many possible worlds rather than anchored to one local deletion.

Two things shift relative to influence methods:

- The unit of interest is usually a contribution to aggregate utility rather than one prediction.
- The main difficulty is no longer only estimation of local change; it is combinatorial coverage of many subsets.

## 3. Active learning

Early in the survey, Settles summarizes active learning with a line that is still hard to improve on: the learner may "[choose the data from which it learns](https://burrsettles.com/pub/settles.activelearning.pdf)."

Here the counterfactual is prospective rather than retrospective. One important family of active-learning formalisms asks which new labeled point would be most useful to add:

```text
x*
  = argmax over x in U_pool
      E_y [ U(A(D ∪ {(x, y)}), E) ]
```

The expectation is over the unknown label `y`, or over whatever posterior the method assumes.

This should not be mistaken for the whole field. Uncertainty sampling, query-by-committee, expected model change, density weighting, and Bayesian experimental design do not reduce to one identical objective. Still, they share a counterfactual structure over possible additions to the training set. The learner is not asking which existing point mattered most. It is asking which not-yet-labeled point would change the model in the most useful way, if acquired.

## 4. Dataset distillation and condensation

In the abstract, Wang et al. define dataset distillation as an attempt to "[distill the knowledge from a large training dataset into a small one](https://openreview.net/forum?id=Sy4lojC9tm)."

The object now is a synthetic replacement dataset `D_tilde`, usually with a strict size budget:

```text
D_tilde*
  = argmin over |D_tilde| = m
      d( A(D_tilde), A(D) )
```

The distance `d` can mean many things: loss after training, gradient matching, trajectory matching, or downstream performance across initializations.

This is still a data counterfactual. But instead of asking what happens when one point is removed, it asks whether a tiny synthetic row can stand in for a much larger region of the grid.

## 5. Machine unlearning

Bourtoule et al. frame machine unlearning as the problem of removing data influence without paying the full cost of retraining from scratch; their SISA proposal is one systems design for making that comparison operational at lower cost ([paper](https://arxiv.org/abs/1912.03817)).

The formal object is usually something like:

```text
Given a removal request R subset of D,
produce A_unlearn(D, R) such that

A_unlearn(D, R) ≈ A(D \ R)
```

The approximation can be exact or approximate, depending on the unlearning setting.

The key comparison is with the world in which the removed data had never been present. Unlearning therefore sits quite naturally inside the data-counterfactual frame, though the literature adds an extra systems question that the earlier sections do not: how quickly, exactly, and auditably can we realize that counterfactual in practice?

## 6. Membership inference and privacy

In the abstract, Song and Mittal describe membership inference as an attack where an adversary aims to "[guess if an input sample was used to train the model](https://www.usenix.org/conference/usenixsecurity21/presentation/song)."

In schematic form:

```text
m(z; A(D)) -> {member, non-member}
or
s(z; A(D)) ≈ P(z in D | model outputs on z)
```

This task does not usually change the training set directly. Instead, it asks whether the difference between two counterfactual worlds,

```text
z in D
versus
z not in D
```

left a detectable trace in the model's behavior.

But membership inference is only one privacy lens. It does not exhaust privacy analysis, and I would not want to imply that differential privacy, extraction attacks, memorization studies, and governance questions are all reducible to this one setup. The narrower claim is that membership inference asks whether one particular data counterfactual is externally observable.

## 7. Poisoning and adversarial data interventions

Biggio et al. study poisoning attacks on SVMs in which an adversary adds crafted training points to worsen downstream performance ([paper](https://arxiv.org/abs/1206.6389)).

The attacker chooses a perturbation set `P` to optimize a bad downstream objective:

```text
P*
  = argmax over feasible poisoned sets P
      U_attack( A(D ∪ P), E )
```

For targeted poisoning or backdoors, `U_attack` is not generic test error but some attack-specific failure mode.

This is close to the same template with the sign flipped. The transformation `T` is malicious, the utility is adversarial, and the point is to move the model into a worse part of the grid. But the adversarial setting also changes the epistemic posture of the problem: feasibility sets, threat models, stealth constraints, and attacker knowledge become central.

## What really changes across these tasks

Putting the formalisms next to each other, the main axes of variation are:

- **Who chooses the intervention?** analyst, learner, data subject, or adversary
- **What is the intervention unit?** single point, coalition, label query, synthetic set, deletion set, or poisoned set
- **What is held fixed?** model class, optimizer, evaluation slice, budget, initialization, or access assumptions
- **What counts as success?** local prediction change, aggregate utility, label efficiency, compression fidelity, deletion fidelity, privacy leakage, or induced failure

## Todo:

- fairness interventions that operate by reweighting or repairing data
- data augmentation and synthetic-neighborhood methods
- experimental design and causal inference framings
- collective action and bargaining over data supply
- recent LLM-specific versions of attribution, memorization, and unlearning

Those would make good next sections, though some of them are exactly where the limits of the umbrella become most visible.
