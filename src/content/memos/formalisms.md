---
order: 2
title: "Formalisms"
summary: "A draft memo lining up several tasks that fit the data counterfactuals frame: influence, valuation, selection, distillation, unlearning, privacy, poisoning, and other neighboring cases."
date: '2026-03-12T00:00:00.000Z'
visibility: public
type: shared_memo
---

WARNING!! Whereas the rest of this site has been human-reviewed and curated, this particularl post is still a *lightly reviewed AI first draft* generated mainly by GPT 5.4. I think it's a valuable artifact but probably don't spend too much time looking at this now unless you'd like to critique/edit.

---

This draft tries to write down a simplified data-counterfactual formalism and then ask how far it stretches. The goal is not to collapse several literatures into one master equation, and not to claim that influence, active learning, privacy, unlearning, and poisoning are secretly interchangeable. The goal is to identify the minimal comparative object they often share and then say, more carefully, where each literature departs from it.

The template below is deliberately lossy. Some tasks fit it neatly; others only fit once we add an observer, an aggregation rule, a sequential policy, or a staged training protocol. That is not a failure of the exercise. It is the point of it.

## A simplified data-counterfactual formalism

Start with five objects:

$$
\begin{aligned}
D &= \text{observed training data} \\
A &= \text{comparison protocol held fixed within one family of worlds} \\
E &= \text{evaluation target, task, slice, or observer query} \\
U(A(D), E) &= \text{the behavior, score, transcript, or release we care about} \\
T &= \text{an allowed transformation of the training data}
\end{aligned}
$$

Apply the transformation to produce a neighboring training world:

$$
\begin{aligned}
D' &= T(D) \\
\Delta_T &= \operatorname{Compare}\bigl(U(A(D'), E), U(A(D), E)\bigr)
\end{aligned}
$$

This is the simplest version of a data counterfactual: hold the comparison protocol fixed, change the training data, and compare outcomes.

That minimal form already captures a lot, but most literatures add at least one extra ingredient:

- an **intervention family** $T$ such as deletion, upweighting, addition, replacement, corruption, or repair
- an **aggregation rule** over many transformations rather than one comparison
- an **observer model** describing what outputs an auditor or attacker gets to see
- a **decision rule** for selecting the next transformation rather than passively evaluating one

For some literatures, those extra ingredients are not side notes. They are part of what must be held fixed if the comparison is to be well defined at all. Active learning needs a query policy and a label model. Distillation often fixes an initialization scheme and a truncated training loop. Unlearning compares a removal procedure to a retraining reference world. Differential privacy quantifies over the outputs of a randomized mechanism rather than one chosen test loss. So the template is best treated as a comparative scaffold, not as a claim that every section below is mathematically identical.

So the family resemblance is not that every task uses the same utility, the same intervention unit, or even the same notion of success. It is that each task compares nearby training worlds and asks what those differences imply for prediction, value, privacy, robustness, or control.

## 1. Influence and leave-one-out

In the abstract, Koh and Liang describe influence functions as a way to "[trace a model's prediction through the learning algorithm and back to its training data](https://proceedings.mlr.press/v70/koh17a.html)."

For the data-counterfactual view, the discrete version is the easiest place to start:

$$
\Delta_i(x) = \ell\bigl(x; A(D \setminus \{z_i\})\bigr) - \ell\bigl(x; A(D)\bigr)
$$

This asks what changes for test point $x$ when training point $z_i$ is removed.

The classical influence-function version does not identify deletion with the derivative itself. Instead, it linearizes the effect of changing one example's weight inside the training objective:

$$
I_{\mathrm{up},\mathrm{loss}}(z_i, x)
= \left.\frac{d}{d\varepsilon} \, \ell\bigl(x; A(D, \operatorname{weight}(z_i) + \varepsilon)\bigr)\right|_{\varepsilon = 0}
$$

If the empirical risk averages over $n$ points, then deleting $z_i$ is approximated by a small negative perturbation of size about $-1/n$:

$$
\ell\bigl(x; A(D \setminus \{z_i\})\bigr) - \ell\bigl(x; A(D)\bigr)
\approx -\frac{1}{n} I_{\mathrm{up},\mathrm{loss}}(z_i, x)
$$

up to higher-order terms and the regularity assumptions that make the linearization sensible. In modern deep nonconvex settings, that relationship is often used as a heuristic approximation rather than an exact identity.

This is a very direct specialization of the simplified formalism:

- $T$ changes the weight of one example
- $E$ is often one test point or one loss term
- $U$ is local predictive behavior
- $\operatorname{Compare}$ is a first-order derivative or a discrete difference

## 2. Data valuation and semivalue methods

In the abstract, Jia et al. say they study the problem of "[data valuation by utilizing the Shapley value](https://proceedings.mlr.press/v89/jia19a.html)."

Here the key move is to add an aggregation rule over many training worlds rather than study one deletion:

$$
\phi_i
= \sum_{S \subseteq D \setminus \{i\}}
\frac{|S|!(n - |S| - 1)!}{n!}
\Bigl(U(A(S \cup \{i\}), E) - U(A(S), E)\Bigr)
$$

This is still a data counterfactual, but the comparison is averaged across many coalitional worlds. Relative to influence methods, two things change:

- the unit of interest is usually aggregate utility rather than one prediction
- the hard part is combinatorial coverage of many subsets rather than approximation of one local perturbation

What makes Shapley-style valuation distinctive, though, is not only that it aggregates many marginal comparisons. It also turns those comparisons into a value assignment under a specific weighting rule and an axiomatic picture of what a fair contribution accounting should look like. So the family resemblance lies in the underlying counterfactual worlds; the Shapley move is the particular way those worlds are weighted and interpreted.

Other semivalues keep the same coalitional counterfactual worlds while changing the weighting rule. For the normalized Banzhaf value, every coalition $S \subseteq D \setminus \{i\}$ gets equal weight:

$$
B_i
= \frac{1}{2^{n-1}}
\sum_{S \subseteq D \setminus \{i\}}
\Bigl(U(A(S \cup \{i\}), E) - U(A(S), E)\Bigr)
$$

An intuitive way to read this is: hold the evaluation target fixed, look at every possible "background training world" that does not yet contain point $i$, add $i$, and ask how much the score moves. Banzhaf says to average those swings uniformly across worlds. In grid language, it is the simple average of all the before-and-after row pairs for $i$ on the chosen evaluation slice. Shapley instead redistributes weight so that coalition size matters in a more structured way, and Beta Shapley keeps the same marginal comparisons while deliberately tilting weight toward smaller or larger coalitions. That is why this section is better read as an aggregation family than as one single equation.

## 3. Coresets, subset selection, and pruning

Coreset and pruning methods deserve their own section because they are close to distillation in spirit but different in mechanism. The search space stays inside the observed dataset rather than moving to a synthetic one. [Sener and Savarese](https://openreview.net/forum?id=H1aIuk-RW) give one influential modern formulation in this neighborhood.

One simple formulation is:

$$
S^*
= \operatorname*{arg\,min}_{S \subseteq D,\ |S| = m}
d\bigl(A(S), A(D)\bigr)
$$

In another common formulation, under a fixed budget, maximize downstream utility directly:

$$
S^*
= \operatorname*{arg\,max}_{S \subseteq D,\ |S| = m}
U\bigl(A(S), E\bigr)
$$

Relative to Shapley-style valuation, the question is no longer "how much was each point worth on average across many worlds?" It is "which small retained world should we actually keep?" Relative to distillation, the intervention is selection over real examples rather than synthesis of new ones. So this is a data counterfactual over subset worlds, but with an explicitly budgeted design objective rather than a contribution accounting objective.

## 4. Active learning and experimental design

Early in the survey, Settles summarizes active learning with a line that is still hard to improve on: the learner may "[choose the data from which it learns](https://burrsettles.com/pub/settles.activelearning.pdf)."

Here the counterfactual is prospective rather than retrospective. A simple pool-based one-step objective looks like:

$$
x^*
= \operatorname*{arg\,max}_{x \in X_{\mathrm{pool}}}
\mathbb{E}_y \bigl[U(A(D \cup \{(x, y)\}), E)\bigr]
$$

The expectation is over the unknown label $y$, or over whatever posterior the method assumes.

This should not be mistaken for the whole field. Uncertainty sampling, query-by-committee, expected model change, density weighting, and Bayesian experimental design do not reduce to one identical objective. Experimental-design variants often replace downstream utility with information gain, uncertainty reduction, or identification power, but the structural move is the same: a decision rule over possible additions to the training set. That is why active learning only fits once the comparison protocol includes a query rule and an assumption about how labels arrive. The learner is not asking which existing point mattered most. It is asking which not-yet-labeled point would move the model into the most useful neighboring world, if acquired.

## 5. Dataset distillation and condensation

In the abstract, Wang et al. define dataset distillation as an attempt to "[distill the knowledge from a large training dataset into a small one](https://openreview.net/forum?id=Sy4lojC9tm)."

The object now is a synthetic replacement dataset $\tilde{D}$, usually under a strict size budget and a fixed training protocol:

$$
\tilde{D}^*
= \operatorname*{arg\,min}_{|\tilde{D}| = m}
d\bigl(A_{k,\theta_0}(\tilde{D}), A_{k,\theta_0}(D)\bigr)
$$

Here $A_{k,\theta_0}$ stands in for a constrained training procedure such as a fixed number of gradient steps from a given or randomized initialization. The distance $d$ can mean many things: downstream loss, gradient matching, trajectory matching, or performance across initializations.

This still fits the data-counterfactual frame, but only in a looser sense than leave-one-out or Shapley do. The intervention is now synthetic replacement rather than simple deletion or addition, and the search takes place in a constructed data space rather than over nearby observed subsets. Unlike coresets, the retained world need not be composed of actual observed examples. The question is whether a tiny constructed world can stand in for a much larger one under a fixed training recipe.

## 6. Machine unlearning

Bourtoule et al. frame machine unlearning as the problem of removing data influence without paying the full cost of retraining from scratch; their SISA proposal is one systems design for making that comparison operational at lower cost ([paper](https://arxiv.org/abs/1912.03817)).

Given a removal request $R \subseteq D$, the formal object is not just one approximate parameter vector. In the randomized setting, it is better understood as a comparison to the distribution of outputs we would have gotten by retraining on the retained data:

$$
\mathcal{L}\!\bigl(A_{\mathrm{unlearn}}(D, R)\bigr)
\approx
\mathcal{L}\!\bigl(A(D \setminus R)\bigr)
$$

For exact unlearning, that relation is equality in distribution. Approximate or certified formulations instead bound some divergence or audit criterion between the unlearned output distribution and the retraining reference world.

This sits naturally inside the simplified formalism:

- $T$ deletes a requested subset
- the reference world is full retraining on $D \setminus R$, often understood distributionally rather than as one fixed weight vector
- the extra question is systems-oriented: how quickly, exactly, and auditably can we realize that counterfactual in practice?

## 7. Reweighting and fairness-by-data repair

Some fairness interventions are best understood not as changing the model class but as changing how much different examples count. Kamiran and Calders's reweighing method is a canonical preprocessing example ([paper](https://link.springer.com/article/10.1007/s10115-011-0463-8)).

Let $w = (w_1, \dots, w_n)$ be a vector of example weights. Then one nearby world is:

$$
D_w = \{(z_i, w_i)\}_{i=1}^n
$$

and the corresponding counterfactual comparison is

$$
\Delta_w
= \operatorname{Compare}\bigl(U(A(D_w), E), U(A(D), E)\bigr)
$$

What makes this family distinctive is that the support of the dataset may stay fixed while the effective counting measure changes. The intervention is often group-structured rather than pointwise, and the target of evaluation is often a vector of group-conditioned metrics rather than one scalar loss. So this is a very direct fit to the umbrella formalism, but it highlights that "neighboring worlds" can differ by weights or sampling frequencies, not only by literal presence or absence.

## 8. Differential privacy

Differential privacy should be treated separately from membership inference because it is a different kind of formal object. It is not an attack. It is a guarantee over neighboring training worlds.

For concreteness, fix the add/remove notion of adjacency: $D \sim D'$ if one can be obtained from the other by adding or removing one record. A related convention uses replace-one-record adjacency, but it should be treated as a different neighboring relation rather than silently swapped in. With that convention fixed, a randomized mechanism $M$ is $(\varepsilon, \delta)$-differentially private if for every measurable event $S$,

$$
\Pr[M(D) \in S] \le e^\varepsilon \Pr[M(D') \in S] + \delta
$$

Following [Dwork (2006)](https://www.microsoft.com/en-us/research/publication/differential-privacy/), the point is to bound how distinguishable two one-record-apart worlds can be from the outside.

This belongs in the same neighborhood as data counterfactuals, but it does not plug into the simplified $\Delta_T = \operatorname{Compare}(\cdots)$ template as directly as influence or Shapley do. The important correspondences are:

- $T$ is an add/remove-one-record transformation in this section
- the observable object is the distribution of released outputs, not just one chosen utility score
- $\operatorname{Compare}$ is not a raw performance gap but an indistinguishability bound across all measurable events $S$

So differential privacy is best read as a worst-case limit on the observable consequences of a one-record data counterfactual. It is not something established by sampling a few neighboring worlds well; it is a guarantee proved about the release mechanism.

## 9. Membership inference attacks

In the abstract, Song and Mittal describe membership inference as an attack where an adversary aims to "[guess if an input sample was used to train the model](https://www.usenix.org/conference/usenixsecurity21/presentation/song)."

In schematic form:

$$
\begin{aligned}
a\bigl(z, O(A(D), z)\bigr) &\to \{\text{member}, \text{non-member}\} \\
s\bigl(z, O(A(D), z)\bigr) &\approx \Pr(z \in D \mid \text{observable outputs})
\end{aligned}
$$

Here $O$ is the observer model: logits, confidence scores, loss values, generated text, or whatever outputs the attacker can actually inspect.

This task does not change the training set directly at evaluation time. Instead, it asks whether the difference between two counterfactual worlds,

$$
z \in D
\qquad \text{versus} \qquad
z \notin D
$$

left a detectable trace in the model's behavior.

That is why MIA should not be conflated with DP:

- DP is an ex ante guarantee over all neighboring worlds and all observable events
- MIA is an ex post attack game under a specific observation model and threat model
- good MIA performance is evidence that a membership-level data counterfactual is observable
- weak MIA performance does not by itself certify a DP-style guarantee

So MIA is best read as one empirical probe of whether a data counterfactual leaked into model behavior strongly enough to detect.

## 10. Poisoning and adversarial data interventions

Biggio et al. study poisoning attacks on SVMs in which an adversary adds crafted training points to worsen downstream performance ([paper](https://arxiv.org/abs/1206.6389)).

The attacker chooses a perturbation set $P$ to optimize a bad downstream objective:

$$
P^*
= \operatorname*{arg\,max}_{P \in \mathcal{P}_{\mathrm{feasible}}}
U_{\mathrm{attack}}\bigl(A(D \cup P), E\bigr)
$$

For targeted poisoning or backdoors, $U_{\mathrm{attack}}$ is not generic test error but some attack-specific failure mode.

This is the same broad template with the sign flipped. The transformation $T$ is malicious, the utility is adversarial, and the point is to move the model into a worse part of the grid. But the adversarial setting also changes the epistemic posture of the problem: feasibility sets, stealth constraints, attacker knowledge, and threat models become central.

## 11. Curriculum learning, training dynamics, and other order-sensitive methods

Some important neighboring ideas do not primarily compare static sets at all. They compare trajectories. Curriculum learning, forgetting events, and data cartography are all useful examples of this shift.

Let $\pi = (B_1, \dots, B_T)$ be a sequence of batches or curriculum choices, and let training evolve as

$$
\theta_{t+1} = G(\theta_t, B_t)
$$

for some update rule $G$. Then the object of interest may be the final model, but it may also be a trajectory-level observable:

$$
U_{\mathrm{traj}}(\pi, E) = U\bigl((\theta_t)_{t=0}^T, E\bigr)
$$

Curriculum learning changes the order and staging of exposure. Forgetting events and data cartography inspect per-example training trajectories such as correctness, confidence, or variability over time. Two worlds can therefore contain the same multiset of training examples and still differ meaningfully because they traverse the space in a different order.

This is exactly the kind of case where the simplified scaffold starts to strain. The relevant counterfactual is not only "which data are present?" but also "in what order, with what schedule, and with what logged training history?" That makes these methods important not because they fit perfectly, but because they clarify one of the main boundaries of the set-based picture.

## 12. Scaling laws and datamodels

Scaling-law and datamodel work also deserve explicit mention because they aggregate over many subset worlds without trying to assign one local credit score to each point. [Kaplan et al.](https://arxiv.org/abs/2001.08361) study scaling laws, while [Ilyas et al.](https://proceedings.mlr.press/v162/ilyas22a.html) fit datamodels over dataset counterfactuals.

One simple data-scaling object is

$$
g(n)
=
\mathbb{E}_{S \sim \mathcal{Q}_n(D)}
\bigl[U(A(S), E)\bigr]
$$

where $\mathcal{Q}_n(D)$ is some procedure for sampling size-$n$ subsets or retained worlds from $D$. Datamodel-style work goes further and tries to fit a surrogate that predicts performance across many subset worlds, compositions, or evaluation targets rather than recomputing every cell directly.

This still belongs to the data-counterfactual family because the underlying evidence comes from training on different data worlds and comparing outcomes. But the output is no longer a local influence score or a fair-value assignment. It is a response surface, scaling curve, or learned map over the subset space. That makes these methods especially relevant for leverage analyses and for deciding which kinds of counterfactual worlds are worth simulating at all.

## What really changes across these tasks

Putting the formalisms next to each other, the main axes of variation are:

- **Who chooses the intervention?** analyst, learner, data subject, curator, or adversary
- **What is the intervention unit?** single point, coalition, weight vector, label query, synthetic set, deletion set, adjacent dataset, poisoned set, or training trajectory
- **What is being compared?** prediction loss, aggregate utility, training transcript, observable release distribution, group-conditioned metric, fitted response surface, or attack success
- **How are comparisons combined?** local derivative, leave-one-out gap, expectation over labels, average over coalitions, worst-case guarantee, sequential policy, or sampled scaling curve
- **What must stay fixed for the comparison to mean anything?** optimizer, initialization, label oracle, observer model, threat model, or audit state

That is why the umbrella remains useful. The shared object is not one universal objective. It is a comparison between training worlds, plus a choice about what sort of observer, institution, or aggregation makes that comparison matter.

## Why data strike simulations matter across much of this landscape

A data strike simulation is one especially useful way to instantiate the simplified formalism. Pick a withholding rule, remove or downweight some subset, retrain or approximate retraining, and compare the result to the baseline world:

For a strike set $S \subseteq D$,

$$
\begin{aligned}
T_{\mathrm{strike},S}(D) &= D \setminus S \\
\Delta_{\mathrm{strike}}(S) &= \operatorname{Compare}\bigl(U(A(D \setminus S), E), U(A(D), E)\bigr)
\end{aligned}
$$

That looks narrow at first, but it is actually a reusable experimental substrate for several important families of questions.

- singleton strike simulations recover leave-one-out style comparisons
- many coalition strike simulations are exactly the raw material that Shapley and semivalue methods aggregate over
- fixed-budget strike simulations can benchmark pruning or coreset heuristics against full-data baselines
- strike simulations at varying sizes and compositions support scaling-law, datamodel, or leverage-style analyses
- unlearning can be benchmarked against the strike world in which the requested data had never been present
- group-targeted strike or downweighting experiments can expose fairness-relevant dependence on particular populations or contribution types
- privacy audits can ask whether neighboring strike worlds are empirically distinguishable from the outside, even though that does not by itself establish a DP guarantee
- MIA asks whether the presence or absence of a struck example left a detectable trace under a particular attacker and observation model
- synthetic replacement and distillation can use strike worlds as comparison targets, even though their main search space is synthetic rather than strike-based
- poisoning flips the sign and asks what happens when we add or corrupt data instead of withdrawing it

So a strike simulator is not just one application sitting beside the other formalisms. For leave-one-out, semivalue methods, coreset benchmarks, scaling analyses, leverage analyses, and unlearning baselines, it can generate the very counterfactual worlds those quantities are defined over. For privacy, distillation, active selection, or poisoning, it is better understood as a diagnostic baseline or comparison device than as the whole formal object.

With enough strike-style simulations over the right subsets, you can estimate some of these concepts directly and stress-test others indirectly. Shapley values are the clearest example because they are built from marginal contributions across many subset worlds. Unlearning baselines are another because the relevant reference world is often "train as if the removed data had never been present." Data scaling curves and datamodel-style surrogates are another because they are summaries over many retained worlds. But for differential privacy, active learning, distillation, poisoning, or order-sensitive training methods, the bottleneck is not only access to neighboring data worlds. It is also the policy, mechanism, schedule, or threat model layered on top of them.

That is the broader motivation for the project. A data strike simulation is a social and strategic object in its own right, but it is also a bridge to attribution, valuation, privacy, unlearning, and robustness. It tells us not just whether withholding data matters, but which other formalisms that withholding can help us measure.
