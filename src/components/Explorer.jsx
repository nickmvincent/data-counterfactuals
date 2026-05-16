import { h } from "preact";
import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import htm from "htm";
import {
  alphabet,
  buildSubsetGrid,
  covertypeDomainMaxCount,
  findSubsetIndex,
  getCovertypeDomains,
  labelSubset as label,
  matrixRange,
  normalizeValue,
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
  gridModeToGraphLens,
  hasExplorerGameStateParams,
  normalizeSharedChoice,
  normalizeSharedTokens,
  parseExplorerGameState,
  parseSharedCount,
  replaceExplorerGameStateUrl,
} from "../lib/explorer-game-state.js";
import { scrollChildIntoContainer } from "../lib/scroll-helpers.js";

const html = htm.bind(h);

function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}

function hexToRgb(hex) {
  const normalized = hex.replace("#", "");
  const value =
    normalized.length === 3 ? normalized.split("").map((char) => `${char}${char}`).join("") : normalized;
  return {
    r: Number.parseInt(value.slice(0, 2), 16),
    g: Number.parseInt(value.slice(2, 4), 16),
    b: Number.parseInt(value.slice(4, 6), 16),
  };
}

function rgbToCss({ r, g, b }) {
  return `rgb(${Math.round(r)} ${Math.round(g)} ${Math.round(b)})`;
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
    return rgbToCss({
      r: start.r + (end.r - start.r) * localT,
      g: start.g + (end.g - start.g) * localT,
      b: start.b + (end.b - start.b) * localT,
    });
  };
}

const palettes = {
  "Textbook atlas": createPalette(["#18353b", "#2d6f72", "#779f87", "#d2b865", "#fff1d2"]),
  "Cedar map": createPalette(["#202737", "#37676d", "#8aa37c", "#c99355", "#fae6d4"]),
  "Library fieldwork": createPalette(["#242733", "#475f75", "#789a9b", "#c7aa6b", "#fff6df"]),
};

const multiFocusConcepts = new Set(["group", "interaction"]);
const kBucketConcepts = new Set(["scaling", "eval-scaling", "diagonal-scaling", "budget"]);

const metricMeta = {
  jaccard: {
    short: "Jaccard",
    name: "Jaccard overlap",
    description: "Normalized overlap between train and eval worlds.",
  },
  inter: {
    short: "|Intersection|",
    name: "Raw overlap count",
    description: "Raw shared count between train and eval worlds.",
  },
  entropy: {
    short: "Entropy",
    name: "Binary entropy of overlap",
    description: "An uncertainty-style score derived from train/eval overlap.",
  },
  real: {
    short: "Real data",
    name: "Toy real-data accuracy",
    description: "Accuracy from a tiny fixed dataset and a simple classifier.",
  },
  covertype: {
    short: "Covertype",
    name: "Held-out domain accuracy",
    description: "Held-out multiclass accuracy over real Covertype wilderness domains.",
  },
};

function clampIndex(index, total) {
  if (!total) return 0;
  if (index < 0) return 0;
  if (index >= total) return total - 1;
  return index;
}

function formatValue(value) {
  return Number.isFinite(value) ? value.toFixed(4) : "0.0000";
}

function useGrid(items, metric, metricOptions = {}) {
  return useMemo(() => {
    const grid = buildSubsetGrid(items, metric, metricOptions);
    return { matrix: grid.matrix, subsets: grid.subsets };
  }, [items, metric, metricOptions]);
}

function formatColumnHeader(index, subset) {
  return html`
    <span class="axis-index">${index}</span>
    <span class="axis-set">${label(subset)}</span>
  `;
}

function formatRowHeader(index, subset) {
  return html`
    <span class="axis-index">${index}</span>
    <span class="axis-set">${label(subset)}</span>
  `;
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
  if (plan.status === "ready") return "ready";
  if (plan.status === "partial") return `${plan.missingCells.length} missing`;
  return "not available";
}

function App() {
  const countMin = 2;
  const countMax = 8;
  const initialUrlStateAppliedRef = useRef(false);
  const pendingUrlSelectionRef = useRef(false);
  const urlSyncEnabledRef = useRef(false);
  const gridWrapRef = useRef(null);

  const [pendingSharedState, setPendingSharedState] = useState(null);
  const [count, setCount] = useState(3);
  const [metric, setMetric] = useState("jaccard");
  const [realDataMode, setRealDataMode] = useState("precomputed");
  const [realDataSample, setRealDataSample] = useState(0);
  const [paletteName, setPaletteName] = useState("Textbook atlas");
  const [appMode, setAppMode] = useState("explore");
  const [queryConcept, setQueryConcept] = useState("loo");
  const [focusSet, setFocusSet] = useState(["A"]);
  const [k, setK] = useState(2);
  const [betaAlpha, setBetaAlpha] = useState(2);
  const [betaBeta, setBetaBeta] = useState(2);
  const [showNums, setShowNums] = useState(true);
  const [showSingletonEvalCols, setShowSingletonEvalCols] = useState(false);
  const [selectedCellIds, setSelectedCellIds] = useState(() => [makeCellId(1, 1)]);
  const [walkthroughStep, setWalkthroughStep] = useState(0);
  const [walkthroughRunning, setWalkthroughRunning] = useState(false);
  const [hoverTarget, setHoverTarget] = useState(null);
  const [shareStatus, setShareStatus] = useState("idle");
  const [hydrated, setHydrated] = useState(false);

  const maxCountForMetric = metric === "covertype" ? Math.min(countMax, covertypeDomainMaxCount) : countMax;
  const base = useMemo(() => alphabet.slice(0, Math.min(count, maxCountForMetric)), [count, maxCountForMetric]);
  const palette = palettes[paletteName];
  const metricOptions = useMemo(
    () => ({
      realDataMode,
      realDataSample,
    }),
    [realDataMode, realDataSample],
  );
  const { matrix, subsets } = useGrid(base, metric, metricOptions);
  const { min: dispMin, max: dispMax } = useMemo(() => matrixRange(matrix), [matrix]);
  const covertypeDomains = useMemo(
    () => (metric === "covertype" ? getCovertypeDomains(base) : []),
    [metric, base],
  );

  const [rowIdx, setRowIdx] = useState(1);
  const [colIdx, setColIdx] = useState(1);
  const safeRowIdx = clampIndex(rowIdx, subsets.length);
  const safeColIdx = clampIndex(colIdx, subsets.length);
  const trainSet = subsets[safeRowIdx] || [];
  const evalSet = subsets[safeColIdx] || [];
  const selectedValue = matrix[safeRowIdx]?.[safeColIdx] ?? 0;
  const focusPrimary = focusSet.find((token) => base.includes(token)) || base[0] || "A";
  const queryUsesFocus = !kBucketConcepts.has(queryConcept);
  const queryAllowsMultiFocus = queryUsesFocus && multiFocusConcepts.has(queryConcept);

  const visibleColIndices = useMemo(() => {
    if (!showSingletonEvalCols) return subsets.map((_, index) => index);
    const singletons = [];
    subsets.forEach((subset, index) => {
      if (subset.length === 1) singletons.push(index);
    });
    return singletons.length ? singletons : subsets.map((_, index) => index);
  }, [showSingletonEvalCols, subsets]);

  useEffect(() => {
    const search = typeof window === "undefined" ? "" : window.location.search;
    const sharedState = parseExplorerGameState(search);
    const hasSelection = Boolean(sharedState.trainSet || sharedState.evalSet);
    urlSyncEnabledRef.current = hasExplorerGameStateParams(search);
    pendingUrlSelectionRef.current = hasSelection;

    if (sharedState.count) setCount(parseSharedCount(sharedState.count, 3, countMin, countMax));
    if (sharedState.metric) setMetric(normalizeSharedChoice(sharedState.metric, Object.keys(metricMeta), "jaccard"));
    if (sharedState.mode && gridConceptIds.includes(sharedState.mode)) {
      setQueryConcept(sharedState.mode);
      setAppMode(sharedState.mode === "explore" ? "explore" : "compute");
    }
    if (sharedState.focusSet) setFocusSet(sharedState.focusSet);
    if (sharedState.k !== null) setK(parseSharedCount(sharedState.k, 2, 0, countMax));

    if (hasSelection) {
      setPendingSharedState(sharedState);
    } else {
      initialUrlStateAppliedRef.current = true;
    }
  }, []);

  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (count > maxCountForMetric) setCount(maxCountForMetric);
  }, [count, maxCountForMetric]);

  useEffect(() => {
    setFocusSet((previous) => {
      const filtered = previous.filter((token) => base.includes(token));
      if (!filtered.length) return base.length ? [base[0]] : [];
      if (!queryAllowsMultiFocus && filtered.length > 1) return [filtered[0]];
      return filtered;
    });
  }, [base, queryAllowsMultiFocus]);

  useEffect(() => {
    if (rowIdx !== safeRowIdx) setRowIdx(safeRowIdx);
  }, [rowIdx, safeRowIdx]);

  useEffect(() => {
    if (colIdx !== safeColIdx) setColIdx(safeColIdx);
  }, [colIdx, safeColIdx]);

  useEffect(() => {
    if (!visibleColIndices.length) return;
    if (!visibleColIndices.includes(colIdx)) setColIdx(visibleColIndices[0]);
  }, [visibleColIndices, colIdx]);

  useEffect(() => {
    if (initialUrlStateAppliedRef.current || !subsets.length || !pendingSharedState) return;
    let nextRow = safeRowIdx;
    let nextCol = safeColIdx;
    if (pendingSharedState.trainSet) {
      const trainIndex = findSubsetIndex(subsets, normalizeSharedTokens(pendingSharedState.trainSet, base));
      if (trainIndex >= 0) nextRow = trainIndex;
    }
    if (pendingSharedState.evalSet) {
      const evalIndex = findSubsetIndex(subsets, normalizeSharedTokens(pendingSharedState.evalSet, base));
      if (evalIndex >= 0) nextCol = evalIndex;
    }
    setRowIdx(nextRow);
    setColIdx(nextCol);
    setSelectedCellIds([makeCellId(nextRow, nextCol)]);
    initialUrlStateAppliedRef.current = true;
    setPendingSharedState(null);
  }, [subsets, base, pendingSharedState, safeRowIdx, safeColIdx]);

  useEffect(() => {
    if (pendingUrlSelectionRef.current) {
      pendingUrlSelectionRef.current = false;
      return;
    }
    setRowIdx(1);
    setColIdx(1);
    setSelectedCellIds([makeCellId(1, 1)]);
  }, [base.length]);

  useEffect(() => {
    setSelectedCellIds((previous) => {
      const filtered = idsToCells(previous, subsets, visibleColIndices);
      return filtered.length ? cellsToIds(filtered) : [makeCellId(safeRowIdx, safeColIdx)];
    });
  }, [subsets, visibleColIndices, safeRowIdx, safeColIdx]);

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
        subsets,
        universe: base,
        rowIndex: safeRowIdx,
        colIndex: safeColIdx,
        focusSet,
        selectedCellIds,
        k,
        betaAlpha,
        betaBeta,
      }),
    [matrix, subsets, base, safeRowIdx, safeColIdx, focusSet, selectedCellIds, k, betaAlpha, betaBeta],
  );
  const sortedPlans = useMemo(
    () => plans.slice().sort((left, right) => rankConceptPlan(left) - rankConceptPlan(right)),
    [plans],
  );
  const activePlan = plans.find((plan) => plan.id === queryConcept) || plans[0];
  const readyPlanCount = plans.filter((plan) => plan.status === "ready").length;
  const activeStep = activePlan?.steps?.[walkthroughStep] || activePlan?.steps?.[0] || null;
  const activeStepCellSet = useMemo(() => new Set(cellsToIds(activeStep?.cells || [])), [activeStep]);
  const requiredCellSet = useMemo(() => new Set(cellsToIds(activePlan?.requiredCells || [])), [activePlan]);

  useEffect(() => {
    setWalkthroughStep(0);
    setWalkthroughRunning(false);
  }, [queryConcept, safeRowIdx, safeColIdx, focusSet, k, betaAlpha, betaBeta]);

  useEffect(() => {
    if (!walkthroughRunning || !activePlan) return undefined;
    if (walkthroughStep >= activePlan.steps.length - 1) {
      setWalkthroughRunning(false);
      return undefined;
    }
    const timer = setTimeout(() => setWalkthroughStep((previous) => previous + 1), 1050);
    return () => clearTimeout(timer);
  }, [walkthroughRunning, walkthroughStep, activePlan]);

  useEffect(() => {
    const container = gridWrapRef.current;
    if (!container) return;
    const selectedCell = container.querySelector('[data-anchor-cell="true"]');
    if (!selectedCell) return;
    scrollChildIntoContainer(container, selectedCell);
  }, [safeRowIdx, safeColIdx, subsets.length]);

  const sharedGameState = useMemo(
    () => ({
      count,
      metric,
      mode: appMode === "explore" ? "explore" : queryConcept,
      lens: gridModeToGraphLens(appMode === "explore" ? "explore" : queryConcept),
      trainSet,
      evalSet,
      focusSet,
      k,
    }),
    [count, metric, appMode, queryConcept, trainSet, evalSet, focusSet, k],
  );
  const graphExplorerHref = buildExplorerHref("/graph", sharedGameState);

  useEffect(() => {
    if (!hydrated || !urlSyncEnabledRef.current) return;
    replaceExplorerGameStateUrl(sharedGameState);
  }, [hydrated, sharedGameState]);

  const copyGridShareUrl = async () => {
    setShareStatus("idle");
    try {
      await copyExplorerShareUrl("/grid", sharedGameState);
      setShareStatus("copied");
      window.setTimeout(() => setShareStatus("idle"), 1400);
    } catch {
      setShareStatus("failed");
    }
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
      setRowIdx(cleanCells[0].rowIndex);
      setColIdx(cleanCells[0].colIndex);
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
    setRowIdx(rowIndex);
    setColIdx(colIndex);
    if (appMode === "compute") {
      setSelectedCellsFromCells(cellsForCurrentCell(rowIndex, colIndex), { moveAnchor: false });
      return;
    }
    toggleCells(cellsForCurrentCell(rowIndex, colIndex));
  };

  const handleRowHeaderClick = (rowIndex) => {
    setRowIdx(rowIndex);
    if (appMode === "explore") toggleCells(cellsForRow(subsets, rowIndex, visibleColIndices));
  };

  const handleColumnHeaderClick = (colIndex) => {
    setColIdx(colIndex);
    if (appMode === "explore") toggleCells(cellsForColumn(subsets, colIndex));
  };

  const startWalkthrough = () => {
    if (!activePlan || activePlan.status === "unavailable") return;
    setSelectedCellsFromCells(activePlan.requiredCells, { moveAnchor: false });
    setWalkthroughStep(0);
    setWalkthroughRunning(true);
  };

  const choosePreset = (planId) => {
    const plan = plans.find((entry) => entry.id === planId);
    if (!plan || plan.status === "unavailable") return;
    setSelectedCellsFromCells(plan.requiredCells);
  };

  const toggleFocus = (token) => {
    if (queryAllowsMultiFocus) {
      setFocusSet((previous) =>
        previous.includes(token)
          ? previous.filter((candidate) => candidate !== token)
          : [...previous, token].sort(),
      );
      return;
    }
    setFocusSet([token]);
  };

  const switchToPrecomputedRealData = () => setRealDataMode("precomputed");
  const switchToLiveRealData = () => {
    setRealDataMode("live");
    setRealDataSample((previous) => previous || 1);
  };
  const resampleRealData = () => {
    setRealDataMode("live");
    setRealDataSample((previous) => (previous || 1) + 1);
  };

  const hoveredRowIdx = hoverTarget?.rowIndex ?? null;
  const hoveredColIdx = hoverTarget?.colIndex ?? null;
  const previewGridTarget = (rowIndex, colIndex) => setHoverTarget({ rowIndex, colIndex });
  const clearGridPreview = () => setHoverTarget(null);

  const displaySummary = [
    showNums ? "Raw values on" : "Raw values off",
    showSingletonEvalCols ? "singleton cols only" : "all eval cols",
  ].join(", ");

  const modeSummary =
    appMode === "explore"
      ? `${selectedCells.length} selected cell${selectedCells.length === 1 ? "" : "s"}; ${readyPlanCount} computation${readyPlanCount === 1 ? "" : "s"} ready.`
      : `${activePlan?.label || "Computation"} is ${planStatusLabel(activePlan)}.`;

  const focusCopy =
    queryConcept === "group"
      ? "Choose two or more focus items for the coalition."
      : queryConcept === "interaction"
        ? "Choose two focus items that both appear in the active train row."
        : kBucketConcepts.has(queryConcept)
          ? "This query uses k as a subset-size bucket; focus is ignored."
        : `The active focus item is ${focusPrimary}.`;
  const focusControlTitle =
    queryConcept === "group" ? "Focus coalition" : queryConcept === "interaction" ? "Focus pair" : "Focus item";

  const presets = [
    {
      label: "Show current cell",
      action: () => setSelectedCellsFromCells(cellsForCurrentCell(safeRowIdx, safeColIdx)),
    },
    { label: "Show LOO pair", planId: "loo" },
    { label: "Show eval pair", planId: "eval" },
    { label: "Show Shapley column", planId: "shapley" },
    { label: `Show k=${k} layer`, planId: "scaling" },
  ];

  const renderPlanCard = (plan) => html`
    <div class=${`concept-plan-card concept-plan-card-${plan.status}`} key=${plan.id}>
      <div class="concept-plan-head">
        <div>
          <div class="concept-plan-title">${plan.label}</div>
          <div class="concept-plan-status">${planStatusLabel(plan)}</div>
        </div>
        ${plan.status !== "unavailable"
          ? html`
              <button class="btn ghost mini" type="button" onClick=${() => setSelectedCellsFromCells(plan.requiredCells)}>
                Select cells
              </button>
            `
          : null}
      </div>
      <div class="toolbar-note">
        ${plan.status === "unavailable"
          ? plan.unavailableReason
          : plan.status === "ready"
            ? `${plan.shortLabel} can be computed from the selected set: ${plan.formula}`
            : `${plan.description} Missing ${plan.missingCells.length} of ${plan.requiredCells.length} required cells.`}
      </div>
    </div>
  `;

  const exploreDock = html`
    <section class="stage-panel selection-dock" data-testid="grid-side-rail">
      <div class="selection-dock-grid">
        <section class="selection-dock-reading value-dock value-dock-tight" data-testid="value-dock">
          <div class="selection-dock-section-head selection-dock-reading-head">
            <div>
              <h3 class="panel-title">Smart explorer</h3>
              <p class="panel-copy">Selected evidence is translated literally, then checked against every computation the grid knows how to make.</p>
            </div>
          </div>
          <div class="current-reading-status">
            <div class="toolbar-label">Current anchor</div>
            <div class="selection-text-line">Train ${label(trainSet)} / Eval ${label(evalSet)} / Score ${formatValue(selectedValue)}</div>
          </div>
          <div class="selected-fact-list">
            ${selectedFacts.length
              ? selectedFacts.slice(0, 8).map(
                  (fact) => html`
                    <div class="selected-fact" key=${fact.id}>
                      <div class="selected-fact-title">${fact.title}</div>
                      <div class="toolbar-note">${fact.body}</div>
                    </div>
                  `,
                )
              : html`<div class="toolbar-note">No cells selected yet. Click cells, rows, or columns to add evidence.</div>`}
            ${selectedFacts.length > 8
              ? html`<div class="toolbar-note">${selectedFacts.length - 8} more selected cells are summarized by the computation cards below.</div>`
              : null}
          </div>
        </section>

        <div class="selection-dock-aside">
          <section class="selection-dock-section" data-testid="capability-panel">
            <div class="selection-dock-section-head">
              <div>
                <h3 class="selection-dock-section-title">What this selection can compute</h3>
              </div>
            </div>
            <div class="concept-plan-list">
              ${sortedPlans.map(renderPlanCard)}
            </div>
          </section>
        </div>
      </div>
    </section>
  `;

  const computeDock = html`
    <section class="stage-panel selection-dock" data-testid="grid-side-rail">
      <div class="selection-dock-grid">
        <section class="selection-dock-reading value-dock value-dock-tight" data-testid="value-dock">
          <div class="selection-dock-section-head selection-dock-reading-head">
            <div>
              <h3 class="panel-title">${activePlan?.label}</h3>
              <p class="panel-copy">${activePlan?.description}</p>
            </div>
            <button class="btn mini" type="button" disabled=${activePlan?.status === "unavailable"} onClick=${startWalkthrough}>
              Start walkthrough
            </button>
          </div>
          <div class="stage-takeaway" data-testid="reading-takeaway">
            ${activePlan?.status === "unavailable"
              ? activePlan.unavailableReason
              : `${activePlan?.formula}. ${activePlan?.missingCells.length ? `${activePlan.missingCells.length} required cells are not selected yet.` : "All required cells are selected."}`}
          </div>
          <div class="walkthrough-steps" data-testid="walkthrough-panel">
            ${activePlan?.steps.map(
              (step, index) => html`
                <button
                  key=${step.title}
                  class=${`walkthrough-step ${index === walkthroughStep ? "active" : ""}`}
                  type="button"
                  aria-pressed=${index === walkthroughStep}
                  onClick=${() => {
                    setWalkthroughStep(index);
                    setWalkthroughRunning(false);
                  }}
                >
                  <span class="walkthrough-step-number">${index + 1}</span>
                  <span>
                    <span class="walkthrough-step-title">${step.title}</span>
                    <span class="walkthrough-step-body">${step.body}</span>
                  </span>
                </button>
              `,
            )}
          </div>
        </section>

        <div class="selection-dock-aside">
          <section class="selection-dock-section" data-testid="question-controls">
            <div class="selection-dock-section-head">
              <div>
                <h3 class="selection-dock-section-title">Query</h3>
                <p class="panel-copy">Pick the value you want, then let the grid collect the cells that define it.</p>
              </div>
            </div>
            <label class="toolbar-select-field">
              <span class="toolbar-label">Question</span>
              <select data-testid="concept-select" value=${queryConcept} onChange=${(event) => setQueryConcept(event.target.value)}>
                ${gridConcepts.map((concept) => html`<option value=${concept.id}>${concept.label}</option>`)}
              </select>
            </label>

            ${queryUsesFocus
              ? html`
                  <div class="control-cluster">
                    <div class="control-head">${focusControlTitle}</div>
                    <div class="ctrl-note">${focusCopy}</div>
                    <div class="focus-token-row">
                      ${base.map((token) => {
                        const active = focusSet.includes(token);
                        return html`
                          <button key=${token} class="btn mini" type="button" aria-pressed=${active} onClick=${() => toggleFocus(token)}>
                            ${token}
                          </button>
                        `;
                      })}
                    </div>
                  </div>
                `
              : null}

            <div class="control-cluster">
              <div class="control-head">Train / eval anchor</div>
              <div class="grid-jump-controls grid-jump-controls-embedded" data-testid="grid-jump-controls">
                <label class="grid-jump-field">
                  <span class="toolbar-label">Train</span>
                  <select data-testid="grid-train-select" value=${safeRowIdx} onChange=${(event) => setRowIdx(Number(event.target.value))}>
                    ${subsets.map((subset, index) => html`<option value=${index}>${label(subset)}</option>`)}
                  </select>
                </label>
                <label class="grid-jump-field">
                  <span class="toolbar-label">Eval</span>
                  <select data-testid="grid-eval-select" value=${safeColIdx} onChange=${(event) => setColIdx(Number(event.target.value))}>
                    ${visibleColIndices.map((colIndex) => html`<option value=${colIndex}>${label(subsets[colIndex] || [])}</option>`)}
                  </select>
                </label>
              </div>
            </div>

            ${kBucketConcepts.has(queryConcept)
              ? html`
                  <div class="control-cluster">
                    <div class="control-head">Subset size bucket</div>
                    <div class="focus-token-row">
                      ${Array.from({ length: base.length + 1 }, (_, bucket) => html`
                        <button class="btn mini" type="button" aria-pressed=${k === bucket} onClick=${() => setK(bucket)}>k=${bucket}</button>
                      `)}
                    </div>
                  </div>
                `
              : null}

            ${queryConcept === "beta"
              ? html`
                  <div class="control-cluster">
                    <div class="control-head">Beta weights</div>
                    <div class="slider-row">
                      <label>Alpha</label>
                      <input type="range" min="1" max="5" step="1" value=${betaAlpha} onInput=${(event) => setBetaAlpha(+event.target.value)} />
                      <span>${betaAlpha}</span>
                    </div>
                    <div class="slider-row">
                      <label>Beta</label>
                      <input type="range" min="1" max="5" step="1" value=${betaBeta} onInput=${(event) => setBetaBeta(+event.target.value)} />
                      <span>${betaBeta}</span>
                    </div>
                  </div>
                `
              : null}
          </section>
        </div>
      </div>
    </section>
  `;

  return html`
    <div class="workspace-shell" data-testid="explorer-workspace" data-ready=${hydrated ? "true" : "false"}>
      <section class="workspace-toolbar" data-testid="explorer-toolbar">
        <div class="toolbar-bar">
          <div class="toolbar-action-strip" aria-label="Explorer actions">
            <a class="toolbar-action-link" href=${graphExplorerHref} data-testid="grid-to-graph-link">Graph view</a>
            <button
              class="toolbar-action-link"
              type="button"
              aria-live="polite"
              title=${shareStatus === "failed" ? "Clipboard blocked; state URL is in the address bar" : "Copy current state URL"}
              data-testid="grid-share-link"
              data-status=${shareStatus}
              onClick=${copyGridShareUrl}
            >
              ${shareStatus === "copied" ? "Copied" : shareStatus === "failed" ? "Copy failed" : "Share"}
            </button>
          </div>
          <div class="toolbar-guide">
            <div class="explorer-mode-switch" role="group" aria-label="Grid explorer mode">
              <button
                class="btn mini"
                type="button"
                data-testid="explore-mode-button"
                aria-pressed=${appMode === "explore"}
                onClick=${() => setAppMode("explore")}
              >
                Explore
              </button>
              <button
                class="btn mini"
                type="button"
                data-testid="compute-mode-button"
                aria-pressed=${appMode === "compute"}
                onClick=${() => setAppMode("compute")}
              >
                Compute
              </button>
            </div>
            <p class="toolbar-guide-copy">${modeSummary}</p>
            <div class="toolbar-selection-strip" aria-label="Current explorer settings">
              <div class="toolbar-selection-item">
                <span class="toolbar-selection-item-label">Mode</span>
                <span class="toolbar-selection-item-value">${appMode === "explore" ? "Explore" : "Compute"}</span>
              </div>
              <div class="toolbar-selection-item">
                <span class="toolbar-selection-item-label">Score</span>
                <span class="toolbar-selection-item-value">${metricMeta[metric].short}</span>
              </div>
              <div class="toolbar-selection-item">
                <span class="toolbar-selection-item-label">Train</span>
                <span class="toolbar-selection-item-value">${label(trainSet)}</span>
              </div>
              <div class="toolbar-selection-item">
                <span class="toolbar-selection-item-label">Eval</span>
                <span class="toolbar-selection-item-value">${label(evalSet)}</span>
              </div>
              <div class="toolbar-selection-item">
                <span class="toolbar-selection-item-label">Focus</span>
                <span class="toolbar-selection-item-value">${queryUsesFocus ? (queryAllowsMultiFocus ? label(focusSet) : focusPrimary) : "not used"}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="toolbar-grid">
          <section class="toolbar-group toolbar-group-primary" data-testid="metric-controls">
            <div class="toolbar-group-head">
              <div class="toolbar-group-head-copy">
                <span class="toolbar-label">Cell score</span>
                <div class="toolbar-current-choice">${metricMeta[metric].name}</div>
              </div>
            </div>
            <label class="toolbar-select-field">
              <span class="toolbar-field-hint">Choose how each train/eval pair gets scored</span>
              <select data-testid="metric-select" value=${metric} onChange=${(event) => setMetric(event.target.value)}>
                ${Object.entries(metricMeta).map(([value, meta]) => html`<option value=${value}>${meta.short}</option>`)}
              </select>
            </label>
            ${metric === "real"
              ? html`
                  <div class="segmented-row">
                    <button class="btn mini" type="button" aria-pressed=${realDataMode === "precomputed"} onClick=${switchToPrecomputedRealData}>Precomputed</button>
                    <button class="btn mini" type="button" aria-pressed=${realDataMode === "live"} onClick=${switchToLiveRealData}>Live</button>
                    <button class="btn ghost mini" type="button" disabled=${realDataMode !== "live"} onClick=${resampleRealData}>Resample</button>
                  </div>
                `
              : metric === "covertype"
                ? html`
                    <div class="toolbar-note">
                      A/B/C/D map to real wilderness-area domains from UCI Covertype. This metric supports up to ${covertypeDomains.length} active domains here.
                    </div>
                  `
                : html`<div class="toolbar-note">${metricMeta[metric].description}</div>`}
          </section>

          <details class="toolbar-group toolbar-group-actions toolbar-expand" data-testid="display-controls">
            <summary class="toolbar-summary">
              <div class="toolbar-summary-copy">
                <span class="toolbar-summary-label">Display settings</span>
                <span class="toolbar-summary-title">${displaySummary}</span>
              </div>
              <div class="toolbar-summary-actions">
                <span class="toolbar-summary-caret"></span>
              </div>
            </summary>
            <div class="toolbar-expanded">
              <label class="checkbox-row">
                <input type="checkbox" checked=${showNums} onChange=${(event) => setShowNums(event.target.checked)} />
                Show raw values
              </label>
              <div class="checkbox-row">
                <input
                  id="show-singleton-eval-cols"
                  type="checkbox"
                  checked=${showSingletonEvalCols}
                  onChange=${(event) => setShowSingletonEvalCols(event.target.checked)}
                />
                <label for="show-singleton-eval-cols">Fewer cols</label>
              </div>
              <label class="toolbar-select-field">
                <span class="toolbar-label">Palette</span>
                <select value=${paletteName} onChange=${(event) => setPaletteName(event.target.value)}>
                  ${Object.keys(palettes).map((name) => html`<option value=${name}>${name}</option>`)}
                </select>
              </label>
            </div>
          </details>

          <section class="toolbar-group" data-testid="scene-controls">
            <div class="toolbar-group-head">
              <div class="toolbar-group-head-copy">
                <span class="toolbar-label">Easy starts</span>
                <div class="toolbar-current-choice">Just show me...</div>
              </div>
            </div>
            <div class="tutorials preset-button-grid">
              ${presets.map((preset) => {
                const plan = preset.planId ? plans.find((entry) => entry.id === preset.planId) : null;
                const disabled = Boolean(plan && plan.status === "unavailable");
                return html`
                  <button
                    key=${preset.label}
                    class="tutorial-btn"
                    type="button"
                    disabled=${disabled}
                    title=${disabled ? plan.unavailableReason : preset.label}
                    onClick=${preset.action || (() => choosePreset(preset.planId))}
                  >
                    <span class="tutorial-title">${preset.label}</span>
                    <span class="tutorial-desc">${plan ? plan.description : "Read the anchor cell directly."}</span>
                  </button>
                `;
              })}
            </div>
          </section>
        </div>
      </section>

      <div class="workspace-main">
        <section class="grid-card grid-card-outer" data-testid="explorer-grid-card">
          <section class="grid-action-panel" data-testid="grid-marker-controls">
            <div class="grid-action-copy">
              <div>
                <h3 class="selection-dock-section-title">
                  ${appMode === "explore" ? "Select evidence cells." : "Run a computation over the grid."}
                </h3>
                <p class="toolbar-note">
                  ${appMode === "explore"
                    ? "Click any cell to add or remove it. Click a row or column header to toggle a whole row or column."
                    : "Click a cell to set the anchor, choose a query, then start the walkthrough."}
                </p>
              </div>
            </div>
            <div class="grid-marker-actions">
              <button class="btn mini" type="button" onClick=${() => setSelectedCellsFromCells(cellsForCurrentCell(safeRowIdx, safeColIdx))}>
                Select current cell
              </button>
              <button class="btn ghost mini" type="button" onClick=${() => setSelectedCellIds([])}>
                Clear selection
              </button>
              ${appMode === "compute"
                ? html`<button class="btn mini" type="button" disabled=${activePlan?.status === "unavailable"} onClick=${startWalkthrough}>Start walkthrough</button>`
                : null}
            </div>
          </section>

          <div class="grid-card-head">
            <div class="panel-heading-group">
              <div>
                <h2 class="grid-card-title">Data counterfactual grid</h2>
                <p class="grid-card-lede">Rows are training worlds; columns are evaluation worlds.</p>
              </div>
            </div>
            <div class="move-legend" aria-label="Grid move types">
              <span class="move-key"><span class="move-icon move-icon-row" aria-hidden="true"></span>Row</span>
              <span class="move-key"><span class="move-icon move-icon-column" aria-hidden="true"></span>Column</span>
              <span class="move-key"><span class="move-icon move-icon-coupled" aria-hidden="true"></span>Selected</span>
            </div>
          </div>

          <div class="grid-stage-shell">
            <div class="grid-stage-board">
              <div
                class="grid-wrap stage-grid"
                ref=${gridWrapRef}
                data-testid="explorer-grid"
                data-compact-cols=${showSingletonEvalCols ? "true" : "false"}
              >
                <div class="grid-matrix">
                  <div class="grid-axis-row">
                    <div class="rl axis-corner" title="Use the plus and minus buttons to grow or shrink the toy universe.">
                      <div class="axis-corner-stack">
                        <span class="axis-corner-label">Grid controls</span>
                        <div class="axis-corner-mode">
                          <span>Rows train</span>
                          <span>Cols eval</span>
                        </div>
                        <div class="axis-corner-actions">
                          <button
                            class="axis-corner-btn"
                            type="button"
                            disabled=${count <= countMin}
                            onClick=${() => setCount((previous) => Math.max(countMin, previous - 1))}
                            title="Remove one base point; rows and columns both shrink."
                          >
                            -
                          </button>
                          <span class="axis-corner-size" title="Toy universe size">${count}</span>
                          <button
                            class="axis-corner-btn"
                            type="button"
                            disabled=${count >= maxCountForMetric}
                            onClick=${() => setCount((previous) => Math.min(maxCountForMetric, previous + 1))}
                            title="Add one base point; rows and columns both grow."
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>
                    ${visibleColIndices.map((colIndex) => {
                      const colSet = subsets[colIndex] || [];
                      const active = colIndex === safeColIdx;
                      const hovered = hoveredColIdx === colIndex;
                      return html`
                        <button
                          key=${`col-${colIndex}`}
                          class=${`cl ${active ? "axis-active" : ""} ${hovered ? "axis-hot" : ""}`}
                          type="button"
                          aria-pressed=${active}
                          aria-label=${`Select evaluation slice ${label(colSet)}`}
                          title=${appMode === "explore" ? `Toggle eval column ${label(colSet)}` : `Use eval ${label(colSet)} as the computation anchor`}
                          onClick=${() => handleColumnHeaderClick(colIndex)}
                          onMouseEnter=${() => previewGridTarget(safeRowIdx, colIndex)}
                          onMouseLeave=${clearGridPreview}
                          onFocus=${() => previewGridTarget(safeRowIdx, colIndex)}
                          onBlur=${clearGridPreview}
                        >
                          ${formatColumnHeader(colIndex, colSet)}
                        </button>
                      `;
                    })}
                  </div>

                  ${subsets.map((rowSet, rowIndex) => {
                    const rowActive = rowIndex === safeRowIdx;
                    const rowHovered = hoveredRowIdx === rowIndex;
                    return html`
                      <div class="grid-matrix-row" key=${`row-${rowIndex}`}>
                        <button
                          class=${`rl ${rowActive ? "axis-active" : ""} ${rowHovered ? "axis-hot" : ""}`}
                          type="button"
                          aria-pressed=${rowActive}
                          aria-label=${`Select training world ${label(rowSet)}`}
                          title=${appMode === "explore" ? `Toggle train row ${label(rowSet)}` : `Use train ${label(rowSet)} as the computation anchor`}
                          onClick=${() => handleRowHeaderClick(rowIndex)}
                          onMouseEnter=${() => previewGridTarget(rowIndex, safeColIdx)}
                          onMouseLeave=${clearGridPreview}
                          onFocus=${() => previewGridTarget(rowIndex, safeColIdx)}
                          onBlur=${clearGridPreview}
                        >
                          ${formatRowHeader(rowIndex, rowSet)}
                        </button>
                        <div class="rr">
                          ${visibleColIndices.map((colIndex) => {
                            const evSet = subsets[colIndex] || [];
                            const value = matrix[rowIndex]?.[colIndex] ?? 0;
                            const normalized = normalizeValue(value, dispMin, dispMax, 0.5);
                            const id = makeCellId(rowIndex, colIndex);
                            const isAnchor = rowIndex === safeRowIdx && colIndex === safeColIdx;
                            const isSelected = selectedSet.has(id);
                            const isRequired = appMode === "compute" && requiredCellSet.has(id);
                            const isStepCell = appMode === "compute" && activeStepCellSet.has(id);
                            const previewingRow = hoveredRowIdx === rowIndex;
                            const previewingCol = hoveredColIdx === colIndex;
                            const previewingCell = previewingRow && previewingCol;
                            const classes = ["cell"];
                            if (isAnchor) classes.push("sel");
                            if (isSelected) classes.push("cell-selected-set");
                            if (isRequired) classes.push("cell-plan");
                            if (isStepCell) classes.push("cell-step");
                            if (previewingRow || previewingCol) classes.push("cell-track");
                            if (previewingCell) classes.push("cell-hot");

                            return html`
                              <button
                                key=${`cell-${rowIndex}-${colIndex}`}
                                class=${classes.join(" ")}
                                type="button"
                                data-selected=${isSelected ? "true" : "false"}
                                data-anchor-cell=${isAnchor ? "true" : "false"}
                                aria-pressed=${isSelected}
                                aria-label=${`Train ${label(rowSet)}, evaluate ${label(evSet)}, score ${value.toFixed(3)}`}
                                title=${`Train ${label(rowSet)} | Eval ${label(evSet)} | value ${value.toFixed(3)}`}
                                onClick=${() => handleCellClick(rowIndex, colIndex)}
                                onMouseEnter=${() => previewGridTarget(rowIndex, colIndex)}
                                onMouseLeave=${clearGridPreview}
                                onFocus=${() => previewGridTarget(rowIndex, colIndex)}
                                onBlur=${clearGridPreview}
                                style=${{ background: palette(normalized) }}
                              >
                                ${isAnchor ? html`<span class="marker-ring marker-ring-target"></span>` : null}
                                ${isSelected && !isAnchor ? html`<span class="marker-ring marker-ring-compare"></span>` : null}
                                ${isStepCell ? html`<span class="ring ring-thick"></span>` : isRequired ? html`<span class="ring ring-thin"></span>` : null}
                                ${showNums
                                  ? html`<span class="num" style=${{ color: normalized > 0.48 ? "#1d2f35" : "#fffaf2" }}>${value.toFixed(2)}</span>`
                                  : null}
                              </button>
                            `;
                          })}
                        </div>
                      </div>
                    `;
                  })}
                </div>
              </div>
            </div>

            ${appMode === "explore" ? exploreDock : computeDock}
          </div>
        </section>
      </div>

      <details class="toolbar-group toolbar-expand json-drawer" id="grid-inspect" data-testid="settings-json">
        <summary class="toolbar-summary">
          <div class="toolbar-summary-copy">
            <span class="toolbar-summary-label">Inspect state</span>
            <span class="toolbar-summary-title">Selection and query JSON</span>
          </div>
          <div class="toolbar-summary-actions">
            <span class="toolbar-summary-caret"></span>
          </div>
        </summary>
        <div class="toolbar-expanded">
          <pre class="json-block">${JSON.stringify(
            {
              appMode,
              queryConcept,
              metric,
              count,
              train: label(trainSet),
              eval: label(evalSet),
              focusSet,
              selectedCells: selectedCellIds,
              activePlan: activePlan
                ? {
                    id: activePlan.id,
                    status: activePlan.status,
                    value: activePlan.value,
                    requiredCells: activePlan.requiredCells,
                  }
                : null,
            },
            null,
            2,
          )}</pre>
        </div>
      </details>
    </div>
  `;
}

export default App;
