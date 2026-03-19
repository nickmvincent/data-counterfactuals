import { existsSync, writeFileSync } from "node:fs";
import path from "node:path";
import readline from "node:readline";
import zlib from "node:zlib";
import { createReadStream } from "node:fs";

const INPUT_PATH = path.resolve(process.cwd(), "tmp/covertype/covtype.data.gz");
const OUTPUT_PATH = path.resolve(process.cwd(), "src/data/covertype-metric-data.js");

const TRAIN_PER_DOMAIN = 1200;
const EVAL_PER_DOMAIN = 600;
const FEATURE_COUNT = 50;
const CLASS_COUNT = 7;
const STEPS = 35;
const LEARNING_RATE = 0.08;
const L2 = 0.0005;

const DOMAIN_DEFINITIONS = [
  {
    token: "A",
    label: "Rawah",
    description: "Wilderness Area 1 in Roosevelt National Forest.",
    wildernessColumn: "Wilderness_Area1",
    areaId: 1,
  },
  {
    token: "B",
    label: "Neota",
    description: "Wilderness Area 2 in Roosevelt National Forest.",
    wildernessColumn: "Wilderness_Area2",
    areaId: 2,
  },
  {
    token: "C",
    label: "Comanche Peak",
    description: "Wilderness Area 3 in Roosevelt National Forest.",
    wildernessColumn: "Wilderness_Area3",
    areaId: 3,
  },
  {
    token: "D",
    label: "Cache la Poudre",
    description: "Wilderness Area 4 in Roosevelt National Forest.",
    wildernessColumn: "Wilderness_Area4",
    areaId: 4,
  },
];

const FEATURE_NAMES = [
  "Elevation",
  "Aspect",
  "Slope",
  "Horizontal_Distance_To_Hydrology",
  "Vertical_Distance_To_Hydrology",
  "Horizontal_Distance_To_Roadways",
  "Hillshade_9am",
  "Hillshade_Noon",
  "Hillshade_3pm",
  "Horizontal_Distance_To_Fire_Points",
  ...Array.from({ length: 40 }, (_, index) => `Soil_Type${index + 1}`),
];

const EXCLUDED_FEATURES = [
  "Wilderness_Area1",
  "Wilderness_Area2",
  "Wilderness_Area3",
  "Wilderness_Area4",
];

const CLASS_LABELS = [
  "Spruce/Fir",
  "Lodgepole Pine",
  "Ponderosa Pine",
  "Cottonwood/Willow",
  "Aspen",
  "Douglas-fir",
  "Krummholz",
];

function invariant(condition, message) {
  if (!condition) throw new Error(message);
}

function round(value, digits = 6) {
  if (!Number.isFinite(value)) return 0;
  const scale = 10 ** digits;
  return Math.round(value * scale) / scale;
}

function mulberry32(seed) {
  return function next() {
    let t = seed += 0x6d2b79f5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffleInPlace(items, seed) {
  const rng = mulberry32(seed);
  for (let index = items.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(rng() * (index + 1));
    [items[index], items[swapIndex]] = [items[swapIndex], items[index]];
  }
  return items;
}

function allSubsets(items) {
  const out = [[]];
  for (const item of items) {
    const current = out.slice();
    for (const subset of current) out.push([...subset, item]);
  }
  return out.sort((left, right) => (left.length - right.length) || left.join("").localeCompare(right.join("")));
}

function softmax(logits) {
  let maxLogit = -Infinity;
  for (const logit of logits) {
    if (logit > maxLogit) maxLogit = logit;
  }
  const exps = logits.map((logit) => Math.exp(logit - maxLogit));
  const total = exps.reduce((sum, value) => sum + value, 0) || 1;
  return exps.map((value) => value / total);
}

function computeFeatureStats(samples) {
  const means = Array(FEATURE_COUNT).fill(0);
  const stds = Array(FEATURE_COUNT).fill(0);

  for (const sample of samples) {
    for (let featureIndex = 0; featureIndex < FEATURE_COUNT; featureIndex += 1) {
      means[featureIndex] += sample.x[featureIndex];
    }
  }

  for (let featureIndex = 0; featureIndex < FEATURE_COUNT; featureIndex += 1) {
    means[featureIndex] /= samples.length || 1;
  }

  for (const sample of samples) {
    for (let featureIndex = 0; featureIndex < FEATURE_COUNT; featureIndex += 1) {
      const delta = sample.x[featureIndex] - means[featureIndex];
      stds[featureIndex] += delta * delta;
    }
  }

  for (let featureIndex = 0; featureIndex < FEATURE_COUNT; featureIndex += 1) {
    stds[featureIndex] = Math.max(Math.sqrt(stds[featureIndex] / (samples.length || 1)), 1e-6);
  }

  return { means, stds };
}

function standardizeVector(vector, featureStats) {
  return vector.map((value, featureIndex) => (value - featureStats.means[featureIndex]) / featureStats.stds[featureIndex]);
}

function trainSoftmaxRegression(samples) {
  invariant(samples.length > 0, "Softmax training requires at least one sample.");

  const featureStats = computeFeatureStats(samples);
  const standardized = samples.map((sample) => ({
    y: sample.y,
    x: standardizeVector(sample.x, featureStats),
  }));
  const weights = Array.from({ length: CLASS_COUNT }, () => Array(FEATURE_COUNT + 1).fill(0));

  for (let step = 0; step < STEPS; step += 1) {
    const gradients = Array.from({ length: CLASS_COUNT }, () => Array(FEATURE_COUNT + 1).fill(0));

    for (const sample of standardized) {
      const logits = weights.map((row) => {
        let total = row[0];
        for (let featureIndex = 0; featureIndex < FEATURE_COUNT; featureIndex += 1) {
          total += row[featureIndex + 1] * sample.x[featureIndex];
        }
        return total;
      });
      const probabilities = softmax(logits);

      for (let classIndex = 0; classIndex < CLASS_COUNT; classIndex += 1) {
        const error = probabilities[classIndex] - (sample.y === classIndex ? 1 : 0);
        gradients[classIndex][0] += error;
        for (let featureIndex = 0; featureIndex < FEATURE_COUNT; featureIndex += 1) {
          gradients[classIndex][featureIndex + 1] += error * sample.x[featureIndex];
        }
      }
    }

    const scale = LEARNING_RATE / standardized.length;
    for (let classIndex = 0; classIndex < CLASS_COUNT; classIndex += 1) {
      weights[classIndex][0] -= scale * gradients[classIndex][0];
      for (let featureIndex = 0; featureIndex < FEATURE_COUNT; featureIndex += 1) {
        weights[classIndex][featureIndex + 1] -= scale * (
          gradients[classIndex][featureIndex + 1] + (L2 * standardized.length * weights[classIndex][featureIndex + 1])
        );
      }
    }
  }

  return { weights, featureStats };
}

function predictClass(model, vector) {
  const standardized = standardizeVector(vector, model.featureStats);
  let bestClass = 0;
  let bestLogit = -Infinity;

  for (let classIndex = 0; classIndex < CLASS_COUNT; classIndex += 1) {
    const row = model.weights[classIndex];
    let logit = row[0];
    for (let featureIndex = 0; featureIndex < FEATURE_COUNT; featureIndex += 1) {
      logit += row[featureIndex + 1] * standardized[featureIndex];
    }
    if (logit > bestLogit) {
      bestLogit = logit;
      bestClass = classIndex;
    }
  }

  return bestClass;
}

function evaluateAccuracy(model, samples) {
  if (!samples.length) return 0;
  let correct = 0;
  for (const sample of samples) {
    if (predictClass(model, sample.x) === sample.y) correct += 1;
  }
  return correct / samples.length;
}

async function loadCovertypeDomains() {
  invariant(existsSync(INPUT_PATH), `Missing ${INPUT_PATH}. Download Covertype into tmp/covertype first.`);

  const domains = Array.from({ length: DOMAIN_DEFINITIONS.length }, () => []);
  const stream = createReadStream(INPUT_PATH).pipe(zlib.createGunzip());
  const lines = readline.createInterface({ input: stream, crlfDelay: Infinity });

  for await (const line of lines) {
    if (!line) continue;
    const parts = line.split(",").map(Number);
    invariant(parts.length === 55, `Expected 55 columns, received ${parts.length}.`);

    const wildernessIndex = parts.slice(10, 14).findIndex((value) => value === 1);
    invariant(wildernessIndex >= 0, `Unable to resolve wilderness area for row: ${line.slice(0, 80)}...`);

    const features = parts.slice(0, 10).concat(parts.slice(14, 54));
    const label = parts[54] - 1;
    domains[wildernessIndex].push({ x: features, y: label });
  }

  return domains;
}

function splitDomainRows(rows, seed) {
  const shuffled = rows.slice();
  shuffleInPlace(shuffled, seed);
  invariant(
    shuffled.length >= TRAIN_PER_DOMAIN + EVAL_PER_DOMAIN,
    `Domain only has ${shuffled.length} rows; need at least ${TRAIN_PER_DOMAIN + EVAL_PER_DOMAIN}.`,
  );
  return {
    train: shuffled.slice(0, TRAIN_PER_DOMAIN),
    eval: shuffled.slice(TRAIN_PER_DOMAIN, TRAIN_PER_DOMAIN + EVAL_PER_DOMAIN),
  };
}

function summarizeDomain(rows) {
  const classCounts = Array(CLASS_COUNT).fill(0);
  for (const row of rows) classCounts[row.y] += 1;
  return classCounts;
}

function buildMetricMatrices(domainSplits) {
  const matrices = {};

  for (let count = 2; count <= DOMAIN_DEFINITIONS.length; count += 1) {
    const activeDomains = DOMAIN_DEFINITIONS.slice(0, count);
    const activeTokens = activeDomains.map((domain) => domain.token);
    const subsets = allSubsets(activeTokens);
    const trainRowsByToken = new Map(activeTokens.map((token, index) => [token, domainSplits[index].train]));
    const evalRowsByToken = new Map(activeTokens.map((token, index) => [token, domainSplits[index].eval]));
    const cachedModels = new Map();
    const matrix = [];

    for (const trainSet of subsets) {
      const trainKey = trainSet.join("");
      let model = cachedModels.get(trainKey);
      if (!model && trainSet.length) {
        model = trainSoftmaxRegression(trainSet.flatMap((token) => trainRowsByToken.get(token) || []));
        cachedModels.set(trainKey, model);
      }

      const row = [];
      for (const evalSet of subsets) {
        if (!evalSet.length) {
          row.push(1);
          continue;
        }
        if (!trainSet.length) {
          row.push(0);
          continue;
        }
        const evalRows = evalSet.flatMap((token) => evalRowsByToken.get(token) || []);
        row.push(round(evaluateAccuracy(model, evalRows)));
      }
      matrix.push(row);
    }

    const values = matrix.flat();
    matrices[String(count)] = {
      count,
      tokens: activeTokens,
      subsetCount: subsets.length,
      metric: "accuracy",
      min: round(Math.min(...values)),
      max: round(Math.max(...values)),
      matrix,
    };
  }

  return matrices;
}

async function main() {
  const rawDomains = await loadCovertypeDomains();
  const domainSplits = rawDomains.map((rows, index) => splitDomainRows(rows, 4100 + index));
  const matrices = buildMetricMatrices(domainSplits);
  const output = {
    version: 1,
    metric: "covertype",
    generatedAt: new Date().toISOString(),
    source: {
      dataset: "UCI Covertype",
      rawPath: "tmp/covertype/covtype.data.gz",
      downloadArchive: "https://cdn.uci-ics-mlr-prod.aws.uci.edu/31/covertype.zip",
      classes: CLASS_LABELS,
      includedFeatures: FEATURE_NAMES,
      excludedFeatures: EXCLUDED_FEATURES,
      trainRowsPerDomain: TRAIN_PER_DOMAIN,
      evalRowsPerDomain: EVAL_PER_DOMAIN,
      training: {
        model: "multiclass softmax regression",
        steps: STEPS,
        learningRate: LEARNING_RATE,
        l2: L2,
      },
      score:
        "Held-out accuracy after training a deterministic multiclass softmax-regression model on the selected wilderness-area train splits and evaluating on disjoint wilderness-area eval splits. Wilderness indicator columns are excluded from the inputs.",
    },
    domains: DOMAIN_DEFINITIONS.map((domain, index) => ({
      ...domain,
      totalRows: rawDomains[index].length,
      trainRows: domainSplits[index].train.length,
      evalRows: domainSplits[index].eval.length,
      classCounts: summarizeDomain(rawDomains[index]),
    })),
    matrices,
  };

  const fileContents = `// Generated by scripts/generate-covertype-metric.mjs\nexport const covertypeMetricData = ${JSON.stringify(output, null, 2)};\n\nexport default covertypeMetricData;\n`;
  writeFileSync(OUTPUT_PATH, fileContents);

  console.log(`Wrote ${OUTPUT_PATH}`);
  console.log(`Domains: ${output.domains.map((domain) => `${domain.token}:${domain.label}:${domain.totalRows}`).join(" ")}`);
  console.log(`Matrices: ${Object.keys(matrices).join(", ")}`);
}

await main();
