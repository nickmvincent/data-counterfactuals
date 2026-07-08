export const signalOptions = [
  {
    id: "preferences",
    label: "Preference rankings",
    short: "Rankings",
    description: "Humans compare candidate outputs so a reward model can learn which behavior is preferred.",
    formula: "r_theta(prompt, chosen) > r_theta(prompt, rejected)",
    weights: { demonstration: 0.34, reward: 1, policy: 0.86, evaluation: 0.46, governance: 0.72 },
  },
  {
    id: "demonstrations",
    label: "Demonstrations",
    short: "Demos",
    description: "Humans write or edit target behavior before later preference and policy optimization steps.",
    formula: "pi_sft = fine-tune(pi_base, D_demo)",
    weights: { demonstration: 1, reward: 0.46, policy: 0.64, evaluation: 0.36, governance: 0.48 },
  },
  {
    id: "critiques",
    label: "Critiques and rubrics",
    short: "Critiques",
    description: "Humans name failure modes, scoring rules, and qualitative standards that make feedback more legible.",
    formula: "r_theta = learn(preferences, rubric_context)",
    weights: { demonstration: 0.52, reward: 0.86, policy: 0.58, evaluation: 0.8, governance: 0.68 },
  },
  {
    id: "redteam",
    label: "Red-team traces",
    short: "Red team",
    description: "Humans search for harmful, brittle, or evasive behavior and turn those discoveries into training or eval signal.",
    formula: "pi' = update(pi, failures, refusals, mitigations)",
    weights: { demonstration: 0.42, reward: 0.72, policy: 0.8, evaluation: 1, governance: 0.84 },
  },
  {
    id: "usage",
    label: "Deployment feedback",
    short: "Usage",
    description: "Prompts, ratings, reports, and support traces reveal which behaviors matter after release.",
    formula: "D_next = collect(policy_use, ratings, reports)",
    weights: { demonstration: 0.36, reward: 0.62, policy: 0.74, evaluation: 0.7, governance: 1 },
  },
];

export const interventionOptions = [
  {
    id: "include",
    label: "Include",
    description: "The signal is available for post-training and downstream measurement.",
    trainingScale: 1,
    evalScale: 0.72,
    leverage: 0.18,
  },
  {
    id: "remove",
    label: "Remove",
    description: "The post-training run proceeds without this signal.",
    trainingScale: 0,
    evalScale: 0.2,
    leverage: 0.24,
  },
  {
    id: "reweight",
    label: "Reweight",
    description: "The signal remains available, but its effective weight changes.",
    trainingScale: 1.2,
    evalScale: 0.7,
    leverage: 0.28,
  },
  {
    id: "reserve",
    label: "Reserve for eval",
    description: "The signal is kept out of training so it can test or audit the result.",
    trainingScale: 0.26,
    evalScale: 1.2,
    leverage: 0.42,
  },
  {
    id: "withhold",
    label: "Withhold access",
    description: "The signal is strategically unavailable unless governance or licensing terms change.",
    trainingScale: 0.12,
    evalScale: 0.42,
    leverage: 1,
  },
];

export const governanceOptions = [
  {
    id: "open",
    label: "Open access",
    multiplier: 1,
    leverage: 0.24,
    note: "The operator can use the data with little friction.",
  },
  {
    id: "licensed",
    label: "Licensed access",
    multiplier: 0.86,
    leverage: 0.62,
    note: "The data flow depends on enforceable terms.",
  },
  {
    id: "collective",
    label: "Collective bargaining",
    multiplier: 0.72,
    leverage: 1,
    note: "The data source can coordinate contribution, refusal, or conditions.",
  },
];

export const stages = [
  {
    id: "demonstration",
    label: "Demonstrations / SFT",
    verb: "shows",
    description: "Human examples define target behavior before reward optimization.",
  },
  {
    id: "reward",
    label: "Reward model",
    verb: "ranks",
    description: "Comparisons, critiques, and rubrics teach the scoring function.",
  },
  {
    id: "policy",
    label: "RL policy update",
    verb: "steers",
    description: "The policy is optimized toward the learned reward signal.",
  },
  {
    id: "evaluation",
    label: "Eval and red-team loop",
    verb: "reveals",
    description: "Held-out feedback finds failure modes and launch-relevant behavior.",
  },
  {
    id: "governance",
    label: "Access and leverage",
    verb: "conditions",
    description: "Rights, provenance, and coordination shape which feedback worlds exist.",
  },
];

export function clampPostTrainingValue(value, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

export function formatPostTrainingPercent(value) {
  return `${Math.round(clampPostTrainingValue(value) * 100)}%`;
}

export function buildPostTrainingModel({ signal, intervention, governance, participation }) {
  const participationScale = participation / 100;
  const reweightScale = intervention.id === "reweight" ? 1.16 : 1;
  const trainingFlow = intervention.trainingScale * governance.multiplier * participationScale * reweightScale;
  const evalFlow = intervention.evalScale * participationScale;
  const leverageFlow = clampPostTrainingValue((intervention.leverage + governance.leverage) / 2);

  const stageScores = stages.map((stage) => {
    const base = signal.weights[stage.id] || 0;
    const stageScale =
      stage.id === "evaluation"
        ? evalFlow
        : stage.id === "governance"
          ? 0.35 + leverageFlow * 0.8
          : trainingFlow;
    return {
      ...stage,
      score: clampPostTrainingValue(base * stageScale),
    };
  });

  const stageScore = (id) => stageScores.find((stage) => stage.id === id)?.score || 0;
  const behavior =
    stageScore("demonstration") * 0.34 +
    stageScore("reward") * 0.34 +
    stageScore("policy") * 0.32;
  const safety =
    stageScore("reward") * 0.24 +
    stageScore("policy") * 0.26 +
    stageScore("evaluation") * 0.5;
  const measurement =
    stageScore("evaluation") * 0.78 +
    stageScore("governance") * 0.22;
  const leverage = clampPostTrainingValue(stageScore("governance"));

  return {
    stageScores,
    metrics: [
      {
        label: "Behavior steering",
        value: clampPostTrainingValue(behavior),
        body: "How strongly this signal can shape model behavior after pretraining.",
      },
      {
        label: "Safety boundary",
        value: clampPostTrainingValue(safety),
        body: "How much the signal helps identify or reinforce boundaries around risky behavior.",
      },
      {
        label: "Measurement value",
        value: clampPostTrainingValue(measurement),
        body: "How useful the signal is for evaluating, auditing, or contesting a model claim.",
      },
      {
        label: "Governance leverage",
        value: leverage,
        body: "How much access conditions, coordination, or licensing affect the available data world.",
      },
    ],
    summary:
      intervention.id === "withhold"
        ? "This counterfactual shifts value away from direct optimization and toward bargaining power over future feedback."
        : intervention.id === "reserve"
          ? "This counterfactual sacrifices some training signal so the same human data can become more valuable evidence."
          : intervention.id === "remove"
            ? "This counterfactual asks what the post-training pipeline loses when this human signal disappears."
            : intervention.id === "reweight"
              ? "This counterfactual asks how model behavior changes when this feedback source counts more heavily."
              : "This baseline keeps the human signal available across the post-training pipeline.",
  };
}

export function findPostTrainingOption(options, id) {
  return options.find((option) => option.id === id) || options[0];
}
