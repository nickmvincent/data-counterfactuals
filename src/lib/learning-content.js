export const homeSignalColumns = [
  { id: "heldout", label: "held-out" },
  { id: "shift", label: "shift" },
  { id: "stress", label: "stress" },
  { id: "policy", label: "policy" },
];

export const homeSignalRows = [
  {
    id: "full",
    label: "full",
    cells: [
      { colId: "heldout", value: "0.92" },
      { colId: "shift", value: "0.78" },
      { colId: "stress", value: "0.64" },
      { colId: "policy", value: "0.71" },
    ],
  },
  {
    id: "minus-b",
    label: "minus B",
    cells: [
      { colId: "heldout", value: "0.83" },
      { colId: "shift", value: "0.48", tone: "warm" },
      { colId: "stress", value: "0.61" },
      { colId: "policy", value: "0.68" },
    ],
  },
  {
    id: "new-eval",
    label: "new eval",
    cells: [
      { colId: "heldout", value: "0.89" },
      { colId: "shift", value: "0.72" },
      { colId: "stress", value: "0.76" },
      { colId: "policy", value: "0.70" },
    ],
  },
  {
    id: "post-train",
    label: "post-train",
    cells: [
      { colId: "heldout", value: "0.87", tone: "bright" },
      { colId: "shift", value: "0.81", tone: "bright" },
      { colId: "stress", value: "0.82", tone: "bright" },
      { colId: "policy", value: "0.79", tone: "bright" },
    ],
  },
];

export const homeNextLinks = [
  {
    href: "/memo/data-counterfactuals",
    title: "Launch memo",
    body: "The original written argument for the project.",
  },
  {
    href: "/grid",
    title: "Grid explorer",
    body: "The toy train/eval counterfactual board.",
  },
];

export const primerBoardColumns = [
  { id: "main", label: "main eval" },
  { id: "shift", label: "shift eval" },
  { id: "holdout", label: "holdout" },
];

export const primerBoardRows = [
  {
    id: "current",
    label: "current",
    cells: [
      { colId: "main", value: "0.92" },
      { colId: "shift", value: "0.78" },
      { colId: "holdout", value: "0.64" },
    ],
  },
  {
    id: "without",
    label: "without B",
    cells: [
      { colId: "main", value: "0.83" },
      { colId: "shift", value: "0.48" },
      { colId: "holdout", value: "0.61" },
    ],
  },
  {
    id: "new-eval",
    label: "new eval",
    cells: [
      { colId: "main", value: "0.89" },
      { colId: "shift", value: "0.72" },
      { colId: "holdout", value: "0.76" },
    ],
  },
  {
    id: "reserved",
    label: "reserved",
    cells: [
      { colId: "main", value: "0.87" },
      { colId: "shift", value: "0.81" },
      { colId: "holdout", value: "0.82" },
    ],
  },
];

export const primerBoardHighlights = [
  { variant: "baseline", row: "current", col: "main", tone: "warm" },
  { variant: "row", row: "without", col: "main", tone: "warm" },
  { variant: "column", row: "current", col: "shift", tone: "warm" },
  { variant: "rights", row: "reserved", col: "holdout", tone: "warm" },
];

export const primerBoardBaselines = [
  { variant: "row", row: "current", col: "main", tone: "base" },
  { variant: "column", row: "current", col: "main", tone: "base" },
  { variant: "rights", row: "current", col: "main", tone: "base" },
];

export const primerScenes = [
  {
    variant: "baseline",
    kicker: "The baseline",
    title: "Begin with the model you actually trained.",
    body: "A model comes from a data world: some sources were included, some were missing, and some were used only for testing. The first cell is the ordinary case. Train on the data you have, measure on the evaluation slice you care about, and write down what happened.",
    caption: "The current row is the world we usually start from.",
  },
  {
    variant: "row",
    kicker: "Row move",
    title: "Then ask what changes if training data change.",
    body: "Remove one source, add another, reweight a group, or imagine a coordinated withdrawal. The model is retrained in a nearby world, while the evaluation question stays fixed. This is the basic training-data counterfactual.",
    caption: "A row move compares two training worlds against the same evaluation column.",
  },
  {
    variant: "column",
    kicker: "Column move",
    title: "Sometimes the model changes less than the measurement.",
    body: "A held-out benchmark, red-team set, or new evaluation slice can reveal a failure that the original score hid. In that case the data are valuable because they change what we can truthfully claim about the model.",
    caption: "A column move keeps the model fixed and changes the evidence used to judge it.",
  },
  {
    variant: "rights",
    kicker: "Rights and access",
    title: "The same data can be trainable, evaluable, reserved, licensed, or withheld.",
    body: "Data do not enter AI systems as neutral tokens. Provenance, permission, contamination controls, independence, and bargaining power decide which worlds are available and which comparisons should be trusted.",
    caption: "A governance move changes which rows and columns are available on acceptable terms.",
  },
];

export const pipelineSteps = ["demonstrations", "preferences", "reward model", "policy update", "evaluation"];

export const learningParts = [
  {
    label: "Part 1",
    title: "Orientation",
    body: "Start here if the phrase is new. These pages explain the basic counterfactual object before the notation gets dense.",
    items: [
      {
        href: "/story",
        title: "Quick primer",
        type: "Article",
        body: "A short visual introduction to row moves, column moves, governance moves, and post-training feedback.",
      },
      {
        href: "/memo/data-counterfactuals",
        title: "Launch memo",
        type: "Memo",
        body: "The written argument for why data counterfactuals connect valuation, evaluation, data leverage, privacy, and related work.",
      },
    ],
  },
  {
    label: "Part 2",
    title: "Explorers",
    body: "Use these when you want to manipulate the toy worlds directly instead of only reading about them.",
    items: [
      {
        href: "/grid",
        title: "Grid explorer",
        type: "Interactive",
        body: "Rows are training worlds, columns are evaluation worlds, and cells are measured outcomes.",
      },
      {
        href: "/graph",
        title: "Graph explorer",
        type: "Interactive",
        body: "The same subset worlds as paths, edges, strike trajectories, and valuation sweeps.",
      },
      {
        href: "/api-explorer",
        title: "API explorer",
        type: "Tool",
        body: "A compact interface for asking the grid and graph questions as structured requests.",
      },
    ],
  },
  {
    label: "Part 3",
    title: "Reference Notes",
    body: "These are slower reference pages. They are useful once the grid metaphor is familiar and the differences between adjacent fields matter.",
    items: [
      {
        href: "/memo/formalisms",
        title: "Formalisms",
        type: "Draft memo",
        body: "A map from influence, valuation, selection, privacy, poisoning, and unlearning into the shared frame.",
      },
      {
        href: "/memo/evaluation-counterfactuals",
        title: "Evaluation counterfactuals",
        type: "Memo",
        body: "Why some data are most valuable when kept out of training and used to measure, audit, or govern.",
      },
      {
        href: "/post-training",
        title: "Human feedback value",
        type: "Stub",
        body: "A provisional page for value pathways that run through demonstrations, preferences, reward models, and post-training feedback.",
      },
      {
        href: "/collections",
        title: "Related work",
        type: "Shelf",
        body: "A broader collection of papers, projects, and neighboring concepts.",
      },
    ],
  },
];

export const readingPath = [
  "If you have five minutes: read the quick primer, then open the grid.",
  "If you are teaching this: pair the launch memo with the grid and graph explorers.",
  "If you are doing research: read the formalisms note, then use the related-work shelf to branch outward.",
  "If your question is about RLHF or human feedback: treat the post-training page as a stub, not a settled measurement recipe.",
];

export const paperTrail = [
  {
    href: "https://proceedings.mlr.press/v70/koh17a.html",
    title: "Influence functions",
    body: "A classic counterfactual question about what happens when a training point is removed or perturbed.",
  },
  {
    href: "https://arxiv.org/abs/1904.02868",
    title: "Data Shapley",
    body: "A canonical valuation method based on averaging marginal contributions across many subsets.",
  },
  {
    href: "https://proceedings.mlr.press/v162/ilyas22a.html",
    title: "Datamodels",
    body: "A way to model how dataset membership affects model predictions across many training subsets.",
  },
  {
    href: "https://arxiv.org/abs/2307.15217",
    title: "Open problems in RLHF",
    body: "A survey of limitations and disclosure needs for reinforcement learning from human feedback.",
  },
];

export const postTrainingReferences = [
  {
    href: "https://arxiv.org/abs/1706.03741",
    title: "Deep reinforcement learning from human preferences",
    body: "The classic RL-from-human-preferences setup for learning reward models from comparisons.",
  },
  {
    href: "https://arxiv.org/abs/2009.01325",
    title: "Learning to summarize from human feedback",
    body: "A language-task example where preference data train a reward model used for policy optimization.",
  },
  {
    href: "https://arxiv.org/abs/2203.02155",
    title: "Training language models to follow instructions with human feedback",
    body: "The InstructGPT paper: demonstrations, rankings, reward modeling, and RLHF for instruction following.",
  },
  {
    href: "https://arxiv.org/abs/2307.15217",
    title: "Open Problems and Fundamental Limitations of RLHF",
    body: "A survey of technical limitations, practical failure modes, and disclosure needs for human-feedback systems.",
  },
  {
    href: "https://arxiv.org/abs/2604.02507",
    title: "Reinforcement Learning from Human Feedback: A Statistical Perspective",
    body: "A recent survey that frames RLHF around noisy, subjective feedback, reward modeling, policy optimization, and open challenges.",
  },
  {
    href: "https://arxiv.org/abs/1904.02868",
    title: "Data Shapley: Equitable Valuation of Data for Machine Learning",
    body: "A canonical data-valuation frame for supervised learning, useful here as a contrast with staged post-training pipelines.",
  },
  {
    href: "https://arxiv.org/abs/2511.12863",
    title: "Rethinking Data Value: Asymmetric Data Shapley",
    body: "A recent valuation proposal that explicitly challenges the interchangeability assumption in sequential ML workflows.",
  },
  {
    href: "https://arxiv.org/abs/2507.09424",
    title: "DATE-LM: Benchmarking Data Attribution Evaluation for Large Language Models",
    body: "Evidence that LLM data-attribution methods remain task-sensitive and do not yet give one dominant general-purpose answer.",
  },
  {
    href: "https://arxiv.org/abs/2310.16787",
    title: "The Data Provenance Initiative",
    body: "A large-scale audit showing why provenance, licensing, and dataset documentation matter before valuation claims can be trusted.",
  },
];

export const postTrainingValueModes = [
  {
    title: "Steering value",
    body: "A feedback source might shape demonstrations, reward modeling, policy updates, or refusal behavior.",
  },
  {
    title: "Evaluation value",
    body: "A feedback source might be more useful as held-out evidence, red-team material, or audit data.",
  },
  {
    title: "Governance value",
    body: "Access, licensing, provenance, and coordinated contribution can decide which feedback worlds exist.",
  },
];
