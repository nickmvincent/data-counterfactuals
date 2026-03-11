export const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

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

export function metricValueForSets(trainSet, evalSet, metric) {
  if (metric === "jaccard") return jaccardScore(trainSet, evalSet);
  if (metric === "inter") return intersectionScore(trainSet, evalSet);
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

export function buildSubsetGrid(items, metric) {
  const subsets = allSubsets(items);
  const matrix = [];
  const values = [];

  for (const trainSet of subsets) {
    const row = [];
    for (const evalSet of subsets) {
      const value = metricValueForSets(trainSet, evalSet, metric);
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

export function computeShapleyStats({ matrix, subsets, focusItem, evalColumnIndex, playerCount }) {
  const bySize = new Map();
  const pairs = computeShapleyPairs(subsets, focusItem);
  let weightedSum = 0;
  let totalWeight = 0;

  for (const { subsetIndex, withFocusIndex } of pairs) {
    const delta = matrix[withFocusIndex][evalColumnIndex] - matrix[subsetIndex][evalColumnIndex];
    const subsetSize = subsets[subsetIndex].length;
    const bucket = bySize.get(subsetSize) || { sum: 0, n: 0 };
    bucket.sum += delta;
    bucket.n += 1;
    bySize.set(subsetSize, bucket);

    const weight = playerCount > 0 ? 1 / (playerCount * choose(playerCount - 1, subsetSize)) : 0;
    weightedSum += delta * weight;
    totalWeight += weight;
  }

  return {
    phi: totalWeight ? weightedSum / totalWeight : 0,
    cnt: pairs.length,
    rows: [...bySize.entries()]
      .sort((left, right) => left[0] - right[0])
      .map(([size, bucket]) => ({ size, avg: bucket.sum / bucket.n, n: bucket.n })),
    pairs,
    totalWeight,
  };
}

export function computeLooDelta({ matrix, rowIndex, colIndex, compareRowIndex }) {
  const baseValue = matrix[rowIndex]?.[colIndex] ?? 0;
  const compareValue = compareRowIndex >= 0 ? (matrix[compareRowIndex]?.[colIndex] ?? baseValue) : baseValue;
  return baseValue - compareValue;
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
    setShowNums,
    setComputed,
    setPendingSelection,
    setPoisonActive,
    setNoiseLevel,
  } = actions;

  return [
    {
      id: "omitB",
      title: "Compare ABC vs AC",
      summary: "Simple leave-one-out comparison.",
      goal: "We want an estimate of how much point B matters.",
      how: "We train on ABC, then omit B so we can compare the ABC vs AC cells directly.",
      concept: "Leave-one-out influence",
      setup: () => {
        setCount(3);
        setMetric("jaccard");
        setFocusSet(["B"]);
        setK(3);
        setShowNums(true);
        setComputed("loo");
        setPendingSelection({ row: ["A", "B", "C"], col: ["A", "B", "C"] });
      },
    },
    {
      id: "powerset",
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
        setComputed("scaling");
        setPendingSelection({ row: ["A", "B", "C", "D"], col: ["A", "B", "C", "D"] });
      },
    },
    {
      id: "strikeCD",
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
        setComputed("group");
        setPendingSelection({ row: ["A", "B", "C", "D"], col: ["A", "B", "C", "D"] });
      },
    },
    {
      id: "shapleyB",
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
        setComputed("shapley");
        setPendingSelection({ row: ["A", "B"], col: ["A", "B", "C"] });
      },
    },
    {
      id: "poisonA",
      title: "Poison with A'",
      summary: "Edit data via corruption.",
      goal: "We want to see how corrupting A affects evals.",
      how: "We turn on the poison edit (rows containing A drop) rather than expanding the universe.",
      concept: "Data poisoning / leverage",
      setup: () => {
        setPoisonActive(true);
        setNoiseLevel(0);
        setCount(3);
        setMetric("jaccard");
        setFocusSet(["A"]);
        setK(3);
        setShowNums(true);
        setComputed("group");
        setPendingSelection({ row: ["A", "B", "C"], col: ["A", "B", "C"] });
      },
    },
  ];
}
