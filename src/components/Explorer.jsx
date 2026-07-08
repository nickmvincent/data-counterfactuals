import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import {
  alphabet,
  applyGridEdits,
  buildSubsetGrid,
  computeColumnSensitivity,
  computeEvaluationConfidenceInterval,
  computeRowRemovalStats,
  computeScalingStats,
  computeSemivalueStats,
  computeShapleyStats,
  covertypeDomainMaxCount,
  createTutorialPresets,
  findSubsetIndex,
  getCovertypeDomains,
  labelSubset as label,
  matrixRange,
  normalizeValue,
  selectAnalysisMatrix,
} from "../lib/counterfactual-math.js";
import {
  buildConceptPlans,
  cellsForColumn,
  cellsForCurrentCell,
  cellsForRow,
  cellsToIds,
  describeCell,
  gridConceptIds,
  gridConcepts,
  makeCellId,
  parseCellId,
  rankConceptPlan,
  uniqueCells,
} from "../lib/grid-concept-planner.js";
import {
  buildExplorerHref,
  copyExplorerShareUrl,
  graphLensToGridMode,
  gridModeToGraphLens,
  hasExplorerGameStateParams,
  normalizeSharedChoice,
  normalizeSharedTokens,
  parseExplorerGameState,
  parseSharedCount,
  replaceExplorerGameStateUrl,
} from "../lib/explorer-game-state.js";
import { conceptAtlasEntries, getConceptAtlasEntry, getConceptComparisons } from "../lib/concept-atlas.js";
import { graphLensSpecs, visualGrammarEntries } from "../lib/concept-lens-specs.js";
import {
  buildCellNarration,
  buildGuidedSteps,
  sameCell,
  validGuideCells,
} from "../lib/explorer-guides.js";
import { scrollChildIntoContainer } from "../lib/scroll-helpers.js";
import { playSurfaceStyles } from "./explorerStyles.js";

const metricMeta = {
  jaccard: {
    short: "Jaccard",
    description: "Normalized overlap between train and eval worlds.",
  },
  inter: {
    short: "|Intersection|",
    description: "Raw shared count between train and eval worlds.",
  },
  entropy: {
    short: "Entropy",
    description: "Binary entropy of overlap; highest when overlap is uncertain.",
  },
  real: {
    short: "Real data",
    description: "Toy classifier accuracy over a small fixed dataset.",
  },
  covertype: {
    short: "Covertype",
    description: "Held-out multiclass accuracy over real wilderness domains.",
  },
};

const graphLensMeta = Object.fromEntries(
  graphLensSpecs.map(({ id, title, tab, summary }) => [id, { title, tab, summary }]),
);

const palettes = {
  atlas: ["#17323a", "#2f6f73", "#7da16f", "#d1a354", "#fff4df"],
  lab: ["#14233a", "#466d91", "#83a5a6", "#d5ad5e", "#fff8ea"],
};

const multiFocusConcepts = new Set(["group", "interaction", "poison"]);
const kBucketConcepts = new Set(["scaling", "eval-scaling", "diagonal-scaling", "budget"]);

const conceptMap = visualGrammarEntries;

function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}

function hexToRgb(hex) {
  const normalized = hex.replace("#", "");
  return {
    r: Number.parseInt(normalized.slice(0, 2), 16),
    g: Number.parseInt(normalized.slice(2, 4), 16),
    b: Number.parseInt(normalized.slice(4, 6), 16),
  };
}

function createPalette(stops) {
  const colors = stops.map(hexToRgb);
  return (input) => {
    const t = clamp01(input);
    const scaled = t * (colors.length - 1);
    const index = Math.min(colors.length - 2, Math.floor(scaled));
    const localT = scaled - index;
    const start = colors[index];
    const end = colors[index + 1];
    const r = start.r + (end.r - start.r) * localT;
    const g = start.g + (end.g - start.g) * localT;
    const b = start.b + (end.b - start.b) * localT;
    return `rgb(${Math.round(r)} ${Math.round(g)} ${Math.round(b)})`;
  };
}

function clampIndex(index, total) {
  if (!total) return 0;
  if (index < 0) return 0;
  if (index >= total) return total - 1;
  return index;
}

function formatValue(value) {
  return Number.isFinite(value) ? value.toFixed(4) : "0.0000";
}

function formatSigned(value) {
  if (!Number.isFinite(value)) return "0.0000";
  return `${value > 0 ? "+" : ""}${value.toFixed(4)}`;
}

function subsetKey(subset) {
  return subset.join("|");
}

function canonicalEdgeKey(left, right) {
  return left < right ? `${left}:${right}` : `${right}:${left}`;
}

function changedToken(left, right) {
  const leftSet = new Set(left);
  for (const token of right) {
    if (!leftSet.has(token)) return token;
  }
  const rightSet = new Set(right);
  for (const token of left) {
    if (!rightSet.has(token)) return token;
  }
  return "";
}

function columnRange(matrix, colIndex) {
  let min = Infinity;
  let max = -Infinity;
  for (const row of matrix) {
    const value = row[colIndex];
    if (!Number.isFinite(value)) continue;
    if (value < min) min = value;
    if (value > max) max = value;
  }
  return {
    min: Number.isFinite(min) ? min : 0,
    max: Number.isFinite(max) ? max : 1,
  };
}

function rowRange(matrix, rowIndex) {
  const row = matrix[rowIndex] || [];
  let min = Infinity;
  let max = -Infinity;
  for (const value of row) {
    if (!Number.isFinite(value)) continue;
    if (value < min) min = value;
    if (value > max) max = value;
  }
  return {
    min: Number.isFinite(min) ? min : 0,
    max: Number.isFinite(max) ? max : 1,
  };
}

function completeFocusPair(focusSet, base) {
  const clean = normalizeSharedTokens(focusSet, base, []).slice(0, 2);
  if (clean.length >= 2) return clean;
  const startIndex = clean.length ? base.indexOf(clean[0]) : -1;
  const ordered = [
    ...base.slice(Math.max(0, startIndex + 1)),
    ...base.slice(0, Math.max(0, startIndex + 1)),
  ];
  for (const token of ordered) {
    if (!clean.includes(token)) clean.push(token);
    if (clean.length >= 2) break;
  }
  return clean;
}

function averageValues(values) {
  const finiteValues = values.filter((value) => Number.isFinite(value));
  if (!finiteValues.length) return 0;
  return finiteValues.reduce((sum, value) => sum + value, 0) / finiteValues.length;
}

function evaluationUnitCountForSet(metric, domains, evalSet) {
  if (metric === "covertype") {
    const byToken = new Map(domains.map((entry) => [entry.token, entry.totalRows || 0]));
    return evalSet.reduce((sum, token) => sum + (byToken.get(token) || 0), 0);
  }
  return evalSet.length;
}

function valueScaleForEval(metric, evalSet) {
  return metric === "inter" ? Math.max(1, evalSet.length) : 1;
}

function confidenceIntervalForValue({ value, evalSet, metric, domains }) {
  const valueScale = valueScaleForEval(metric, evalSet);
  const interval = computeEvaluationConfidenceInterval({
    estimate: value,
    unitCount: evaluationUnitCountForSet(metric, domains, evalSet),
    confidenceLevel: 0.95,
    valueScale,
  });
  return { interval, valueScale };
}

function intervalBandStyle(interval, valueScale) {
  if (!interval?.available || valueScale <= 0) return null;
  const left = clamp01(interval.lower / valueScale);
  const right = clamp01(interval.upper / valueScale);
  return {
    "--ci-left": `${left * 100}%`,
    "--ci-width": `${Math.max(3, (right - left) * 100)}%`,
  };
}

function graphIntervalBand(interval, valueScale, nodeWidth) {
  if (!interval?.available || valueScale <= 0) return null;
  const pad = 8;
  const innerWidth = Math.max(0, nodeWidth - pad * 2);
  const left = clamp01(interval.lower / valueScale);
  const right = clamp01(interval.upper / valueScale);
  return {
    x: -nodeWidth / 2 + pad + left * innerWidth,
    width: Math.max(5, (right - left) * innerWidth),
  };
}

function buildGraphGeometry(subsets, items) {
  const layers = Array.from({ length: items.length + 1 }, () => []);
  const indexByKey = new Map();

  subsets.forEach((subset, index) => {
    layers[subset.length].push({ index, subset, label: label(subset) });
    indexByKey.set(subsetKey(subset), index);
  });

  const slotWidth = 92;
  const slotHeight = 86;
  const maxLayerSize = Math.max(...layers.map((layer) => Math.max(1, layer.length)));
  const width = Math.max(650, 110 + (maxLayerSize - 1) * slotWidth);
  const height = 110 + items.length * slotHeight;
  const nodes = new Map();

  layers.forEach((layer, size) => {
    const span = (Math.max(1, layer.length) - 1) * slotWidth;
    const startX = width / 2 - span / 2;
    const y = 58 + size * slotHeight;
    layer.forEach((entry, layerIndex) => {
      const nodeWidth = Math.max(42, 21 + entry.label.length * 8);
      nodes.set(entry.index, {
        x: startX + layerIndex * slotWidth,
        y,
        width: nodeWidth,
        height: 32,
        label: entry.label,
      });
    });
  });

  const edges = [];
  subsets.forEach((subset, index) => {
    items.forEach((token) => {
      if (subset.includes(token)) return;
      const superset = [...subset, token].sort();
      const targetIndex = indexByKey.get(subsetKey(superset));
      if (typeof targetIndex !== "number") return;
      edges.push({
        id: `${index}-${targetIndex}`,
        from: index,
        to: targetIndex,
        token,
        key: canonicalEdgeKey(index, targetIndex),
      });
    });
  });

  return { width, height, nodes, edges };
}

function idsToCells(ids, subsets, visibleColIndices) {
  const visibleCols = new Set(visibleColIndices);
  return ids
    .map(parseCellId)
    .filter(
      (cell) =>
        cell &&
        cell.rowIndex >= 0 &&
        cell.rowIndex < subsets.length &&
        cell.colIndex >= 0 &&
        cell.colIndex < subsets.length &&
        visibleCols.has(cell.colIndex),
    );
}

function planStatusLabel(plan) {
  if (!plan) return "not available";
  if (plan.status === "ready") return "ready";
  if (plan.status === "partial") return `${plan.missingCells.length} missing`;
  return "not available";
}

function normalizePendingTokens(tokens, base) {
  const normalized = normalizeSharedTokens(tokens, base, []);
  return normalized.length === tokens.length || tokens.length === 0 ? normalized : null;
}

function parseSharedNumber(value, fallback, min = -Infinity, max = Infinity) {
  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, parsed));
}

function parseSharedBoolean(value, fallback = false) {
  if (value === "1" || value === "true") return true;
  if (value === "0" || value === "false") return false;
  return fallback;
}

function Explorer({ initialView = "grid" }) {
  const routeView = initialView === "graph" ? "graph" : "grid";
  const countMin = 2;
  const countMax = 7;
  const gridWrapRef = useRef(null);
  const graphWrapRef = useRef(null);
  const initialUrlStateAppliedRef = useRef(false);
  const pendingUrlSelectionRef = useRef(false);
  const skipNextDefaultSelectionRef = useRef(false);
  const setupAutoShownRef = useRef(false);
  const urlSyncEnabledRef = useRef(false);

  const [view, setView] = useState(routeView);
  const [pendingSharedState, setPendingSharedState] = useState(null);
  const [pendingSelection, setPendingSelection] = useState(null);
  const [count, setCount] = useState(routeView === "graph" ? 4 : 3);
  const [metric, setMetric] = useState("jaccard");
  const [realDataMode, setRealDataMode] = useState("precomputed");
  const [realDataSample, setRealDataSample] = useState(0);
  const [paletteKey, setPaletteKey] = useState("atlas");
  const [appMode, setAppMode] = useState("explore");
  const [queryConcept, setQueryConcept] = useState("loo");
  const [presetChoice, setPresetChoice] = useState("current");
  const [lens, setLens] = useState("ablation");
  const [focusSet, setFocusSet] = useState(routeView === "graph" ? ["B"] : ["A"]);
  const [k, setK] = useState(2);
  const [betaAlpha, setBetaAlpha] = useState(2);
  const [betaBeta, setBetaBeta] = useState(2);
  const [epsilon, setEpsilon] = useState(1);
  const [auditTolerance, setAuditTolerance] = useState(0.15);
  const [poisonActive, setPoisonActive] = useState(false);
  const [gridView, setGridView] = useState("real");
  const [showNums, setShowNums] = useState(true);
  const [showConfidence, setShowConfidence] = useState(true);
  const [showSingletonEvalCols, setShowSingletonEvalCols] = useState(false);
  const [controlsOpen, setControlsOpen] = useState(false);
  const [trainIdx, setTrainIdx] = useState(1);
  const [evalIdx, setEvalIdx] = useState(1);
  const [selectedCellIds, setSelectedCellIds] = useState(() => [makeCellId(1, 1)]);
  const [walkthroughStep, setWalkthroughStep] = useState(0);
  const [walkthroughRunning, setWalkthroughRunning] = useState(false);
  const [hoverTarget, setHoverTarget] = useState(null);
  const [hoveredNodeIndex, setHoveredNodeIndex] = useState(null);
  const [setupOpen, setSetupOpen] = useState(false);
  const [modeDialogOpen, setModeDialogOpen] = useState(false);
  const [tutorialOpen, setTutorialOpen] = useState(false);
  const [atlasOpen, setAtlasOpen] = useState(false);
  const [atlasConceptId, setAtlasConceptId] = useState("explore");
  const [comparisonId, setComparisonId] = useState("shapley-influence");
  const [activeGuideId, setActiveGuideId] = useState(null);
  const [guidePreviewId, setGuidePreviewId] = useState("evalConfidence");
  const [guideStepIndex, setGuideStepIndex] = useState(0);
  const [guideNarration, setGuideNarration] = useState("");
  const [shareStatus, setShareStatus] = useState("idle");
  const [hydrated, setHydrated] = useState(false);

  const maxCountForMetric = metric === "covertype" ? Math.min(countMax, covertypeDomainMaxCount) : countMax;
  const base = useMemo(() => alphabet.slice(0, Math.min(count, maxCountForMetric)), [count, maxCountForMetric]);
  const palette = useMemo(() => createPalette(palettes[paletteKey]), [paletteKey]);
  const metricOptions = useMemo(() => ({ realDataMode, realDataSample }), [realDataMode, realDataSample]);
  const { matrix: baseMatrix, subsets } = useMemo(() => buildSubsetGrid(base, metric, metricOptions), [base, metric, metricOptions]);
  const editedMatrix = useMemo(
    () =>
      applyGridEdits(baseMatrix, subsets, {
        focusSet: focusSet.filter((token) => base.includes(token)),
        poisonActive,
        noiseLevel: 0,
      }),
    [baseMatrix, subsets, focusSet, base, poisonActive],
  );
  const poisonViewActive = view === "graph" ? lens === "poison" : queryConcept === "poison";
  const matrix = useMemo(
    () =>
      poisonViewActive
        ? selectAnalysisMatrix({ baseMatrix, editedMatrix, gridView })
        : baseMatrix,
    [poisonViewActive, baseMatrix, editedMatrix, gridView],
  );
  const { min: dispMin, max: dispMax } = useMemo(() => matrixRange(matrix), [matrix]);
  const covertypeDomains = useMemo(
    () => (metric === "covertype" ? getCovertypeDomains(base) : []),
    [metric, base],
  );
  const fullSetIndex = useMemo(() => findSubsetIndex(subsets, base), [subsets, base]);
  const emptySetIndex = useMemo(() => findSubsetIndex(subsets, []), [subsets]);

  const visibleColIndices = useMemo(() => {
    if (!showSingletonEvalCols) return subsets.map((_, index) => index);
    const singletons = subsets
      .map((subset, index) => (subset.length === 1 ? index : null))
      .filter((index) => index !== null);
    return singletons.length ? singletons : subsets.map((_, index) => index);
  }, [showSingletonEvalCols, subsets]);

  const safeTrainIdx = clampIndex(trainIdx, subsets.length);
  const safeEvalIdx = clampIndex(evalIdx, subsets.length);
  const trainSet = subsets[safeTrainIdx] || [];
  const evalSet = subsets[safeEvalIdx] || [];
  const selectedValue = matrix[safeTrainIdx]?.[safeEvalIdx] ?? 0;
  const focusPrimary = focusSet.find((token) => base.includes(token)) || base[0] || "A";
  const lensAllowsMultiFocus = lens === "strike" || lens === "interaction" || lens === "poison";
  const lensUsesK = lens === "scaling" || lens === "eval-scaling";
  const lensUsesEvalAxis = lens === "eval-scaling";
  const queryUsesFocus = !kBucketConcepts.has(queryConcept);
  const queryAllowsMultiFocus = queryUsesFocus && multiFocusConcepts.has(queryConcept);
  const focusGroup = lens === "strike" || lens === "poison" || queryConcept === "group" || queryConcept === "poison"
    ? focusSet.filter((token) => base.includes(token)).sort()
    : focusPrimary
      ? [focusPrimary]
      : [];
  const interactionPair = completeFocusPair(focusSet, base);

  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated || setupAutoShownRef.current || typeof window === "undefined") return;
    setupAutoShownRef.current = true;
    if (!hasExplorerGameStateParams(window.location.search)) setSetupOpen(true);
  }, [hydrated]);

  useEffect(() => {
    const search = typeof window === "undefined" ? "" : window.location.search;
    const sharedState = parseExplorerGameState(search);
    const hasSelection = Boolean(sharedState.trainSet || sharedState.evalSet);
    urlSyncEnabledRef.current = hasExplorerGameStateParams(search);
    pendingUrlSelectionRef.current = hasSelection;

    if (sharedState.count) setCount(parseSharedCount(sharedState.count, routeView === "graph" ? 4 : 3, countMin, countMax));
    if (sharedState.metric) setMetric(normalizeSharedChoice(sharedState.metric, Object.keys(metricMeta), "jaccard"));
    if (sharedState.mode && gridConceptIds.includes(sharedState.mode)) {
      setQueryConcept(sharedState.mode);
      setAppMode(sharedState.mode === "explore" ? "explore" : "compute");
      setLens(sharedState.lens || gridModeToGraphLens(sharedState.mode));
    } else if (sharedState.mode === "explore") {
      setAppMode("explore");
      setLens(sharedState.lens || "ablation");
    }
    if (sharedState.lens) {
      const normalizedLens = normalizeSharedChoice(sharedState.lens, Object.keys(graphLensMeta), "ablation");
      setLens(normalizedLens);
      if (!sharedState.mode) {
        setQueryConcept(graphLensToGridMode(normalizedLens));
        setAppMode("compute");
      }
      if (normalizedLens === "poison" && sharedState.poisonActive === null) setPoisonActive(true);
      if (normalizedLens === "poison" && !sharedState.gridView) setGridView("operator");
    }
    if (sharedState.focusSet) setFocusSet(sharedState.focusSet);
    if (sharedState.k !== null) setK(parseSharedCount(sharedState.k, 2, 0, countMax));
    if (sharedState.epsilon !== null) setEpsilon(parseSharedNumber(sharedState.epsilon, 1, 0.01, 20));
    if (sharedState.auditTolerance !== null) setAuditTolerance(parseSharedNumber(sharedState.auditTolerance, 0.15, 0, 1));
    if (sharedState.poisonActive !== null) setPoisonActive(parseSharedBoolean(sharedState.poisonActive, false));
    if (sharedState.gridView) setGridView(normalizeSharedChoice(sharedState.gridView, ["real", "operator"], "real"));

    if (hasSelection) {
      setPendingSharedState(sharedState);
    } else {
      initialUrlStateAppliedRef.current = true;
    }
  }, [routeView]);

  useEffect(() => {
    if (count > maxCountForMetric) setCount(maxCountForMetric);
  }, [count, maxCountForMetric]);

  useEffect(() => {
    if (trainIdx !== safeTrainIdx) setTrainIdx(safeTrainIdx);
    if (evalIdx !== safeEvalIdx) setEvalIdx(safeEvalIdx);
  }, [trainIdx, evalIdx, safeTrainIdx, safeEvalIdx]);

  useEffect(() => {
    if (!visibleColIndices.length) return;
    if (!visibleColIndices.includes(safeEvalIdx)) setEvalIdx(visibleColIndices[0]);
  }, [visibleColIndices, safeEvalIdx]);

  useEffect(() => {
    setFocusSet((previous) => {
      const filtered = previous.filter((token) => base.includes(token));
      const fallback = routeView === "graph" && base.includes("B") ? ["B"] : base.length ? [base[0]] : [];
      const next = filtered.length ? filtered : fallback;
      if (!queryAllowsMultiFocus && !lensAllowsMultiFocus && next.length > 1) return [next[0]];
      return next;
    });
  }, [base, queryAllowsMultiFocus, lensAllowsMultiFocus, routeView]);

  useEffect(() => {
    if (k > base.length) setK(base.length);
  }, [base.length, k]);

  useEffect(() => {
    if (initialUrlStateAppliedRef.current || !subsets.length || !pendingSharedState) return;
    let nextTrain = safeTrainIdx;
    let nextEval = safeEvalIdx;
    if (pendingSharedState.trainSet) {
      const trainIndex = findSubsetIndex(subsets, normalizeSharedTokens(pendingSharedState.trainSet, base));
      if (trainIndex >= 0) nextTrain = trainIndex;
    }
    if (pendingSharedState.evalSet) {
      const evalIndex = findSubsetIndex(subsets, normalizeSharedTokens(pendingSharedState.evalSet, base));
      if (evalIndex >= 0) nextEval = evalIndex;
    }
    setTrainIdx(nextTrain);
    setEvalIdx(nextEval);
    setSelectedCellIds([makeCellId(nextTrain, nextEval)]);
    skipNextDefaultSelectionRef.current = true;
    initialUrlStateAppliedRef.current = true;
    setPendingSharedState(null);
  }, [subsets, base, pendingSharedState, safeTrainIdx, safeEvalIdx]);

  useEffect(() => {
    if (!subsets.length || pendingSharedState) return;
    if (pendingUrlSelectionRef.current) {
      pendingUrlSelectionRef.current = false;
      return;
    }
    if (skipNextDefaultSelectionRef.current) {
      skipNextDefaultSelectionRef.current = false;
      return;
    }
    const nextIndex = routeView === "graph"
      ? fullSetIndex >= 0
        ? fullSetIndex
        : 0
      : Math.min(1, Math.max(0, subsets.length - 1));
    setTrainIdx(nextIndex);
    setEvalIdx(nextIndex);
    setSelectedCellIds([makeCellId(nextIndex, nextIndex)]);
  }, [count, subsets.length, fullSetIndex, routeView, pendingSharedState]);

  useEffect(() => {
    if (!pendingSelection || !subsets.length) return;
    const rowTokens = normalizePendingTokens(pendingSelection.row || [], base);
    const colTokens = normalizePendingTokens(pendingSelection.col || [], base);
    if (!rowTokens || !colTokens) return;
    const rowIndex = findSubsetIndex(subsets, rowTokens);
    const colIndex = findSubsetIndex(subsets, colTokens);
    if (rowIndex < 0 || colIndex < 0) return;
    setTrainIdx(rowIndex);
    setEvalIdx(colIndex);
    setSelectedCellIds([makeCellId(rowIndex, colIndex)]);
    setView("grid");
    setPendingSelection(null);
  }, [pendingSelection, subsets, base]);

  useEffect(() => {
    setSelectedCellIds((previous) => {
      const filtered = idsToCells(previous, subsets, visibleColIndices);
      return filtered.length ? cellsToIds(filtered) : [makeCellId(safeTrainIdx, safeEvalIdx)];
    });
  }, [subsets, visibleColIndices, safeTrainIdx, safeEvalIdx]);

  const selectedCells = useMemo(
    () => idsToCells(selectedCellIds, subsets, visibleColIndices),
    [selectedCellIds, subsets, visibleColIndices],
  );
  const selectedSet = useMemo(() => new Set(selectedCellIds), [selectedCellIds]);
  const selectedFacts = useMemo(
    () => selectedCells.map((cell) => describeCell({ cell, matrix, subsets })),
    [selectedCells, matrix, subsets],
  );

  const plans = useMemo(
    () =>
      buildConceptPlans({
        matrix,
        cleanMatrix: baseMatrix,
        operatorMatrix: editedMatrix,
        subsets,
        universe: base,
        rowIndex: safeTrainIdx,
        colIndex: safeEvalIdx,
        focusSet,
        selectedCellIds,
        k,
        betaAlpha,
        betaBeta,
        epsilon,
        auditTolerance,
        poisonActive,
      }),
    [matrix, baseMatrix, editedMatrix, subsets, base, safeTrainIdx, safeEvalIdx, focusSet, selectedCellIds, k, betaAlpha, betaBeta, epsilon, auditTolerance, poisonActive],
  );
  const sortedPlans = useMemo(
    () => plans.slice().sort((left, right) => rankConceptPlan(left) - rankConceptPlan(right)),
    [plans],
  );
  const activePlan = plans.find((plan) => plan.id === queryConcept) || plans[0];
  const activeAtlasEntry = getConceptAtlasEntry(atlasConceptId);
  const activeComparisons = getConceptComparisons(atlasConceptId);
  const activeComparison = activeComparisons.find((card) => card.id === comparisonId) || activeComparisons[0] || null;
  const activeStep = activePlan?.steps?.[walkthroughStep] || activePlan?.steps?.[0] || null;
  const activeStepCellSet = useMemo(() => new Set(cellsToIds(activeStep?.cells || [])), [activeStep]);
  const requiredCellSet = useMemo(() => new Set(cellsToIds(activePlan?.requiredCells || [])), [activePlan]);

  useEffect(() => {
    setWalkthroughStep(0);
    setWalkthroughRunning(false);
  }, [queryConcept, safeTrainIdx, safeEvalIdx, focusSet, k, betaAlpha, betaBeta, epsilon, auditTolerance, poisonActive, gridView]);

  useEffect(() => {
    if (!walkthroughRunning || !activePlan) return undefined;
    if (walkthroughStep >= activePlan.steps.length - 1) {
      setWalkthroughRunning(false);
      return undefined;
    }
    const timer = setTimeout(() => setWalkthroughStep((previous) => previous + 1), 950);
    return () => clearTimeout(timer);
  }, [walkthroughRunning, walkthroughStep, activePlan]);

  useEffect(() => {
    const container = gridWrapRef.current;
    if (!container || view !== "grid") return;
    const selectedCell = container.querySelector('[data-anchor-cell="true"]');
    if (selectedCell) scrollChildIntoContainer(container, selectedCell);
  }, [safeTrainIdx, safeEvalIdx, subsets.length, view]);

  useEffect(() => {
    const container = graphWrapRef.current;
    if (!container || view !== "graph") return;
    const selectedNode = container.querySelector('[data-selected="true"]');
    if (selectedNode) scrollChildIntoContainer(container, selectedNode);
  }, [safeTrainIdx, safeEvalIdx, lens, count, view]);

  const evaluationUnitCount = useMemo(() => {
    return evaluationUnitCountForSet(metric, covertypeDomains, evalSet);
  }, [metric, covertypeDomains, evalSet]);
  const evaluationInterval = useMemo(
    () =>
      computeEvaluationConfidenceInterval({
        estimate: selectedValue,
        unitCount: evaluationUnitCount,
        confidenceLevel: 0.95,
        valueScale: valueScaleForEval(metric, evalSet),
      }),
    [selectedValue, evaluationUnitCount, metric, evalSet.length],
  );

  const graph = useMemo(() => buildGraphGeometry(subsets, base), [subsets, base]);
  const graphIsDense = subsets.length >= 32;
  const { min: colMin, max: colMax } = useMemo(() => columnRange(matrix, safeEvalIdx), [matrix, safeEvalIdx]);
  const ablationStats = useMemo(
    () =>
      computeRowRemovalStats({
        matrix,
        subsets,
        rowIndex: safeTrainIdx,
        colIndex: safeEvalIdx,
        tokensToRemove: focusPrimary ? [focusPrimary] : [],
      }),
    [matrix, subsets, safeTrainIdx, safeEvalIdx, focusPrimary],
  );
  const strikeStats = useMemo(
    () =>
      computeRowRemovalStats({
        matrix,
        subsets,
        rowIndex: safeTrainIdx,
        colIndex: safeEvalIdx,
        tokensToRemove: focusGroup,
      }),
    [matrix, subsets, safeTrainIdx, safeEvalIdx, focusGroup],
  );
  const strikePath = useMemo(() => {
    if (!strikeStats.removedTokens.length) return [safeTrainIdx];
    const indices = [safeTrainIdx];
    let cursor = [...trainSet];
    strikeStats.removedTokens.forEach((token) => {
      cursor = cursor.filter((candidate) => candidate !== token);
      const nextIndex = findSubsetIndex(subsets, cursor);
      if (nextIndex >= 0) indices.push(nextIndex);
    });
    return indices;
  }, [strikeStats.removedTokens, safeTrainIdx, trainSet, subsets]);
  const shapleyStats = useMemo(
    () =>
      computeShapleyStats({
        matrix,
        subsets,
        focusItem: focusPrimary,
        evalColumnIndex: safeEvalIdx,
        playerCount: base.length,
      }),
    [matrix, subsets, focusPrimary, safeEvalIdx, base.length],
  );
  const semivalueStats = useMemo(
    () =>
      computeSemivalueStats({
        matrix,
        subsets,
        focusItem: focusPrimary,
        evalColumnIndex: safeEvalIdx,
        playerCount: base.length,
        mode: queryConcept === "banzhaf" ? "banzhaf" : queryConcept === "beta" ? "beta" : "shapley",
        alpha: betaAlpha,
        beta: betaBeta,
      }),
    [matrix, subsets, focusPrimary, safeEvalIdx, base.length, queryConcept, betaAlpha, betaBeta],
  );
  const scalingRows = useMemo(
    () =>
      computeScalingStats({
        matrix,
        subsets,
        maxSize: base.length,
        evalColumnIndex: safeEvalIdx,
      }),
    [matrix, subsets, base.length, safeEvalIdx],
  );
  const scalingBucket = scalingRows.find((entry) => entry.k === k) || { avg: 0, n: 0 };
  const { min: rowMin, max: rowMax } = useMemo(() => rowRange(matrix, safeTrainIdx), [matrix, safeTrainIdx]);
  const interactionStats = useMemo(() => {
    const [left, right] = interactionPair;
    const backgroundSet = trainSet.filter((token) => !interactionPair.includes(token));
    const leftSet = left ? [...backgroundSet, left].sort() : backgroundSet;
    const rightSet = right ? [...backgroundSet, right].sort() : backgroundSet;
    const bothSet = interactionPair.length === 2 ? [...backgroundSet, ...interactionPair].sort() : trainSet;
    const rawCorners = [
      { id: "both", name: "Together", coefficient: 1, set: bothSet },
      { id: "left", name: left || "Left", coefficient: -1, set: leftSet },
      { id: "right", name: right || "Right", coefficient: -1, set: rightSet },
      { id: "background", name: "Background", coefficient: 1, set: backgroundSet },
    ];
    const corners = rawCorners.map((corner) => {
      const rowIndex = findSubsetIndex(subsets, corner.set);
      return {
        ...corner,
        rowIndex,
        value: rowIndex >= 0 ? (matrix[rowIndex]?.[safeEvalIdx] ?? 0) : 0,
      };
    });
    const available = interactionPair.length === 2 && corners.every((corner) => corner.rowIndex >= 0);
    const value = available
      ? corners.reduce((sum, corner) => sum + corner.coefficient * corner.value, 0)
      : 0;
    const edgeKeys = available
      ? [
          canonicalEdgeKey(corners[3].rowIndex, corners[1].rowIndex),
          canonicalEdgeKey(corners[3].rowIndex, corners[2].rowIndex),
          canonicalEdgeKey(corners[1].rowIndex, corners[0].rowIndex),
          canonicalEdgeKey(corners[2].rowIndex, corners[0].rowIndex),
        ]
      : [];

    return {
      left,
      right,
      pair: interactionPair,
      backgroundSet,
      leftSet,
      rightSet,
      bothSet,
      corners,
      edgeKeys,
      available,
      value,
    };
  }, [interactionPair, trainSet, subsets, matrix, safeEvalIdx]);
  const dpStats = useMemo(
    () =>
      computeRowRemovalStats({
        matrix: baseMatrix,
        subsets,
        rowIndex: safeTrainIdx,
        colIndex: safeEvalIdx,
        tokensToRemove: focusPrimary ? [focusPrimary] : [],
      }),
    [baseMatrix, subsets, safeTrainIdx, safeEvalIdx, focusPrimary],
  );
  const dpSensitivity = useMemo(
    () =>
      computeColumnSensitivity({
        matrix: baseMatrix,
        rowIndex: safeTrainIdx,
        compareRowIndex: dpStats.compareRowIndex,
      }),
    [baseMatrix, safeTrainIdx, dpStats.compareRowIndex],
  );
  const dpLocalGap = Math.abs((baseMatrix[safeTrainIdx]?.[safeEvalIdx] ?? 0) - (dpStats.compareValue ?? 0));
  const dpScale = dpSensitivity / Math.max(epsilon, 0.01);
  const dpTopGaps = useMemo(() => {
    if (dpStats.compareRowIndex < 0) return [];
    return subsets
      .map((subset, index) => ({
        evalLabel: label(subset),
        gap: Math.abs((baseMatrix[safeTrainIdx]?.[index] ?? 0) - (baseMatrix[dpStats.compareRowIndex]?.[index] ?? 0)),
      }))
      .sort((left, right) => right.gap - left.gap)
      .slice(0, 3);
  }, [baseMatrix, subsets, safeTrainIdx, dpStats.compareRowIndex]);
  const evalScalingRows = useMemo(
    () =>
      Array.from({ length: base.length + 1 }, (_, bucket) => {
        const values = subsets
          .map((subset, index) => (subset.length === bucket ? (matrix[safeTrainIdx]?.[index] ?? 0) : null))
          .filter((value) => value !== null);
        return { k: bucket, avg: averageValues(values), n: values.length };
      }),
    [base.length, subsets, matrix, safeTrainIdx],
  );
  const evalScalingBucket = evalScalingRows.find((entry) => entry.k === k) || { avg: 0, n: 0 };
  const poisonTargets = focusGroup.length ? focusGroup : focusPrimary ? [focusPrimary] : [];
  const showPoisonOverlay = lens === "poison";
  const poisonedNodes = useMemo(
    () =>
      new Set(
        poisonActive && showPoisonOverlay
          ? subsets
              .map((subset, index) => (poisonTargets.some((token) => subset.includes(token)) ? index : null))
              .filter((index) => index !== null)
          : [],
      ),
    [poisonActive, showPoisonOverlay, subsets, poisonTargets],
  );
  const poisonCleanValue = baseMatrix[safeTrainIdx]?.[safeEvalIdx] ?? 0;
  const poisonOperatorValue = editedMatrix[safeTrainIdx]?.[safeEvalIdx] ?? poisonCleanValue;
  const poisonDelta = poisonOperatorValue - poisonCleanValue;

  const removalWalks = useMemo(
    () =>
      trainSet.map((token) => {
        const nextSet = trainSet.filter((candidate) => candidate !== token);
        const nextIndex = findSubsetIndex(subsets, nextSet);
        const nextValue = nextIndex >= 0 ? (matrix[nextIndex]?.[safeEvalIdx] ?? selectedValue) : selectedValue;
        return {
          token,
          kind: focusPrimary === token ? "focus ablation" : "single deletion",
          nextLabel: label(nextSet),
          nextIndex,
          delta: selectedValue - nextValue,
        };
      }),
    [trainSet, subsets, matrix, safeEvalIdx, selectedValue, focusPrimary],
  );
  const additionWalks = useMemo(
    () =>
      base
        .filter((token) => !trainSet.includes(token))
        .map((token) => {
          const nextSet = [...trainSet, token].sort();
          const nextIndex = findSubsetIndex(subsets, nextSet);
          const nextValue = nextIndex >= 0 ? (matrix[nextIndex]?.[safeEvalIdx] ?? selectedValue) : selectedValue;
          return {
            token,
            kind: "augmentation",
            nextLabel: label(nextSet),
            nextIndex,
            delta: nextValue - selectedValue,
          };
        }),
    [base, trainSet, subsets, matrix, safeEvalIdx, selectedValue],
  );

  const highlightedNodes = new Set([lensUsesEvalAxis ? safeEvalIdx : safeTrainIdx]);
  const highlightedEdges = new Set();
  const squareEdges = new Set();
  const envelopeEdges = new Set();
  const envelopeNodes = new Set();
  if (lens === "ablation" && ablationStats.compareRowIndex >= 0 && trainSet.includes(focusPrimary)) {
    highlightedNodes.add(ablationStats.compareRowIndex);
    highlightedEdges.add(canonicalEdgeKey(safeTrainIdx, ablationStats.compareRowIndex));
  }
  if (lens === "strike" && strikePath.length > 1) {
    strikePath.forEach((index) => highlightedNodes.add(index));
    for (let step = 0; step < strikePath.length - 1; step += 1) {
      highlightedEdges.add(canonicalEdgeKey(strikePath[step], strikePath[step + 1]));
    }
  }
  if (lens === "interaction" && interactionStats.available) {
    interactionStats.corners.forEach((corner) => highlightedNodes.add(corner.rowIndex));
    interactionStats.edgeKeys.forEach((edgeKey) => {
      highlightedEdges.add(edgeKey);
      squareEdges.add(edgeKey);
    });
  }
  if (lens === "shapley") {
    shapleyStats.pairs.forEach((pair) => {
      highlightedNodes.add(pair.subsetIndex);
      highlightedNodes.add(pair.withFocusIndex);
      highlightedEdges.add(canonicalEdgeKey(pair.subsetIndex, pair.withFocusIndex));
    });
  }
  if (lens === "scaling") {
    subsets.forEach((subset, index) => {
      if (subset.length === k) highlightedNodes.add(index);
    });
  }
  if (lens === "eval-scaling") {
    subsets.forEach((subset, index) => {
      if (subset.length === k) highlightedNodes.add(index);
    });
  }
  if (lens === "dp" && dpStats.compareRowIndex >= 0 && dpStats.compareRowIndex !== safeTrainIdx) {
    highlightedNodes.add(dpStats.compareRowIndex);
    envelopeNodes.add(safeTrainIdx);
    envelopeNodes.add(dpStats.compareRowIndex);
    const edgeKey = canonicalEdgeKey(safeTrainIdx, dpStats.compareRowIndex);
    highlightedEdges.add(edgeKey);
    envelopeEdges.add(edgeKey);
  }

  const questionBlock = useMemo(() => {
    if (lens === "strike") {
      return {
        title: "Walk a data strike path",
        answerLabel: "Strike delta",
        answerValue: strikeStats.delta,
        copy: strikeStats.removedTokens.length
          ? `The path removes ${label(strikeStats.removedTokens)} one edge at a time until train ${label(trainSet)} reaches ${label(strikeStats.compareSet)}.`
          : `None of ${label(focusGroup)} are present in train ${label(trainSet)}, so the path stays put.`,
        formula: `f(${label(trainSet)}, ${label(evalSet)}) - f(${label(strikeStats.compareSet)}, ${label(evalSet)}) = ${formatValue(strikeStats.delta)}`,
      };
    }
    if (lens === "interaction") {
      return {
        title: "Read the pair square",
        answerLabel: "Interaction",
        answerValue: interactionStats.value,
        copy: interactionStats.available
          ? `${label(interactionStats.pair)} forms a four-corner motif around background ${label(interactionStats.backgroundSet)} on eval ${label(evalSet)}.`
          : "Choose two focus items so the graph can form a complete interaction square.",
        formula: `f(${label(interactionStats.bothSet)}, ${label(evalSet)}) - f(${label(interactionStats.leftSet)}, ${label(evalSet)}) - f(${label(interactionStats.rightSet)}, ${label(evalSet)}) + f(${label(interactionStats.backgroundSet)}, ${label(evalSet)}) = ${formatValue(interactionStats.value)}`,
      };
    }
    if (lens === "shapley") {
      return {
        title: "Average every edge that adds the focus point",
        answerLabel: "Shapley phi",
        answerValue: shapleyStats.phi,
        copy: `The highlighted sweep marks every pair ${focusPrimary} can complete on eval ${label(evalSet)}.`,
        formula: `phi(${focusPrimary}; ${label(evalSet)}) averages ${shapleyStats.cnt} one-step additions.`,
      };
    }
    if (lens === "scaling") {
      return {
        title: "Collapse one layer of the lattice",
        answerLabel: `Average at k=${k}`,
        answerValue: scalingBucket.avg,
        copy: `${scalingBucket.n} nodes with |train| = ${k} are highlighted on eval ${label(evalSet)}.`,
        formula: `Average f(S, ${label(evalSet)}) over every highlighted node whose size is ${k}.`,
      };
    }
    if (lens === "eval-scaling") {
      return {
        title: "Scan the eval layer",
        answerLabel: `Eval avg k=${k}`,
        answerValue: evalScalingBucket.avg,
        copy: `${evalScalingBucket.n} eval nodes with |E| = ${k} are highlighted while train ${label(trainSet)} stays fixed.`,
        formula: `Average f(${label(trainSet)}, E) over every highlighted eval node whose size is ${k}.`,
      };
    }
    if (lens === "dp") {
      return {
        title: "Trace the sensitivity envelope",
        answerLabel: "Scale",
        answerValue: dpScale,
        copy:
          dpStats.compareRowIndex >= 0
            ? `Neighbor ${label(dpStats.compareSet)} defines the row envelope for ${focusPrimary}; epsilon is ${formatValue(epsilon)}.`
            : `${focusPrimary} is not in train ${label(trainSet)}, so the neighboring-row envelope is unavailable.`,
        formula: `max_E |f(${label(trainSet)}, E) - f(${label(dpStats.compareSet)}, E)| / epsilon = ${formatValue(dpSensitivity)} / ${formatValue(epsilon)}`,
      };
    }
    if (lens === "poison") {
      return {
        title: "Compare clean and operator worlds",
        answerLabel: "Attack delta",
        answerValue: poisonDelta,
        copy: `${poisonedNodes.size} training nodes contain target ${label(poisonTargets)}; node color is the ${gridView === "operator" ? "operator" : "clean"} score.`,
        formula: `f_operator(${label(trainSet)}, ${label(evalSet)}) - f_clean(${label(trainSet)}, ${label(evalSet)}) = ${formatValue(poisonDelta)}`,
      };
    }
    return {
      title: "Follow one ablation edge",
      answerLabel: "Ablation delta",
      answerValue: ablationStats.delta,
      copy: trainSet.includes(focusPrimary)
        ? `Move from train ${label(trainSet)} to ${label(ablationStats.compareSet)} while keeping eval ${label(evalSet)} fixed.`
        : `${focusPrimary} is not in train ${label(trainSet)}, so the ablation edge is unavailable.`,
      formula: `f(${label(trainSet)}, ${label(evalSet)}) - f(${label(ablationStats.compareSet)}, ${label(evalSet)}) = ${formatValue(ablationStats.delta)}`,
    };
  }, [
    lens,
    strikeStats,
    trainSet,
    evalSet,
    focusGroup,
    interactionStats,
    shapleyStats,
    focusPrimary,
    scalingBucket,
    evalScalingBucket,
    k,
    dpStats,
    dpScale,
    dpSensitivity,
    epsilon,
    poisonDelta,
    poisonedNodes.size,
    poisonTargets,
    gridView,
    ablationStats,
  ]);

  const sharedGameState = useMemo(
    () => ({
      count,
      metric,
      mode: appMode === "explore" ? "explore" : queryConcept,
      lens,
      trainSet,
      evalSet,
      focusSet: normalizeSharedTokens(focusSet, base, focusPrimary ? [focusPrimary] : []),
      k,
      epsilon: queryConcept === "dp" || lens === "dp" ? epsilon : undefined,
      auditTolerance: queryConcept === "unlearning" ? auditTolerance : undefined,
      poisonActive: queryConcept === "poison" || lens === "poison" ? poisonActive : undefined,
      gridView: queryConcept === "poison" || lens === "poison" ? gridView : undefined,
    }),
    [count, metric, appMode, queryConcept, lens, trainSet, evalSet, focusSet, base, focusPrimary, k, epsilon, auditTolerance, poisonActive, gridView],
  );
  const gridExplorerHref = buildExplorerHref("/grid", sharedGameState);
  const graphExplorerHref = buildExplorerHref("/graph", sharedGameState);

  useEffect(() => {
    if (!hydrated || !urlSyncEnabledRef.current) return;
    replaceExplorerGameStateUrl(sharedGameState);
  }, [hydrated, sharedGameState]);

  useEffect(() => {
    if (shareStatus === "idle") return undefined;
    const timer = window.setTimeout(() => setShareStatus("idle"), 1500);
    return () => window.clearTimeout(timer);
  }, [shareStatus]);

  const copyShareUrl = async () => {
    const path = routeView === "graph" ? "/graph" : "/grid";
    urlSyncEnabledRef.current = true;
    try {
      await copyExplorerShareUrl(path, sharedGameState);
      replaceExplorerGameStateUrl(sharedGameState);
      setShareStatus("copied");
    } catch {
      setShareStatus("failed");
    }
  };

  const openAtlas = (conceptId = appMode === "explore" ? "explore" : queryConcept) => {
    setSetupOpen(false);
    setModeDialogOpen(false);
    setTutorialOpen(false);
    setAtlasConceptId(conceptId);
    setComparisonId(getConceptComparisons(conceptId)[0]?.id || "");
    setAtlasOpen(true);
  };

  const selectAtlasConcept = (conceptId) => {
    setAtlasConceptId(conceptId);
    setComparisonId(getConceptComparisons(conceptId)[0]?.id || "");
  };

  const setSelectedCellsFromCells = (cells, { moveAnchor = true } = {}) => {
    const cleanCells = uniqueCells(cells).filter(
      (cell) =>
        cell.rowIndex >= 0 &&
        cell.rowIndex < subsets.length &&
        cell.colIndex >= 0 &&
        cell.colIndex < subsets.length &&
        visibleColIndices.includes(cell.colIndex),
    );
    if (!cleanCells.length) return;
    setSelectedCellIds(cellsToIds(cleanCells));
    if (moveAnchor) {
      setTrainIdx(cleanCells[0].rowIndex);
      setEvalIdx(cleanCells[0].colIndex);
    }
  };

  const toggleCells = (cells) => {
    const cleanIds = cellsToIds(
      cells.filter(
        (cell) =>
          cell.rowIndex >= 0 &&
          cell.rowIndex < subsets.length &&
          cell.colIndex >= 0 &&
          cell.colIndex < subsets.length &&
          visibleColIndices.includes(cell.colIndex),
      ),
    );
    if (!cleanIds.length) return;
    setSelectedCellIds((previous) => {
      const next = new Set(previous);
      const allSelected = cleanIds.every((id) => next.has(id));
      cleanIds.forEach((id) => {
        if (allSelected) next.delete(id);
        else next.add(id);
      });
      return [...next];
    });
  };

  const handleCellClick = (rowIndex, colIndex) => {
    completeGuideStepForCell(rowIndex, colIndex);
    setTrainIdx(rowIndex);
    setEvalIdx(colIndex);
    if (appMode === "compute") {
      setSelectedCellsFromCells(cellsForCurrentCell(rowIndex, colIndex), { moveAnchor: false });
      return;
    }
    toggleCells(cellsForCurrentCell(rowIndex, colIndex));
  };

  const handleRowHeaderClick = (rowIndex) => {
    completeGuideStepForAxis("row", rowIndex);
    setTrainIdx(rowIndex);
    if (appMode === "explore") toggleCells(cellsForRow(subsets, rowIndex, visibleColIndices));
  };

  const handleColumnHeaderClick = (colIndex) => {
    completeGuideStepForAxis("col", colIndex);
    setEvalIdx(colIndex);
    if (appMode === "explore") toggleCells(cellsForColumn(subsets, colIndex));
  };

  const startWalkthrough = () => {
    if (!activePlan || activePlan.status === "unavailable") return;
    setAppMode("compute");
    setSelectedCellsFromCells(activePlan.requiredCells, { moveAnchor: false });
    setWalkthroughStep(0);
    setWalkthroughRunning(true);
  };

  const changeConcept = (conceptId) => {
    setQueryConcept(conceptId);
    setAppMode("compute");
    setLens(gridModeToGraphLens(conceptId));
    if (conceptId === "poison") {
      setPoisonActive(true);
      setGridView("operator");
    }
  };

  const changeLens = (nextLens) => {
    setLens(nextLens);
    setQueryConcept((previous) => (gridModeToGraphLens(previous) === nextLens ? previous : graphLensToGridMode(nextLens)));
    setAppMode("compute");
    if (nextLens === "interaction") {
      setFocusSet((previous) => completeFocusPair(previous, base));
      if (fullSetIndex >= 0) setTrainIdx(fullSetIndex);
    }
    if (nextLens === "dp" && fullSetIndex >= 0 && !trainSet.includes(focusPrimary)) {
      setTrainIdx(fullSetIndex);
    }
    if (nextLens === "poison") {
      setPoisonActive(true);
      setGridView("operator");
      if (fullSetIndex >= 0 && !focusGroup.some((token) => trainSet.includes(token))) setTrainIdx(fullSetIndex);
    }
  };

  const toggleFocus = (token) => {
    if (lens === "interaction" || queryConcept === "interaction") {
      setFocusSet((previous) => {
        const clean = normalizeSharedTokens(previous, base, []);
        if (clean.includes(token)) return completeFocusPair(clean.filter((candidate) => candidate !== token), base);
        const next = clean.length >= 2 ? [clean[clean.length - 1], token] : [...clean, token];
        return completeFocusPair(next, base);
      });
      return;
    }
    if (queryAllowsMultiFocus || lensAllowsMultiFocus) {
      setFocusSet((previous) => {
        if (previous.includes(token)) {
          const next = previous.filter((candidate) => candidate !== token);
          return next.length ? next : previous;
        }
        return [...previous, token].sort();
      });
      return;
    }
    setFocusSet([token]);
  };

  const applyPreset = (presetId) => {
    if (presetId === "current") {
      setSelectedCellsFromCells(cellsForCurrentCell(safeTrainIdx, safeEvalIdx));
      return;
    }
    const plan = plans.find((entry) => entry.id === presetId);
    if (!plan || plan.status === "unavailable") return;
    setSelectedCellsFromCells(plan.requiredCells);
  };

  const resetGame = () => {
    const nextCount = routeView === "graph" ? 4 : 3;
    const nextFocus = routeView === "graph" ? ["B"] : ["A"];
    setView(routeView);
    setCount(nextCount);
    setMetric("jaccard");
    setAppMode("explore");
    setQueryConcept("loo");
    setPresetChoice("current");
    setLens("ablation");
    setFocusSet(nextFocus);
    setK(2);
    setBetaAlpha(2);
    setBetaBeta(2);
    setEpsilon(1);
    setAuditTolerance(0.15);
    setPoisonActive(false);
    setGridView("real");
    setShowNums(true);
    setShowConfidence(true);
    setShowSingletonEvalCols(false);
    setControlsOpen(false);
    setSelectedCellIds([makeCellId(1, 1)]);
    setTrainIdx(1);
    setEvalIdx(1);
    setActiveGuideId(null);
    setGuideStepIndex(0);
    setGuideNarration("");
    setGuidePreviewId("evalConfidence");
    setModeDialogOpen(false);
    setSetupOpen(false);
    setTutorialOpen(false);
    setAtlasOpen(false);
    setAtlasConceptId("explore");
    setComparisonId("shapley-influence");
    urlSyncEnabledRef.current = true;
  };

  const setConceptMode = (mode) => {
    if (mode === "explore") {
      setAppMode("explore");
      setQueryConcept("loo");
      setLens("ablation");
      return;
    }
    if (!gridConceptIds.includes(mode)) return;
    setAppMode("compute");
    setQueryConcept(mode);
    setLens(gridModeToGraphLens(mode));
    if (mode === "poison") {
      setPoisonActive(true);
      setGridView("operator");
    }
  };

  const openSetupDialog = () => {
    setModeDialogOpen(false);
    setTutorialOpen(false);
    setAtlasOpen(false);
    setSetupOpen(true);
  };

  const openModeDialog = () => {
    setSetupOpen(false);
    setTutorialOpen(false);
    setAtlasOpen(false);
    setModeDialogOpen(true);
  };

  const openGuideDialog = () => {
    setSetupOpen(false);
    setModeDialogOpen(false);
    setAtlasOpen(false);
    setGuidePreviewId(activeGuideId || "evalConfidence");
    setTutorialOpen(true);
  };

  const initializeGame = (preset) => {
    setMetric("jaccard");
    setPresetChoice("current");
    setK(2);
    setBetaAlpha(2);
    setBetaBeta(2);
    setEpsilon(1);
    setAuditTolerance(0.15);
    setPoisonActive(false);
    setGridView("real");
    setShowNums(true);
    setShowConfidence(true);
    setShowSingletonEvalCols(false);
    setControlsOpen(false);
    setSelectedCellIds([makeCellId(1, 1)]);
    setActiveGuideId(null);
    setGuideStepIndex(0);
    setGuideNarration("");
    setSetupOpen(false);
    setModeDialogOpen(false);
    setTutorialOpen(false);
    setAtlasOpen(false);
    urlSyncEnabledRef.current = true;

    if (preset === "graph") {
      setView("graph");
      setCount(4);
      setConceptMode("loo");
      setFocusSet(["B"]);
      setPendingSelection({ row: ["A", "B", "C", "D"], col: ["A", "B", "C", "D"] });
      return;
    }

    if (preset === "compute") {
      setView("grid");
      setCount(4);
      setConceptMode("shapley");
      setFocusSet(["A"]);
      setPendingSelection({ row: ["A", "B", "C", "D"], col: ["A", "B", "C", "D"] });
      return;
    }

    setView("grid");
    setCount(3);
    setConceptMode("explore");
    setFocusSet(["A"]);
    setPendingSelection({ row: ["A"], col: ["A"] });
  };

  const chooseInteractionMode = (mode) => {
    const nextMode = mode === "compute" ? queryConcept : mode;
    setConceptMode(nextMode === "compute" ? "loo" : nextMode);
    if (nextMode !== "explore") setControlsOpen(true);
    setModeDialogOpen(false);
  };

  const baseTutorials = createTutorialPresets({
    setCount,
    setMetric,
    setFocusSet,
    setK,
    setConceptMode,
    setShowNums,
    setShowSingletonEvalCols,
    setPendingSelection,
    setBetaAlpha,
    setBetaBeta,
    setEpsilon,
    setAuditTolerance,
    setPoisonActive,
    setGridView,
  }).filter((tutorial) => tutorial.mode === "explore" || gridConceptIds.includes(tutorial.mode));
  const uncertaintyTutorial = {
    id: "evalConfidence",
    mode: "explore",
    title: "Read eval CI bands",
    summary: "See uncertainty as a band on every eval-backed score.",
    goal: "We want the grid to show both the score and how much evaluation evidence supports that score.",
    how: "We turn on eval CI bands, keep the raw values visible, and compare singleton eval cells against larger eval worlds.",
    concept: "Evaluation uncertainty",
    setup: () => {
      setCount(3);
      setMetric("jaccard");
      setFocusSet(["A"]);
      setK(2);
      setShowNums(true);
      setShowConfidence(true);
      setShowSingletonEvalCols(false);
      setControlsOpen(false);
      setConceptMode("explore");
      setPoisonActive(false);
      setGridView("real");
      setPendingSelection({ row: ["A"], col: ["A"] });
    },
  };
  const tutorials = baseTutorials.length
    ? [baseTutorials[0], uncertaintyTutorial, ...baseTutorials.slice(1)]
    : [uncertaintyTutorial];

  const runTutorial = (tutorial) => {
    setActiveGuideId(tutorial.id);
    setGuideStepIndex(0);
    setGuideNarration("");
    tutorial.setup();
    setControlsOpen(false);
    setSetupOpen(false);
    setModeDialogOpen(false);
    setTutorialOpen(false);
  };

  const exitGuide = () => {
    setActiveGuideId(null);
    setGuideStepIndex(0);
    setGuideNarration("");
  };

  const shareLabel = shareStatus === "copied" ? "Copied" : shareStatus === "failed" ? "Copy failed" : "Share";
  const stateModeLabel = appMode === "explore" ? "Explore" : activePlan?.shortLabel || "Compute";
  const focusControlTitle =
    queryConcept === "group"
      ? "Focus coalition"
      : queryConcept === "interaction" || lens === "interaction"
        ? "Focus pair"
        : queryConcept === "poison" || lens === "poison"
          ? "Poison target"
          : "Focus";
  const displaySummary = `${metricMeta[metric].short}; ${showNums ? "values on" : "values off"}; ${
    showSingletonEvalCols ? "singleton evals" : "all evals"
  }; CI ${showConfidence ? "on" : "off"}`;
  const controlsSummary = view === "graph"
    ? `${count} datasets; ${graphLensMeta[lens].title}; train ${label(trainSet)} / eval ${label(evalSet)}`
    : `${count} datasets; ${appMode === "explore" ? "explore" : activePlan?.shortLabel || "compute"}; train ${label(trainSet)} / eval ${label(evalSet)}`;
  const activeGuide = tutorials.find((tutorial) => tutorial.id === activeGuideId);
  const guidePreview = tutorials.find((tutorial) => tutorial.id === guidePreviewId) || activeGuide || tutorials[0];
  const recommendedGuideKeys = new Set(["evalConfidence", activeGuideId, appMode === "explore" ? tutorials[0]?.id : queryConcept]);
  const recommendedGuides = tutorials.filter((tutorial) => recommendedGuideKeys.has(tutorial.id) || recommendedGuideKeys.has(tutorial.mode));
  const visibleGuides = (recommendedGuides.length >= 3 ? recommendedGuides : tutorials).slice(0, 4);
  const guidedSteps = useMemo(
    () =>
      buildGuidedSteps({
        guide: activeGuide,
        base,
        subsets,
        matrix,
        activePlan,
        safeTrainIdx,
        safeEvalIdx,
        evaluationInterval,
      }),
    [activeGuide, base, subsets, matrix, activePlan, safeTrainIdx, safeEvalIdx, evaluationInterval],
  );
  const safeGuideStepIndex = guidedSteps.length ? Math.min(guideStepIndex, guidedSteps.length - 1) : 0;
  const activeGuideStep = guidedSteps[safeGuideStepIndex] || null;
  const guideTargetCellSet = useMemo(
    () => new Set(cellsToIds(validGuideCells(activeGuideStep?.targetCells || [], subsets))),
    [activeGuideStep, subsets],
  );
  const guideTargetRows = useMemo(
    () => new Set(validGuideCells(activeGuideStep?.targetCells || [], subsets).map((cell) => cell.rowIndex)),
    [activeGuideStep, subsets],
  );
  const guideTargetCols = useMemo(
    () => new Set(validGuideCells(activeGuideStep?.targetCells || [], subsets).map((cell) => cell.colIndex)),
    [activeGuideStep, subsets],
  );
  const guideModeActive = Boolean(activeGuide && activeGuideStep);
  const guideProgressLabel = guidedSteps.length ? `${safeGuideStepIndex + 1}/${guidedSteps.length}` : "0/0";
  const overlayOpen = setupOpen || modeDialogOpen || tutorialOpen || atlasOpen;
  const selectedFactLimit = selectedFacts.slice(0, 4);
  const intervalLabel = evaluationInterval.available
    ? `${formatValue(evaluationInterval.lower)} - ${formatValue(evaluationInterval.upper)}`
    : "n/a";
  const focusHudLabel =
    kBucketConcepts.has(queryConcept) || lensUsesK
      ? `k=${k}`
      : queryConcept === "interaction" || lens === "interaction"
        ? label(interactionPair)
      : queryConcept === "poison"
        ? label(focusSet.filter((token) => base.includes(token)))
        : label(focusGroup);
  const canJumpToAblation = ablationStats.compareRowIndex >= 0 && ablationStats.compareRowIndex !== safeTrainIdx;
  const canJumpToStrikeTerminal = strikeStats.compareRowIndex >= 0 && strikeStats.compareRowIndex !== safeTrainIdx;
  const showGraphNeighborLists = !["interaction", "eval-scaling", "dp", "poison"].includes(lens);
  const previewNodeIndex = clampIndex(hoveredNodeIndex ?? (lensUsesEvalAxis ? safeEvalIdx : safeTrainIdx), subsets.length);
  const previewSet = subsets[previewNodeIndex] || [];
  const previewValue = lensUsesEvalAxis ? (matrix[safeTrainIdx]?.[previewNodeIndex] ?? 0) : (matrix[previewNodeIndex]?.[safeEvalIdx] ?? 0);

  useEffect(() => {
    if (typeof document === "undefined") return undefined;
    const previousOverflow = document.body.style.overflow;
    if (overlayOpen) document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [overlayOpen]);

  useEffect(() => {
    if (!guidedSteps.length || guideStepIndex < guidedSteps.length) return;
    setGuideStepIndex(Math.max(0, guidedSteps.length - 1));
  }, [guidedSteps.length, guideStepIndex]);

  function advanceGuideStep(direction) {
    if (!guidedSteps.length) return;
    const nextIndex = Math.max(0, Math.min(guidedSteps.length - 1, safeGuideStepIndex + direction));
    if (direction > 0 && activeGuideStep?.result) setGuideNarration(activeGuideStep.result);
    if (direction < 0) setGuideNarration("");
    setGuideStepIndex(nextIndex);
  }

  function completeGuideStepForCell(rowIndex, colIndex) {
    if (!guideModeActive || !activeGuideStep?.targetCells?.length) return;
    const clickedCell = { rowIndex, colIndex };
    const hit = activeGuideStep.targetCells.some((cell) => sameCell(cell, clickedCell));
    if (!hit) return;
    const narration =
      activeGuideStep.result ||
      buildCellNarration({
        rowIndex,
        colIndex,
        previousRowIndex: safeTrainIdx,
        previousColIndex: safeEvalIdx,
        matrix,
        subsets,
      });
    setGuideNarration(narration);
    setGuideStepIndex((previous) => Math.min(previous + 1, Math.max(0, guidedSteps.length - 1)));
  }

  function completeGuideStepForAxis(kind, index) {
    if (!guideModeActive || activeGuideStep?.targetCells?.length) return;
    const matchesAxis = kind === "row" ? guideTargetRows.has(index) : guideTargetCols.has(index);
    if (!matchesAxis) return;
    setGuideNarration(activeGuideStep.result || activeGuideStep.why || "");
    setGuideStepIndex((previous) => Math.min(previous + 1, Math.max(0, guidedSteps.length - 1)));
  }

  return (
    <div
      class="workspace-shell graph-workspace counterfactual-play"
      data-testid="explorer-workspace"
      data-ready={hydrated ? "true" : "false"}
      data-overlay-open={overlayOpen ? "true" : "false"}
      data-guided-mode={guideModeActive ? "true" : "false"}
    >
      <style>{playSurfaceStyles}</style>

      <section
        class="play-hud"
        data-testid="explorer-toolbar"
        data-graph-toolbar="true"
      >
        <div class="graph-toolbar-sentinel" data-testid="graph-explorer-toolbar">
          <span>Unified graph controls</span>
        </div>
        <div class="hud-row">
          <div class="hud-title-block">
            <span class="hud-kicker">Command center</span>
            <h2>{view === "grid" ? "Grid board" : "Graph board"}</h2>
          </div>
        </div>

        <div class="hud-actions">
          <div class="segmented compact" role="group" aria-label="View">
            <button type="button" aria-pressed={view === "grid"} onClick={() => setView("grid")}>
              Grid
            </button>
            <button type="button" aria-pressed={view === "graph"} onClick={() => setView("graph")}>
              Graph
            </button>
          </div>
          <button class="command-btn mode-command" type="button" data-testid="mode-dialog-button" onClick={openModeDialog}>
            Mode: {stateModeLabel}
          </button>
          <button class="command-btn" type="button" data-testid="game-setup-button" onClick={openSetupDialog}>
            New game
          </button>
          <button class="command-btn" type="button" data-testid="guides-open-button" onClick={openGuideDialog}>
            Guides
          </button>
          <button class="command-btn" type="button" data-testid="atlas-open-button" onClick={() => openAtlas()}>
            Atlas
          </button>
          <a
            class="command-btn link"
            data-testid={view === "grid" ? "grid-to-graph-link" : "graph-to-grid-link"}
            href={view === "grid" ? graphExplorerHref : gridExplorerHref}
          >
            {view === "grid" ? "Graph route" : "Grid route"}
          </a>
          <button
            class="command-btn"
            type="button"
            data-testid={routeView === "graph" ? "graph-share-link" : "grid-share-link"}
            data-status={shareStatus}
            onClick={copyShareUrl}
          >
            {shareLabel}
          </button>
        </div>

        <div class="state-console" aria-label="Current game state">
          <div class="state-item">
            <span>Mode</span>
            <strong>{stateModeLabel}</strong>
          </div>
          <div class="state-item">
            <span>Train</span>
            <strong data-testid="graph-selected-train">{label(trainSet)}</strong>
          </div>
          <div class="state-item">
            <span>Eval</span>
            <strong data-testid="graph-selected-eval">{label(evalSet)}</strong>
          </div>
          <div class="state-item">
            <span>Metric</span>
            <strong data-testid="graph-pill-metric">{metricMeta[metric].short}</strong>
          </div>
          <div class="state-item">
            <span>Focus</span>
            <strong>{focusHudLabel}</strong>
          </div>
          <div class="state-item">
            <span>Score</span>
            <strong data-testid="graph-selected-score">{formatValue(selectedValue)}</strong>
          </div>
          <div class="state-item">
            <span>Eval CI</span>
            <strong title="95% Wilson-style evaluation uncertainty interval">{intervalLabel}</strong>
          </div>
        </div>

        {guideModeActive ? (
          <section class="guided-shell" data-testid="guided-mode-shell" aria-label="Guided mode">
            <div class="guided-overview">
              <span class="hud-kicker">Guided mode</span>
              <h3>{activeGuide.title}</h3>
              <p>{activeGuideStep.objective}</p>
            </div>
            <div class="guided-step">
              <span>{guideProgressLabel}</span>
              <strong>{activeGuideStep.title}</strong>
              <p>{activeGuideStep.action}</p>
              <em>{activeGuideStep.why}</em>
            </div>
            <div class="guided-result" data-testid="guide-result">
              <span>What changed</span>
              <strong>{guideNarration || "Make the highlighted move to update the readout."}</strong>
            </div>
            <div class="guided-controls">
              <button type="button" data-testid="guide-back-button" disabled={safeGuideStepIndex === 0} onClick={() => advanceGuideStep(-1)}>
                Back
              </button>
              <button type="button" data-testid="guide-next-button" disabled={safeGuideStepIndex >= guidedSteps.length - 1} onClick={() => advanceGuideStep(1)}>
                Next
              </button>
              <button type="button" data-testid="guide-exit-button" onClick={exitGuide}>
                Exit guide
              </button>
            </div>
          </section>
        ) : null}

        <div class="tactical-actions board-actions" aria-label="Board actions" hidden={guideModeActive}>
          <button
            type="button"
            aria-label="Select current cell"
            onClick={() => setSelectedCellsFromCells(cellsForCurrentCell(safeTrainIdx, safeEvalIdx))}
          >
            Select
          </button>
          <button type="button" aria-label="Clear selection" onClick={() => setSelectedCellIds([])}>
            Clear
          </button>
          <button type="button" aria-label="Start walkthrough" disabled={activePlan?.status === "unavailable"} onClick={startWalkthrough}>
            Walkthrough
          </button>
          <button
            type="button"
            class="ci-toggle"
            aria-pressed={showConfidence}
            title="Toggle evaluation uncertainty bands"
            onClick={() => setShowConfidence((previous) => !previous)}
          >
            CI
          </button>
        </div>

        <details
          class="controls-drawer"
          data-testid="move-controls"
          hidden={guideModeActive}
          open={controlsOpen}
          onToggle={(event) => setControlsOpen(event.currentTarget.open)}
        >
          <summary>
            <span>Move controls</span>
            <strong>{controlsSummary}</strong>
          </summary>
          <div class="control-shelf">
            <div class="query-control-group" data-testid="question-controls">
              <div class="control-cell count-cell">
                <span class="control-label">Universe</span>
                <div class="stepper">
                  <button
                    type="button"
                    data-testid="graph-count-decrease"
                    disabled={count <= countMin}
                    onClick={() => setCount((previous) => Math.max(countMin, previous - 1))}
                  >
                    -
                  </button>
                  <span data-testid="graph-count-value">{count} datasets</span>
                  <button
                    type="button"
                    data-testid="graph-count-increase"
                    disabled={count >= maxCountForMetric}
                    onClick={() => setCount((previous) => Math.min(maxCountForMetric, previous + 1))}
                  >
                    +
                  </button>
                </div>
              </div>

              {view === "grid" ? (
                <label class="control-cell">
                  <span class="control-label">Query</span>
                  <select
                    data-testid="concept-select"
                    value={queryConcept}
                    onChange={(event) => changeConcept(event.currentTarget.value)}
                  >
                    {gridConcepts.map((concept) => (
                      <option key={concept.id} value={concept.id}>
                        {concept.label}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}

              <label class="control-cell">
                <span class="control-label">Train</span>
                <select
                  data-testid={view === "graph" ? "graph-train-select" : "grid-train-select"}
                  value={safeTrainIdx}
                  onChange={(event) => setTrainIdx(Number(event.currentTarget.value))}
                >
                  {subsets.map((subset, index) => (
                    <option key={`train-${index}`} value={index}>
                      {label(subset)}
                    </option>
                  ))}
                </select>
              </label>

              <label class="control-cell">
                <span class="control-label">Eval</span>
                <select
                  data-testid={view === "graph" ? "graph-eval-select" : "grid-eval-select"}
                  value={safeEvalIdx}
                  onChange={(event) => setEvalIdx(Number(event.currentTarget.value))}
                >
                  {(view === "grid" ? visibleColIndices : subsets.map((_, index) => index)).map((index) => (
                    <option key={`eval-${index}`} value={index}>
                      {label(subsets[index] || [])}
                    </option>
                  ))}
                </select>
              </label>

              <div class="control-cell token-control" data-testid="graph-focus-tokens">
                <span class="control-label">{focusControlTitle}</span>
                <div class="token-row">
                  {base.map((token) => (
                    <button
                      key={token}
                      type="button"
                      aria-pressed={focusSet.includes(token)}
                      onClick={() => toggleFocus(token)}
                    >
                      {token}
                    </button>
                  ))}
                </div>
              </div>

              {kBucketConcepts.has(queryConcept) || lensUsesK ? (
                <div class="control-cell k-control">
                  <span class="control-label">Subset size bucket</span>
                  <div class="bucket-row">
                    {Array.from({ length: base.length + 1 }, (_, bucket) => (
                      <button key={bucket} type="button" aria-pressed={k === bucket} onClick={() => setK(bucket)}>
                        k={bucket}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>

            {view === "graph" ? (
              <div class="control-cell graph-lens-cell">
                <span class="control-label">Graph lens</span>
                <div class="segmented">
                  {Object.entries(graphLensMeta).map(([id, meta]) => (
                    <button key={id} type="button" aria-label={meta.title} aria-pressed={lens === id} onClick={() => changeLens(id)}>
                      {meta.tab}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {view === "graph" ? (
              <div class="control-cell metric-buttons">
                <span class="control-label">Metric</span>
                <div class="segmented">
                  {["jaccard", "inter", "entropy", "covertype"].map((id) => (
                    <button key={id} type="button" aria-pressed={metric === id} onClick={() => setMetric(id)}>
                      {metricMeta[id].short}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {view === "graph" ? (
              <div class="control-cell graph-jump-cell">
                <span class="control-label">Jump</span>
                <div class="quick-actions" data-testid="graph-quick-actions">
                  <button type="button" onClick={() => emptySetIndex >= 0 && setTrainIdx(emptySetIndex)}>
                    Use empty train
                  </button>
                  <button type="button" onClick={() => fullSetIndex >= 0 && setTrainIdx(fullSetIndex)}>
                    Use full train
                  </button>
                  <button type="button" onClick={() => setTrainIdx(safeEvalIdx)}>
                    Use eval as train
                  </button>
                  <button type="button" onClick={() => setEvalIdx(safeTrainIdx)}>
                    Mirror train
                  </button>
                  <button type="button" onClick={() => fullSetIndex >= 0 && setEvalIdx(fullSetIndex)}>
                    Use full set
                  </button>
                  {lens === "ablation" ? (
                    <button type="button" disabled={!canJumpToAblation} onClick={() => canJumpToAblation && setTrainIdx(ablationStats.compareRowIndex)}>
                      Jump to without {focusPrimary}
                    </button>
                  ) : null}
                  {lens === "strike" ? (
                    <button type="button" disabled={!canJumpToStrikeTerminal} onClick={() => canJumpToStrikeTerminal && setTrainIdx(strikeStats.compareRowIndex)}>
                      Jump to strike remainder
                    </button>
                  ) : null}
                </div>
              </div>
            ) : null}

            {view === "graph" && lens === "dp" ? (
              <div class="control-cell lens-tuning-cell">
                <span class="control-label">Lens tuning</span>
                <div class="lens-inline-controls">
                  <label>
                    Epsilon {formatValue(epsilon)}
                    <input type="range" min="0.25" max="5" step="0.25" value={epsilon} onInput={(event) => setEpsilon(+event.currentTarget.value)} />
                  </label>
                </div>
              </div>
            ) : null}

            {view === "graph" && lens === "poison" ? (
              <div class="control-cell lens-tuning-cell">
                <span class="control-label">Lens tuning</span>
                <div class="lens-inline-controls">
                  <label class="checkbox-line">
                    <input type="checkbox" checked={poisonActive} onChange={(event) => setPoisonActive(event.currentTarget.checked)} />
                    Attack active
                  </label>
                  <div class="bucket-row">
                    <button type="button" aria-pressed={gridView === "real"} onClick={() => setGridView("real")}>
                      Clean
                    </button>
                    <button type="button" aria-pressed={gridView === "operator"} onClick={() => setGridView("operator")}>
                      Operator
                    </button>
                  </div>
                </div>
              </div>
            ) : null}

            {view === "grid" ? (
              <div class="control-cell preset-cell" data-testid="scene-controls">
                <span class="control-label">Preset</span>
                <div class="preset-row">
                  <select
                    data-testid="preset-select"
                    value={presetChoice}
                    onChange={(event) => setPresetChoice(event.currentTarget.value)}
                  >
                    <option value="current">Current cell</option>
                    <option value="loo">LOO pair</option>
                    <option value="eval">Eval pair</option>
                    <option value="shapley">Shapley column</option>
                    <option value="scaling">k layer</option>
                  </select>
                  <button type="button" onClick={() => applyPreset(presetChoice)}>
                    Show
                  </button>
                </div>
              </div>
            ) : null}
          </div>

          {view === "grid" ? (
            <details class="options-drawer" data-testid="display-controls">
              <summary>
                <span>Options</span>
                <strong>{displaySummary}</strong>
              </summary>
              <div class="drawer-grid" data-testid="metric-controls">
                <label>
                  <span class="control-label">Cell score</span>
                  <select data-testid="metric-select" value={metric} onChange={(event) => setMetric(event.currentTarget.value)}>
                    {Object.entries(metricMeta).map(([id, meta]) => (
                      <option key={id} value={id}>
                        {meta.short}
                      </option>
                    ))}
                  </select>
                </label>
                <label class="checkbox-line">
                  <input type="checkbox" checked={showNums} onChange={(event) => setShowNums(event.currentTarget.checked)} />
                  Show raw values
                </label>
                <label class="checkbox-line">
                  <input type="checkbox" checked={showConfidence} onChange={(event) => setShowConfidence(event.currentTarget.checked)} />
                  Show eval CI
                </label>
                <label class="checkbox-line">
                  <input
                    type="checkbox"
                    checked={showSingletonEvalCols}
                    onChange={(event) => setShowSingletonEvalCols(event.currentTarget.checked)}
                  />
                  Fewer cols
                </label>
                <label>
                  <span class="control-label">Palette</span>
                  <select value={paletteKey} onChange={(event) => setPaletteKey(event.currentTarget.value)}>
                    <option value="atlas">Atlas</option>
                    <option value="lab">Lab</option>
                  </select>
                </label>
                {kBucketConcepts.has(queryConcept) || lensUsesK ? (
                  <div class="bucket-row">
                    {Array.from({ length: base.length + 1 }, (_, bucket) => (
                      <button key={bucket} type="button" aria-pressed={k === bucket} onClick={() => setK(bucket)}>
                        k={bucket}
                      </button>
                    ))}
                  </div>
                ) : null}
                {queryConcept === "beta" ? (
                  <div class="range-stack">
                    <label>
                      Alpha {betaAlpha}
                      <input type="range" min="1" max="5" step="1" value={betaAlpha} onInput={(event) => setBetaAlpha(+event.currentTarget.value)} />
                    </label>
                    <label>
                      Beta {betaBeta}
                      <input type="range" min="1" max="5" step="1" value={betaBeta} onInput={(event) => setBetaBeta(+event.currentTarget.value)} />
                    </label>
                  </div>
                ) : null}
                {queryConcept === "dp" ? (
                  <div class="range-stack">
                    <label>
                      Epsilon {formatValue(epsilon)}
                      <input type="range" min="0.25" max="5" step="0.25" value={epsilon} onInput={(event) => setEpsilon(+event.currentTarget.value)} />
                    </label>
                    <p class="drawer-note">Toy sensitivity view only; this does not certify a private training mechanism.</p>
                  </div>
                ) : null}
                {queryConcept === "unlearning" ? (
                  <div class="range-stack">
                    <label>
                      Audit tolerance {formatValue(auditTolerance)}
                      <input
                        type="range"
                        min="0"
                        max="0.5"
                        step="0.01"
                        value={auditTolerance}
                        onInput={(event) => setAuditTolerance(+event.currentTarget.value)}
                      />
                    </label>
                  </div>
                ) : null}
                {queryConcept === "poison" ? (
                  <div class="range-stack">
                    <label class="checkbox-line">
                      <input type="checkbox" checked={poisonActive} onChange={(event) => setPoisonActive(event.currentTarget.checked)} />
                      Poison edit active
                    </label>
                    <div class="bucket-row">
                      <button type="button" aria-pressed={gridView === "real"} onClick={() => setGridView("real")}>
                        Clean
                      </button>
                      <button type="button" aria-pressed={gridView === "operator"} onClick={() => setGridView("operator")}>
                        Operator
                      </button>
                    </div>
                    <p class="drawer-note">The operator view applies a simple targeted corruption to rows containing the selected target.</p>
                  </div>
                ) : null}
                {metric === "real" ? (
                  <div class="bucket-row">
                    <button type="button" aria-pressed={realDataMode === "precomputed"} onClick={() => setRealDataMode("precomputed")}>
                      Precomputed
                    </button>
                    <button
                      type="button"
                      aria-pressed={realDataMode === "live"}
                      onClick={() => {
                        setRealDataMode("live");
                        setRealDataSample((previous) => previous || 1);
                      }}
                    >
                      Live
                    </button>
                    <button
                      type="button"
                      disabled={realDataMode !== "live"}
                      onClick={() => {
                        setRealDataMode("live");
                        setRealDataSample((previous) => (previous || 1) + 1);
                      }}
                    >
                      Resample
                    </button>
                  </div>
                ) : (
                  <p class="drawer-note">{metricMeta[metric].description}</p>
                )}
              </div>
            </details>
          ) : null}
        </details>

        <details class="options-drawer json-drawer" id="grid-inspect" data-testid="settings-json" hidden={guideModeActive}>
          <summary>
            <span>Inspect state</span>
            <strong>Selection and query JSON</strong>
          </summary>
          <pre>
            {JSON.stringify(
              {
                view,
                appMode,
                queryConcept,
                lens,
                metric,
                count,
                train: label(trainSet),
                eval: label(evalSet),
                focusSet,
                k,
                epsilon,
                auditTolerance,
                poisonActive,
                gridView,
                selectedCells: selectedCellIds,
                confidenceInterval: evaluationInterval,
              },
              null,
              2,
            )}
          </pre>
        </details>

        <details class="options-drawer intel-drawer" data-testid="intel-drawer" hidden={guideModeActive}>
          <summary>
            <span>Intel</span>
            <strong>
              {view === "graph"
                ? `${questionBlock.answerLabel}: ${formatValue(questionBlock.answerValue)}`
                : appMode === "explore"
                  ? "Smart explorer and capability scan"
                  : activePlan?.label || "Current computation"}
            </strong>
          </summary>
          <div class="intel-stack">
            {view === "grid" ? (
              <section class="side-panel value-panel" data-testid="value-dock">
                <div class="panel-head">
                  <div>
                    <span class="hud-kicker">{appMode === "explore" ? "Smart explorer" : "Current computation"}</span>
                    <h3>{appMode === "explore" ? "Smart explorer" : activePlan?.label}</h3>
                  </div>
                </div>
                {appMode === "explore" ? (
                  <>
                    <div class="fact-list">
                      {selectedFactLimit.length ? (
                        selectedFactLimit.map((fact) => (
                          <div class="fact" key={fact.id}>
                            <strong>{fact.title.replace(/\s+=\s+[-+0-9.]+$/, "")}</strong>
                            <span>{fact.body}</span>
                          </div>
                        ))
                      ) : (
                        <p class="panel-copy">No active cells yet. Click cells, rows, or columns to move them into the active set.</p>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <p class="panel-copy">{activePlan?.description}</p>
                    <div class="takeaway" data-testid="reading-takeaway">
                      {activePlan?.status === "unavailable"
                        ? activePlan.unavailableReason
                        : `${activePlan?.formula}. ${activePlan?.missingCells.length ? `${activePlan.missingCells.length} required cells are not selected yet.` : "All required cells are selected."}`}
                    </div>
                    <div class="walkthrough-steps" data-testid="walkthrough-panel">
                      {activePlan?.steps.map((step, index) => (
                        <button
                          key={`${step.title}-${index}`}
                          type="button"
                          class={index === walkthroughStep ? "active" : ""}
                          aria-pressed={index === walkthroughStep}
                          onClick={() => {
                            setWalkthroughStep(index);
                            setWalkthroughRunning(false);
                          }}
                        >
                          <span>{index + 1}</span>
                          <strong>{step.title}</strong>
                          <em>{step.body}</em>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </section>
            ) : null}

            {view === "grid" ? (
              <section class="side-panel concept-map-panel">
                <div class="panel-head">
                  <div>
                    <span class="hud-kicker">Design-space map</span>
                    <h3>Grid visual grammar</h3>
                  </div>
                </div>
                <div class="concept-map">
                  {conceptMap.map(([name, visual, copy]) => (
                    <div key={name}>
                      <strong>{name}</strong>
                      <span>{visual}</span>
                      <p>{copy}</p>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            {appMode === "explore" && view === "grid" ? (
              <section class="side-panel" data-testid="capability-panel">
                <div class="panel-head">
                  <div>
                    <span class="hud-kicker">Capability scan</span>
                    <h3>What this active set can compute</h3>
                  </div>
                </div>
                <div class="plan-list">
                  {sortedPlans.slice(0, 6).map((plan) => (
                    <button key={plan.id} type="button" onClick={() => plan.status !== "unavailable" && setSelectedCellsFromCells(plan.requiredCells)}>
                      <strong>{plan.label}</strong>
                      <span>{plan.status === "ready" ? `${plan.shortLabel} can be computed` : planStatusLabel(plan)}</span>
                    </button>
                  ))}
                </div>
              </section>
            ) : null}

            {view === "graph" ? (
              <section class="side-panel" data-testid="graph-lens-panel">
                <div class="panel-head">
                  <div>
                    <span class="hud-kicker">Graph lens</span>
                    <h3>{questionBlock.title}</h3>
                  </div>
                  <span class="answer-pill">
                    {questionBlock.answerLabel}: {formatValue(questionBlock.answerValue)}
                  </span>
                </div>
                <p class="panel-copy">{questionBlock.copy}</p>
                <details class="mini-drawer" id="graph-inspect">
                  <summary>Formula and details</summary>
                  <div class="formula">{questionBlock.formula}</div>
                  {showGraphNeighborLists ? (
                    <div class="neighbor-columns">
                      <div>
                        <strong>Single deletions</strong>
                        <ul data-testid="graph-removal-neighbors">
                          {removalWalks.length ? (
                            removalWalks.map((entry) => (
                              <li key={`drop-${entry.token}`}>
                                <button type="button" disabled={entry.nextIndex < 0} onClick={() => entry.nextIndex >= 0 && setTrainIdx(entry.nextIndex)}>
                                  -{entry.token} -&gt; {entry.nextLabel} | {formatSigned(-entry.delta)}
                                </button>
                              </li>
                            ))
                          ) : (
                            <li>No deletions available.</li>
                          )}
                        </ul>
                      </div>
                      <div>
                        <strong>Single additions</strong>
                        <ul data-testid="graph-addition-neighbors">
                          {additionWalks.length ? (
                            additionWalks.map((entry) => (
                              <li key={`add-${entry.token}`}>
                                <button type="button" disabled={entry.nextIndex < 0} onClick={() => entry.nextIndex >= 0 && setTrainIdx(entry.nextIndex)}>
                                  +{entry.token} -&gt; {entry.nextLabel} | {formatSigned(entry.delta)}
                                </button>
                              </li>
                            ))
                          ) : (
                            <li>No additions available.</li>
                          )}
                        </ul>
                      </div>
                    </div>
                  ) : null}
                  {lens === "interaction" ? (
                    <table>
                      <thead>
                        <tr>
                          <th>Corner</th>
                          <th>Train</th>
                          <th>Value</th>
                        </tr>
                      </thead>
                      <tbody>
                        {interactionStats.corners.map((corner) => (
                          <tr key={corner.id}>
                            <td>{corner.name}</td>
                            <td>{label(corner.set)}</td>
                            <td>{formatValue(corner.value)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : null}
                  {lens === "dp" ? (
                    <table>
                      <thead>
                        <tr>
                          <th>Measure</th>
                          <th>Value</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td>Row sensitivity</td>
                          <td>{formatValue(dpSensitivity)}</td>
                        </tr>
                        <tr>
                          <td>Local gap</td>
                          <td>{formatValue(dpLocalGap)}</td>
                        </tr>
                        <tr>
                          <td>Epsilon</td>
                          <td>{formatValue(epsilon)}</td>
                        </tr>
                        {dpTopGaps.map((entry) => (
                          <tr key={entry.evalLabel}>
                            <td>Top gap {entry.evalLabel}</td>
                            <td>{formatValue(entry.gap)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : null}
                  {lens === "poison" ? (
                    <table>
                      <thead>
                        <tr>
                          <th>Measure</th>
                          <th>Value</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td>Attacked nodes</td>
                          <td>{poisonedNodes.size}</td>
                        </tr>
                        <tr>
                          <td>Clean score</td>
                          <td>{formatValue(poisonCleanValue)}</td>
                        </tr>
                        <tr>
                          <td>Operator score</td>
                          <td>{formatValue(poisonOperatorValue)}</td>
                        </tr>
                      </tbody>
                    </table>
                  ) : null}
                  {lens === "shapley" ? (
                    <table>
                      <thead>
                        <tr>
                          <th>|S|</th>
                          <th>Avg delta</th>
                          <th>Edges</th>
                        </tr>
                      </thead>
                      <tbody>
                        {semivalueStats.rows.map((row) => (
                          <tr key={row.size}>
                            <td>{row.size}</td>
                            <td>{formatValue(row.avg)}</td>
                            <td>{row.n}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : null}
                  {lens === "scaling" ? (
                    <table>
                      <thead>
                        <tr>
                          <th>k</th>
                          <th>Avg score</th>
                          <th>Nodes</th>
                        </tr>
                      </thead>
                      <tbody>
                        {scalingRows.map((row) => (
                          <tr key={row.k} class={row.k === k ? "active" : ""}>
                            <td>{row.k}</td>
                            <td>{formatValue(row.avg)}</td>
                            <td>{row.n}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : null}
                  {lens === "eval-scaling" ? (
                    <table>
                      <thead>
                        <tr>
                          <th>k</th>
                          <th>Avg score</th>
                          <th>Eval nodes</th>
                        </tr>
                      </thead>
                      <tbody>
                        {evalScalingRows.map((row) => (
                          <tr key={row.k} class={row.k === k ? "active" : ""}>
                            <td>{row.k}</td>
                            <td>{formatValue(row.avg)}</td>
                            <td>{row.n}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : null}
                </details>
              </section>
            ) : null}
          </div>
        </details>
      </section>

      <div class="play-layout">
        <main class="board-card" data-testid={view === "grid" ? "explorer-grid-card" : "explorer-graph-card"}>
          <section class="board-toolbar" data-testid="grid-marker-controls">
            <div>
              <span class="hud-kicker">{view === "grid" ? "Counterfactual grid" : "Subset lattice"}</span>
              <h3>{view === "grid" ? (appMode === "explore" ? "Build the active set." : "Run a computation over the grid.") : "Move through legal subset worlds."}</h3>
            </div>
          </section>

          {view === "grid" ? (
            <div class="grid-wrap stage-grid" ref={gridWrapRef} data-testid="explorer-grid">
              <div class={`grid-matrix ${guideModeActive ? "is-guided" : ""} ${guideTargetCellSet.size ? "has-guide-target" : ""}`}>
                <div class="grid-axis-row">
                  <div class="rl axis-corner">
                    <span class="axis-index">train</span>
                    <span class="corner-label">eval</span>
                  </div>
                  {visibleColIndices.map((colIndex) => {
                    const colSet = subsets[colIndex] || [];
                    const active = colIndex === safeEvalIdx;
                    return (
                      <button
                        key={`col-${colIndex}`}
                        class={`cl ${active ? "axis-active" : ""} ${guideTargetCols.has(colIndex) ? "axis-guide-target" : ""}`}
                        type="button"
                        aria-pressed={active}
                        aria-label={`Select evaluation slice ${label(colSet)}`}
                        onClick={() => handleColumnHeaderClick(colIndex)}
                        onMouseEnter={() => setHoverTarget({ rowIndex: safeTrainIdx, colIndex })}
                        onMouseLeave={() => setHoverTarget(null)}
                        onFocus={() => setHoverTarget({ rowIndex: safeTrainIdx, colIndex })}
                        onBlur={() => setHoverTarget(null)}
                      >
                        <span class="axis-index">{colIndex}</span>
                        <span class="axis-set">{label(colSet)}</span>
                      </button>
                    );
                  })}
                </div>

                {subsets.map((rowSet, rowIndex) => (
                  <div class="grid-matrix-row" key={`row-${rowIndex}`}>
                    <button
                      class={`rl ${rowIndex === safeTrainIdx ? "axis-active" : ""} ${guideTargetRows.has(rowIndex) ? "axis-guide-target" : ""}`}
                      type="button"
                      aria-pressed={rowIndex === safeTrainIdx}
                      aria-label={`Select training world ${label(rowSet)}`}
                      onClick={() => handleRowHeaderClick(rowIndex)}
                      onMouseEnter={() => setHoverTarget({ rowIndex, colIndex: safeEvalIdx })}
                      onMouseLeave={() => setHoverTarget(null)}
                      onFocus={() => setHoverTarget({ rowIndex, colIndex: safeEvalIdx })}
                      onBlur={() => setHoverTarget(null)}
                    >
                      <span class="axis-index">{rowIndex}</span>
                      <span class="axis-set">{label(rowSet)}</span>
                    </button>
                    <div class="rr">
                      {visibleColIndices.map((colIndex) => {
                        const evSet = subsets[colIndex] || [];
                        const value = matrix[rowIndex]?.[colIndex] ?? 0;
                        const normalized = normalizeValue(value, dispMin, dispMax, 0.5);
                        const cellConfidence = confidenceIntervalForValue({
                          value,
                          evalSet: evSet,
                          metric,
                          domains: covertypeDomains,
                        });
                        const cellCiStyle = intervalBandStyle(cellConfidence.interval, cellConfidence.valueScale);
                        const ciTitle = cellConfidence.interval.available
                          ? `Eval CI ${formatValue(cellConfidence.interval.lower)}-${formatValue(cellConfidence.interval.upper)}`
                          : "Eval CI unavailable";
                        const id = makeCellId(rowIndex, colIndex);
                        const isAnchor = rowIndex === safeTrainIdx && colIndex === safeEvalIdx;
                        const isSelected = selectedSet.has(id);
                        const isRequired = appMode === "compute" && requiredCellSet.has(id);
                        const isStepCell = appMode === "compute" && activeStepCellSet.has(id);
                        const isTrack = hoverTarget?.rowIndex === rowIndex || hoverTarget?.colIndex === colIndex;
                        const classes = ["cell"];
                        if (isAnchor) classes.push("sel");
                        if (isSelected) classes.push("cell-selected-set");
                        if (isRequired) classes.push("cell-plan");
                        if (isStepCell) classes.push("cell-step");
                        if (guideTargetCellSet.has(id)) classes.push("cell-guide-target");
                        if (isTrack) classes.push("cell-track");
                        return (
                          <button
                            key={`cell-${rowIndex}-${colIndex}`}
                            class={classes.join(" ")}
                            type="button"
                            data-selected={isSelected ? "true" : "false"}
                            data-anchor-cell={isAnchor ? "true" : "false"}
                            aria-pressed={isSelected}
                            aria-label={`Train ${label(rowSet)}, evaluate ${label(evSet)}, score ${value.toFixed(3)}${showConfidence ? `, ${ciTitle}` : ""}`}
                            title={`Train ${label(rowSet)} | Eval ${label(evSet)} | value ${value.toFixed(3)}${showConfidence ? ` | ${ciTitle}` : ""}`}
                            onClick={() => handleCellClick(rowIndex, colIndex)}
                            onMouseEnter={() => setHoverTarget({ rowIndex, colIndex })}
                            onMouseLeave={() => setHoverTarget(null)}
                            onFocus={() => setHoverTarget({ rowIndex, colIndex })}
                            onBlur={() => setHoverTarget(null)}
                            style={{ "--cell-color": palette(normalized) }}
                          >
                            {isAnchor ? <span class="marker-ring target"></span> : null}
                            {isSelected && !isAnchor ? <span class="marker-ring compare"></span> : null}
                            {isStepCell || isRequired ? <span class="marker-ring plan"></span> : null}
                            {showConfidence && cellCiStyle ? <span class="cell-ci" style={cellCiStyle}></span> : null}
                            {showNums ? (
                              <span class="num" style={{ color: normalized > 0.48 ? "#10273d" : "#fffaf2" }}>
                                {value.toFixed(2)}
                              </span>
                            ) : null}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div class="graph-surface">
              <div class="graph-command-readout">
                <span class="control-label">{hoveredNodeIndex === null ? "Lens" : "Hover preview"}</span>
                <strong>
                  {hoveredNodeIndex === null
                    ? graphLensMeta[lens].title
                    : lensUsesEvalAxis
                      ? `Eval ${label(previewSet)} | Score ${formatValue(previewValue)}`
                      : `Train ${label(previewSet)} | Score ${formatValue(previewValue)}`}
                </strong>
                <span>{graphLensMeta[lens].summary}</span>
              </div>
              <div class="graph-scroll" ref={graphWrapRef}>
                <svg
                  class={`graph-lattice ${graphIsDense ? "is-dense" : ""}`}
                  data-testid="explorer-graph"
                  viewBox={`0 0 ${graph.width} ${graph.height}`}
                  aria-label="Subset lattice"
                >
                  {graph.edges.map((edge) => {
                    const from = graph.nodes.get(edge.from);
                    const to = graph.nodes.get(edge.to);
                    if (!from || !to) return null;
                    const highlighted = highlightedEdges.has(edge.key);
                    const square = squareEdges.has(edge.key);
                    const envelope = envelopeEdges.has(edge.key);
                    const pathToken = changedToken(subsets[edge.from] || [], subsets[edge.to] || []);
                    return (
                      <g key={edge.id} class={`graph-edge ${highlighted ? "is-highlighted" : ""} ${square ? "is-square" : ""} ${envelope ? "is-envelope" : ""}`}>
                        <line
                          x1={from.x}
                          y1={from.y + from.height / 2 - 2}
                          x2={to.x}
                          y2={to.y - to.height / 2 + 2}
                        />
                        {highlighted ? (
                          <text x={(from.x + to.x) / 2} y={(from.y + to.y) / 2 - 6} text-anchor="middle">
                            {pathToken}
                          </text>
                        ) : null}
                      </g>
                    );
                  })}
                  {subsets.map((_, index) => {
                    const node = graph.nodes.get(index);
                    if (!node) return null;
                    const value = lensUsesEvalAxis ? (matrix[safeTrainIdx]?.[index] ?? 0) : (matrix[index]?.[safeEvalIdx] ?? 0);
                    const normalized = lensUsesEvalAxis ? normalizeValue(value, rowMin, rowMax, 0.5) : normalizeValue(value, colMin, colMax, 0.5);
                    const nodeEvalSet = lensUsesEvalAxis ? (subsets[index] || []) : evalSet;
                    const nodeConfidence = confidenceIntervalForValue({
                      value,
                      evalSet: nodeEvalSet,
                      metric,
                      domains: covertypeDomains,
                    });
                    const nodeCi = graphIntervalBand(nodeConfidence.interval, nodeConfidence.valueScale, node.width);
                    const nodeCiLabel = nodeConfidence.interval.available
                      ? `Eval CI ${formatValue(nodeConfidence.interval.lower)}-${formatValue(nodeConfidence.interval.upper)}`
                      : "Eval CI unavailable";
                    const selected = lensUsesEvalAxis ? index === safeEvalIdx : index === safeTrainIdx;
                    const highlighted = highlightedNodes.has(index);
                    const evalMirrored = lensUsesEvalAxis ? index === safeTrainIdx : index === safeEvalIdx;
                    const poisoned = poisonedNodes.has(index);
                    const envelope = envelopeNodes.has(index);
                    const square = lens === "interaction" && interactionStats.corners.some((corner) => corner.rowIndex === index);
                    const hovered = hoveredNodeIndex === index;
                    const showDenseDetail = !graphIsDense || selected || highlighted || evalMirrored || poisoned || envelope || square || hovered;
                    const showNodeBand = showConfidence && nodeCi && showDenseDetail;
                    const showNodeTick = showConfidence && nodeCi && graphIsDense && !showDenseDetail;
                    const tickX = nodeCi ? nodeCi.x + nodeCi.width / 2 - 2 : 0;
                    return (
                      <g
                        key={`node-${index}`}
                        class={`graph-node ${selected ? "is-selected" : ""} ${highlighted ? "is-highlighted" : ""} ${evalMirrored ? "is-eval" : ""} ${poisoned ? "is-poisoned" : ""} ${envelope ? "is-envelope" : ""} ${square ? "is-square" : ""}`}
                        transform={`translate(${node.x}, ${node.y})`}
                        onClick={() => (lensUsesEvalAxis ? setEvalIdx(index) : setTrainIdx(index))}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            if (lensUsesEvalAxis) setEvalIdx(index);
                            else setTrainIdx(index);
                          }
                        }}
                        onMouseEnter={() => setHoveredNodeIndex(index)}
                        onMouseLeave={() => setHoveredNodeIndex(null)}
                        onFocus={() => setHoveredNodeIndex(index)}
                        onBlur={() => setHoveredNodeIndex(null)}
                        data-selected={selected ? "true" : "false"}
                        role="button"
                        tabIndex="0"
                        aria-label={
                          lensUsesEvalAxis
                            ? `Select evaluation world ${node.label}, score ${formatValue(value)}${showConfidence ? `, ${nodeCiLabel}` : ""}`
                            : `Select training world ${node.label}, score ${formatValue(value)}${showConfidence ? `, ${nodeCiLabel}` : ""}`
                        }
                      >
                        <rect
                          class="graph-node-halo"
                          x={-node.width / 2 - 5}
                          y={-node.height / 2 - 5}
                          width={node.width + 10}
                          height={node.height + 10}
                          rx="8"
                        />
                        <rect
                          class="graph-node-plate"
                          x={-node.width / 2}
                          y={-node.height / 2}
                          width={node.width}
                          height={node.height}
                          rx="6"
                          fill={palette(normalized)}
                        />
                        <rect
                          class="graph-node-frame"
                          x={-node.width / 2 + 2}
                          y={-node.height / 2 + 2}
                          width={Math.max(0, node.width - 4)}
                          height={Math.max(0, node.height - 4)}
                          rx="5"
                        />
                        {showNodeBand ? (
                          <>
                            <rect class="graph-node-ci-track" x={-node.width / 2 + 8} y={node.height / 2 - 8} width={node.width - 16} height="4" rx="2" />
                            <rect class="graph-node-ci" x={nodeCi.x} y={node.height / 2 - 8} width={nodeCi.width} height="4" rx="2" />
                          </>
                        ) : null}
                        {showNodeTick ? <rect class="graph-node-ci-tick" x={tickX} y={node.height / 2 - 8} width="4" height="4" rx="2" /> : null}
                        {evalMirrored ? <circle class="graph-node-eval" cx={node.width / 2 - 10} cy={-node.height / 2 + 10} r="4"></circle> : null}
                        {poisoned ? (
                          <g class="graph-node-poison">
                            <circle cx={-node.width / 2 + 10} cy={-node.height / 2 + 10} r="5"></circle>
                            <text x={-node.width / 2 + 10} y={-node.height / 2 + 13} text-anchor="middle">
                              !
                            </text>
                          </g>
                        ) : null}
                        {showDenseDetail ? (
                          <text x="0" y="5" text-anchor="middle">
                            {node.label}
                          </text>
                        ) : null}
                      </g>
                    );
                  })}
                </svg>
              </div>
            </div>
          )}
        </main>

      </div>

      {setupOpen ? (
        <div class="tutorial-modal" role="dialog" aria-modal="true" aria-label="Initialize game state" data-testid="game-setup-modal">
          <div class="tutorial-card setup-card">
            <div class="panel-head">
              <div>
                <span class="hud-kicker">New game</span>
                <h3>Choose a starting position.</h3>
              </div>
              <button type="button" data-testid="setup-keep-current" onClick={() => setSetupOpen(false)}>
                Keep current
              </button>
            </div>
            <div class="modal-body setup-body">
              <section class="explain-panel">
                <strong>What you are setting up</strong>
                <p>
                  Each square is a counterfactual world: a training set on one axis, an evaluation set on the other, and a score for how that pairing behaves.
                  Pick a start if you want the board to feel like a game state instead of a pile of controls.
                </p>
              </section>
              <div class="starter-grid">
                <button type="button" data-testid="setup-starter-grid" onClick={() => initializeGame("starter")}>
                  <span>Starter board</span>
                  <strong>Explore one train/eval square</strong>
                  <em>Best first move. Three datasets, Jaccard score, A vs A selected.</em>
                </button>
                <button type="button" data-testid="setup-compute-grid" onClick={() => initializeGame("compute")}>
                  <span>Value quest</span>
                  <strong>Compute a formal data value</strong>
                  <em>Starts on Shapley value with four datasets and the full board available.</em>
                </button>
                <button type="button" data-testid="setup-graph-route" onClick={() => initializeGame("graph")}>
                  <span>Graph route</span>
                  <strong>Navigate subset worlds as a map</strong>
                  <em>Starts on the lattice view, where moves add or remove training data.</em>
                </button>
              </div>
              <div class="modal-actions">
                <button type="button" onClick={resetGame}>
                  Reset defaults
                </button>
                <button type="button" onClick={() => setSetupOpen(false)}>
                  Continue current run
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {modeDialogOpen ? (
        <div class="tutorial-modal" role="dialog" aria-modal="true" aria-label="Change interaction mode" data-testid="mode-dialog">
          <div class="tutorial-card mode-card">
            <div class="panel-head">
              <div>
                <span class="hud-kicker">Interaction mode</span>
                <h3>Decide what clicks mean.</h3>
              </div>
              <button type="button" onClick={() => setModeDialogOpen(false)}>
                Close
              </button>
            </div>
            <div class="modal-body">
              <div class="mode-choice-grid">
                <button
                  type="button"
                  data-testid="explore-mode-button"
                  aria-pressed={appMode === "explore"}
                  onClick={() => chooseInteractionMode("explore")}
                >
                  <span>Explore</span>
                  <strong>Collect evidence on the board</strong>
                  <em>Clicks add cells, rows, or columns to the active set so you can see what can be computed.</em>
                </button>
                <button
                  type="button"
                  data-testid="compute-mode-button"
                  aria-pressed={appMode === "compute"}
                  onClick={() => chooseInteractionMode("compute")}
                >
                  <span>Compute</span>
                  <strong>Run a named counterfactual query</strong>
                  <em>Clicks move the anchor cell while the selected query explains which cells matter.</em>
                </button>
              </div>
              <section class="mode-detail-panel">
                <div>
                  <span class="hud-kicker">Current query</span>
                  <h3>{appMode === "explore" ? "Free exploration" : activePlan?.label}</h3>
                  <p>{appMode === "explore" ? "You are building an active set. Switch to a query when you want the board to answer a specific question." : activePlan?.description}</p>
                </div>
                {view === "grid" ? (
                  <div class="mode-query-list">
                    {gridConcepts.slice(0, 8).map((concept) => (
                      <button
                        key={concept.id}
                        type="button"
                        aria-pressed={appMode === "compute" && queryConcept === concept.id}
                        onClick={() => chooseInteractionMode(concept.id)}
                      >
                        {concept.label}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div class="mode-query-list">
                    {Object.entries(graphLensMeta).map(([id, meta]) => (
                      <button
                        key={id}
                        type="button"
                        aria-pressed={lens === id}
                        onClick={() => {
                          changeLens(id);
                          setModeDialogOpen(false);
                          setControlsOpen(true);
                        }}
                      >
                        {meta.title}
                      </button>
                    ))}
                  </div>
                )}
              </section>
            </div>
          </div>
        </div>
      ) : null}

      {tutorialOpen ? (
        <div class="tutorial-modal" role="dialog" aria-modal="true" aria-label="Guided tutorials" data-testid="guide-modal">
          <div class="tutorial-card guide-card">
            <div class="panel-head">
              <div>
                <span class="hud-kicker">Guides</span>
                <h3>Pick one route, then play it.</h3>
              </div>
              <button type="button" onClick={() => setTutorialOpen(false)}>
                Close
              </button>
            </div>
            <div class="modal-body guide-dialog-layout">
              <section class="guide-feature">
                <div>
                  <span class="hud-kicker">{guidePreview?.concept}</span>
                  <h3>{guidePreview?.title}</h3>
                  <p>{guidePreview?.summary}</p>
                </div>
                <div class="takeaway">{guidePreview?.goal}</div>
                <p>{guidePreview?.how}</p>
                <button type="button" data-testid="run-guide-button" disabled={!guidePreview} onClick={() => guidePreview && runTutorial(guidePreview)}>
                  Start guide
                </button>
              </section>
              <nav class="guide-list" aria-label="Recommended guides">
                {visibleGuides.map((tutorial) => (
                  <button
                    key={tutorial.id}
                    type="button"
                    data-testid="guide-option"
                    class={guidePreview?.id === tutorial.id ? "active" : ""}
                    aria-pressed={guidePreview?.id === tutorial.id}
                    onClick={() => setGuidePreviewId(tutorial.id)}
                  >
                    <strong>{tutorial.title}</strong>
                    <span>{tutorial.concept}</span>
                  </button>
                ))}
              </nav>
            </div>
          </div>
        </div>
      ) : null}

      {atlasOpen ? (
        <div class="tutorial-modal" role="dialog" aria-modal="true" aria-label="Concept atlas" data-testid="concept-atlas">
          <div class="tutorial-card atlas-card">
            <div class="panel-head">
              <div>
                <span class="hud-kicker">Concept atlas</span>
                <h3>{activeAtlasEntry.name}</h3>
              </div>
              <button type="button" onClick={() => setAtlasOpen(false)}>
                Close
              </button>
            </div>
            <div class="atlas-layout">
              <nav class="atlas-nav" aria-label="Concept list">
                {conceptAtlasEntries.map((entry) => (
                  <button
                    key={entry.id}
                    type="button"
                    aria-pressed={atlasConceptId === entry.id}
                    onClick={() => selectAtlasConcept(entry.id)}
                  >
                    <span>{entry.family}</span>
                    <strong>{entry.name}</strong>
                  </button>
                ))}
              </nav>
              <section class="atlas-detail">
                <div class="atlas-badges">
                  <span>{activeAtlasEntry.family}</span>
                  <span>{activeAtlasEntry.gridMove.split(".")[0]}</span>
                </div>
                <p class="panel-copy">{activeAtlasEntry.definition}</p>
                <div class="formula">{activeAtlasEntry.formula}</div>
                {activeComparisons.length && activeComparison ? (
                  <section class="comparison-strip" aria-label="Related field comparisons">
                    <div class="comparison-head">
                      <strong>{atlasConceptId === "explore" ? "Field bridges" : "Closest field bridge"}</strong>
                      <span>{activeComparisons.length} comparison{activeComparisons.length === 1 ? "" : "s"}</span>
                    </div>
                    {activeComparisons.length > 1 ? (
                      <div class="comparison-tabs" role="group" aria-label="Comparison cards">
                        {activeComparisons.map((card) => (
                          <button
                            key={card.id}
                            type="button"
                            aria-pressed={activeComparison.id === card.id}
                            onClick={() => setComparisonId(card.id)}
                          >
                            {card.title}
                          </button>
                        ))}
                      </div>
                    ) : null}
                    <div class="comparison-grid">
                      {activeComparisons.map((card) => (
                        <article class="comparison-card" key={card.id} hidden={card.id !== activeComparison.id}>
                          <div class="comparison-title">
                            <strong>{card.title}</strong>
                            <span>{card.left} / {card.right}</span>
                          </div>
                          <p>{card.sharedGridMove}</p>
                          <p>{card.distinction}</p>
                          <div class="comparison-bridge">{card.bridge}</div>
                          <small>{card.caution}</small>
                        </article>
                      ))}
                    </div>
                  </section>
                ) : null}
                <div class="atlas-grid">
                  <div>
                    <strong>Grid move</strong>
                    <p>{activeAtlasEntry.gridMove}</p>
                  </div>
                  <div>
                    <strong>Graph move</strong>
                    <p>{activeAtlasEntry.graphMove}</p>
                  </div>
                </div>
                <div class="atlas-grid">
                  <div>
                    <strong>Assumptions</strong>
                    <ul>
                      {activeAtlasEntry.assumptions.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <strong>Field hooks</strong>
                    <ul>
                      {activeAtlasEntry.related.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </section>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default Explorer;
