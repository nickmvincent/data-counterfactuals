import covertypeMetricData from "../data/covertype-metric-data.js";

export const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
export const covertypeDomainMaxCount = covertypeMetricData.domains.length;

export function clamp01(value) {
  return Math.min(1, Math.max(0, value));
}

export function binaryEntropy(probability) {
  if (probability <= 0 || probability >= 1) return 0;
  return -(probability * Math.log2(probability) + (1 - probability) * Math.log2(1 - probability));
}

export function pseudoRand(rowIndex, colIndex) {
  const seed = Math.sin((rowIndex + 1) * 12.9898 + (colIndex + 1) * 78.233) * 43758.5453;
  return seed - Math.floor(seed);
}

export function choose(n, k) {
  if (k < 0 || k > n) return 0;
  let out = 1;
  for (let i = 1; i <= k; i += 1) out = (out * (n - k + i)) / i;
  return out;
}

export function combos(items, subsetSize) {
  const out = [];
  const total = items.length;

  function rec(start, current) {
    if (current.length === subsetSize) {
      out.push(current.slice());
      return;
    }
    for (let idx = start; idx < total; idx += 1) {
      current.push(items[idx]);
      rec(idx + 1, current);
      current.pop();
    }
  }

  rec(0, []);
  return out;
}

export function allSubsets(items) {
  const out = [[]];
  for (let subsetSize = 1; subsetSize <= items.length; subsetSize += 1) {
    out.push(...combos(items, subsetSize));
  }
  return out.sort((left, right) => (left.length - right.length) || left.join("").localeCompare(right.join("")));
}

export function labelSubset(subset) {
  return subset.length ? subset.join("") : "∅";
}

export function subsetsEqual(left, right) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

export function findSubsetIndex(subsets, subset) {
  return subsets.findIndex((candidate) => subsetsEqual(candidate, subset));
}

export function jaccardScore(trainSet, evalSet) {
  const train = new Set(trainSet);
  const evaluation = new Set(evalSet);
  if (!train.size && !evaluation.size) return 1;
  let intersection = 0;
  for (const item of train) {
    if (evaluation.has(item)) intersection += 1;
  }
  const unionSize = new Set([...trainSet, ...evalSet]).size;
  return unionSize ? intersection / unionSize : 0;
}

export function intersectionScore(trainSet, evalSet) {
  const train = new Set(trainSet);
  let hits = 0;
  for (const item of evalSet) {
    if (train.has(item)) hits += 1;
  }
  return hits;
}

const toyRealExamples = {
  A: { x: -1.45, y: 1.2, label: 1 },
  B: { x: -1.05, y: 0.78, label: 1 },
  C: { x: -0.52, y: 0.18, label: 1 },
  D: { x: 0.38, y: -0.1, label: 0 },
  E: { x: 0.95, y: -0.48, label: 0 },
  F: { x: 1.48, y: -0.96, label: 0 },
  G: { x: -0.86, y: 1.56, label: 1 },
  H: { x: 1.34, y: 0.06, label: 0 },
};

function seedUnit(seed) {
  const value = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return value - Math.floor(value);
}

export function createToyRealDataset(sample = 0) {
  if (sample === 0) return toyRealExamples;

  const jitterScale = 0.18;
  const out = {};
  for (const [token, example] of Object.entries(toyRealExamples)) {
    const tokenSeed = sample * 97 + token.charCodeAt(0) * 13;
    const jitterX = (seedUnit(tokenSeed) * 2 - 1) * jitterScale;
    const jitterY = (seedUnit(tokenSeed + 1) * 2 - 1) * jitterScale;
    out[token] = {
      x: example.x + jitterX,
      y: example.y + jitterY,
      label: example.label,
    };
  }
  return out;
}

function meanPoint(points) {
  if (!points.length) return null;
  const total = points.reduce(
    (acc, point) => ({
      x: acc.x + point.x,
      y: acc.y + point.y,
    }),
    { x: 0, y: 0 },
  );
  return {
    x: total.x / points.length,
    y: total.y / points.length,
  };
}

function squaredDistance(left, right) {
  return (left.x - right.x) ** 2 + (left.y - right.y) ** 2;
}

export function toyRealDataScore(trainSet, evalSet, dataset = toyRealExamples) {
  if (!evalSet.length) return 1;

  const trainPoints = trainSet.map((token) => dataset[token]).filter(Boolean);
  const evalPoints = evalSet.map((token) => dataset[token]).filter(Boolean);
  if (!evalPoints.length) return 0;
  if (!trainPoints.length) return 0.5;

  const positives = trainPoints.filter((point) => point.label === 1);
  const negatives = trainPoints.filter((point) => point.label === 0);
  const positiveCentroid = meanPoint(positives);
  const negativeCentroid = meanPoint(negatives);
  const majorityLabel =
    positives.length === negatives.length ? 1 : positives.length > negatives.length ? 1 : 0;

  let correct = 0;
  for (const point of evalPoints) {
    let predicted;
    if (positiveCentroid && negativeCentroid) {
      predicted =
        squaredDistance(point, positiveCentroid) <= squaredDistance(point, negativeCentroid) ? 1 : 0;
    } else if (positiveCentroid) {
      predicted = 1;
    } else if (negativeCentroid) {
      predicted = 0;
    } else {
      predicted = majorityLabel;
    }
    if (predicted === point.label) correct += 1;
  }

  return correct / evalPoints.length;
}

export function metricValueForSets(trainSet, evalSet, metric, options = {}) {
  const { realDataset = toyRealExamples } = options;
  if (metric === "jaccard") return jaccardScore(trainSet, evalSet);
  if (metric === "inter") return intersectionScore(trainSet, evalSet);
  if (metric === "real") return toyRealDataScore(trainSet, evalSet, realDataset);
  return binaryEntropy(jaccardScore(trainSet, evalSet));
}

export function matrixRange(matrix) {
  let min = Infinity;
  let max = -Infinity;

  for (const row of matrix) {
    for (const value of row) {
      if (!Number.isFinite(value)) continue;
      if (value < min) min = value;
      if (value > max) max = value;
    }
  }

  if (!Number.isFinite(min)) min = 0;
  if (!Number.isFinite(max)) max = 1;
  return { min, max };
}

export function normalizeValue(value, min, max, fallback = 0.5) {
  if (!Number.isFinite(value)) return fallback;
  if (max === min) return fallback;
  return (value - min) / (max - min);
}

function buildGridFromScoreFn(items, scoreFn) {
  const subsets = allSubsets(items);
  const matrix = [];
  const values = [];

  for (const trainSet of subsets) {
    const row = [];
    for (const evalSet of subsets) {
      const value = scoreFn(trainSet, evalSet);
      row.push(value);
      values.push(value);
    }
    matrix.push(row);
  }

  return {
    matrix,
    subsets,
    min: values.length ? Math.min(...values) : 0,
    max: values.length ? Math.max(...values) : 1,
  };
}

const precomputedRealGridCache = new Map();

function cloneCovertypeDomain(domain) {
  return {
    ...domain,
    classCounts: Array.isArray(domain.classCounts) ? [...domain.classCounts] : [],
  };
}

function isSupportedCovertypePrefix(items) {
  if (items.length > covertypeDomainMaxCount) return false;
  return items.every((token, index) => token === covertypeMetricData.domains[index]?.token);
}

export function getCovertypeDomains(countOrItems = covertypeDomainMaxCount) {
  const count = Array.isArray(countOrItems) ? countOrItems.length : countOrItems;
  const safeCount = Math.max(0, Math.min(covertypeDomainMaxCount, count));
  return covertypeMetricData.domains.slice(0, safeCount).map(cloneCovertypeDomain);
}

function buildCovertypeGrid(items) {
  if (!isSupportedCovertypePrefix(items)) {
    throw new Error(`Covertype metric supports the prefix tokens A-${covertypeMetricData.domains[Math.max(0, items.length - 1)]?.token || "A"} only.`);
  }

  const entry = covertypeMetricData.matrices[String(items.length)];
  if (!entry) {
    throw new Error(`Missing precomputed Covertype matrix for count=${items.length}.`);
  }

  return {
    matrix: entry.matrix,
    subsets: allSubsets(items),
    min: entry.min,
    max: entry.max,
  };
}

export function buildSubsetGrid(items, metric, options = {}) {
  const { realDataMode = "precomputed", realDataSample = 0 } = options;

  if (metric === "covertype") {
    return buildCovertypeGrid(items);
  }

  if (metric === "real" && realDataMode === "precomputed") {
    const cacheKey = items.join("");
    if (!precomputedRealGridCache.has(cacheKey)) {
      precomputedRealGridCache.set(
        cacheKey,
        buildGridFromScoreFn(items, (trainSet, evalSet) =>
          metricValueForSets(trainSet, evalSet, metric, { realDataset: toyRealExamples }),
        ),
      );
    }
    return precomputedRealGridCache.get(cacheKey);
  }

  const realDataset = metric === "real" ? createToyRealDataset(realDataSample) : toyRealExamples;
  return buildGridFromScoreFn(items, (trainSet, evalSet) =>
    metricValueForSets(trainSet, evalSet, metric, { realDataset }),
  );
}

export function applyGridEdits(baseMatrix, subsets, options = {}) {
  const {
    focusSet = [],
    poisonActive = false,
    noiseLevel = 0,
  } = options;

  return baseMatrix.map((row, rowIndex) => {
    const rowSet = subsets[rowIndex] || [];
    return row.map((value, colIndex) => {
      let next = value;
      if (poisonActive && focusSet.some((token) => rowSet.includes(token))) next -= 0.15;
      if (noiseLevel > 0) {
        const scale = noiseLevel === 1 ? 0.05 : 0.12;
        const rand = pseudoRand(rowIndex, colIndex);
        next += (rand * 2 - 1) * scale;
      }
      return clamp01(next);
    });
  });
}

export function selectAnalysisMatrix({ baseMatrix, editedMatrix, gridView }) {
  return gridView === "real" ? baseMatrix : editedMatrix;
}

export function computeShapleyPairs(subsets, focusItem) {
  const pairs = [];
  for (const subset of subsets) {
    if (subset.includes(focusItem)) continue;
    const withFocus = [...subset, focusItem].sort();
    const subsetIndex = findSubsetIndex(subsets, subset);
    const withFocusIndex = findSubsetIndex(subsets, withFocus);
    if (subsetIndex >= 0 && withFocusIndex >= 0) {
      pairs.push({ subsetIndex, withFocusIndex });
    }
  }
  return pairs;
}

function logGamma(value) {
  const g = 7;
  const coefficients = [
    0.9999999999998099,
    676.5203681218851,
    -1259.1392167224028,
    771.3234287776531,
    -176.6150291621406,
    12.507343278686905,
    -0.13857109526572012,
    0.000009984369578019572,
    0.00000015056327351493116,
  ];

  if (value < 0.5) {
    return Math.log(Math.PI) - Math.log(Math.sin(Math.PI * value)) - logGamma(1 - value);
  }

  let x = coefficients[0];
  const shifted = value - 1;
  for (let index = 1; index < coefficients.length; index += 1) {
    x += coefficients[index] / (shifted + index);
  }
  const t = shifted + g + 0.5;
  return 0.5 * Math.log(2 * Math.PI) + (shifted + 0.5) * Math.log(t) - t + Math.log(x);
}

function betaFunction(alpha, beta) {
  return Math.exp(logGamma(alpha) + logGamma(beta) - logGamma(alpha + beta));
}

function betaBinomialProbability(total, subsetSize, alpha, beta) {
  if (total <= 0) return subsetSize === 0 ? 1 : 0;
  return choose(total, subsetSize) * betaFunction(subsetSize + alpha, total - subsetSize + beta) / betaFunction(alpha, beta);
}

function semivalueWeight({ mode, subsetSize, playerCount, alpha = 2, beta = 2 }) {
  if (playerCount <= 0) return 0;

  if (mode === "shapley") {
    return 1 / (playerCount * choose(playerCount - 1, subsetSize));
  }

  if (mode === "banzhaf") {
    return 1 / (2 ** Math.max(0, playerCount - 1));
  }

  const bucketCount = choose(playerCount - 1, subsetSize);
  if (!bucketCount) return 0;
  const bucketWeight = betaBinomialProbability(playerCount - 1, subsetSize, alpha, beta);
  return bucketWeight / bucketCount;
}

export function computeSemivalueStats({
  matrix,
  subsets,
  focusItem,
  evalColumnIndex,
  playerCount,
  mode = "shapley",
  alpha = 2,
  beta = 2,
}) {
  const bySize = new Map();
  const pairs = computeShapleyPairs(subsets, focusItem);
  let weightedSum = 0;
  let totalWeight = 0;

  for (const { subsetIndex, withFocusIndex } of pairs) {
    const delta = matrix[withFocusIndex][evalColumnIndex] - matrix[subsetIndex][evalColumnIndex];
    const subsetSize = subsets[subsetIndex].length;
    const weight = semivalueWeight({ mode, subsetSize, playerCount, alpha, beta });
    const bucket = bySize.get(subsetSize) || { sum: 0, n: 0, weight: 0 };
    bucket.sum += delta;
    bucket.n += 1;
    bucket.weight += weight;
    bySize.set(subsetSize, bucket);

    weightedSum += delta * weight;
    totalWeight += weight;
  }

  return {
    phi: totalWeight ? weightedSum / totalWeight : 0,
    cnt: pairs.length,
    rows: [...bySize.entries()]
      .sort((left, right) => left[0] - right[0])
      .map(([size, bucket]) => ({
        size,
        avg: bucket.sum / bucket.n,
        n: bucket.n,
        weight: bucket.weight,
        contribution: (bucket.sum / bucket.n) * bucket.weight,
      })),
    pairs,
    totalWeight,
  };
}

export function computeShapleyStats({ matrix, subsets, focusItem, evalColumnIndex, playerCount }) {
  return computeSemivalueStats({
    matrix,
    subsets,
    focusItem,
    evalColumnIndex,
    playerCount,
    mode: "shapley",
  });
}

export function computeLooDelta({ matrix, rowIndex, colIndex, compareRowIndex }) {
  const baseValue = matrix[rowIndex]?.[colIndex] ?? 0;
  const compareValue = compareRowIndex >= 0 ? (matrix[compareRowIndex]?.[colIndex] ?? baseValue) : baseValue;
  return baseValue - compareValue;
}

export function computeRowRemovalStats({
  matrix,
  subsets,
  rowIndex,
  colIndex,
  tokensToRemove = [],
}) {
  const selectedSet = subsets[rowIndex] || [];
  const removedTokens = tokensToRemove.filter((token) => selectedSet.includes(token));
  const compareSet = selectedSet.filter((token) => !removedTokens.includes(token));
  const compareRowIndex = findSubsetIndex(subsets, compareSet);
  const baseValue = matrix[rowIndex]?.[colIndex] ?? 0;
  const compareValue = compareRowIndex >= 0 ? (matrix[compareRowIndex]?.[colIndex] ?? baseValue) : baseValue;

  return {
    selectedSet,
    compareSet,
    compareRowIndex,
    baseValue,
    compareValue,
    delta: computeLooDelta({ matrix, rowIndex, colIndex, compareRowIndex }),
    removedTokens,
  };
}

export function computeColumnSensitivity({ matrix, rowIndex, compareRowIndex }) {
  const row = matrix[rowIndex] || [];
  if (compareRowIndex < 0) return 0;

  return row.reduce(
    (maxGap, value, index) => Math.max(maxGap, Math.abs(value - (matrix[compareRowIndex]?.[index] ?? value))),
    0,
  );
}

export function computeScalingStats({ matrix, subsets, maxSize, evalColumnIndex }) {
  const rows = [];
  for (let subsetSize = 0; subsetSize <= maxSize; subsetSize += 1) {
    let sum = 0;
    let count = 0;
    for (let rowIndex = 0; rowIndex < subsets.length; rowIndex += 1) {
      if (subsets[rowIndex].length !== subsetSize) continue;
      sum += matrix[rowIndex][evalColumnIndex];
      count += 1;
    }
    rows.push({ k: subsetSize, avg: count ? sum / count : 0, n: count });
  }
  return rows;
}

export function createTutorialPresets(actions) {
  const {
    setCount,
    setMetric,
    setFocusSet,
    setK,
    setConceptMode,
    setComputed,
    setShowNums,
    setShowSingletonEvalCols,
    setPendingSelection,
    setPoisonActive,
    setGridView,
    setBetaAlpha,
    setBetaBeta,
    setEpsilon,
    setAuditTolerance,
  } = actions;
  const setMode = setConceptMode || setComputed || (() => {});

  return [
    {
      id: "readGrid",
      mode: "explore",
      title: "Read one cell",
      summary: "Anchor on a single train/eval pair.",
      goal: "We want to explain what one grid cell stands for before aggregating anything.",
      how: "We click the ABC / ABC cell and read it directly as train on ABC, evaluate on ABC.",
      concept: "Baseline exploration",
      setup: () => {
        setCount(3);
        setMetric("jaccard");
        setFocusSet(["A"]);
        setK(3);
        setShowNums(true);
        setShowSingletonEvalCols?.(false);
        setMode("explore");
        setPoisonActive?.(false);
        setGridView?.("real");
        setPendingSelection({ row: ["A", "B", "C"], col: ["A", "B", "C"] });
      },
    },
    {
      id: "omitB",
      mode: "loo",
      title: "Compare ABC vs AC",
      summary: "Single-point leave-one-out.",
      goal: "We want an estimate of how much point B matters.",
      how: "We train on ABC, then omit B so we can compare the ABC vs AC cells directly.",
      concept: "Leave-one-out influence",
      setup: () => {
        setCount(3);
        setMetric("jaccard");
        setFocusSet(["B"]);
        setK(3);
        setShowNums(true);
        setShowSingletonEvalCols?.(false);
        setMode("loo");
        setPoisonActive?.(false);
        setGridView?.("real");
        setPendingSelection({ row: ["A", "B", "C"], col: ["A", "B", "C"] });
      },
    },
    {
      id: "strikeCD",
      mode: "group",
      title: "Strike with C and D",
      summary: "Data strike after full training.",
      goal: "We want to see what happens if C and D stop contributing.",
      how: "We train on ABCD, then have C and D walk out together to watch the data strike drop performance.",
      concept: "Group leave-one-out / data strike",
      setup: () => {
        setCount(4);
        setMetric("jaccard");
        setFocusSet(["C", "D"].sort());
        setK(4);
        setShowNums(true);
        setShowSingletonEvalCols?.(false);
        setMode("group");
        setPoisonActive?.(false);
        setGridView?.("real");
        setPendingSelection({ row: ["A", "B", "C", "D"], col: ["A", "B", "C", "D"] });
      },
    },
    {
      id: "shapleyB",
      mode: "shapley",
      title: "Shapley around B",
      summary: "Average contribution of point B.",
      goal: "We want the Shapley-style value for point B.",
      how: "We let the Shapley view sweep all subsets at eval ABC and focus on B's average marginal gain.",
      concept: "Shapley value",
      setup: () => {
        setCount(3);
        setMetric("jaccard");
        setFocusSet(["B"]);
        setK(2);
        setShowNums(false);
        setShowSingletonEvalCols?.(false);
        setMode("shapley");
        setPoisonActive?.(false);
        setGridView?.("real");
        setPendingSelection({ row: ["A", "B"], col: ["A", "B", "C"] });
      },
    },
    {
      id: "banzhafB",
      mode: "banzhaf",
      title: "Banzhaf around B",
      summary: "Equal weight on every coalition.",
      goal: "We want a semivalue that treats every subset world equally rather than every subset size equally.",
      how: "We keep the same subset pairs as Shapley but switch to Banzhaf weighting for B.",
      concept: "Banzhaf value",
      setup: () => {
        setCount(4);
        setMetric("jaccard");
        setFocusSet(["B"]);
        setShowNums(false);
        setShowSingletonEvalCols?.(false);
        setMode("banzhaf");
        setPoisonActive?.(false);
        setGridView?.("real");
        setPendingSelection({ row: ["A", "B"], col: ["A", "B", "C", "D"] });
      },
    },
    {
      id: "betaB",
      mode: "beta",
      title: "Beta Shapley toward big worlds",
      summary: "Bias the semivalue toward larger coalitions.",
      goal: "We want a semivalue that emphasizes larger retained worlds.",
      how: "We keep B fixed but move Beta-Shapley toward larger subset sizes with alpha=4, beta=1.",
      concept: "Beta Shapley",
      setup: () => {
        setCount(4);
        setMetric("jaccard");
        setFocusSet(["B"]);
        setShowNums(false);
        setShowSingletonEvalCols?.(false);
        setBetaAlpha?.(4);
        setBetaBeta?.(1);
        setMode("beta");
        setPoisonActive?.(false);
        setGridView?.("real");
        setPendingSelection({ row: ["A", "B", "C"], col: ["A", "B", "C", "D"] });
      },
    },
    {
      id: "powerset",
      mode: "scaling",
      title: "ABCD & the powerset",
      summary: "Show the whole powerset via scaling.",
      goal: "We want to see how performance scales with dataset size.",
      how: "We train on ABCD, then look across the entire powerset via the scaling summary.",
      concept: "Scaling laws",
      setup: () => {
        setCount(4);
        setMetric("jaccard");
        setFocusSet(["A"]);
        setK(2);
        setShowNums(false);
        setShowSingletonEvalCols?.(false);
        setMode("scaling");
        setPoisonActive?.(false);
        setGridView?.("real");
        setPendingSelection({ row: ["A", "B", "C", "D"], col: ["A", "B", "C", "D"] });
      },
    },
    {
      id: "dpB",
      mode: "dp",
      title: "Protect B with epsilon 1",
      summary: "Compare neighboring rows under a privacy budget.",
      goal: "We want to estimate how much one record can move the output and what noise scale that implies.",
      how: "We compare a row containing B against the adjacent row without B, then read off a toy Laplace scale at epsilon = 1.",
      concept: "Differential privacy",
      setup: () => {
        setCount(4);
        setMetric("jaccard");
        setFocusSet(["B"]);
        setShowNums(true);
        setShowSingletonEvalCols?.(false);
        setEpsilon?.(1);
        setMode("dp");
        setPoisonActive?.(false);
        setGridView?.("real");
        setPendingSelection({ row: ["A", "B", "C"], col: ["A", "B", "C"] });
      },
    },
    {
      id: "unlearnC",
      mode: "unlearning",
      title: "Forget C from ABCD",
      summary: "Compare the current row to the exact retrain world.",
      goal: "We want to inspect a deletion request as an exact retrain benchmark.",
      how: "We treat removing C from ABCD as the reference unlearned world and audit the gap against that retrain baseline.",
      concept: "Machine unlearning",
      setup: () => {
        setCount(4);
        setMetric("jaccard");
        setFocusSet(["C"]);
        setShowNums(true);
        setShowSingletonEvalCols?.(false);
        setAuditTolerance?.(0.15);
        setMode("unlearning");
        setPoisonActive?.(false);
        setGridView?.("real");
        setPendingSelection({ row: ["A", "B", "C", "D"], col: ["A", "B", "C", "D"] });
      },
    },
    {
      id: "poisonA",
      mode: "poison",
      title: "Poison rows with A",
      summary: "Edit data via corruption.",
      goal: "We want to see how corrupting rows containing A affects evals.",
      how: "We turn on the poison edit for every row containing A and compare the attacked cell to the clean reference score.",
      concept: "Data poisoning / leverage",
      setup: () => {
        setCount(3);
        setMetric("jaccard");
        setFocusSet(["A"]);
        setK(3);
        setShowNums(true);
        setShowSingletonEvalCols?.(false);
        setMode("poison");
        setPoisonActive?.(true);
        setGridView?.("operator");
        setPendingSelection({ row: ["A", "B", "C"], col: ["A", "B", "C"] });
      },
    },
  ];
}
