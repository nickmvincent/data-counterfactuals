export const sources = {
  koh2017: {
    short: "Koh & Liang (2017)",
    title: "Understanding Black-box Predictions via Influence Functions",
    href: "https://proceedings.mlr.press/v70/koh17a.html",
  },
  ghorbani2019: {
    short: "Ghorbani & Zou (2019)",
    title: "Data Shapley: Equitable Valuation of Data for Machine Learning",
    href: "https://proceedings.mlr.press/v97/ghorbani19c.html",
  },
  jia2019: {
    short: "Jia et al. (2019)",
    title: "Towards Efficient Data Valuation Based on the Shapley Value",
    href: "https://proceedings.mlr.press/v89/jia19a.html",
  },
  dwork2006: {
    short: "Dwork (2006)",
    title: "Differential Privacy",
    href: "https://doi.org/10.1007/11787006_1",
  },
  shokri2017: {
    short: "Shokri et al. (2017)",
    title: "Membership Inference Attacks Against Machine Learning Models",
    href: "https://ieeexplore.ieee.org/document/7958568",
  },
  guo2020: {
    short: "Guo et al. (2020)",
    title: "Certified Data Removal from Machine Learning Models",
    href: "https://proceedings.mlr.press/v119/guo20c.html",
  },
  bourtoule2021: {
    short: "Bourtoule et al. (2021)",
    title: "Machine Unlearning",
    href: "https://ieeexplore.ieee.org/document/9519428",
  },
  biggio2012: {
    short: "Biggio et al. (2012)",
    title: "Poisoning Attacks against Support Vector Machines",
    href: "https://icml.cc/2012/papers/880.pdf",
  },
  steinhardt2017: {
    short: "Steinhardt et al. (2017)",
    title: "Certified Defenses for Data Poisoning Attacks",
    href: "https://papers.nips.cc/paper_files/paper/2017/hash/9d7311ba459f9e45ed746755a32dcd11-Abstract.html",
  },
  hardt2023: {
    short: "Hardt et al. (2023)",
    title: "Algorithmic Collective Action in Machine Learning",
    href: "https://proceedings.mlr.press/v202/hardt23a.html",
  },
  vincent2021: {
    short: "Vincent et al. (2021)",
    title: "Data Leverage: A Framework for Empowering the Public in its Relationship with Technology Companies",
    href: "https://www.microsoft.com/en-us/research/publication/data-leverage-a-framework-for-empowering-the-public-in-its-relationship-with-technology-companies/",
  },
  mitchell2019: {
    short: "Mitchell et al. (2019)",
    title: "Model Cards for Model Reporting",
    href: "https://doi.org/10.1145/3287560.3287596",
  },
  gebru2021: {
    short: "Gebru et al. (2021)",
    title: "Datasheets for Datasets",
    href: "https://doi.org/10.1145/3458723",
  },
  srivastava2023: {
    short: "Srivastava et al. (2023)",
    title: "Beyond the Imitation Game: Quantifying and Extrapolating the Capabilities of Language Models",
    href: "https://arxiv.org/abs/2206.04615",
  },
  liang2023: {
    short: "Liang et al. (2023)",
    title: "Holistic Evaluation of Language Models",
    href: "https://arxiv.org/abs/2211.09110",
  },
  stiennon2020: {
    short: "Stiennon et al. (2020)",
    title: "Learning to Summarize with Human Feedback",
    href: "https://proceedings.neurips.cc/paper/2020/hash/1f89885d556929e98d3ef9b86448f951-Abstract.html",
  },
  ouyang2022: {
    short: "Ouyang et al. (2022)",
    title: "Training Language Models to Follow Instructions with Human Feedback",
    href: "https://arxiv.org/abs/2203.02155",
  },
  casper2023: {
    short: "Casper et al. (2023)",
    title: "Open Problems and Fundamental Limitations of Reinforcement Learning from Human Feedback",
    href: "https://arxiv.org/abs/2307.15217",
  },
  swayamdipta2020: {
    short: "Swayamdipta et al. (2020)",
    title: "Dataset Cartography: Mapping and Diagnosing Datasets with Training Dynamics",
    href: "https://aclanthology.org/2020.emnlp-main.746/",
  },
  shumailov2024: {
    short: "Shumailov et al. (2024)",
    title: "AI Models Collapse When Trained on Recursively Generated Data",
    href: "https://www.nature.com/articles/s41586-024-07566-y",
  },
};

export const roleOptions = [
  {
    id: "training",
    label: "Training data",
    short: "Change what the model learns from",
  },
  {
    id: "evaluation",
    label: "Evaluation data",
    short: "Change how the model is measured",
  },
  {
    id: "access",
    label: "Access and governance",
    short: "Change which data worlds are feasible",
  },
  {
    id: "feedback",
    label: "Human feedback",
    short: "Change a post-training signal or pipeline",
  },
];

export const unitOptions = [
  { id: "example", label: "one example" },
  { id: "group", label: "a group of examples" },
  { id: "source", label: "a data source" },
  { id: "population", label: "a contributor population" },
  { id: "stream", label: "a future data stream" },
];

export const interventionOptions = [
  { id: "remove", label: "remove or withhold" },
  { id: "add", label: "add or acquire" },
  { id: "reweight", label: "reweight" },
  { id: "repair", label: "repair or replace" },
  { id: "reserve", label: "reserve for evaluation" },
  { id: "relicense", label: "change access terms" },
];

export const outcomeOptions = [
  { id: "performance", label: "model performance" },
  { id: "fairness", label: "distributional performance or fairness" },
  { id: "privacy", label: "privacy risk or stability" },
  { id: "trust", label: "evaluation credibility or trust" },
  { id: "power", label: "compensation or bargaining power" },
];

export const roleGuidance = {
  training: {
    comparison: "Compare two training worlds while holding the evaluation target and training procedure as fixed as the study allows.",
    notation: "f(Dₜ, Dₑ) − f(I(Dₜ), Dₑ)",
    methods: ["controlled retraining or ablation", "leave-one-out or group removal", "Shapley-style data valuation", "influence or attribution approximations"],
    caveat: "A difference between two runs is only attributable to the data intervention when other changes—optimization, randomness, model choice, and evaluation—are controlled or modeled.",
    sourceIds: ["koh2017", "ghorbani2019", "jia2019"],
    explorerHref: "/grid?mode=leave-one-out",
  },
  evaluation: {
    comparison: "Hold the trained model fixed and specify whether the comparison adds evidence for the same target, changes the target, or changes a decision.",
    notation: "f(Dₜ, Dₑ) − f(Dₜ, I(Dₑ))",
    methods: ["same-target estimation and uncertainty analysis", "slice or target-shift evaluation", "benchmark and contamination audits", "decision-theoretic value-of-information analysis"],
    caveat: "A score change from adding observations is estimator sensitivity, not automatically information value. Target shifts and decision changes require different estimands.",
    sourceIds: ["mitchell2019", "srivastava2023", "liang2023"],
    explorerHref: "/grid?mode=eval-value",
  },
  access: {
    comparison: "Compare the data worlds available under two access, licensing, provenance, or coordination regimes.",
    notation: "A(G) → A(G′), then compare outcomes over the feasible worlds",
    methods: ["group ablation or contribution experiments", "outside-option and substitution analysis", "participation, mechanism, or bargaining analysis", "provenance and rights audits"],
    caveat: "Technical dependence is only the first step. Feasible control, outside options, participation, operator response, and surplus distribution determine whether leverage follows.",
    sourceIds: ["vincent2021", "hardt2023", "gebru2021"],
    explorerHref: "/examples#collective-withholding",
  },
  feedback: {
    comparison: "Compare post-training pipelines that differ in one feedback source, weighting rule, or use of that feedback.",
    notation: "P(B, H, R, U, E) − P(B, I(H), R, U, E)",
    methods: ["controlled feedback ablation", "reward-model or policy evaluation", "held-out human evaluation", "red-team and subgroup analysis"],
    caveat: "Feedback can affect several stages at once. Preferences, reward modeling, policy optimization, and evaluation should be separated before assigning value to a feedback source.",
    sourceIds: ["stiennon2020", "ouyang2022", "casper2023"],
    explorerHref: "/post-training",
  },
};

export const outcomeGuidance = {
  performance: "Choose a task-specific metric before inspecting the result, define the training-randomness estimand, and report uncertainty across repeated runs when retraining is involved.",
  fairness: "Pre-specify the groups, target construct, and fairness criterion. Aggregate accuracy can conceal distributional changes.",
  privacy: "A visible adjacent-world gap is not a differential-privacy guarantee or a membership-inference audit; those require their formal release or attacker models.",
  trust: "State whether the evaluation adds evidence for the same target, changes the target, or changes a decision; then document independence and contamination controls.",
  power: "Name whose payoff or welfare is being measured, then trace technical dependence through outside options, participation, strategic response, and surplus distribution.",
};

export const evaluationComparisonTypes = [
  {
    id: "same-target",
    label: "More evidence, same target",
    move: "Add or replace observations sampled for the same construct and population.",
    estimand: "Estimator precision, calibration, or uncertainty for a fixed target.",
    conclusion: "The estimate became more or less informative under the sampling design.",
  },
  {
    id: "target-change",
    label: "Different target or slice",
    move: "Change the population, capability, subgroup, stress condition, or construct being measured.",
    estimand: "Performance on the newly defined target—not a refinement of the old target.",
    conclusion: "The fixed model behaves differently on a different target.",
  },
  {
    id: "decision-value",
    label: "Decision information",
    move: "Reveal independent evidence before model selection, deployment, or audit action.",
    estimand: "Expected decision loss, value of information, or probability of a decision change.",
    conclusion: "The evidence improved or altered a specified decision under a loss function.",
  },
];

export const evidenceReuseRows = [
  {
    analysis: "Ablation and subset-response curves",
    support: "Direct",
    requirement: "Matched retraining runs, a fixed evaluation plan, and uncertainty across training randomness.",
  },
  {
    analysis: "Shapley and semivalue allocation",
    support: "Direct when coalitions match",
    requirement: "The required characteristic-function evaluations and the specified weighting rule.",
  },
  {
    analysis: "Influence approximation",
    support: "Validation reference",
    requirement: "Method-specific derivatives or checkpoints; retraining tests approximation quality.",
  },
  {
    analysis: "Differential privacy",
    support: "Diagnostic only",
    requirement: "A randomized release mechanism and a proof or accountant over all adjacent inputs.",
  },
  {
    analysis: "Strategic leverage",
    support: "One empirical input",
    requirement: "Outside options, feasible control, participation, timing, response, and payoff assumptions.",
  },
];

export const strategicLeverageSteps = [
  {
    number: "01",
    title: "Measure technical dependence",
    question: "What changes under a feasible withholding or access intervention?",
    evidence: "Matched ablations, contribution experiments, and uncertainty analysis.",
    failure: "The measured change is small, unstable, or specific to one model and evaluation target.",
  },
  {
    number: "02",
    title: "Identify control and outside options",
    question: "Can participants control future supply or deletion, and what substitutes can the operator use?",
    evidence: "Rights, provenance, retention, substitution cost, and alternative-source analysis.",
    failure: "The operator already retains the data or can substitute at low cost.",
  },
  {
    number: "03",
    title: "Model participation and coordination",
    question: "Who joins, at what cost, with what information and commitment?",
    evidence: "Participation thresholds, coordination costs, coalition stability, and enforcement assumptions.",
    failure: "Free riding, fragmentation, or weak commitment prevents an effective coalition.",
  },
  {
    number: "04",
    title: "Specify strategic response",
    question: "How can the operator adapt, delay, bargain, litigate, or redesign the system?",
    evidence: "Actors, timing, strategy sets, information, and a stated bargaining or equilibrium concept.",
    failure: "Adaptation or delay eliminates the coalition’s temporary advantage.",
  },
  {
    number: "05",
    title: "Trace surplus and incidence",
    question: "Who gains, who pays, and which welfare or payoff measure defines success?",
    evidence: "Payoffs, transfer rules, distributional effects, and enforcement of any agreement.",
    failure: "Technical leverage exists but produces no durable participant benefit or worsens distributional outcomes.",
  },
];

export const scenarioExamples = [
  {
    id: "source-removal",
    eyebrow: "Training world",
    title: "What changes when one source is removed?",
    summary: "Retrain with and without a source, evaluate both models on the same targets, and separate the source effect from run-to-run variation.",
    move: "Row move",
    measure: "Performance difference, subgroup difference, or prediction-level change",
    method: "Ablation, group leave-one-out, Shapley-style valuation, or an approximation",
    limit: "The answer is specific to the model, training procedure, evaluation data, and source definition used in the study.",
    sourceIds: ["koh2017", "ghorbani2019", "jia2019"],
  },
  {
    id: "secure-holdout",
    eyebrow: "Evaluation world",
    title: "What is gained by keeping data out of training?",
    summary: "A reserved benchmark can add independent evidence, measure a new target, or improve a decision. The study must say which role it plays.",
    move: "Column and role move",
    measure: "Same-target uncertainty, performance on a newly defined target, or expected decision loss",
    method: "Sampling analysis, slice or target-shift evaluation, contamination audit, or value-of-information analysis",
    limit: "Do not treat sample sensitivity, target shift, and decision value as one quantity. Secrecy alone does not make an evaluation valid.",
    sourceIds: ["mitchell2019", "srivastava2023", "liang2023"],
  },
  {
    id: "collective-withholding",
    eyebrow: "Governance world",
    title: "Could coordinated withholding create leverage?",
    summary: "Estimate how an operator’s attainable outcomes change when a contributor group withholds, redirects, or conditions access to data.",
    move: "Group row move plus an access constraint",
    measure: "Technical dependence, outside options, participation threshold, strategic response, and distribution of gains or losses",
    method: "Group ablation, substitution analysis, participation modeling, and an explicit bargaining or equilibrium model",
    limit: "Observed performance dependence does not by itself establish feasible coordination, legal control, compensation, or durable bargaining power.",
    sourceIds: ["vincent2021", "hardt2023"],
  },
  {
    id: "unlearning-request",
    eyebrow: "Deletion world",
    title: "Did an unlearning method approximate retraining without the data?",
    summary: "Compare the unlearned model with a reference model retrained from scratch on the retained data, using task and privacy-relevant tests.",
    move: "Row move with a retraining reference",
    measure: "Distance from the retrained reference, retained utility, and relevant privacy or attack outcomes",
    method: "Certified removal or empirical unlearning evaluation",
    limit: "Matching one task metric does not prove that every effect of the removed data has disappeared.",
    sourceIds: ["guo2020", "bourtoule2021"],
  },
  {
    id: "privacy-neighbor",
    eyebrow: "Privacy world",
    title: "How distinguishable are neighboring datasets from an algorithm’s release?",
    summary: "Differential privacy bounds changes in output distributions for adjacent inputs; membership inference instead specifies an attacker trying to infer inclusion.",
    move: "Adjacent training worlds plus a release or attacker model",
    measure: "A formal privacy parameter or attack performance—not merely a visible score difference",
    method: "Differential-privacy analysis or membership-inference evaluation",
    limit: "The site’s toy grid illustrates adjacency but cannot certify privacy.",
    sourceIds: ["dwork2006", "shokri2017"],
  },
  {
    id: "poisoning",
    eyebrow: "Adversarial world",
    title: "What if an attacker changes the training data?",
    summary: "Specify the attacker’s feasible data intervention and objective, then compare clean and attacked training worlds on both ordinary and targeted evaluations.",
    move: "Constrained adversarial row move",
    measure: "Clean utility, target success, detectability, and robustness under the threat model",
    method: "Poisoning attack and defense evaluation",
    limit: "An arbitrary cell edit is not a poisoning result; feasibility and the attacker’s knowledge and budget are essential.",
    sourceIds: ["biggio2012", "steinhardt2017"],
  },
];

export const methodFamilies = [
  {
    id: "ablation",
    name: "Retraining and ablation",
    answers: "What changed when a specified training subset was added, removed, or replaced?",
    requires: "A controlled intervention, repeated runs when training is stochastic, and a fixed evaluation plan.",
    doesNot: "Generalize automatically beyond the tested model, data definition, or evaluation distribution.",
    sourceIds: ["koh2017", "swayamdipta2020"],
  },
  {
    id: "semivalues",
    name: "Shapley-style data valuation",
    answers: "What allocation does a specified cooperative-game value assign from marginal contributions across coalitions?",
    requires: "A player set, characteristic function, allocation or semivalue rule, and usually a documented approximation scheme.",
    doesNot: "Prove moral fairness, determine a market price, or assign context-free value to data.",
    sourceIds: ["ghorbani2019", "jia2019"],
  },
  {
    id: "influence",
    name: "Influence and training-data attribution",
    answers: "Which examples are estimated to change a prediction or loss under a specified infinitesimal reweighting approximation?",
    requires: "A method-specific approximation and validation against retraining or another relevant reference.",
    doesNot: "Make every influence estimate causal or reliable for deep, non-convex training.",
    sourceIds: ["koh2017"],
  },
  {
    id: "evaluation",
    name: "Held-out and slice evaluation",
    answers: "How precisely is a fixed target estimated, how does the model behave on a different target, or how does evidence change a decision?",
    requires: "A declared comparison type, construct, sampling frame, metric, uncertainty analysis, decision rule where relevant, and contamination controls.",
    doesNot: "Turn estimator sensitivity into information value or establish validity for populations and decisions the evaluation did not represent.",
    sourceIds: ["mitchell2019", "srivastava2023", "liang2023"],
  },
  {
    id: "privacy",
    name: "Privacy guarantees and attacks",
    answers: "How much can a release change across adjacent datasets, or what can a specified attacker infer about membership?",
    requires: "A formal mechanism and adjacency definition for differential privacy, or an explicit attacker and observation model for membership inference.",
    doesNot: "Follow from a small task-performance difference between two visible grid cells.",
    sourceIds: ["dwork2006", "shokri2017"],
  },
  {
    id: "unlearning",
    name: "Machine unlearning",
    answers: "How closely does a deletion procedure approximate an appropriate retraining or certified-removal reference?",
    requires: "A deletion request, retained-data reference, utility tests, and method-appropriate privacy or indistinguishability tests.",
    doesNot: "Prove universal erasure merely because accuracy matches the retrained model.",
    sourceIds: ["guo2020", "bourtoule2021"],
  },
  {
    id: "collective-action",
    name: "Data leverage and collective action",
    answers: "Under a stated strategic model, can coordinated control of data change payoffs or the distribution of surplus?",
    requires: "Technical dependence, feasible control, outside options, participation costs, timing, strategy sets, information, and a bargaining or equilibrium concept.",
    doesNot: "Derive leverage, price, compensation, or welfare from a model-performance delta alone.",
    sourceIds: ["vincent2021", "hardt2023"],
  },
  {
    id: "feedback",
    name: "Human-feedback ablation",
    answers: "How does a defined feedback source or weighting rule affect reward modeling, policy behavior, or evaluation?",
    requires: "A stage-specific intervention, held-out evaluation, and care around annotator and task heterogeneity.",
    doesNot: "Assign one scalar value to feedback that is reused across training, evaluation, and governance roles.",
    sourceIds: ["stiennon2020", "ouyang2022", "casper2023"],
  },
];

export function resolveSources(sourceIds = []) {
  return sourceIds.map((id) => ({ id, ...sources[id] })).filter((source) => source.href);
}
