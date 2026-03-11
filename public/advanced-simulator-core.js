export const groupConfigs = [
  { id: "A", label: 0, center: [-1.6, -0.3], spread: 0.42, seed: 11, tagline: "Wide, slow signals" },
  { id: "B", label: 1, center: [1.1, 0.45], spread: 0.48, seed: 22, tagline: "Fast telemetry" },
  { id: "C", label: 0, center: [-0.4, 1.25], spread: 0.36, seed: 33, tagline: "Satellite uplinks" },
  { id: "D", label: 1, center: [1.05, -1.1], spread: 0.55, seed: 44, tagline: "Edge devices" },
];

export const defaultTaglines = Object.fromEntries(groupConfigs.map((group) => [group.id, group.tagline]));

export const explanationSets = [
  { id: "default", label: "Sensor fleet (default)", taglines: defaultTaglines },
  {
    id: "llm-pretrain",
    label: "LLM pretraining slices",
    taglines: {
      A: "Open web encyclopedias and FAQs",
      B: "Code-heavy forums + docs",
      C: "Newswire and policy briefs",
      D: "Fiction + longform narrative",
    },
  },
  {
    id: "robotics",
    label: "Robotics curriculum",
    taglines: {
      A: "Tabletop manipulation demos",
      B: "Outdoor drone footage",
      C: "Industrial arm telemetry",
      D: "Simulated dexterity tasks",
    },
  },
];

export const scenarioConfigs = [
  {
    id: "alpha",
    label: "Eval alpha",
    description: "Baseline mixture - same distribution as training.",
    groups: ["A", "B", "C", "D"],
    seed: 201,
    noise: 0.1,
    flip: 0.02,
    transform: (x, y) => [x, y],
  },
  {
    id: "beta",
    label: "Eval beta",
    description: "Sensor drift stretches X and introduces mild label noise.",
    groups: ["A", "B", "D"],
    seed: 202,
    noise: 0.16,
    flip: 0.07,
    transform: (x, y) => [x * 0.85 + 0.35, y * 1.2 - 0.15],
  },
  {
    id: "gamma",
    label: "Eval gamma",
    description: "Northern skies: mostly C & D with a +Y shift.",
    groups: ["C", "D"],
    seed: 203,
    noise: 0.12,
    flip: 0.04,
    transform: (x, y) => [x * 0.95 - 0.15, y + 0.8],
  },
  {
    id: "delta",
    label: "Eval delta",
    description: "Adversarial sweep bending trajectories and flipping more labels.",
    groups: ["A", "B", "C", "D"],
    seed: 204,
    noise: 0.18,
    flip: 0.12,
    transform: (x, y) => [x + 0.45 * Math.sin(y), y - 0.3 * Math.cos(x)],
  },
];

export const GROUP_SIZE = 42;

export const DEFAULT_TRAINING_OPTIONS = {
  steps: 520,
  learningRate: 0.16,
  l2: 0.02,
  tolerance: 1e-6,
  patience: 14,
};

export function mulberry32(seed) {
  return function next() {
    let t = seed += 0x6d2b79f5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function normal(rng) {
  let u = 0;
  let v = 0;
  while (u === 0) u = rng();
  while (v === 0) v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

export function allSubsets(ids) {
  const out = [];
  const count = ids.length;
  for (let mask = 1; mask < (1 << count); mask += 1) {
    const picks = [];
    for (let idx = 0; idx < count; idx += 1) {
      if (mask & (1 << idx)) picks.push(ids[idx]);
    }
    out.push(picks);
  }
  return out.sort((left, right) => (left.length - right.length) || left.join("").localeCompare(right.join("")));
}

export const subsetDefs = allSubsets(groupConfigs.map((group) => group.id)).map((groups) => ({
  id: groups.join(""),
  label: groups.join(" + "),
  groups,
}));

export function generateGroup(config, seedBump = 0) {
  const rng = mulberry32(config.seed + seedBump);
  const out = [];
  for (let index = 0; index < GROUP_SIZE; index += 1) {
    const x = config.center[0] + normal(rng) * config.spread;
    const y = config.center[1] + normal(rng) * config.spread;
    out.push({ x, y, label: config.label, group: config.id });
  }
  return out;
}

export function makeScenarioDataset(config, groupData, seedBump = 0) {
  const rng = mulberry32(config.seed + seedBump * 3);
  const out = [];
  for (const groupId of config.groups) {
    const source = groupData.get(groupId) || [];
    for (const point of source) {
      let [x, y] = config.transform(point.x, point.y, rng);
      x += normal(rng) * config.noise;
      y += normal(rng) * config.noise;
      let label = point.label;
      if (config.flip && rng() < config.flip) label = label ? 0 : 1;
      out.push({ x, y, label, source: groupId });
    }
  }
  return out;
}

export function computeFeatureStats(samples) {
  if (!samples.length) {
    return { meanX: 0, meanY: 0, stdX: 1, stdY: 1 };
  }

  const count = samples.length;
  const meanX = samples.reduce((sum, sample) => sum + sample.x, 0) / count;
  const meanY = samples.reduce((sum, sample) => sum + sample.y, 0) / count;
  const varianceX = samples.reduce((sum, sample) => sum + ((sample.x - meanX) ** 2), 0) / count;
  const varianceY = samples.reduce((sum, sample) => sum + ((sample.y - meanY) ** 2), 0) / count;

  return {
    meanX,
    meanY,
    stdX: Math.max(Math.sqrt(varianceX), 1e-6),
    stdY: Math.max(Math.sqrt(varianceY), 1e-6),
  };
}

export function standardizePoint(point, featureStats) {
  return {
    ...point,
    x: (point.x - featureStats.meanX) / featureStats.stdX,
    y: (point.y - featureStats.meanY) / featureStats.stdY,
  };
}

export function standardizeSamples(samples, featureStats = computeFeatureStats(samples)) {
  return {
    samples: samples.map((sample) => standardizePoint(sample, featureStats)),
    featureStats,
  };
}

function logisticLoss(samples, weights, l2) {
  if (!samples.length) return 0;
  let loss = 0;
  for (const sample of samples) {
    const z = weights[0] + weights[1] * sample.x + weights[2] * sample.y;
    const p = 1 / (1 + Math.exp(-z));
    loss += -(sample.label * Math.log(Math.max(p, 1e-8)) + (1 - sample.label) * Math.log(Math.max(1 - p, 1e-8)));
  }
  const penalty = 0.5 * l2 * ((weights[1] ** 2) + (weights[2] ** 2));
  return (loss / samples.length) + penalty;
}

export function logisticTrain(samples, options = {}) {
  const config = { ...DEFAULT_TRAINING_OPTIONS, ...options };
  if (!samples.length) {
    return {
      weights: [0, 0, 0],
      featureStats: computeFeatureStats(samples),
      loss: 0,
      iterations: 0,
      converged: true,
      regularization: config.l2,
    };
  }

  const { samples: standardizedSamples, featureStats } = standardizeSamples(samples);
  const weights = [0, 0, 0];
  let previousLoss = Infinity;
  let stallCount = 0;
  let converged = false;
  let iteration = 0;

  for (iteration = 0; iteration < config.steps; iteration += 1) {
    let grad0 = 0;
    let grad1 = 0;
    let grad2 = 0;

    for (const sample of standardizedSamples) {
      const z = weights[0] + weights[1] * sample.x + weights[2] * sample.y;
      const p = 1 / (1 + Math.exp(-z));
      const error = p - sample.label;
      grad0 += error;
      grad1 += error * sample.x;
      grad2 += error * sample.y;
    }

    const scale = config.learningRate / standardizedSamples.length;
    weights[0] -= scale * grad0;
    weights[1] -= scale * (grad1 + (config.l2 * standardizedSamples.length * weights[1]));
    weights[2] -= scale * (grad2 + (config.l2 * standardizedSamples.length * weights[2]));

    const currentLoss = logisticLoss(standardizedSamples, weights, config.l2);
    if (Math.abs(previousLoss - currentLoss) <= config.tolerance) {
      stallCount += 1;
      if (stallCount >= config.patience) {
        converged = true;
        iteration += 1;
        previousLoss = currentLoss;
        break;
      }
    } else {
      stallCount = 0;
    }
    previousLoss = currentLoss;
  }

  if (iteration === config.steps) iteration = config.steps;

  return {
    weights,
    featureStats,
    loss: Number.isFinite(previousLoss) ? previousLoss : logisticLoss(standardizedSamples, weights, config.l2),
    iterations: iteration,
    converged,
    regularization: config.l2,
  };
}

export function predictProbability(model, sample) {
  const standardized = standardizePoint(sample, model.featureStats);
  const [bias, weightX, weightY] = model.weights;
  return 1 / (1 + Math.exp(-(bias + weightX * standardized.x + weightY * standardized.y)));
}

export function predictLabel(model, sample, threshold = 0.5) {
  return predictProbability(model, sample) >= threshold ? 1 : 0;
}

export function evaluate(samples, model) {
  if (!samples.length) {
    return { accuracy: 0, precision: 0, recall: 0, f1: 0, counts: { tp: 0, fp: 0, tn: 0, fn: 0 } };
  }

  let correct = 0;
  let tp = 0;
  let tn = 0;
  let fp = 0;
  let fn = 0;

  for (const sample of samples) {
    const prediction = predictLabel(model, sample);
    if (prediction === sample.label) correct += 1;
    if (prediction === 1 && sample.label === 1) tp += 1;
    else if (prediction === 1 && sample.label === 0) fp += 1;
    else if (prediction === 0 && sample.label === 0) tn += 1;
    else fn += 1;
  }

  const accuracy = correct / samples.length;
  const precision = tp + fp ? tp / (tp + fp) : 0;
  const recall = tp + fn ? tp / (tp + fn) : 0;
  const f1 = precision + recall ? (2 * precision * recall) / (precision + recall) : 0;

  return { accuracy, precision, recall, f1, counts: { tp, fp, tn, fn } };
}

export function buildDecisionBoundary(model) {
  const [bias, weightX, weightY] = model.weights;
  const { meanX, meanY, stdX, stdY } = model.featureStats;
  return {
    xCoeff: weightX / stdX,
    yCoeff: weightY / stdY,
    bias: bias - ((weightX * meanX) / stdX) - ((weightY * meanY) / stdY),
  };
}

export function metricMatrixFor(resultMatrix, metric) {
  return resultMatrix.map((row) => row.map((cell) => cell.stats[metric] || 0));
}

export function buildModelRun(seedBump = 0, trainingOptions = {}) {
  const groupData = new Map(groupConfigs.map((config) => [config.id, generateGroup(config, seedBump)]));
  const scenarioDataMap = new Map(scenarioConfigs.map((config) => [config.id, makeScenarioDataset(config, groupData, seedBump)]));
  const trainDataCache = new Map(subsetDefs.map((definition) => [definition.id, definition.groups.flatMap((groupId) => groupData.get(groupId) || [])]));

  const resultMatrix = subsetDefs.map((definition) => {
    const model = logisticTrain(trainDataCache.get(definition.id), trainingOptions);
    return scenarioConfigs.map((scenario) => {
      const stats = evaluate(scenarioDataMap.get(scenario.id), model);
      return {
        model,
        weights: [...model.weights],
        stats,
      };
    });
  });

  return { groupData, scenarioDataMap, trainDataCache, resultMatrix };
}
