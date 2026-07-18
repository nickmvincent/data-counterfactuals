import { SILO_OPT_OUT_STUDY } from "../data/silo-opt-out.js";

export const LAB_SCHEMA = "data-counterfactuals/lab-state";
export const LAB_VERSION = 1;
export const DEFAULT_SCENARIO_ID = "one-removal";
export const STORAGE_KEY = "data-counterfactuals.lab-state.v1";
export const EXPLAINER_STORAGE_KEY = "data-counterfactuals.explainer-dismissed.v1";

const SAFE_ENUMERATION_OBJECTS = 14;
const EXACT_WORLD_LIMIT = 256n;
const EXACT_CELL_LIMIT = 65_536n;
const WINDOWED_WORLD_LIMIT = 16_384n;

const ORIGINS = [
  "external",
  "modeler",
  "evaluator",
  "governance",
  "collective-action",
  "adversarial",
  "operator",
];

const OPERATION_KINDS = [
  "remove",
  "add",
  "reserve-eval",
  "withdraw",
  "scale",
  "corrupt",
  "unlearn-audit",
  "select",
];

export const METRICS = [
  {
    id: "coverage",
    name: "Normalized coverage",
    formula: "|train ∩ eval| / |eval|",
    range: "[0, 1]",
  },
  {
    id: "jaccard",
    name: "Jaccard overlap",
    formula: "|train ∩ eval| / |train ∪ eval|",
    range: "[0, 1]",
  },
  {
    id: "raw-overlap",
    name: "Raw overlap",
    formula: "|train ∩ eval|",
    range: "[0, |eval|]",
  },
  {
    id: "weighted-coverage",
    name: "Weighted coverage",
    formula: "weight(train ∩ eval) / weight(eval)",
    range: "[0, 1]",
  },
  {
    id: "toy-poisoned-coverage",
    name: "Toy poisoned coverage",
    formula: "coverage − penalty × corrupted eval objects",
    range: "[0, 1]",
  },
  {
    id: "empirical-perplexity",
    name: "Published perplexity",
    formula: "published test perplexity",
    range: "lower is better",
    empiricalOnly: true,
  },
];

function object(id, weight = 1) {
  return { id, label: id, weight };
}

function world(train, evaluation, corrupted = []) {
  return {
    train: [...train],
    eval: [...evaluation],
    ...(corrupted.length ? { corrupted: [...corrupted] } : {}),
  };
}

export const SCENARIOS = [
  {
    id: "one-removal",
    title: "One removal",
    eyebrow: "Start here",
    question: "Which two worlds show what changes when B is removed from training?",
    summary:
      "Hold evaluation fixed, remove one training object, and compare the resulting score.",
    objects: [object("A"), object("B"), object("C")],
    baseline: world(["A", "B", "C"], ["A", "B", "C"]),
    counterfactual: world(["A", "C"], ["A", "B", "C"]),
    operation: { origin: "modeler", kind: "remove", targets: ["B"] },
    focus: ["B"],
    metric: { id: "coverage", parameters: {} },
    advanced: {
      budget: null,
      poisonPenalty: 0.15,
      candidateUnlearnedScore: null,
    },
    notes: {
      heldFixed: "The evaluation world ABC and the score rule.",
      changed: "Access to B in the training world.",
      boundary:
        "The score illustrates a comparison structure; it is not a claim about a trained model.",
    },
  },
  {
    id: "silo-opt-out",
    title: "SILO data opt-out",
    eyebrow: "Observed · ICLR 2024",
    question:
      "What changes when related books are removed from SILO's inference datastore?",
    summary:
      "Compare published perplexities with and without related-series books in a fixed retrieval datastore.",
    objects: [{ id: "R", label: "Related-series books", weight: 1 }],
    baseline: world(["R"], ["R"]),
    counterfactual: world([], ["R"]),
    operation: { origin: "governance", kind: "remove", targets: ["R"] },
    focus: ["R"],
    metric: { id: "empirical-perplexity", parameters: {} },
    advanced: {
      budget: null,
      poisonPenalty: 0.15,
      candidateUnlearnedScore: null,
    },
    empirical: SILO_OPT_OUT_STUDY,
    notes: {
      heldFixed:
        "The SILO pdsw 1.3B parametric model, datastore size, and held-out evaluation book.",
      changed:
        "Whether the other six books in the held-out book's series are available to the retrieval datastore.",
      boundary:
        "This is an inference-time retrieval-access counterfactual, not a training-set ablation or proof of memorization.",
    },
  },
  {
    id: "evaluation-shift",
    title: "Evaluation shift",
    eyebrow: "Change the question",
    question: "Which two worlds show what changes when C becomes part of evaluation?",
    summary:
      "Keep training fixed while the evaluation world changes from AB to ABC.",
    objects: [object("A"), object("B"), object("C")],
    baseline: world(["A", "B"], ["A", "B"]),
    counterfactual: world(["A", "B"], ["A", "B", "C"]),
    operation: { origin: "evaluator", kind: "reserve-eval", targets: ["C"] },
    focus: ["C"],
    metric: { id: "coverage", parameters: {} },
    advanced: {
      budget: null,
      poisonPenalty: 0.15,
      candidateUnlearnedScore: null,
    },
    notes: {
      heldFixed: "The training world AB and the score rule.",
      changed: "The evaluation lens expands to include C.",
      boundary:
        "This is an evaluation counterfactual, not a training transition.",
    },
  },
  {
    id: "coalition-strike",
    title: "Coalition strike",
    eyebrow: "Collective action",
    question: "Which comparison represents B and C withholding their data together?",
    summary:
      "Compare the full training world with the endpoint after a coalition withdraws.",
    objects: [object("A"), object("B"), object("C"), object("D")],
    baseline: world(["A", "B", "C", "D"], ["A", "B", "C", "D"]),
    counterfactual: world(["A", "D"], ["A", "B", "C", "D"]),
    operation: {
      origin: "collective-action",
      kind: "withdraw",
      targets: ["B", "C"],
    },
    focus: ["B", "C"],
    metric: { id: "coverage", parameters: {} },
    advanced: {
      budget: null,
      poisonPenalty: 0.15,
      candidateUnlearnedScore: null,
    },
    notes: {
      heldFixed: "The evaluation world ABCD.",
      changed: "The coalition BC withholds access.",
      boundary:
        "The endpoint comparison is stable here; richer training systems can depend on withdrawal order.",
    },
  },
  {
    id: "scaling",
    title: "Scaling",
    eyebrow: "A family of worlds",
    question: "How does average score change as the training world grows?",
    summary:
      "Compare graph layers and grid rows grouped by retained training-set size.",
    objects: ["A", "B", "C", "D", "E"].map((id) => object(id)),
    baseline: world([], ["A", "B", "C", "D", "E"]),
    counterfactual: world(
      ["A", "B", "C", "D", "E"],
      ["A", "B", "C", "D", "E"],
    ),
    operation: { origin: "modeler", kind: "scale", targets: [] },
    focus: [],
    metric: { id: "coverage", parameters: {} },
    advanced: {
      budget: null,
      poisonPenalty: 0.15,
      candidateUnlearnedScore: null,
    },
    notes: {
      heldFixed: "The evaluation world ABCDE.",
      changed: "The number and identity of retained training objects.",
      boundary:
        "The layer average summarizes this toy score, not an empirical neural scaling law.",
    },
  },
  {
    id: "poisoning",
    title: "Poisoning",
    eyebrow: "Threat-model illustration",
    question:
      "Which worlds isolate the effect of changing B into a corrupted training record?",
    summary:
      "Compare clean ABC with AB*C under an explicit, inspectable toy penalty.",
    objects: [object("A"), object("B"), object("C")],
    baseline: world(["A", "B", "C"], ["A", "B", "C"]),
    counterfactual: world(
      ["A", "B", "C"],
      ["A", "B", "C"],
      ["B"],
    ),
    operation: { origin: "adversarial", kind: "corrupt", targets: ["B"] },
    focus: ["B"],
    metric: { id: "toy-poisoned-coverage", parameters: {} },
    advanced: {
      budget: null,
      poisonPenalty: 0.15,
      candidateUnlearnedScore: null,
    },
    notes: {
      heldFixed: "Training membership and the clean evaluation world ABC.",
      changed: "B is replaced by a corrupted variant B*.",
      boundary:
        "This transparent penalty is a threat-model illustration, not a realistic poisoning benchmark.",
    },
  },
  {
    id: "unlearning-audit",
    title: "Unlearning audit",
    eyebrow: "Choose a reference",
    question: "What reference world should an unlearning result be compared with?",
    summary:
      "Use exact retraining without B as the reference for auditing a candidate result.",
    objects: [object("A"), object("B"), object("C"), object("D")],
    baseline: world(["A", "B", "C", "D"], ["A", "B", "C", "D"]),
    counterfactual: world(["A", "C", "D"], ["A", "B", "C", "D"]),
    operation: {
      origin: "operator",
      kind: "unlearn-audit",
      targets: ["B"],
    },
    focus: ["B"],
    metric: { id: "coverage", parameters: {} },
    advanced: {
      budget: null,
      poisonPenalty: 0.15,
      candidateUnlearnedScore: 0.71,
    },
    notes: {
      heldFixed: "The evaluation world ABCD.",
      changed: "B is omitted in the exact-retrain reference.",
      boundary:
        "The candidate is an overlay for comparison; the lab does not implement a production unlearning algorithm.",
    },
  },
  {
    id: "budget-selection",
    title: "Budgeted selection",
    eyebrow: "Optimization",
    question: "With room for only two training objects, which retained world scores highest?",
    summary:
      "Inspect the size-two layer using explicit object weights and an ACE evaluation world.",
    objects: [
      object("A", 0.32),
      object("B", 0.05),
      object("C", 0.26),
      object("D", 0.12),
      object("E", 0.25),
    ],
    baseline: world(["A", "B"], ["A", "C", "E"]),
    counterfactual: world(["A", "C"], ["A", "C", "E"]),
    operation: { origin: "modeler", kind: "select", targets: ["A", "C"] },
    focus: ["A", "C"],
    metric: { id: "weighted-coverage", parameters: {} },
    advanced: {
      budget: 2,
      poisonPenalty: 0.15,
      candidateUnlearnedScore: null,
    },
    notes: {
      heldFixed: "The evaluation world ACE and the capacity k=2.",
      changed: "Which two objects are retained.",
      boundary:
        "The highlighted optimum follows only from the visible toy weights.",
    },
  },
];

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function unique(values) {
  return [...new Set(values)];
}

function sorted(values) {
  return [...values].sort((a, b) => a.localeCompare(b));
}

function clamp(value, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function setIntersection(left, right) {
  const rightSet = new Set(right);
  return left.filter((value) => rightSet.has(value));
}

function setUnion(left, right) {
  return unique([...left, ...right]);
}

function symmetricDifferenceSize(left, right) {
  const a = new Set(left);
  const b = new Set(right);
  let count = 0;
  for (const value of a) if (!b.has(value)) count += 1;
  for (const value of b) if (!a.has(value)) count += 1;
  return count;
}

export function getScenario(id) {
  return SCENARIOS.find((scenario) => scenario.id === id) || SCENARIOS[0];
}

export function getEmpiricalStudy(state) {
  if (!state || state.scenario === "custom") return null;
  const scenario = getScenario(state.scenario);
  if (scenario.metric?.id !== state.metric?.id) return null;
  return scenario.empirical || null;
}

export function createInitialState(id = DEFAULT_SCENARIO_ID) {
  const scenario = clone(getScenario(id));
  const baselineEvidence = worldKey(scenario.baseline);
  return {
    schema: LAB_SCHEMA,
    version: LAB_VERSION,
    mode: "guided",
    view: "grid",
    scenario: scenario.id,
    objects: scenario.objects,
    baseline: scenario.baseline,
    counterfactual: scenario.counterfactual,
    operation: scenario.operation,
    focus: scenario.focus,
    metric: scenario.metric,
    selection: {
      worldIds: [],
      evidence: [baselineEvidence],
      worldA: [],
      worldB: [],
      activeWorld: "a",
    },
    advanced: scenario.advanced,
    display: {
      numbers: true,
      resourceHud: true,
      reducedMotionOverride: null,
    },
  };
}

export function createExploreState() {
  const state = createInitialState(DEFAULT_SCENARIO_ID);
  const ids = state.objects.map((item) => item.id);
  const emptyWorld = world([], ids);
  return {
    ...state,
    mode: "explore",
    scenario: "custom",
    baseline: clone(emptyWorld),
    counterfactual: clone(emptyWorld),
    operation: { origin: "modeler", kind: "select", targets: [] },
    focus: [],
    selection: {
      worldIds: [],
      evidence: [],
      worldA: [],
      worldB: [],
      activeWorld: "a",
    },
  };
}

export function getScenarioNotes(state) {
  if (state.scenario === "custom") {
    return {
      heldFixed: "Whatever remains identical between the two configured worlds.",
      changed: "The train, evaluation, corruption, or operation fields you edited.",
      boundary:
        "The active metric is a transparent toy function; interpret the comparison structure, not a real model outcome.",
    };
  }
  return getScenario(state.scenario).notes;
}

export function worldKey(value) {
  const train = sorted(value?.train || []).join(",");
  const evaluation = sorted(value?.eval || []).join(",");
  const corrupted = sorted(value?.corrupted || []).join(",");
  return `train:${train}|eval:${evaluation}|corrupted:${corrupted}`;
}

export function worldFromKey(key) {
  if (typeof key !== "string") return null;
  const match = key.match(
    /^train:([^|]*)\|eval:([^|]*)\|corrupted:([^|]*)$/,
  );
  if (!match) return null;
  const values = (part) => (part ? part.split(",").filter(Boolean) : []);
  return {
    train: values(match[1]),
    eval: values(match[2]),
    ...(match[3] ? { corrupted: values(match[3]) } : {}),
  };
}

export function worldLabel(value, options = {}) {
  const corrupted = new Set(value?.corrupted || []);
  const train = sorted(value?.train || [])
    .map((id) => (corrupted.has(id) ? `${id}*` : id))
    .join("");
  const evaluation = sorted(value?.eval || []).join("");
  const empty = options.emptyLabel || "∅";
  return `${train || empty} / ${evaluation || empty}`;
}

export function subsetLabel(values, corruptedValues = []) {
  const corrupted = new Set(corruptedValues);
  const label = sorted(values)
    .map((id) => (corrupted.has(id) ? `${id}*` : id))
    .join("");
  return label || "∅";
}

export function expectedEvidence(state) {
  return [worldKey(state.baseline), worldKey(state.counterfactual)];
}

export function comparisonMatched(state) {
  const evidence = new Set(state.selection?.evidence || []);
  return expectedEvidence(state).every((key) => evidence.has(key));
}

export function evaluateMetric(state, value) {
  const train = unique(value?.train || []);
  const evaluation = unique(value?.eval || []);
  const overlap = setIntersection(train, evaluation);
  const metricId = state.metric?.id || "coverage";

  if (metricId === "empirical-perplexity") {
    const study = getEmpiricalStudy(state);
    const observation = study?.observedWorlds.find(
      (item) => worldKey(item.world) === worldKey(value),
    );
    return observation ? observation.value : null;
  }

  if (metricId === "raw-overlap") return overlap.length;

  if (metricId === "jaccard") {
    const denominator = setUnion(train, evaluation).length;
    return denominator === 0 ? 1 : overlap.length / denominator;
  }

  if (metricId === "weighted-coverage") {
    const weights = new Map(
      state.objects.map((item) => [item.id, Number(item.weight) || 0]),
    );
    const denominator = evaluation.reduce(
      (sum, id) => sum + (weights.get(id) || 0),
      0,
    );
    const numerator = overlap.reduce(
      (sum, id) => sum + (weights.get(id) || 0),
      0,
    );
    return denominator === 0 ? 1 : numerator / denominator;
  }

  const coverage =
    evaluation.length === 0 ? 1 : overlap.length / evaluation.length;

  if (metricId === "toy-poisoned-coverage") {
    const corrupted = setIntersection(value?.corrupted || [], evaluation);
    const penalty = Number(state.advanced?.poisonPenalty ?? 0.15);
    return clamp(coverage - Math.max(0, penalty) * corrupted.length);
  }

  return coverage;
}

export function deriveComparison(state) {
  const baselineScore = evaluateMetric(state, state.baseline);
  const counterfactualScore = evaluateMetric(state, state.counterfactual);
  return {
    baselineScore,
    counterfactualScore,
    delta: counterfactualScore - baselineScore,
    matched: comparisonMatched(state),
  };
}

const EXPLORE_COMPARISON_TYPES = [
  ["training-removal", "Training removals"],
  ["training-addition", "Training additions"],
  ["training-substitution", "Training substitutions"],
  ["evaluation-shift", "Evaluation shifts"],
  ["corruption-change", "Corruption changes"],
  ["joint-shift", "Joint train + evaluation shifts"],
];

function sameMembers(left, right) {
  const leftValues = sorted(left || []);
  const rightValues = sorted(right || []);
  return (
    leftValues.length === rightValues.length &&
    leftValues.every((value, index) => value === rightValues[index])
  );
}

function isSubset(left, right) {
  const rightValues = new Set(right || []);
  return (left || []).every((value) => rightValues.has(value));
}

function comparisonType(left, right) {
  const sameTrain = sameMembers(left.train, right.train);
  const sameEval = sameMembers(left.eval, right.eval);
  const sameCorrupted = sameMembers(left.corrupted, right.corrupted);

  if (sameTrain && sameEval && sameCorrupted) return "same-world";
  if (sameTrain && sameEval) return "corruption-change";
  if (sameTrain) return "evaluation-shift";
  if (!sameEval) return "joint-shift";
  if (isSubset(right.train, left.train)) return "training-removal";
  if (isSubset(left.train, right.train)) return "training-addition";
  return "training-substitution";
}

function changedMembers(left, right) {
  const rightValues = new Set(right || []);
  return (left || []).filter((value) => !rightValues.has(value));
}

function comparisonChangeLabel(type, left, right) {
  if (type === "training-removal") {
    return `Remove ${subsetLabel(changedMembers(left.train, right.train))} from training`;
  }
  if (type === "training-addition") {
    return `Add ${subsetLabel(changedMembers(right.train, left.train))} to training`;
  }
  if (type === "training-substitution") {
    return `Replace ${subsetLabel(changedMembers(left.train, right.train))} with ${subsetLabel(changedMembers(right.train, left.train))} in training`;
  }
  if (type === "evaluation-shift") {
    return `Change evaluation from ${subsetLabel(left.eval)} to ${subsetLabel(right.eval)}`;
  }
  if (type === "corruption-change") {
    return `Change corruption status from ${subsetLabel(left.corrupted || [])} to ${subsetLabel(right.corrupted || [])}`;
  }
  return "Change both the training and evaluation worlds";
}

export function deriveExploreComparisons(state, exampleLimit = 16) {
  const leftWorlds = (state.selection?.worldA || [])
    .map((key) => ({ key, world: worldFromKey(key) }))
    .filter((item) => item.world);
  const rightWorlds = (state.selection?.worldB || [])
    .map((key) => ({ key, world: worldFromKey(key) }))
    .filter((item) => item.world);
  const categoryCounts = new Map(
    EXPLORE_COMPARISON_TYPES.map(([id]) => [id, 0]),
  );
  const comparisons = [];
  let identicalCount = 0;
  let positive = 0;
  let negative = 0;
  let unchanged = 0;

  for (const left of leftWorlds) {
    for (const right of rightWorlds) {
      const type = comparisonType(left.world, right.world);
      if (type === "same-world") {
        identicalCount += 1;
        continue;
      }
      categoryCounts.set(type, (categoryCounts.get(type) || 0) + 1);
      const scoreA = evaluateMetric(state, left.world);
      const scoreB = evaluateMetric(state, right.world);
      const delta = scoreB - scoreA;
      if (delta > 1e-12) positive += 1;
      else if (delta < -1e-12) negative += 1;
      else unchanged += 1;
      comparisons.push({
        type,
        leftKey: left.key,
        rightKey: right.key,
        left: left.world,
        right: right.world,
        scoreA,
        scoreB,
        delta,
        change: comparisonChangeLabel(type, left.world, right.world),
      });
    }
  }

  comparisons.sort((left, right) => {
    const deltaOrder = Math.abs(right.delta) - Math.abs(left.delta);
    if (deltaOrder) return deltaOrder;
    return left.change.localeCompare(right.change);
  });

  return {
    totalPairings: leftWorlds.length * rightWorlds.length,
    counterfactualCount: comparisons.length,
    identicalCount,
    direction: { positive, negative, unchanged },
    categories: EXPLORE_COMPARISON_TYPES.map(([id, label]) => ({
      id,
      label,
      count: categoryCounts.get(id) || 0,
    })).filter((item) => item.count > 0),
    examples: comparisons.slice(0, Math.max(0, exampleLimit)),
  };
}

export function enumerateSubsets(ids) {
  if (ids.length > SAFE_ENUMERATION_OBJECTS) {
    throw new RangeError(
      `Full subset enumeration is disabled above ${SAFE_ENUMERATION_OBJECTS} objects.`,
    );
  }

  const subsets = [];
  const total = 2 ** ids.length;
  for (let mask = 0; mask < total; mask += 1) {
    const subset = [];
    for (let index = 0; index < ids.length; index += 1) {
      if (mask & 2 ** index) subset.push(ids[index]);
    }
    subsets.push(subset);
  }
  return subsets;
}

function relevantSubsets(state, axis, limit) {
  const ids = state.objects.map((item) => item.id);
  const baseline = state.baseline[axis] || [];
  const counterfactual = state.counterfactual[axis] || [];

  if (ids.length <= SAFE_ENUMERATION_OBJECTS) {
    const subsets = enumerateSubsets(ids);
    subsets.sort((left, right) => {
      const leftPriority = Math.min(
        symmetricDifferenceSize(left, baseline),
        symmetricDifferenceSize(left, counterfactual),
      );
      const rightPriority = Math.min(
        symmetricDifferenceSize(right, baseline),
        symmetricDifferenceSize(right, counterfactual),
      );
      if (leftPriority !== rightPriority) return leftPriority - rightPriority;
      if (left.length !== right.length) return left.length - right.length;
      return subsetLabel(left).localeCompare(subsetLabel(right));
    });
    return subsets.slice(0, limit);
  }

  const candidates = [
    baseline,
    counterfactual,
    [],
    ids,
    ...ids.slice(0, Math.max(0, limit - 4)).map((id) => [id]),
  ];
  const seen = new Set();
  return candidates
    .map((subset) => sorted(subset))
    .filter((subset) => {
      const key = subset.join(",");
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, limit);
}

export function getDisplaySubsets(state, axis = "train", limit = 24) {
  const ids = state.objects.map((item) => item.id);
  const workload = deriveWorkload(state);
  if (
    workload.tier === "exact" &&
    ids.length <= SAFE_ENUMERATION_OBJECTS &&
    2 ** ids.length <= limit
  ) {
    return enumerateSubsets(ids).sort((left, right) => {
      if (left.length !== right.length) return left.length - right.length;
      return subsetLabel(left).localeCompare(subsetLabel(right));
    });
  }
  return relevantSubsets(state, axis, limit);
}

export function getGraphEdges(subsets) {
  const edges = [];
  for (let leftIndex = 0; leftIndex < subsets.length; leftIndex += 1) {
    for (
      let rightIndex = leftIndex + 1;
      rightIndex < subsets.length;
      rightIndex += 1
    ) {
      if (
        symmetricDifferenceSize(subsets[leftIndex], subsets[rightIndex]) === 1
      ) {
        edges.push([leftIndex, rightIndex]);
      }
    }
  }
  return edges;
}

export function layerAverages(state) {
  const ids = state.objects.map((item) => item.id);
  if (ids.length > SAFE_ENUMERATION_OBJECTS) return [];
  const evaluation = state.counterfactual.eval;
  const totals = new Map();
  for (const train of enumerateSubsets(ids)) {
    const score = evaluateMetric(state, { train, eval: evaluation });
    const current = totals.get(train.length) || { total: 0, count: 0 };
    current.total += score;
    current.count += 1;
    totals.set(train.length, current);
  }
  return [...totals.entries()].map(([size, value]) => ({
    size,
    average: value.count ? value.total / value.count : 0,
    count: value.count,
  }));
}

export function bestBudgetWorld(state) {
  const budget = Number(state.advanced?.budget);
  const ids = state.objects.map((item) => item.id);
  if (
    !Number.isInteger(budget) ||
    budget < 0 ||
    ids.length > SAFE_ENUMERATION_OBJECTS
  ) {
    return null;
  }
  const evaluation = state.counterfactual.eval;
  let best = null;
  for (const train of enumerateSubsets(ids)) {
    if (train.length !== budget) continue;
    const score = evaluateMetric(state, { train, eval: evaluation });
    if (!best || score > best.score) best = { train, score };
  }
  return best;
}

export function deriveWorkload(state, visibleMarks = 0, frameTime = null) {
  const objectCount = BigInt(state.objects.length);
  const worlds = 1n << objectCount;
  const cells = worlds * worlds;
  const edges =
    objectCount === 0n ? 0n : objectCount * (1n << (objectCount - 1n));
  const estimatedBytes = cells * 8n;
  let tier = "aggregate";
  if (
    worlds <= EXACT_WORLD_LIMIT &&
    cells <= EXACT_CELL_LIMIT &&
    edges <= 8_192n
  ) {
    tier = "exact";
  } else if (worlds <= WINDOWED_WORLD_LIMIT) {
    tier = "windowed";
  }
  return {
    tier,
    backend: "Canvas 2D + semantic controls",
    objectCount: Number(objectCount),
    worlds,
    cells,
    edges,
    visibleMarks,
    frameTime,
    estimatedBytes,
  };
}

export function formatCount(value) {
  const bigint = typeof value === "bigint" ? value : BigInt(value);
  if (bigint < 1_000_000n) return bigint.toLocaleString("en-US");
  const digits = bigint.toString();
  const exponent = digits.length - 1;
  const mantissa = `${digits[0]}.${digits.slice(1, 3)}`.replace(/\.$/, "");
  return `${mantissa}e${exponent}`;
}

export function formatBytes(value) {
  const bigint = typeof value === "bigint" ? value : BigInt(value);
  const units = [
    ["TB", 1_099_511_627_776n],
    ["GB", 1_073_741_824n],
    ["MB", 1_048_576n],
    ["KB", 1_024n],
  ];
  for (const [label, unit] of units) {
    if (bigint >= unit) {
      const tenths = (bigint * 10n) / unit;
      return `${Number(tenths) / 10} ${label}`;
    }
  }
  return `${bigint} B`;
}

function makeCustom(state, patch) {
  return {
    ...state,
    ...patch,
    scenario: "custom",
    selection: {
      worldIds: [],
      evidence: [worldKey(patch.baseline || state.baseline)],
      worldA: [],
      worldB: [],
      activeWorld: state.selection?.activeWorld === "b" ? "b" : "a",
    },
  };
}

function toggleToken(values, token) {
  return values.includes(token)
    ? values.filter((value) => value !== token)
    : sorted([...values, token]);
}

function nextObjectId(objects) {
  const used = new Set(objects.map((item) => item.id));
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  for (const id of alphabet) if (!used.has(id)) return id;
  let index = 27;
  while (used.has(`D${index}`)) index += 1;
  return `D${index}`;
}

export function labReducer(state, action) {
  switch (action.type) {
    case "SELECT_SCENARIO":
      if (action.animate) {
        const scenarioState = createInitialState(action.id);
        return {
          ...scenarioState,
          view: state.view,
          selection: { ...scenarioState.selection, evidence: [] },
        };
      }
      return { ...createInitialState(action.id), view: state.view };
    case "SET_MODE":
      if (action.mode === "explore") return createExploreState();
      if (action.mode === "guided") return createInitialState();
      return state;
    case "RESET":
      return state.mode === "explore"
        ? createExploreState()
        : createInitialState(DEFAULT_SCENARIO_ID);
    case "IMPORT":
      return clone(action.state);
    case "SET_VIEW":
      return action.view === "graph" || action.view === "grid"
        ? { ...state, view: action.view }
        : state;
    case "SET_METRIC":
      if (
        !METRICS.some(
          (metric) => metric.id === action.id && !metric.empiricalOnly,
        )
      ) {
        return state;
      }
      if (state.mode === "explore") {
        return {
          ...state,
          scenario: "custom",
          metric: { id: action.id, parameters: {} },
        };
      }
      return makeCustom(state, {
        metric: { id: action.id, parameters: {} },
      });
    case "TOGGLE_EVIDENCE": {
      const evidence = state.selection.evidence.includes(action.key)
        ? state.selection.evidence.filter((key) => key !== action.key)
        : [...state.selection.evidence, action.key];
      return {
        ...state,
        selection: { ...state.selection, evidence },
      };
    }
    case "SET_EVIDENCE":
      return {
        ...state,
        selection: {
          ...state.selection,
          evidence: unique(action.evidence || []),
        },
      };
    case "SET_ACTIVE_WORLD":
      if (!["a", "b"].includes(action.world)) return state;
      return {
        ...state,
        selection: { ...state.selection, activeWorld: action.world },
      };
    case "TOGGLE_EXPLORE_WORLD": {
      const key = action.key;
      const activeWorld = state.selection?.activeWorld === "b" ? "b" : "a";
      const activeField = activeWorld === "a" ? "worldA" : "worldB";
      const otherField = activeWorld === "a" ? "worldB" : "worldA";
      const activeValues = state.selection?.[activeField] || [];
      const removing = activeValues.includes(key);
      return {
        ...state,
        selection: {
          ...state.selection,
          [activeField]: removing
            ? activeValues.filter((value) => value !== key)
            : [...activeValues, key],
          [otherField]: removing
            ? state.selection?.[otherField] || []
            : (state.selection?.[otherField] || []).filter(
                (value) => value !== key,
              ),
        },
      };
    }
    case "ADD_EXPLORE_WORLDS": {
      const requestedA = unique(action.worldA || []);
      const requestedB = unique(action.worldB || []);
      const requestedEither = unique(action.either || []);
      let worldA = unique([
        ...(state.selection?.worldA || []),
        ...requestedA,
      ]).filter((key) => !requestedB.includes(key));
      let worldB = unique([
        ...(state.selection?.worldB || []),
        ...requestedB,
      ]).filter((key) => !requestedA.includes(key));
      if (state.selection?.activeWorld === "b") {
        worldB = unique([...worldB, ...requestedEither]);
        worldA = worldA.filter((key) => !requestedEither.includes(key));
      } else {
        worldA = unique([...worldA, ...requestedEither]);
        worldB = worldB.filter((key) => !requestedEither.includes(key));
      }
      return {
        ...state,
        selection: { ...state.selection, worldA, worldB },
      };
    }
    case "CLEAR_EXPLORE_WORLDS":
      return {
        ...state,
        selection: {
          ...state.selection,
          worldA: [],
          worldB: [],
        },
      };
    case "ADD_OBJECT": {
      const id = nextObjectId(state.objects);
      const objects = [...state.objects, object(id)];
      return makeCustom(state, {
        objects,
        baseline: {
          ...state.baseline,
          train: [...state.baseline.train, id],
          eval: [...state.baseline.eval, id],
        },
        counterfactual: {
          ...state.counterfactual,
          train: [...state.counterfactual.train, id],
          eval: [...state.counterfactual.eval, id],
        },
      });
    }
    case "REMOVE_OBJECT": {
      if (state.objects.length <= 1) return state;
      const removed = state.objects[state.objects.length - 1].id;
      const omit = (values) => values.filter((id) => id !== removed);
      const cleanWorld = (value) => ({
        ...value,
        train: omit(value.train),
        eval: omit(value.eval),
        ...(value.corrupted
          ? { corrupted: omit(value.corrupted) }
          : {}),
      });
      return makeCustom(state, {
        objects: state.objects.slice(0, -1),
        baseline: cleanWorld(state.baseline),
        counterfactual: cleanWorld(state.counterfactual),
        focus: omit(state.focus),
        operation: {
          ...state.operation,
          targets: omit(state.operation.targets),
        },
      });
    }
    case "TOGGLE_WORLD_TOKEN": {
      if (!["baseline", "counterfactual"].includes(action.world)) return state;
      if (!["train", "eval", "corrupted"].includes(action.field)) return state;
      const currentWorld = state[action.world];
      const currentValues = currentWorld[action.field] || [];
      const nextWorld = {
        ...currentWorld,
        [action.field]: toggleToken(currentValues, action.token),
      };
      return makeCustom(state, { [action.world]: nextWorld });
    }
    case "SET_OBJECT_WEIGHT": {
      const value = Number(action.value);
      if (!Number.isFinite(value) || value < 0) return state;
      if (state.mode === "explore") {
        return {
          ...state,
          objects: state.objects.map((item) =>
            item.id === action.id ? { ...item, weight: value } : item,
          ),
        };
      }
      return makeCustom(state, {
        objects: state.objects.map((item) =>
          item.id === action.id ? { ...item, weight: value } : item,
        ),
      });
    }
    case "SET_OPERATION_ORIGIN":
      if (!ORIGINS.includes(action.origin)) return state;
      return makeCustom(state, {
        operation: { ...state.operation, origin: action.origin },
      });
    case "SET_OPERATION_KIND":
      if (!OPERATION_KINDS.includes(action.kind)) return state;
      return makeCustom(state, {
        operation: { ...state.operation, kind: action.kind },
      });
    case "SET_FOCUS":
      return makeCustom(state, {
        focus: unique(action.focus || []).filter((id) =>
          state.objects.some((item) => item.id === id),
        ),
      });
    case "SET_ADVANCED": {
      const value =
        action.value === null || action.value === ""
          ? null
          : Number(action.value);
      if (value !== null && !Number.isFinite(value)) return state;
      if (state.mode === "explore") {
        return {
          ...state,
          advanced: { ...state.advanced, [action.field]: value },
        };
      }
      return makeCustom(state, {
        advanced: { ...state.advanced, [action.field]: value },
      });
    }
    case "SET_DISPLAY":
      return {
        ...state,
        display: { ...state.display, [action.field]: action.value },
      };
    default:
      return state;
  }
}

function validateWorld(input, ids, path, errors) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    errors.push(`${path} must be an object.`);
    return world([], []);
  }
  const output = {};
  for (const field of ["train", "eval", "corrupted"]) {
    if (field === "corrupted" && input[field] === undefined) continue;
    if (!Array.isArray(input[field])) {
      errors.push(`${path}.${field} must be an array.`);
      output[field] = [];
      continue;
    }
    const values = unique(input[field]);
    for (const id of values) {
      if (typeof id !== "string" || !ids.has(id)) {
        errors.push(`${path}.${field} references missing object "${id}".`);
      }
    }
    output[field] = values.filter(
      (id) => typeof id === "string" && ids.has(id),
    );
  }
  return {
    train: output.train || [],
    eval: output.eval || [],
    ...(output.corrupted ? { corrupted: output.corrupted } : {}),
  };
}

function validateExploreKeys(input, ids, path, errors) {
  if (input === undefined) return [];
  if (!Array.isArray(input)) {
    errors.push(`${path} must be an array.`);
    return [];
  }
  const output = [];
  for (const key of unique(input)) {
    const parsed = worldFromKey(key);
    if (!parsed) {
      errors.push(`${path} contains an invalid world key.`);
      continue;
    }
    const referenced = [
      ...parsed.train,
      ...parsed.eval,
      ...(parsed.corrupted || []),
    ];
    const missing = referenced.find((id) => !ids.has(id));
    if (missing) {
      errors.push(`${path} references missing object "${missing}".`);
      continue;
    }
    output.push(worldKey(parsed));
  }
  return output;
}

export function validateLabState(input) {
  const errors = [];
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { ok: false, errors: ["Configuration must be a JSON object."] };
  }
  if (input.schema !== LAB_SCHEMA) {
    errors.push(`schema must equal "${LAB_SCHEMA}".`);
  }
  if (input.version !== LAB_VERSION) {
    errors.push(`version must equal ${LAB_VERSION}.`);
  }
  if (!Array.isArray(input.objects) || input.objects.length === 0) {
    errors.push("objects must be a non-empty array.");
  }

  const objects = [];
  const ids = new Set();
  for (const [index, item] of (input.objects || []).entries()) {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      errors.push(`objects[${index}] must be an object.`);
      continue;
    }
    if (typeof item.id !== "string" || !item.id.trim()) {
      errors.push(`objects[${index}].id must be a non-empty string.`);
      continue;
    }
    if (ids.has(item.id)) {
      errors.push(`objects contains duplicate id "${item.id}".`);
      continue;
    }
    const weight = Number(item.weight ?? 1);
    if (!Number.isFinite(weight) || weight < 0) {
      errors.push(`objects[${index}].weight must be a finite non-negative number.`);
    }
    ids.add(item.id);
    objects.push({
      id: item.id,
      label:
        typeof item.label === "string" && item.label.trim()
          ? item.label
          : item.id,
      weight: Number.isFinite(weight) && weight >= 0 ? weight : 1,
    });
  }

  const baseline = validateWorld(input.baseline, ids, "baseline", errors);
  const counterfactual = validateWorld(
    input.counterfactual,
    ids,
    "counterfactual",
    errors,
  );

  const metricId = input.metric?.id;
  const metricDefinition = METRICS.find((metric) => metric.id === metricId);
  const scenarioDefinition = SCENARIOS.find(
    (scenario) => scenario.id === input.scenario,
  );
  if (!metricDefinition) {
    errors.push(`metric.id "${metricId}" is not supported.`);
  } else if (
    metricDefinition.empiricalOnly &&
    scenarioDefinition?.metric?.id !== metricId
  ) {
    errors.push(
      `metric.id "${metricId}" requires its prepared empirical scenario.`,
    );
  }

  const operation = input.operation || {};
  const targets = Array.isArray(operation.targets)
    ? unique(operation.targets)
    : [];
  if (!Array.isArray(operation.targets)) {
    errors.push("operation.targets must be an array.");
  }
  for (const id of targets) {
    if (!ids.has(id)) {
      errors.push(`operation.targets references missing object "${id}".`);
    }
  }

  const focus = Array.isArray(input.focus) ? unique(input.focus) : [];
  if (!Array.isArray(input.focus)) errors.push("focus must be an array.");
  for (const id of focus) {
    if (!ids.has(id)) errors.push(`focus references missing object "${id}".`);
  }

  const poisonPenalty = Number(input.advanced?.poisonPenalty ?? 0.15);
  const budget =
    input.advanced?.budget === null || input.advanced?.budget === undefined
      ? null
      : Number(input.advanced.budget);
  const candidate =
    input.advanced?.candidateUnlearnedScore === null ||
    input.advanced?.candidateUnlearnedScore === undefined
      ? null
      : Number(input.advanced.candidateUnlearnedScore);
  if (!Number.isFinite(poisonPenalty) || poisonPenalty < 0) {
    errors.push("advanced.poisonPenalty must be a finite non-negative number.");
  }
  if (budget !== null && (!Number.isInteger(budget) || budget < 0)) {
    errors.push("advanced.budget must be null or a non-negative integer.");
  }
  if (candidate !== null && !Number.isFinite(candidate)) {
    errors.push(
      "advanced.candidateUnlearnedScore must be null or a finite number.",
    );
  }

  const evidence = Array.isArray(input.selection?.evidence)
    ? unique(input.selection.evidence.filter((item) => typeof item === "string"))
    : [];
  const worldA = validateExploreKeys(
    input.selection?.worldA,
    ids,
    "selection.worldA",
    errors,
  );
  const worldB = validateExploreKeys(
    input.selection?.worldB,
    ids,
    "selection.worldB",
    errors,
  ).filter((key) => !worldA.includes(key));

  const value = {
    schema: LAB_SCHEMA,
    version: LAB_VERSION,
    mode: input.mode === "explore" ? "explore" : "guided",
    view: input.view === "graph" ? "graph" : "grid",
    scenario:
      typeof input.scenario === "string" ? input.scenario : "custom",
    objects,
    baseline,
    counterfactual,
    operation: {
      origin: ORIGINS.includes(operation.origin)
        ? operation.origin
        : "modeler",
      kind: OPERATION_KINDS.includes(operation.kind)
        ? operation.kind
        : "remove",
      targets: targets.filter((id) => ids.has(id)),
    },
    focus: focus.filter((id) => ids.has(id)),
    metric: {
      id: METRICS.some((metric) => metric.id === metricId)
        ? metricId
        : "coverage",
      parameters:
        input.metric?.parameters &&
        typeof input.metric.parameters === "object" &&
        !Array.isArray(input.metric.parameters)
          ? clone(input.metric.parameters)
          : {},
    },
    selection: {
      worldIds: Array.isArray(input.selection?.worldIds)
        ? input.selection.worldIds.filter((item) => typeof item === "string")
        : [],
      evidence,
      worldA,
      worldB,
      activeWorld: input.selection?.activeWorld === "b" ? "b" : "a",
    },
    advanced: {
      budget,
      poisonPenalty:
        Number.isFinite(poisonPenalty) && poisonPenalty >= 0
          ? poisonPenalty
          : 0.15,
      candidateUnlearnedScore: candidate,
    },
    display: {
      numbers: input.display?.numbers !== false,
      resourceHud: input.display?.resourceHud !== false,
      reducedMotionOverride:
        typeof input.display?.reducedMotionOverride === "boolean"
          ? input.display.reducedMotionOverride
          : null,
    },
  };

  return errors.length ? { ok: false, errors } : { ok: true, errors: [], value };
}

export function parseLabState(text) {
  let input;
  try {
    input = JSON.parse(text);
  } catch (error) {
    return {
      ok: false,
      errors: [`Invalid JSON: ${error instanceof Error ? error.message : error}`],
    };
  }
  return validateLabState(input);
}

export function serializeLabState(state) {
  const result = validateLabState(state);
  const serializable = result.ok ? result.value : createInitialState();
  return JSON.stringify(serializable, null, 2);
}
