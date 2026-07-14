---
order: 4
title: "Formalisms"
summary: "A draft memo lining up several tasks that fit the data counterfactuals frame: influence, valuation, evaluation value, selection, distillation, unlearning, privacy, poisoning, and other neighboring cases."
date: '2026-03-12T00:00:00.000Z'
visibility: public
type: shared_memo
---

Draft status: Whereas the rest of this site has been human-reviewed and curated, this particular post is still a *lightly reviewed AI-assisted first draft* generated mainly by GPT 5.4. I have read it top to bottom and confirmed that it is close to what I think will be a useful reference memo for the site. I have a number of edits in mind, but have not finished them yet. I think it is a useful artifact already, but probably not worth spending too much time on unless you'd like to critique or edit it.

---

This draft tries to write down a simplified data-counterfactual formalism and then ask how far it stretches. The goal is not to collapse several literatures into one master equation, and not to claim that influence, active learning, privacy, unlearning, and poisoning are secretly interchangeable. The goal is to identify the minimal comparative object they often share and then say, more carefully, where each literature departs from it.

The template below is deliberately lossy. Some tasks fit it neatly; others only fit once we add an observer, an aggregation rule, a sequential policy, or a staged training protocol. That is not a failure of the exercise. It is the point of it.

## A simplified data-counterfactual formalism

Start with a small set of objects:

$$
\begin{aligned}
D &= \text{observed training data} \\
A &= \text{comparison protocol held fixed within one family of worlds} \\
E &= \text{evaluation target, task, slice, or observer query} \\
G &= \text{governance or trust state} \\
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

The simplified version above is deliberately training-centered. Once the grid is explicit, two nearby extensions become useful. First, we can change the evaluation target while holding the training world fixed:

$$
\Delta_E =
\operatorname{Compare}\bigl(U(A(D), E'), U(A(D), E)\bigr)
$$

This is the column move: the data object changes the measurement rather than the model. Second, we can change the governance or trust state:

$$
\Delta_G =
\operatorname{Compare}\bigl(U_G(A(D), E), U_{G'}(A(D), E)\bigr)
$$

Here $G$ can include provenance, licensing, evaluator independence, contamination controls, label process, secrecy, or any other condition that decides whether a train/eval comparison should count. In this expanded version, the core question is not only "did the data change the model?" It is "did the data change the model, the measurement, or trust in the measurement?"

That minimal form already captures a lot, but most literatures add at least one extra ingredient:

- an **intervention family** $T$ such as deletion, upweighting, addition, replacement, corruption, or repair
- an **aggregation rule** over many transformations rather than one comparison
- an **observer model** describing what outputs an auditor or attacker gets to see
- a **decision rule** for selecting the next transformation rather than passively evaluating one

For some literatures, those extra ingredients are not side notes. They are part of what must be held fixed if the comparison is to be well defined at all. Active learning needs a query policy and a label model. Distillation often fixes an initialization scheme and a truncated training loop. Unlearning compares a removal procedure to a retraining reference world. Differential privacy quantifies over the outputs of a randomized mechanism rather than one chosen test loss. So the template is best treated as a comparative scaffold, not as a claim that every section below is mathematically identical.

So the family resemblance is not that every task uses the same utility, the same intervention unit, or even the same notion of success. It is that each task compares nearby data, evaluation, or protocol worlds and asks what those differences imply for prediction, value, privacy, robustness, or control.

## What really changes across these tasks

Before going case by case, it helps to name the main axes along which the literatures differ:

- **Who chooses the intervention?** analyst, learner, data subject, curator, or adversary
- **What is the intervention unit?** single point, coalition, weight vector, label query, synthetic set, deletion set, adjacent dataset, poisoned set, or training trajectory
- **What is being compared?** prediction loss, aggregate utility, training transcript, observable release distribution, group-conditioned metric, fitted response surface, or attack success
- **How are comparisons combined?** local derivative, leave-one-out gap, expectation over labels, average over coalitions, worst-case guarantee, sequential policy, or sampled scaling curve
- **What must stay fixed for the comparison to mean anything?** optimizer, initialization, label oracle, observer model, threat model, or audit state
- **Which axis is moving?** training row, evaluation column, coupled train/eval role, or governance state

That is the roadmap for the rest of the memo. The shared object is not one universal objective. It is a comparison between nearby worlds, plus a choice about what sort of observer, institution, or aggregation makes that comparison matter.

## 1. Influence and leave-one-out

In the abstract, Koh and Liang describe influence functions as a way to "[trace a model's prediction through the learning algorithm and back to its training data](https://proceedings.mlr.press/v70/koh17a.html)."

For the data-counterfactual view, the discrete version is the easiest place to start:

$$
\Delta_i(x) = \ell\bigl(x; A(D \setminus \{z_i\})\bigr) - \ell\bigl(x; A(D)\bigr)
$$

This asks what changes for test point $x$ when training point $z_i$ is removed.

The classical influence-function version does not identify deletion with the derivative itself. Instead, it linearizes the effect of changing one example's weight inside the training objective. More explicitly, if $A_\varepsilon(D, z_i)$ denotes training after adding an $\varepsilon$-weighted copy of the loss term for $z_i$ to the averaged empirical risk, then:

$$
I_{\mathrm{up},\mathrm{loss}}(z_i, x)
= \left.\frac{d}{d\varepsilon} \, \ell\bigl(x; A_\varepsilon(D, z_i)\bigr)\right|_{\varepsilon = 0}
$$

If the empirical risk averages over $n$ points, then deleting $z_i$ is approximated by a small negative perturbation of size about $-1/n$:

$$
\ell\bigl(x; A(D \setminus \{z_i\})\bigr) - \ell\bigl(x; A(D)\bigr)
\approx -\frac{1}{n} I_{\mathrm{up},\mathrm{loss}}(z_i, x)
$$

up to higher-order terms and the regularity assumptions that make the linearization sensible. In modern deep nonconvex settings, that relationship is often used as a heuristic approximation rather than an exact identity.

This is a very direct specialization of the simplified formalism:

- $T$ deletes or infinitesimally reweights one example
- $E$ is often one test point or one loss term
- $U$ is local predictive behavior
- $\operatorname{Compare}$ is a first-order derivative or a discrete difference

## 2. Data valuation and semivalue methods

Ghorbani and Zou popularized the term [Data Shapley](https://proceedings.mlr.press/v97/ghorbani19c.html), and in the abstract of a related efficient-valuation paper, Jia et al. say they study the problem of "[data valuation by utilizing the Shapley value](https://proceedings.mlr.press/v89/jia19a.html)."

Here the key move is to add an aggregation rule over many training worlds rather than study one deletion. Let the observed dataset be indexed as $D = \{z_1, \dots, z_n\}$, let $N = \{1, \dots, n\}$, and write $D_S = \{z_j : j \in S\}$ for any index set $S \subseteq N$. Then the Shapley value of point $z_i$ can be written as

$$
\phi_i
= \sum_{S \subseteq N \setminus \{i\}}
\frac{|S|!(n - |S| - 1)!}{n!}
\Bigl(U(A(D_{S \cup \{i\}}), E) - U(A(D_S), E)\Bigr)
$$

This is still a data counterfactual, but the comparison is averaged across many coalitional worlds. Relative to influence methods, two things change:

- the unit of interest is usually aggregate utility rather than one prediction
- the hard part is combinatorial coverage of many subsets rather than approximation of one local perturbation

What makes Shapley-style valuation distinctive, though, is not only that it aggregates many marginal comparisons. It turns those comparisons into an allocation under a specified cooperative game and weighting rule. The familiar Shapley axioms characterize that allocation rule; they do not establish a morally fair payment, market price, or entitlement. The family resemblance lies in the underlying counterfactual worlds, while the Shapley move is the particular way those worlds are weighted and interpreted.

Other semivalues keep the same coalitional counterfactual worlds while changing the weighting rule. For the equal-weight Banzhaf semivalue, every coalition $S \subseteq N \setminus \{i\}$ gets the same weight:

$$
B_i
= \frac{1}{2^{n-1}}
\sum_{S \subseteq N \setminus \{i\}}
\Bigl(U(A(D_{S \cup \{i\}}), E) - U(A(D_S), E)\Bigr)
$$

An intuitive way to read this is: hold the evaluation target fixed, look at every possible background training world that does not yet contain point $i$, add $i$, and ask how much the score moves. Banzhaf says to average those swings uniformly across worlds. Shapley instead redistributes weight so that coalition size matters in a more structured way, and Beta Shapley keeps the same marginal comparisons while deliberately tilting weight toward smaller or larger coalitions. That is why this section is better read as an aggregation family than as one single equation.

## 2.5 Evaluation-side comparisons and column moves

The valuation section above is still row-centered: it asks how a training contribution changes utility under a fixed evaluation target. When an object enters the evaluation world, at least three different questions can follow. They should not be collapsed into one value.

First, if the construct and target population stay fixed, adding an observation can change an estimator or its uncertainty:

$$
\Delta_{\mathrm{est},i}
= \widehat{\theta}(A(D_T); D_E \cup \{z_i\})
- \widehat{\theta}(A(D_T); D_E)
$$

This raw difference is estimator or sample sensitivity. Its interpretation requires a sampling frame, dependence assumptions, a metric, and uncertainty analysis. It is not automatically model improvement or data value.

Second, adding a subgroup, capability, stress condition, or new construct changes the target itself. A contrast between $\widehat{\theta}_{E'}$ and $\widehat{\theta}_{E}$ then describes performance on different targets; it is not simply a more precise estimate of the old one.

Third, independent evidence can affect a decision. Given an action set $\mathcal{A}$ and loss $L$, a value-of-information analysis compares expected decision loss before and after observing the evidence:

$$
\operatorname{VOI}(z_i)
= \min_{a \in \mathcal{A}} \mathbb{E}[L(a, \Theta) \mid D_E]
- \mathbb{E}_{z_i}\!\left[\min_{a \in \mathcal{A}} \mathbb{E}[L(a, \Theta) \mid D_E, z_i]\right]
$$

That quantity is defined only relative to the stated decision, loss, prior information, and evidence model.

This is especially important when data objects have role-specific rights:

$$
z_i \in \{\text{trainable}, \text{evaluable}, \text{both}, \text{reserved}, \text{unavailable}\}
$$

The same object can therefore produce different, generally incommensurable outputs under different roles:

$$
\begin{aligned}
\Delta_T(z_i) &= \text{training-side effect under a specified protocol} \\
\Delta_{\mathrm{est}}(z_i) &= \text{same-target estimator change} \\
\operatorname{VOI}(z_i) &= \text{decision value under a stated loss} \\
Q_G(z_i) &= \text{governance or trust evidence}
\end{aligned}
$$

The point of this notation is defensive. It prevents sample sensitivity, target change, decision value, or trust evidence from being smuggled back in as if each were another training-data attribution score. A combined application score would require explicit normalization and normative weights; no universal combination is implied here.

## 2.75 Human-feedback value in post-training

Reinforcement learning-based post-training adds a different pathway for data value. The data object may not be pretraining content at all. It may be a demonstration, preference comparison, critique, rubric, red-team transcript, refusal example, user rating, or deployment report. In a simplified RLHF-style pipeline, we might write:

$$
\begin{aligned}
M_0 &= \text{base model} \\
H &= \text{human feedback data} \\
R_H &= \operatorname{RewardModel}(M_0, H) \\
\pi_H &= \operatorname{RLUpdate}(M_0, R_H)
\end{aligned}
$$

The natural counterfactual is then not merely a row move in the pretraining dataset:

$$
\Delta_H =
\operatorname{Compare}\bigl(U(\pi_{H'}, E), U(\pi_H, E)\bigr)
$$

where $H'$ might remove, reweight, reserve, corrupt, or govern access to a source of human feedback. In papers such as [Christiano et al.](https://arxiv.org/abs/1706.03741), [Stiennon et al.](https://arxiv.org/abs/2009.01325), and [Ouyang et al.](https://arxiv.org/abs/2203.02155), human preference data help define or train the reward signal used for later policy optimization. For the data-counterfactual frame, the important point is that the value can flow through at least four objects:

- the supervised or demonstration policy
- the reward model or preference model
- the RL-updated policy
- the evaluation, red-team, or governance process that decides whether the update should count

That makes the role-specific score even more important:

$$
S_H(h) =
\lambda_{\mathrm{steer}} S_{\mathrm{steer}}(h)
+ \lambda_{\mathrm{eval}} S_{\mathrm{eval}}(h)
+ \lambda_{\mathrm{safety}} S_{\mathrm{safety}}(h)
+ \lambda_{\mathrm{govern}} S_{\mathrm{govern}}(h)
$$

The same feedback item can be valuable because it improves helpfulness, because it reveals a safety failure, because it gives an evaluator a cleaner holdout, or because the group that can supply it has leverage over future access. So post-training human-feedback value is still a data counterfactual, but its comparison object is a staged pipeline rather than one static training row.

## 3. Reweighting and fairness-by-data repair

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

What makes this family distinctive is that the support of the dataset may stay fixed while the effective counting measure changes. The intervention is often group-structured rather than pointwise, and the target of evaluation is often a vector of group-conditioned metrics rather than one scalar loss. So this is a very direct fit to the umbrella formalism, but it highlights that neighboring worlds can differ by weights or sampling frequencies, not only by literal presence or absence.

## 4. Coresets, subset selection, and pruning

Coreset, subset-selection, and pruning methods deserve their own section because many of them stay inside, or assign weights to, the observed dataset while still searching over retained worlds under a budget. One influential active-learning version of this budgeted selection move appears in work such as [Sener and Savarese](https://openreview.net/forum?id=H1aIuk-RW), though their concrete objective is closer to coverage in a learned representation space than to the abstract equations below. The broader design problem is not limited to active learning.

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

Relative to Shapley-style valuation, the question is no longer how much each point was worth on average across many worlds. It is which small retained world we should actually keep. Relative to synthetic compression methods, the search space stays inside the observed dataset rather than moving to a constructed one. So this is a data counterfactual over subset worlds, but with an explicitly budgeted design objective rather than a contribution accounting objective.

## 5. Data scaling curves and datamodels

Scaling-law and datamodel work also deserve explicit mention because they summarize behavior across many data worlds without trying to assign one local credit score to each point. [Kaplan et al.](https://arxiv.org/abs/2001.08361) study scaling laws over data, model size, and compute, while [Ilyas et al.](https://proceedings.mlr.press/v162/ilyas22a.html) fit datamodels over dataset counterfactuals.

The simple object in this memo is closer to a data-scaling curve than to the full Kaplan et al. scaling-law setup:

$$
g(n)
=
\mathbb{E}_{S \sim \mathcal{Q}_n(D)}
\bigl[U(A(S), E)\bigr]
$$

where $\mathcal{Q}_n(D)$ is some procedure for sampling size-$n$ subsets or retained worlds from $D$. Datamodel-style work goes further and tries to fit a surrogate that predicts a chosen target output, prediction, or score across many subset worlds rather than recomputing every cell directly. Multiple targets can be modeled by fitting multiple such maps.

This still belongs to the data-counterfactual family because the underlying evidence comes from training on different data worlds and comparing outcomes. But the output is no longer a local influence score or a fair-value assignment. It is a response surface, scaling curve, or learned map over the subset space. That makes these methods especially relevant for leverage analyses and for deciding which kinds of counterfactual worlds are worth simulating at all.

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

## 7. Active learning and experimental design

Early in the survey, Settles summarizes active learning with a line that is still hard to improve on: the learner may "[choose the data from which it learns](https://burrsettles.com/pub/settles.activelearning.pdf)."

Here the counterfactual is prospective rather than retrospective. A simple pool-based one-step objective looks like:

$$
x^*
= \operatorname*{arg\,max}_{x \in X_{\mathrm{pool}}}
\mathbb{E}_{y \sim p(\cdot \mid x, D)}
\bigl[U(A(D \cup \{(x, y)\}), E)\bigr]
$$

The expectation is over the unknown label $y$, or over whatever posterior the method assumes.

This should not be mistaken for the whole field. Uncertainty sampling, query-by-committee, expected model change, density weighting, and Bayesian experimental design do not reduce to one identical objective. Experimental-design variants often replace downstream utility with information gain, uncertainty reduction, or identification power, but the structural move is the same: a decision rule over possible additions to the training set. That is why active learning only fits once the comparison protocol includes a query rule and an assumption about how labels arrive. The learner is not asking which existing point mattered most. It is asking which not-yet-labeled point would move the model into the most useful neighboring world, if acquired.

## 8. Dataset distillation and condensation

In the abstract, Wang et al. define dataset distillation as an attempt to "[distill the knowledge from a large training dataset into a small one](https://openreview.net/forum?id=Sy4lojC9tm)."

The object now is a synthetic replacement dataset $\tilde{D}$, usually under a strict size budget and a fixed training protocol. One simple way to write the original distillation idea is to ask for a tiny synthetic set that, after a short fixed training run, performs well on the original task:

$$
\tilde{D}^*
= \operatorname*{arg\,min}_{|\tilde{D}| = m}
\mathbb{E}_{\theta_0 \sim P_0}
\bigl[\mathcal{L}_D(A_{k,\theta_0}(\tilde{D}))\bigr]
$$

Here $A_{k,\theta_0}$ stands in for a constrained training procedure such as a fixed number of gradient steps from a given or randomized initialization, and $\mathcal{L}_D$ evaluates performance against the original task or data distribution. Later condensation methods can also be written in distance-matching terms, where $d$ might compare gradients, trajectories, final predictions, or performance across initializations.

This still fits the data-counterfactual frame, but only in a looser sense than leave-one-out or Shapley do. The intervention is now synthetic replacement rather than simple deletion or addition, and the search takes place in a constructed data space rather than over nearby observed subsets. Unlike coresets, the retained world need not be composed of actual observed examples. The question is whether a tiny constructed world can stand in for a much larger one under a fixed training recipe.

## 9. Poisoning and adversarial data interventions

Biggio et al. study poisoning attacks on SVMs in which an adversary adds crafted training points to worsen downstream performance ([paper](https://arxiv.org/abs/1206.6389)).

The attacker chooses a perturbation set $P$ to optimize a bad downstream objective:

$$
P^*
= \operatorname*{arg\,max}_{P \in \mathcal{P}_{\mathrm{feasible}}}
U_{\mathrm{attack}}\bigl(A(D \cup P), E\bigr)
$$

For targeted poisoning or backdoors, $U_{\mathrm{attack}}$ is not generic test error but some attack-specific failure mode.

This is the same broad template with an adversarial objective rather than a helpful or diagnostic one. The transformation $T$ is malicious, the utility is adversarial, and the point is to move the model into a worse part of the grid. But the adversarial setting also changes the epistemic posture of the problem: feasibility sets, stealth constraints, attacker knowledge, and threat models become central.

## 10. Differential privacy

Differential privacy should be treated separately from membership inference because it is a different kind of formal object. It is not an attack. It is a guarantee over neighboring training worlds.

For concreteness, fix the add/remove notion of adjacency: $D \sim D'$ if one can be obtained from the other by adding or removing one record. A related convention uses replace-one-record adjacency, but it should be treated as a different neighboring relation rather than silently swapped in. With that convention fixed, a randomized mechanism $M$ is $(\varepsilon, \delta)$-differentially private if for all adjacent $D \sim D'$ and every measurable event $S \subseteq \operatorname{Range}(M)$,

$$
\Pr[M(D) \in S] \le e^\varepsilon \Pr[M(D') \in S] + \delta
$$

Following [Dwork (2006)](https://www.microsoft.com/en-us/research/publication/differential-privacy/) and later textbook treatments, the point is to bound how distinguishable two one-record-apart worlds can be from the outside. The probabilities above are over the randomness of the mechanism.

This belongs in the same neighborhood as data counterfactuals, but it does not plug into the simplified $\Delta_T = \operatorname{Compare}(\cdots)$ template as directly as influence or Shapley do. The important correspondences are:

- $T$ is an add/remove-one-record transformation in this section
- the observable object is the distribution of released outputs, not just one chosen utility score
- $\operatorname{Compare}$ is not a raw performance gap but an indistinguishability bound across all measurable events $S$

So differential privacy is best read as a worst-case limit on the observable consequences of a one-record data counterfactual. It is not something established by sampling a few neighboring worlds well; it is a guarantee proved about the release mechanism.

## 11. Membership inference attacks

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

## 12. Curriculum learning, training dynamics, and other order-sensitive methods

Some important neighboring ideas do not primarily compare static sets at all. They concern trajectories. Curriculum learning is a direct order-sensitive intervention; forgetting events and data cartography are trajectory-level diagnostics that inspect how examples behave during training.

Let $\pi = (B_1, \dots, B_T)$ be a sequence of batches or curriculum choices, and let training evolve as

$$
\theta_{t+1} = G(\theta_t, B_t)
$$

for some update rule $G$. Then the object of interest may be the final model, but it may also be a trajectory-level observable:

$$
U_{\mathrm{traj}}(\pi, E) = U\bigl((\theta_t)_{t=0}^T, E\bigr)
$$

Curriculum learning changes the order and staging of exposure. Forgetting events and data cartography inspect per-example training trajectories such as correctness, confidence, or variability over time. Two worlds can therefore contain the same multiset of training examples and still differ meaningfully because they traverse the space in a different order, or because the observable of interest is the path itself rather than only the final model.

This is exactly the kind of case where the simplified scaffold starts to strain. The relevant counterfactual is not only which data are present, but also in what order, with what schedule, and with what logged training history. That makes these methods important not because they fit perfectly, but because they clarify one of the main boundaries of the set-based picture.

## Why data strike simulations matter across much of this landscape

A data strike simulation is one especially useful way to instantiate the simplified formalism. Pick a withholding rule, remove or downweight some subset, retrain or approximate retraining, and compare the result to the baseline world:

For a strike set $S \subseteq D$,

$$
\begin{aligned}
T_{\mathrm{strike},S}(D) &= D \setminus S \\
\Delta_{\mathrm{strike}}(S) &= \operatorname{Compare}\bigl(U(A(D \setminus S), E), U(A(D), E)\bigr)
\end{aligned}
$$

This estimates technical dependence under the chosen intervention. A strategic conclusion needs a longer chain: establish feasible control over the data, identify the operator's substitutes and outside options, model participation and coordination, specify the operator's response and the bargaining or equilibrium concept, and trace the resulting surplus. Failure at any link can break the inference from a measured performance effect to durable leverage.

That looks narrow at first, but it is actually a reusable experimental substrate for several important families of questions.

- singleton strike simulations recover leave-one-out style comparisons
- many coalition strike simulations can supply the subset-utility evaluations that Shapley and semivalue methods aggregate over
- fixed-budget strike simulations can benchmark pruning or coreset heuristics against full-data baselines
- strike simulations at varying sizes and compositions support data-scaling, datamodel, or leverage-style analyses
- unlearning can be benchmarked against the strike world in which the requested data had never been present
- group-targeted strike or downweighting experiments can expose fairness-relevant dependence on particular populations or contribution types
- privacy audits can ask whether neighboring strike worlds are empirically distinguishable from the outside, even though that does not by itself establish a DP guarantee
- MIA asks whether the presence or absence of a struck example left a detectable trace under a particular attacker and observation model
- synthetic replacement and distillation can use strike worlds as comparison targets, even though their main search space is synthetic rather than strike-based
- poisoning flips the sign and asks what happens when we add or corrupt data instead of withdrawing it

So a strike simulator is not just one application sitting beside the other formalisms. For leave-one-out, semivalue methods, coreset benchmarks, data-scaling analyses, leverage analyses, and unlearning baselines, it can generate the very counterfactual worlds those quantities are defined over. For privacy, distillation, active selection, or poisoning, it is better understood as a diagnostic baseline or comparison device than as the whole formal object.

With enough strike-style simulations over the right subsets, you can estimate some of these concepts directly and stress-test others indirectly. Shapley values are the clearest example because they are built from marginal contributions across many subset worlds, though in practice this requires matched subset evaluations rather than only single removals from the full dataset. Unlearning baselines are another because the relevant reference world is often "train as if the removed data had never been present." Data scaling curves and datamodel-style surrogates are another because they are summaries over many retained worlds. But for differential privacy, active learning, distillation, poisoning, or order-sensitive training methods, the bottleneck is not only access to neighboring data worlds. It is also the policy, mechanism, schedule, or threat model layered on top of them.

That is the broader motivation for the project. A data strike simulation is a social and strategic object in its own right, but it is also a bridge to attribution, valuation, privacy, unlearning, and robustness. It tells us whether the modeled withholding intervention changes a technical outcome and which other analyses those worlds can support; it does not by itself establish bargaining power.

## A first simple unifying formalism

If there is a useful unifying formalism here, it should probably stay small. The common object is not one universal loss function. It is a structured comparison over worlds:

$$
\mathcal{F} = (W_0, \mathcal{T}, A, O, C)
$$

where:

- $W_0$ is the reference world, usually including a training dataset $D_0$, an evaluation target $E_0$, and any relevant governance or trust state $G_0$
- $\mathcal{T}$ is the allowed family of moves, usually data moves but sometimes evaluation, role, or governance moves
- $A$ is the learning, release, or query protocol held fixed across the comparison except where the move explicitly changes the protocol state
- $O$ is the observer or release map, which can be the identity map when no special observer is needed
- $C$ is the comparison rule, aggregation rule, or distinguishability criterion

For a single move $t \in \mathcal{T}$,

$$
\begin{aligned}
W_t &= t(W_0) \\
Y_0 &= O(A(W_0), W_0) \\
Y_t &= O(A(W_t), W_t) \\
\Gamma(t) &= C(Y_t, Y_0)
\end{aligned}
$$

This is the one-move version: change the world along an allowed axis, run the relevant protocol, observe the relevant output, and compare it to the reference world.

Many of the literatures above add one more layer. Valuation methods aggregate $\Gamma(t)$ over many subset moves. Active learning and poisoning choose the move that optimizes $\Gamma(t)$ under a budget or feasibility constraint. Differential privacy replaces a scalar gap with a worst-case indistinguishability requirement over neighboring worlds and observable events. Unlearning asks a procedure to land close to the retraining reference world. Order-sensitive methods make the schedule part of $W$ or $A$, because the protocol must include the trajectory.

So the proposed common sentence is:

> A data-counterfactual analysis fixes a protocol and an observer, varies the world along an allowed data-related axis, and compares the resulting observable outcomes.

That is simple enough to be useful and weak enough not to erase the differences. The real work in any concrete case is specifying which data moves are allowed, what protocol is held fixed, what the observer can see, and how the comparison is aggregated or optimized.
