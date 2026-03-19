import {
  alphabet,
  applyGridEdits,
  buildSubsetGrid,
  computeColumnSensitivity,
  computeRowRemovalStats,
  computeScalingStats,
  computeSemivalueStats,
  computeShapleyStats,
  covertypeDomainMaxCount,
  findSubsetIndex,
  getCovertypeDomains,
  labelSubset,
  selectAnalysisMatrix,
} from "./counterfactual-math.js";

const GRID_CONCEPT_MODES = [
  "explore",
  "loo",
  "group",
  "shapley",
  "banzhaf",
  "beta",
  "scaling",
  "dp",
  "unlearning",
  "poison",
];
const GRAPH_LENSES = ["ablation", "strike", "shapley", "scaling"];
const GRID_METRICS = ["jaccard", "inter", "entropy", "real", "covertype"];
const GRAPH_METRICS = ["jaccard", "inter", "entropy", "covertype"];
const RESPONSE_TYPES = ["matrix", "cell", "answer"];
const SINGLE_FOCUS_GRID_MODES = new Set(["explore", "loo", "shapley", "banzhaf", "beta", "dp", "unlearning"]);
const MULTI_FOCUS_GRID_MODES = new Set(["group", "poison"]);
const RESERVED_REQUEST_KEYS = new Set(["explorer", "response", "state"]);

export const apiExplorerExamples = {
  gridMatrix: {
    explorer: "grid",
    response: "matrix",
    count: 4,
    metric: "jaccard",
    conceptMode: "poison",
    gridView: "operator",
    poisonActive: true,
    focusSet: ["A", "C"],
    train: "ABCD",
    eval: "ABCD",
  },
  gridCell: {
    explorer: "grid",
    response: "cell",
    count: 4,
    metric: "real",
    realDataMode: "live",
    realDataSample: 2,
    conceptMode: "dp",
    focusSet: ["B"],
    train: "ABC",
    eval: "ABC",
    epsilon: 1.5,
  },
  graphAnswer: {
    explorer: "graph",
    response: "answer",
    count: 4,
    metric: "covertype",
    lens: "strike",
    focusSet: ["B", "C"],
    train: "ABCD",
    eval: "ABCD",
  },
};

export const apiExplorerFieldGroups = [
  {
    title: "Common",
    fields: [
      {
        name: "explorer",
        type: '"grid" | "graph"',
        description: "Chooses which explorer state to interpret.",
      },
      {
        name: "response",
        type: '"matrix" | "cell" | "answer"',
        description: "Returns the whole matrix, the selected cell, or the explorer's headline answer.",
      },
      {
        name: "count",
        type: "2-8 for grid, 2-7 for graph",
        description: "Chooses how many letters from A onward exist in the toy universe.",
      },
      {
        name: "train / eval",
        type: 'subset label like "ABC", array like ["A","B","C"], or subset index',
        description: "Pins the selected training world and evaluation slice.",
      },
      {
        name: "focusSet",
        type: 'subset label, array, or comma list',
        description: "Uses the same focus tokens the grid and graph explorers already expose.",
      },
    ],
  },
  {
    title: "Grid",
    fields: [
      {
        name: "metric",
        type: '"jaccard" | "inter" | "entropy" | "real" | "covertype"',
        description: 'Matches the score rule buttons in the grid explorer. "covertype" uses precomputed scores from real Covertype wilderness domains.',
      },
      {
        name: "conceptMode",
        type: GRID_CONCEPT_MODES.join(" | "),
        description: "Selects the active grid question family.",
      },
      {
        name: "gridView",
        type: '"real" | "operator"',
        description: "Only matters in poison mode; it chooses the clean or attacked matrix.",
      },
      {
        name: "poisonActive",
        type: "boolean",
        description: "Turns the toy corruption rule on or off in poison mode.",
      },
      {
        name: "realDataMode / realDataSample",
        type: '"precomputed" | "live" / integer',
        description: "Controls the toy real-data metric when metric is real.",
      },
      {
        name: "betaAlpha / betaBeta / k / epsilon / auditTolerance",
        type: "numbers",
        description: "Feed the same secondary controls used by beta Shapley, scaling, DP, and unlearning.",
      },
      {
        name: "showSingletonEvalCols",
        type: "boolean",
        description: "Filters matrix output down to singleton eval columns, mirroring the grid display toggle.",
      },
    ],
  },
  {
    title: "Graph",
    fields: [
      {
        name: "metric",
        type: '"jaccard" | "inter" | "entropy" | "covertype"',
        description: 'Matches the graph score rule buttons. "covertype" uses the same real wilderness-domain matrix as the grid.',
      },
      {
        name: "lens",
        type: GRAPH_LENSES.join(" | "),
        description: "Chooses the current graph lens.",
      },
      {
        name: "k",
        type: "0-7",
        description: "Selects the highlighted scaling layer when lens is scaling.",
      },
    ],
  },
];

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function roundValue(value, digits = 6) {
  if (!Number.isFinite(value)) return 0;
  const scale = 10 ** digits;
  return Math.round(value * scale) / scale;
}

function roundMatrix(matrix, digits = 6) {
  return matrix.map((row) => row.map((value) => roundValue(value, digits)));
}

function clampInteger(value, fallback, min, max) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, parsed));
}

function clampNumber(value, fallback, min = -Infinity, max = Infinity) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, parsed));
}

function coerceBoolean(value, fallback = false) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value !== "string") return fallback;
  const normalized = value.trim().toLowerCase();
  if (["true", "1", "yes", "on"].includes(normalized)) return true;
  if (["false", "0", "no", "off"].includes(normalized)) return false;
  return fallback;
}

function coerceEnum(value, allowedValues, fallback) {
  if (typeof value !== "string") return fallback;
  return allowedValues.includes(value) ? value : fallback;
}

function parseSubsetTokens(value) {
  if (Array.isArray(value)) return value.map((entry) => String(entry).trim()).filter(Boolean);
  if (typeof value !== "string") return null;

  const trimmed = value.trim();
  if (!trimmed || trimmed === "∅" || trimmed.toLowerCase() === "empty") return [];
  if (trimmed.includes(",")) {
    return trimmed
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean);
  }

  const compact = trimmed.replace(/[^A-Za-z]/g, "").toUpperCase();
  if (!compact) return [];
  return compact.split("");
}

function normalizeTokenSet(value, universe, fallback = []) {
  const tokens = parseSubsetTokens(value);
  if (tokens === null) return Array.isArray(fallback) ? fallback.slice() : fallback;

  const allowed = new Set(universe);
  const seen = new Set();
  const out = [];
  tokens.forEach((token) => {
    const normalized = token.toUpperCase();
    if (!allowed.has(normalized) || seen.has(normalized)) return;
    seen.add(normalized);
    out.push(normalized);
  });
  return out.sort();
}

function pickStateValue(state, ...keys) {
  for (const key of keys) {
    if (state[key] !== undefined) return state[key];
  }
  return undefined;
}

function subsetIndexFromValue(value, subsets, universe, fallbackIndex) {
  if (value === undefined || value === null) return fallbackIndex;

  if (typeof value === "number" && Number.isInteger(value)) {
    return Math.max(0, Math.min(subsets.length - 1, value));
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (/^-?\d+$/.test(trimmed)) {
      const numeric = Number.parseInt(trimmed, 10);
      return Math.max(0, Math.min(subsets.length - 1, numeric));
    }
  }

  const tokens = normalizeTokenSet(value, universe, null);
  if (tokens === null) return fallbackIndex;
  const index = findSubsetIndex(subsets, tokens);
  return index >= 0 ? index : fallbackIndex;
}

function mergeRequestState(request = {}) {
  const merged = {};
  Object.entries(request).forEach(([key, value]) => {
    if (!RESERVED_REQUEST_KEYS.has(key)) merged[key] = value;
  });
  if (isPlainObject(request.state)) {
    Object.entries(request.state).forEach(([key, value]) => {
      merged[key] = value;
    });
  }
  return merged;
}

function buildGridSnapshot(rawState = {}) {
  const metric = coerceEnum(rawState.metric, GRID_METRICS, "jaccard");
  const countLimit = metric === "covertype" ? Math.min(8, covertypeDomainMaxCount) : 8;
  const count = clampInteger(rawState.count, 4, 2, countLimit);
  const universe = alphabet.slice(0, count);
  const conceptMode = coerceEnum(rawState.conceptMode, GRID_CONCEPT_MODES, "explore");
  const realDataMode = coerceEnum(rawState.realDataMode, ["precomputed", "live"], "precomputed");
  const realDataSample = clampInteger(rawState.realDataSample, 0, 0, Number.MAX_SAFE_INTEGER);
  const metricOptions = { realDataMode, realDataSample };
  const { matrix: baseMatrix, subsets } = buildSubsetGrid(universe, metric, metricOptions);
  const subsetLegend = metric === "covertype" ? getCovertypeDomains(universe) : [];

  const defaultFocus = universe.length ? [universe[0]] : [];
  let focusSet = normalizeTokenSet(rawState.focusSet ?? rawState.focus, universe, defaultFocus);
  if (!focusSet.length && defaultFocus.length) focusSet = defaultFocus;
  if (SINGLE_FOCUS_GRID_MODES.has(conceptMode) && focusSet.length > 1) focusSet = [focusSet[0]];
  const allowsMultiFocus = MULTI_FOCUS_GRID_MODES.has(conceptMode);
  const groupSet = allowsMultiFocus ? focusSet : [];
  const focusPrimary = focusSet[0] || universe[0] || "A";

  const fullColumnIndices = subsets.map((_, index) => index);
  const singletonColumnIndices = subsets
    .map((subset, index) => ({ subset, index }))
    .filter(({ subset }) => subset.length === 1)
    .map(({ index }) => index);
  const showSingletonEvalCols = coerceBoolean(rawState.showSingletonEvalCols, false);
  const visibleColumnIndices = showSingletonEvalCols && singletonColumnIndices.length
    ? singletonColumnIndices
    : fullColumnIndices;

  const rowIndex = subsetIndexFromValue(
    pickStateValue(rawState, "train", "row", "rowIdx", "rowIndex", "selectedIndex"),
    subsets,
    universe,
    Math.min(1, Math.max(0, subsets.length - 1)),
  );
  const requestedColIndex = subsetIndexFromValue(
    pickStateValue(rawState, "eval", "column", "col", "colIdx", "colIndex", "evalIndex"),
    subsets,
    universe,
    Math.min(1, Math.max(0, subsets.length - 1)),
  );
  const colIndex = visibleColumnIndices.includes(requestedColIndex) ? requestedColIndex : (visibleColumnIndices[0] ?? 0);

  const poisonActive = conceptMode === "poison" ? coerceBoolean(rawState.poisonActive, false) : false;
  const gridView = conceptMode === "poison"
    ? coerceEnum(rawState.gridView, ["real", "operator"], "real")
    : "real";
  const editedMatrix = applyGridEdits(baseMatrix, subsets, {
    focusSet: groupSet.length ? groupSet : focusSet,
    poisonActive,
    noiseLevel: 0,
  });
  const analysisMatrix = selectAnalysisMatrix({
    baseMatrix,
    editedMatrix,
    gridView,
  });

  const betaAlpha = clampNumber(rawState.betaAlpha, 2, 0.01);
  const betaBeta = clampNumber(rawState.betaBeta, 2, 0.01);
  const epsilon = clampNumber(rawState.epsilon, 1, 0);
  const auditTolerance = clampNumber(rawState.auditTolerance, 0.15, 0);
  const k = clampInteger(rawState.k, 2, 0, universe.length);

  const trainSet = subsets[rowIndex] || [];
  const evalSet = subsets[colIndex] || [];
  const cleanValue = baseMatrix[rowIndex]?.[colIndex] ?? 0;
  const selectedValue = analysisMatrix[rowIndex]?.[colIndex] ?? 0;
  const operatorValue = editedMatrix[rowIndex]?.[colIndex] ?? cleanValue;

  const looStats = computeRowRemovalStats({
    matrix: baseMatrix,
    subsets,
    rowIndex,
    colIndex,
    tokensToRemove: focusPrimary ? [focusPrimary] : [],
  });
  const groupStats = allowsMultiFocus && groupSet.length
    ? computeRowRemovalStats({
        matrix: baseMatrix,
        subsets,
        rowIndex,
        colIndex,
        tokensToRemove: groupSet,
      })
    : {
        compareSet: [],
        compareRowIndex: -1,
        compareValue: cleanValue,
        delta: 0,
        removedTokens: [],
      };
  const semivalueMode = conceptMode === "banzhaf" ? "banzhaf" : conceptMode === "beta" ? "beta" : "shapley";
  const semivalueStats = computeSemivalueStats({
    matrix: baseMatrix,
    subsets,
    focusItem: focusPrimary,
    evalColumnIndex: colIndex,
    playerCount: universe.length,
    mode: semivalueMode,
    alpha: betaAlpha,
    beta: betaBeta,
  });
  const scalingRows = computeScalingStats({
    matrix: baseMatrix,
    subsets,
    maxSize: universe.length,
    evalColumnIndex: colIndex,
  });
  const scalingBucket = scalingRows.find((entry) => entry.k === k) || { avg: 0, n: 0 };
  const dpSensitivity = computeColumnSensitivity({
    matrix: baseMatrix,
    rowIndex,
    compareRowIndex: looStats.compareRowIndex,
  });
  const dpLocalGap = Math.abs(cleanValue - looStats.compareValue);
  const dpSuggestedScale = epsilon > 0 ? dpSensitivity / epsilon : 0;
  const unlearningGap = Math.abs(cleanValue - looStats.compareValue);
  const unlearningPass = unlearningGap <= auditTolerance;
  const attackDelta = operatorValue - cleanValue;

  let answer;
  if (conceptMode === "explore") {
    answer = {
      label: "Cell score",
      value: selectedValue,
      formula: `f(${labelSubset(trainSet)}, ${labelSubset(evalSet)})`,
      detail: "Read the selected train/eval cell directly.",
    };
  } else if (conceptMode === "loo") {
    answer = {
      label: "LOO delta",
      value: looStats.delta,
      formula: `f(${labelSubset(trainSet)}, ${labelSubset(evalSet)}) - f(${labelSubset(looStats.compareSet)}, ${labelSubset(evalSet)})`,
      detail: `Removes ${focusPrimary} if it is present in the selected training world.`,
    };
  } else if (conceptMode === "group") {
    answer = {
      label: "Group delta",
      value: groupStats.delta,
      formula: `f(${labelSubset(trainSet)}, ${labelSubset(evalSet)}) - f(${labelSubset(groupStats.compareSet)}, ${labelSubset(evalSet)})`,
      detail: groupSet.length
        ? `Removes ${labelSubset(groupSet)} together as one coalition.`
        : "Pick multiple focus tokens to form a coalition.",
    };
  } else if (conceptMode === "shapley") {
    answer = {
      label: "Shapley phi",
      value: semivalueStats.phi,
      formula: `phi(${focusPrimary}; ${labelSubset(evalSet)})`,
      detail: `${semivalueStats.cnt} subset pairs contribute to this estimate.`,
    };
  } else if (conceptMode === "banzhaf") {
    answer = {
      label: "Banzhaf value",
      value: semivalueStats.phi,
      formula: `Banzhaf(${focusPrimary}; ${labelSubset(evalSet)})`,
      detail: `${semivalueStats.cnt} subset pairs contribute with equal coalition weight.`,
    };
  } else if (conceptMode === "beta") {
    answer = {
      label: "Beta phi",
      value: semivalueStats.phi,
      formula: `Beta(${focusPrimary}; alpha=${betaAlpha}, beta=${betaBeta}; ${labelSubset(evalSet)})`,
      detail: `${semivalueStats.cnt} subset pairs contribute under beta-binomial weighting.`,
    };
  } else if (conceptMode === "scaling") {
    answer = {
      label: `Avg at k=${k}`,
      value: scalingBucket.avg,
      formula: `Avg_S f(S, ${labelSubset(evalSet)}) for |S| = ${k}`,
      detail: `${scalingBucket.n} rows contribute to this size bucket.`,
    };
  } else if (conceptMode === "dp") {
    answer = {
      label: "Suggested scale",
      value: dpSuggestedScale,
      formula: `sensitivity / epsilon = ${dpSensitivity} / ${epsilon}`,
      detail: `Local cell gap ${dpLocalGap.toFixed(4)}; row sensitivity ${dpSensitivity.toFixed(4)}.`,
    };
  } else if (conceptMode === "unlearning") {
    answer = {
      label: "Audit gap",
      value: unlearningGap,
      formula: `|f(${labelSubset(trainSet)}, ${labelSubset(evalSet)}) - f(${labelSubset(looStats.compareSet)}, ${labelSubset(evalSet)})|`,
      detail: `Tolerance ${auditTolerance.toFixed(2)} -> ${unlearningPass ? "pass" : "fail"}.`,
    };
  } else {
    answer = {
      label: "Attack delta",
      value: attackDelta,
      formula: `f_attack(${labelSubset(trainSet)}, ${labelSubset(evalSet)}) - f_clean(${labelSubset(trainSet)}, ${labelSubset(evalSet)})`,
      detail: poisonActive ? "Operator view includes the toy corruption rule." : "Attack toggle is currently off.",
    };
  }

  const visibleMatrix = analysisMatrix.map((row) => visibleColumnIndices.map((visibleIndex) => row[visibleIndex] ?? 0));
  const visibleColumnLabels = visibleColumnIndices.map((visibleIndex) => labelSubset(subsets[visibleIndex] || []));

  return {
    explorer: "grid",
    normalizedState: {
      count,
      universe,
      metric,
      subsetLegend,
      conceptMode,
      focusSet,
      focusPrimary,
      realDataMode,
      realDataSample,
      gridView,
      poisonActive,
      betaAlpha,
      betaBeta,
      epsilon,
      auditTolerance,
      k,
      showSingletonEvalCols,
      train: {
        index: rowIndex,
        set: trainSet,
        label: labelSubset(trainSet),
      },
      eval: {
        index: colIndex,
        set: evalSet,
        label: labelSubset(evalSet),
      },
    },
    matrixSource: gridView,
    subsetLegend,
    fullMatrix: baseMatrix,
    analysisMatrix,
    editedMatrix,
    responseMatrix: visibleMatrix,
    rowLabels: subsets.map((subset) => labelSubset(subset)),
    columnLabels: visibleColumnLabels,
    columnIndices: visibleColumnIndices,
    selectedCell: {
      rowIndex,
      colIndex,
      trainSet,
      evalSet,
      trainLabel: labelSubset(trainSet),
      evalLabel: labelSubset(evalSet),
      cleanValue,
      operatorValue,
      value: selectedValue,
    },
    answer,
  };
}

function buildGraphSnapshot(rawState = {}) {
  const metric = coerceEnum(rawState.metric, GRAPH_METRICS, "jaccard");
  const countLimit = metric === "covertype" ? Math.min(7, covertypeDomainMaxCount) : 7;
  const count = clampInteger(rawState.count, 4, 2, countLimit);
  const universe = alphabet.slice(0, count);
  const lens = coerceEnum(rawState.lens, GRAPH_LENSES, "ablation");
  const { matrix, subsets } = buildSubsetGrid(universe, metric);
  const subsetLegend = metric === "covertype" ? getCovertypeDomains(universe) : [];
  const fullSetIndex = findSubsetIndex(subsets, universe);
  const defaultFocus = universe[Math.min(1, Math.max(0, universe.length - 1))] || universe[0] || "A";
  let focusSet = normalizeTokenSet(rawState.focusSet ?? rawState.focus, universe, [defaultFocus]);
  if (!focusSet.length && defaultFocus) focusSet = [defaultFocus];
  if (lens !== "strike" && focusSet.length > 1) focusSet = [focusSet[0]];
  const focusPrimary = focusSet[0] || defaultFocus;
  const focusGroup = lens === "strike" ? focusSet : focusPrimary ? [focusPrimary] : [];

  const selectedIndex = subsetIndexFromValue(
    pickStateValue(rawState, "train", "selected", "selectedIndex", "row", "rowIndex"),
    subsets,
    universe,
    fullSetIndex >= 0 ? fullSetIndex : 0,
  );
  const evalIndex = subsetIndexFromValue(
    pickStateValue(rawState, "eval", "evalIndex", "column", "col", "colIndex"),
    subsets,
    universe,
    fullSetIndex >= 0 ? fullSetIndex : 0,
  );
  const k = clampInteger(rawState.k, 2, 0, universe.length);

  const trainSet = subsets[selectedIndex] || [];
  const evalSet = subsets[evalIndex] || [];
  const currentValue = matrix[selectedIndex]?.[evalIndex] ?? 0;
  const ablationStats = computeRowRemovalStats({
    matrix,
    subsets,
    rowIndex: selectedIndex,
    colIndex: evalIndex,
    tokensToRemove: focusPrimary ? [focusPrimary] : [],
  });
  const strikeStats = computeRowRemovalStats({
    matrix,
    subsets,
    rowIndex: selectedIndex,
    colIndex: evalIndex,
    tokensToRemove: focusGroup,
  });
  const shapleyStats = computeShapleyStats({
    matrix,
    subsets,
    focusItem: focusPrimary,
    evalColumnIndex: evalIndex,
    playerCount: universe.length,
  });
  const scalingRows = computeScalingStats({
    matrix,
    subsets,
    maxSize: universe.length,
    evalColumnIndex: evalIndex,
  });
  const scalingBucket = scalingRows.find((entry) => entry.k === k) || { avg: 0, n: 0 };

  let answer;
  if (lens === "ablation") {
    answer = {
      label: "Ablation delta",
      value: ablationStats.delta,
      formula: `f(${labelSubset(trainSet)}, ${labelSubset(evalSet)}) - f(${labelSubset(ablationStats.compareSet)}, ${labelSubset(evalSet)})`,
      detail: `Follow the one-step deletion that removes ${focusPrimary}.`,
    };
  } else if (lens === "strike") {
    answer = {
      label: "Strike delta",
      value: strikeStats.delta,
      formula: `f(${labelSubset(trainSet)}, ${labelSubset(evalSet)}) - f(${labelSubset(strikeStats.compareSet)}, ${labelSubset(evalSet)})`,
      detail: strikeStats.removedTokens.length
        ? `Strike path removes ${labelSubset(strikeStats.removedTokens)} one edge at a time.`
        : "None of the requested strike tokens are present in the selected train node.",
    };
  } else if (lens === "shapley") {
    answer = {
      label: "Shapley phi",
      value: shapleyStats.phi,
      formula: `phi(${focusPrimary}; ${labelSubset(evalSet)})`,
      detail: `${shapleyStats.cnt} one-step additions contribute to the sweep.`,
    };
  } else {
    answer = {
      label: `Average at k=${k}`,
      value: scalingBucket.avg,
      formula: `Avg_S f(S, ${labelSubset(evalSet)}) for |S| = ${k}`,
      detail: `${scalingBucket.n} nodes are highlighted in this layer.`,
    };
  }

  return {
    explorer: "graph",
    normalizedState: {
      count,
      universe,
      metric,
      subsetLegend,
      lens,
      focusSet,
      focusPrimary,
      k,
      train: {
        index: selectedIndex,
        set: trainSet,
        label: labelSubset(trainSet),
      },
      eval: {
        index: evalIndex,
        set: evalSet,
        label: labelSubset(evalSet),
      },
    },
    matrixSource: "graph",
    subsetLegend,
    fullMatrix: matrix,
    responseMatrix: matrix,
    rowLabels: subsets.map((subset) => labelSubset(subset)),
    columnLabels: subsets.map((subset) => labelSubset(subset)),
    selectedCell: {
      rowIndex: selectedIndex,
      colIndex: evalIndex,
      trainSet,
      evalSet,
      trainLabel: labelSubset(trainSet),
      evalLabel: labelSubset(evalSet),
      value: currentValue,
    },
    answer,
  };
}

function buildResponsePayload(snapshot, responseType) {
  if (responseType === "cell") {
    return {
      explorer: snapshot.explorer,
      response: "cell",
      normalizedState: snapshot.normalizedState,
      subsetLegend: snapshot.subsetLegend,
      selection: {
        rowIndex: snapshot.selectedCell.rowIndex,
        colIndex: snapshot.selectedCell.colIndex,
        train: snapshot.selectedCell.trainLabel,
        eval: snapshot.selectedCell.evalLabel,
      },
      value: roundValue(snapshot.selectedCell.value),
      cleanValue: snapshot.selectedCell.cleanValue !== undefined ? roundValue(snapshot.selectedCell.cleanValue) : undefined,
      operatorValue:
        snapshot.selectedCell.operatorValue !== undefined ? roundValue(snapshot.selectedCell.operatorValue) : undefined,
    };
  }

  if (responseType === "answer") {
    return {
      explorer: snapshot.explorer,
      response: "answer",
      normalizedState: snapshot.normalizedState,
      subsetLegend: snapshot.subsetLegend,
      selection: {
        train: snapshot.selectedCell.trainLabel,
        eval: snapshot.selectedCell.evalLabel,
      },
      answer: {
        label: snapshot.answer.label,
        value: roundValue(snapshot.answer.value),
        formula: snapshot.answer.formula,
        detail: snapshot.answer.detail,
      },
    };
  }

  return {
    explorer: snapshot.explorer,
    response: "matrix",
    normalizedState: snapshot.normalizedState,
    subsetLegend: snapshot.subsetLegend,
    matrixSource: snapshot.matrixSource,
    rowLabels: snapshot.rowLabels,
    columnLabels: snapshot.columnLabels,
    matrix: roundMatrix(snapshot.responseMatrix),
    selection: {
      train: snapshot.selectedCell.trainLabel,
      eval: snapshot.selectedCell.evalLabel,
      value: roundValue(snapshot.selectedCell.value),
    },
    answer: {
      label: snapshot.answer.label,
      value: roundValue(snapshot.answer.value),
      formula: snapshot.answer.formula,
      detail: snapshot.answer.detail,
    },
  };
}

export function runExplorerApiRequest(request = {}) {
  const explorer = coerceEnum(request.explorer, ["grid", "graph"], "grid");
  const responseType = coerceEnum(request.response, RESPONSE_TYPES, "matrix");
  const rawState = mergeRequestState(request);
  const snapshot = explorer === "graph" ? buildGraphSnapshot(rawState) : buildGridSnapshot(rawState);
  return buildResponsePayload(snapshot, responseType);
}
