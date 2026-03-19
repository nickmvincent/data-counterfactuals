import { h } from "preact";
import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import htm from "htm";
import {
  alphabet,
  applyGridEdits,
  buildSubsetGrid,
  computeColumnSensitivity,
  computeRowRemovalStats,
  computeScalingStats,
  computeSemivalueStats,
  covertypeDomainMaxCount,
  createTutorialPresets,
  findSubsetIndex,
  getCovertypeDomains,
  labelSubset as label,
  matrixRange,
  normalizeValue,
  selectAnalysisMatrix,
} from "../lib/counterfactual-math.js";
import { scrollChildIntoContainer } from "../lib/scroll-helpers.js";

const html = htm.bind(h);

const ToolbarHelp = (summary, body, testId) => html`
  <details class="toolbar-inline-help" data-testid=${testId}>
    <summary>${summary}</summary>
    <div class="toolbar-inline-help-body">${body}</div>
  </details>
`;

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
  "Clear daylight": createPalette(["#14324a", "#2f5c7e", "#5f8fb0", "#c59d59", "#fbf4de"]),
  "Sage ledger": createPalette(["#1b2d2b", "#365b56", "#6b9387", "#bfd0c3", "#f7f2e7"]),
  "Ink and paper": createPalette(["#1d2434", "#38597d", "#7899ba", "#d1b27a", "#fff6e2"]),
};

const metricMeta = {
  jaccard: {
    short: "Jaccard",
    name: "Jaccard overlap",
    description: "normalized overlap; a rough proxy when train and eval look similar",
  },
  inter: {
    short: "|Intersection|",
    name: "Raw overlap count",
    description: "raw shared count; a rough coverage proxy that favors larger slices",
  },
  entropy: {
    short: "Entropy",
    name: "Binary entropy of overlap",
    description: "an uncertainty-style score from overlap, better for ambiguity than accuracy",
  },
  real: {
    short: "Real data",
    name: "Toy real-data accuracy",
    description: "accuracy from a tiny fixed dataset and a simple classifier",
  },
  covertype: {
    short: "Covertype",
    name: "Held-out domain accuracy",
    description: "held-out multiclass accuracy over real Covertype wilderness domains",
  },
};

const questionMeta = {
  explore: "Explore",
  loo: "Leave-one-out",
  group: "Group leave-one-out",
  shapley: "Shapley value",
  banzhaf: "Banzhaf value",
  beta: "Beta Shapley",
  scaling: "Scaling law",
  dp: "DP (toy)",
  unlearning: "Unlearning (toy)",
  poison: "Poison (toy)",
};

const conceptOrder = ["explore", "loo", "group", "shapley", "banzhaf", "beta", "scaling", "dp", "unlearning", "poison"];
const semivalueModes = new Set(["shapley", "banzhaf", "beta"]);
const multiFocusModes = new Set(["group", "poison"]);

const conceptMeta = {
  explore: {
    label: "Explore",
    description: "Read one train/eval cell directly.",
  },
  loo: {
    label: "LOO",
    description:
      "Ask the most local counterfactual first: keep evaluation fixed and remove one contributor from the selected training world.",
  },
  group: {
    label: "Group LOO",
    description:
      "Treat several contributors as one coalition and compare the selected world to the world that remains after removing them together.",
  },
  shapley: {
    label: "Shapley",
    description:
      "Average a contributor's marginal gain across all partial worlds, with Shapley's size-balanced weighting.",
  },
  banzhaf: {
    label: "Banzhaf",
    description:
      "Use the same subset-pair comparisons as Shapley, but weight every coalition equally instead of every coalition size equally.",
  },
  beta: {
    label: "Beta Shapley",
    description:
      "Stay in the semivalue family while reweighting which coalition sizes matter more with alpha/beta controls.",
  },
  scaling: {
    label: "Scaling",
    description:
      "Collapse many rows into a size-conditioned summary by averaging every training world with the same number of retained items.",
  },
  dp: {
    label: "DP",
    description:
      "Treat neighboring rows as adjacent datasets, measure their output gap, and turn that sensitivity into a toy privacy-noise budget.",
  },
  unlearning: {
    label: "Unlearning",
    description:
      "Frame deletion as a forget request: compare the current row to the exact retrain world where the requested point was never present, then inspect a toy audit threshold.",
  },
  poison: {
    label: "Poison",
    description:
      "Switch to an operator lens: apply a toy corruption rule to rows containing the chosen point or coalition, then compare the attacked score to the clean reference.",
  },
};

function useGrid(items, metric, metricOptions = {}) {
  return useMemo(() => {
    const grid = buildSubsetGrid(items, metric, metricOptions);
    return { matrix: grid.matrix, subsets: grid.subsets };
  }, [items, metric, metricOptions]);
}

function sparkPath(values, width = 260, height = 50, pad = 4) {
  const count = values.length || 1;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const scaleX = (index) => pad + (index * (width - 2 * pad)) / Math.max(1, count - 1);
  const scaleY = (value) => {
    if (max === min) return height / 2;
    const normalized = (value - min) / (max - min);
    return pad + (1 - normalized) * (height - 2 * pad);
  };

  let path = "";
  values.forEach((value, index) => {
    const x = scaleX(index);
    const y = scaleY(value);
    path += index === 0 ? `M${x},${y}` : ` L${x},${y}`;
  });
  return { d: path, min, max };
}

function formatColumnHeader(index, subset) {
  return html`
    <span class="axis-label">
      <span class="axis-index">${index}</span>
      <span class="axis-set">${label(subset)}</span>
    </span>
  `;
}

function formatRowHeader(index, subset) {
  return html`
    <span class="axis-label axis-label-row">
      <span class="axis-index">${index}</span>
      <span class="axis-set">${label(subset)}</span>
    </span>
  `;
}

function csvEscape(value) {
  const text = String(value);
  if (/[",\n]/.test(text)) return `"${text.replace(/"/g, "\"\"")}"`;
  return text;
}

function buildMatrixCsv(rowLabels, columnLabels, matrix) {
  const header = ["train/eval", ...columnLabels].map(csvEscape).join(",");
  const rows = matrix.map((row, rowIndex) =>
    [rowLabels[rowIndex], ...row.map((value) => value.toFixed(6))].map(csvEscape).join(","),
  );
  return [header, ...rows].join("\n");
}

function downloadTextFile(filename, text, mimeType) {
  const blob = new Blob([text], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

function createExportStamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function formatSigned(value, digits = 4) {
  if (!Number.isFinite(value)) return `+${(0).toFixed(digits)}`;
  return `${value >= 0 ? "+" : ""}${value.toFixed(digits)}`;
}

function clampIndex(index, total) {
  if (!total) return 0;
  if (index < 0) return 0;
  if (index >= total) return total - 1;
  return index;
}

function App() {
  const countMin = 2;
  const countMax = 8;
  const [count, setCount] = useState(4);

  const [metric, setMetric] = useState("jaccard");
  const [realDataMode, setRealDataMode] = useState("precomputed");
  const [realDataSample, setRealDataSample] = useState(0);
  const [paletteName, setPaletteName] = useState("Clear daylight");
  const palette = palettes[paletteName];
  const maxCountForMetric = metric === "covertype" ? Math.min(countMax, covertypeDomainMaxCount) : countMax;
  const base = useMemo(() => alphabet.slice(0, Math.min(count, maxCountForMetric)), [count, maxCountForMetric]);

  const [conceptMode, setConceptMode] = useState("explore");
  const [gridView, setGridView] = useState("real");
  const [focusSet, setFocusSet] = useState(["A"]);
  const [k, setK] = useState(2);
  const [showNums, setShowNums] = useState(true);
  const [showSingletonEvalCols, setShowSingletonEvalCols] = useState(false);
  const [tutorialKind, setTutorialKind] = useState(null);
  const [tutorialInfo, setTutorialInfo] = useState(null);
  const [pendingSelection, setPendingSelection] = useState(null);
  const [selectionArmed, setSelectionArmed] = useState(null);
  const [comparePoint, setComparePoint] = useState(null);
  const [poisonActive, setPoisonActive] = useState(false);
  const [betaAlpha, setBetaAlpha] = useState(2);
  const [betaBeta, setBetaBeta] = useState(2);
  const [epsilon, setEpsilon] = useState(1);
  const [auditTolerance, setAuditTolerance] = useState(0.15);
  const [presetFlash, setPresetFlash] = useState(false);
  const [computedFlash, setComputedFlash] = useState(false);
  const [switchPulse, setSwitchPulse] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [hoverTarget, setHoverTarget] = useState(null);
  const [hydrated, setHydrated] = useState(false);

  const presetFlashRef = useRef(null);
  const animRef = useRef(null);
  const gridWrapRef = useRef(null);

  const resetModeArtifacts = () => {
    setPoisonActive(false);
    setGridView("real");
    setPlaying(false);
    setSelectionArmed(null);
    setComparePoint(null);
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

  const metricOptions = useMemo(
    () => ({
      realDataMode,
      realDataSample,
    }),
    [realDataMode, realDataSample],
  );
  const { matrix: baseMatrix, subsets: subs } = useGrid(base, metric, metricOptions);
  const covertypeDomains = useMemo(
    () => (metric === "covertype" ? getCovertypeDomains(base) : []),
    [metric, base],
  );
  const [rowIdx, setRowIdx] = useState(1);
  const [colIdx, setColIdx] = useState(1);

  useEffect(() => {
    if (count > maxCountForMetric) setCount(maxCountForMetric);
  }, [count, maxCountForMetric]);

  useEffect(() => {
    setRowIdx(1);
    setColIdx(1);
    setComparePoint(null);
    setSelectionArmed(null);
  }, [base.length]);

  useEffect(() => {
    setFocusSet((previous) => {
      const filtered = previous.filter((token) => base.includes(token));
      if (filtered.length) return filtered;
      return base.length ? [base[0]] : [];
    });
  }, [base]);

  const allowsMultiFocus = multiFocusModes.has(conceptMode);
  const focusPrimary = focusSet.find((token) => base.includes(token)) || base[0] || "A";
  const groupSet = allowsMultiFocus ? focusSet.filter((token) => base.includes(token)) : [];
  const visibleColIndices = useMemo(() => {
    if (!showSingletonEvalCols) return subs.map((_, index) => index);
    const singletons = [];
    subs.forEach((subset, index) => {
      if (subset.length === 1) singletons.push(index);
    });
    return singletons.length ? singletons : subs.map((_, index) => index);
  }, [showSingletonEvalCols, subs]);

  useEffect(() => {
    if (!allowsMultiFocus && focusSet.length > 1) {
      setFocusSet((previous) => (previous.length ? [previous[0]] : base.length ? [base[0]] : []));
    }
  }, [allowsMultiFocus, focusSet.length, base]);

  const toggleFocus = (token) =>
    setFocusSet((previous) =>
      previous.includes(token) ? previous.filter((candidate) => candidate !== token) : [...previous, token].sort(),
    );

  const safeRowIdx = clampIndex(rowIdx, subs.length);
  const safeColIdx = clampIndex(colIdx, subs.length);

  useEffect(() => {
    if (rowIdx !== safeRowIdx) setRowIdx(safeRowIdx);
  }, [rowIdx, safeRowIdx]);

  useEffect(() => {
    if (colIdx !== safeColIdx) setColIdx(safeColIdx);
  }, [colIdx, safeColIdx]);

  useEffect(() => {
    if (!visibleColIndices.length) return;
    if (!visibleColIndices.includes(colIdx)) {
      setColIdx(visibleColIndices[0]);
    }
  }, [visibleColIndices, colIdx]);

  useEffect(() => {
    setHoverTarget((previous) => {
      if (!previous) return previous;
      if (previous.rowIndex >= subs.length) return null;
      if (previous.colIndex >= subs.length) return null;
      if (!visibleColIndices.includes(previous.colIndex)) return null;
      return previous;
    });
  }, [subs.length, visibleColIndices]);

  const tutorialPresets = useMemo(
    () =>
      createTutorialPresets({
        setCount,
        setMetric,
        setFocusSet,
        setK,
        setConceptMode,
        setShowNums,
        setShowSingletonEvalCols,
        setPendingSelection,
        setPoisonActive,
        setGridView,
        setBetaAlpha,
        setBetaBeta,
        setEpsilon,
        setAuditTolerance,
      }),
    [],
  );
  const visibleTutorials = tutorialPresets.filter((entry) => entry.mode === conceptMode);
  const activeTutorial = tutorialPresets.find((entry) => entry.id === tutorialKind) || null;

  const runTutorial = (id) => {
    const preset = tutorialPresets.find((entry) => entry.id === id);
    if (!preset) return;
    resetModeArtifacts();
    preset.setup();
    setTutorialKind(id);
    setTutorialInfo({ goal: preset.goal, how: preset.how, concept: preset.concept });
    if (presetFlashRef.current) clearTimeout(presetFlashRef.current);
    setPresetFlash(true);
    presetFlashRef.current = setTimeout(() => setPresetFlash(false), 900);
  };

  const chooseConcept = (mode) => {
    setConceptMode(mode);
    setTutorialKind(null);
    setTutorialInfo(null);
  };

  const findIdx = (subset) => findSubsetIndex(subs, subset);

  const editedMatrix = useMemo(
    () =>
      applyGridEdits(baseMatrix, subs, {
        focusSet: groupSet.length ? groupSet : focusSet,
        poisonActive: conceptMode === "poison" ? poisonActive : false,
        noiseLevel: 0,
      }),
    [baseMatrix, subs, groupSet, focusSet, conceptMode, poisonActive],
  );

  const operatorRange = useMemo(() => matrixRange(editedMatrix), [editedMatrix]);
  const baseRange = useMemo(() => matrixRange(baseMatrix), [baseMatrix]);
  const effectiveGridView = conceptMode === "poison" ? gridView : "real";
  const analysisMatrix = selectAnalysisMatrix({ baseMatrix, editedMatrix, gridView: effectiveGridView });
  const displayMatrix = analysisMatrix;
  const { min: dispMin, max: dispMax } = effectiveGridView === "real" ? baseRange : operatorRange;
  const Srow = subs[safeRowIdx] || [];
  const evalSet = subs[safeColIdx] || [];
  const hasGroup = conceptMode === "group" && groupSet.length > 0;
  const selectedValue = displayMatrix[safeRowIdx]?.[safeColIdx] ?? 0;
  const cleanSelectedValue = baseMatrix[safeRowIdx]?.[safeColIdx] ?? 0;
  const operatorSelectedValue = editedMatrix[safeRowIdx]?.[safeColIdx] ?? cleanSelectedValue;
  const attackDelta = operatorSelectedValue - cleanSelectedValue;

  const looStats = useMemo(
    () =>
      computeRowRemovalStats({
        matrix: baseMatrix,
        subsets: subs,
        rowIndex: safeRowIdx,
        colIndex: safeColIdx,
        tokensToRemove: focusPrimary ? [focusPrimary] : [],
      }),
    [baseMatrix, subs, safeRowIdx, safeColIdx, focusPrimary],
  );
  const groupStats = useMemo(
    () =>
      hasGroup
        ? computeRowRemovalStats({
            matrix: baseMatrix,
            subsets: subs,
            rowIndex: safeRowIdx,
            colIndex: safeColIdx,
            tokensToRemove: groupSet,
          })
        : {
            compareSet: [],
            compareRowIndex: -1,
            compareValue: cleanSelectedValue,
            delta: 0,
            removedTokens: [],
          },
    [baseMatrix, subs, safeRowIdx, safeColIdx, hasGroup, groupSet, cleanSelectedValue],
  );
  const strikeMinus = groupStats.compareSet;
  const strikeMinusIdx = groupStats.compareRowIndex;
  const looMinus = looStats.compareSet;
  const looMinusIdx = looStats.compareRowIndex;
  const compareValueForLoo = looStats.compareValue;
  const compareValueForGroup = groupStats.compareValue;

  useEffect(() => {
    setRowIdx((previous) => {
      if (!subs.length) return 0;
      if (previous < 0) return 0;
      if (previous >= subs.length) return subs.length - 1;
      return previous;
    });
    setColIdx((previous) => {
      if (!subs.length) return 0;
      if (previous < 0) return 0;
      if (previous >= subs.length) return subs.length - 1;
      return previous;
    });
  }, [subs.length]);

  useEffect(() => {
    if (!pendingSelection) return;
    const { row, col } = pendingSelection;
    if (row) {
      const index = findIdx(row);
      if (index >= 0) setRowIdx(index);
    }
    if (col) {
      const index = findIdx(col);
      if (index >= 0) setColIdx(index);
    }
    setPendingSelection(null);
  }, [pendingSelection, subs]);

  useEffect(() => {
    setComparePoint((previous) => {
      if (!previous) return previous;
      if (previous.rowIndex >= subs.length || previous.colIndex >= subs.length) return null;
      return previous;
    });
  }, [subs.length]);

  useEffect(() => {
    setComparePoint((previous) => {
      if (!previous) return previous;
      if (!visibleColIndices.includes(previous.colIndex)) return null;
      return previous;
    });
  }, [visibleColIndices]);

  useEffect(() => {
    setComputedFlash(true);
    setSwitchPulse(true);
    const flashTimer = setTimeout(() => setComputedFlash(false), 850);
    const pulseTimer = setTimeout(() => setSwitchPulse(false), 650);
    return () => {
      clearTimeout(flashTimer);
      clearTimeout(pulseTimer);
    };
  }, [conceptMode, safeColIdx, safeRowIdx]);

  useEffect(() => () => {
    if (presetFlashRef.current) clearTimeout(presetFlashRef.current);
  }, []);

  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (conceptMode !== "poison") {
      setPoisonActive(false);
      setGridView("real");
    }
    if (conceptMode !== "scaling") setPlaying(false);
  }, [conceptMode]);

  const semivalueStats = useMemo(
    () =>
      computeSemivalueStats({
        matrix: baseMatrix,
        subsets: subs,
        focusItem: focusPrimary,
        evalColumnIndex: safeColIdx,
        playerCount: base.length,
        mode: conceptMode === "banzhaf" ? "banzhaf" : conceptMode === "beta" ? "beta" : "shapley",
        alpha: betaAlpha,
        beta: betaBeta,
      }),
    [baseMatrix, subs, focusPrimary, safeColIdx, base.length, conceptMode, betaAlpha, betaBeta],
  );

  const looDelta = useMemo(
    () =>
      conceptMode === "group" ? groupStats.delta : looStats.delta,
    [conceptMode, groupStats.delta, looStats.delta],
  );

  const scalingAll = useMemo(
    () =>
      computeScalingStats({
        matrix: baseMatrix,
        subsets: subs,
        maxSize: base.length,
        evalColumnIndex: safeColIdx,
      }),
    [baseMatrix, subs, base.length, safeColIdx],
  );
  const scalingBucket = scalingAll.find((entry) => entry.k === k) || { avg: 0, n: 0 };
  const spark = useMemo(() => sparkPath(scalingAll.map((entry) => entry.avg), 260, 50, 4), [scalingAll]);

  const unlearningGap = Math.abs(cleanSelectedValue - compareValueForLoo);
  const unlearningPass = unlearningGap <= auditTolerance;
  const dpLocalGap = Math.abs(cleanSelectedValue - compareValueForLoo);
  const dpColumnSensitivity = computeColumnSensitivity({
    matrix: baseMatrix,
    rowIndex: safeRowIdx,
    compareRowIndex: looMinusIdx,
  });
  const dpRecommendedScale = epsilon > 0 ? dpColumnSensitivity / epsilon : 0;

  const attackTokens = groupSet.length ? groupSet : focusPrimary ? [focusPrimary] : [];
  const poisonRows = useMemo(() => {
    const out = new Set();
    if (conceptMode !== "poison" || !poisonActive) return out;
    subs.forEach((subset, index) => {
      if (attackTokens.some((token) => subset.includes(token))) out.add(index);
    });
    return out;
  }, [conceptMode, poisonActive, subs, attackTokens]);

  useEffect(() => {
    if (!playing || conceptMode !== "scaling") return undefined;
    let direction = 1;
    function tick() {
      setK((previous) => {
        let next = previous + direction;
        if (next >= base.length || next <= 0) direction *= -1;
        next = Math.max(0, Math.min(base.length, next));
        return next;
      });
      animRef.current = setTimeout(tick, 600);
    }
    tick();
    return () => {
      if (animRef.current) clearTimeout(animRef.current);
    };
  }, [playing, conceptMode, base.length]);

  const semivalueThinRows = useMemo(
    () => new Set(semivalueStats.pairs.map((pair) => pair.subsetIndex)),
    [semivalueStats.pairs],
  );
  const semivalueThickRows = useMemo(
    () => new Set(semivalueStats.pairs.map((pair) => pair.withFocusIndex)),
    [semivalueStats.pairs],
  );

  const activeEditLabels = [];
  if (poisonActive) {
    activeEditLabels.push(`poisoning every row that contains ${groupSet.length ? label(groupSet) : focusPrimary}`);
  }
  const worldLayerSummary =
    gridView === "operator"
      ? activeEditLabels.length
        ? `Operator view is active, so the grid is drawn after ${activeEditLabels.join(" and ")}.`
        : "Operator view is active, but no attack toggles are on yet."
      : activeEditLabels.length
        ? "Reference view is active, so you are seeing the untouched matrix even though the attack toggle is on."
        : "No attack layer is active, so Operator and Reference currently match.";

  const focusTargetCopy =
    conceptMode === "group"
      ? groupSet.length
        ? `The current question treats ${label(groupSet)} as one coalition. Changing these tokens changes who gets removed together; it does not move the selected train row ${label(Srow)}.`
        : `Pick two or more tokens to ask what happens when that coalition leaves train ${label(Srow)} together. This control changes the question, not the selected row.`
      : conceptMode === "poison"
        ? `The current attack targets rows containing ${groupSet.length ? label(groupSet) : focusPrimary}. Changing these chips changes which rows get corrupted; it does not move the selected row ${label(Srow)}.`
        : `The current question is about ${focusPrimary}. Clicking another token changes who is being removed, added, or valued, while the selected train row stays ${label(Srow)} until you change it on the grid.`;

  const scoreProxyCopy =
    metric === "real"
      ? realDataMode === "precomputed"
        ? `Each cell comes from a cached precomputed matrix over a tiny fixed toy dataset: train a simple classifier on ${label(Srow)} and score it on ${label(evalSet)}. It feels more like real data, but it is still a toy benchmark rather than a real experiment.`
        : `Each cell is recomputed live from a lightly resampled toy dataset: train a simple classifier on ${label(Srow)} and score it on ${label(evalSet)}. Use resample to perturb the tiny dataset and watch the grid move slightly.`
      : metric === "covertype"
        ? `Each cell comes from a cached Covertype domain experiment. The letters now map to real wilderness-area cohorts shown below, and the score reads as "train a multiclass classifier on the row domains, then evaluate it on held-out examples from the column domains."`
      : `Each cell is a toy proxy for "retrain on ${label(Srow)} and evaluate on ${label(evalSet)}." ${metricMeta[metric].short} summarizes how much the train and eval sets structurally line up, which can loosely track performance when overlap helps. It still ignores labels, features, model choice, and optimization, so treat it as a heuristic rather than true accuracy.`;

  let questionSummary;
  let formulaLine;
  let lensGuide;
  let stageReadouts;

  if (conceptMode === "explore") {
    questionSummary = {
      title: "Read one train/eval cell",
      question: `What does it mean to train on ${label(Srow)} and evaluate on ${label(evalSet)}?`,
      answerLabel: "Cell score",
      answerValue: selectedValue.toFixed(4),
      trace: `Read this directly as f(${label(Srow)}, ${label(evalSet)}). The row chooses the training world; the column chooses the evaluation slice.`,
    };
    formulaLine = `f(${label(Srow)}, ${label(evalSet)}) = ${selectedValue.toFixed(4)}`;
    lensGuide = {
      title: "Stay local first",
      body:
        "Explore mode is the anchor for the whole interface. Before averaging, deleting, or attacking anything, it asks you to read one world pair directly.",
    };
    stageReadouts = [
      {
        key: "selected",
        label: "Cell score",
        value: selectedValue.toFixed(3),
        note: `f(${label(Srow)}, ${label(evalSet)})`,
        tone: "primary",
      },
      {
        key: "train",
        label: "Train world",
        value: label(Srow),
        note: "The selected row determines which world the toy model trains on.",
        tone: "accent",
      },
      {
        key: "eval",
        label: "Eval slice",
        value: label(evalSet),
        note: "The selected column determines which slice gets evaluated.",
        tone: "quiet",
      },
    ];
  } else if (conceptMode === "loo") {
    questionSummary = {
      title: "Remove one point from the selected training world",
      question: `If ${focusPrimary} disappeared from train ${label(Srow)} while eval ${label(evalSet)} stays fixed, how much would the score move?`,
      answerLabel: "LOO delta",
      answerValue: looDelta.toFixed(4),
      trace: Srow.includes(focusPrimary)
        ? `We compare the selected row ${label(Srow)} against ${label(looMinus)} at eval ${label(evalSet)}.`
        : `${focusPrimary} is not in ${label(Srow)}, so removing it leaves the selected row unchanged here.`,
    };
    formulaLine = `LOO delta = f(${label(Srow)}, ${label(evalSet)}) - f(${label(looMinus)}, ${label(evalSet)}) = ${cleanSelectedValue.toFixed(4)} - ${compareValueForLoo.toFixed(4)} = ${looDelta.toFixed(4)}`;
    lensGuide = {
      title: "Nearest-neighbor comparison",
      body:
        "Leave-one-out is the most local move in the grid. You keep the evaluation slice fixed and step from the selected training row to the nearby row with one member removed.",
    };
    stageReadouts = [
      {
        key: "selected",
        label: "Target cell",
        value: cleanSelectedValue.toFixed(3),
        note: `f(${label(Srow)}, ${label(evalSet)})`,
        tone: "primary",
      },
      {
        key: "answer",
        label: "LOO delta",
        value: looDelta.toFixed(4),
        note: questionSummary.trace,
        tone: "accent",
      },
      {
        key: "compare",
        label: `Without ${focusPrimary}`,
        value: compareValueForLoo.toFixed(3),
        note: looMinusIdx >= 0 ? `f(${label(looMinus)}, ${label(evalSet)})` : "The comparison row matches the selected row here.",
        tone: "quiet",
      },
    ];
  } else if (conceptMode === "group") {
    questionSummary = {
      title: "Remove a group together",
      question: groupSet.length
        ? `If group ${label(groupSet)} walked out of train ${label(Srow)} while eval ${label(evalSet)} stays fixed, what would happen?`
        : "Pick multiple focus chips to turn this into a group-removal question.",
      answerLabel: "Group delta",
      answerValue: looDelta.toFixed(4),
      trace: groupSet.length
        ? groupSet.some((token) => Srow.includes(token))
          ? `We compare ${label(Srow)} against ${label(strikeMinus)} after removing the chosen group.`
          : `None of ${label(groupSet)} are present in ${label(Srow)}, so the selected coalition cannot change this row.`
        : "Group mode is most useful once you choose a multi-point group above the grid.",
    };
    formulaLine = `Group delta = f(${label(Srow)}, ${label(evalSet)}) - f(${label(groupSet.length ? strikeMinus : [])}, ${label(evalSet)}) = ${cleanSelectedValue.toFixed(4)} - ${compareValueForGroup.toFixed(4)} = ${looDelta.toFixed(4)}`;
    lensGuide = {
      title: "Coordinated removal",
      body:
        "Group leave-one-out asks whether several contributors matter together. The grid shows the selected world next to the world that remains after removing the chosen group as a block.",
    };
    stageReadouts = [
      {
        key: "selected",
        label: "Target cell",
        value: cleanSelectedValue.toFixed(3),
        note: `f(${label(Srow)}, ${label(evalSet)})`,
        tone: "primary",
      },
      {
        key: "answer",
        label: "Group delta",
        value: looDelta.toFixed(4),
        note: questionSummary.trace,
        tone: "accent",
      },
      {
        key: "compare",
        label: groupSet.length ? `Without ${label(groupSet)}` : "Comparison row",
        value: compareValueForGroup.toFixed(3),
        note:
          strikeMinusIdx >= 0 ? `f(${label(strikeMinus)}, ${label(evalSet)})` : "Choose at least two focus chips to create a coalition comparison.",
        tone: "quiet",
      },
    ];
  } else if (semivalueModes.has(conceptMode)) {
    const answerLabel =
      conceptMode === "shapley" ? "Shapley phi" : conceptMode === "banzhaf" ? "Banzhaf value" : "Beta phi";
    questionSummary = {
      title: `${questionMeta[conceptMode]} on one contributor`,
      question:
        conceptMode === "shapley"
          ? `Across every partial training world and fixed eval ${label(evalSet)}, how much does adding ${focusPrimary} help on average?`
          : conceptMode === "banzhaf"
            ? `Across every partial training world and fixed eval ${label(evalSet)}, what is ${focusPrimary}'s average marginal contribution when every coalition gets equal weight?`
            : `Across every partial training world and fixed eval ${label(evalSet)}, what is ${focusPrimary}'s marginal contribution when coalition sizes are reweighted by alpha=${betaAlpha} and beta=${betaBeta}?`,
      answerLabel,
      answerValue: semivalueStats.phi.toFixed(4),
      trace: `${semivalueStats.cnt} row-pairs contribute to this estimate. The rings show the exact before-and-after comparisons.`,
    };
    formulaLine =
      conceptMode === "shapley"
        ? `Shapley phi(${focusPrimary}) averages the marginal change from adding ${focusPrimary} across ${semivalueStats.cnt} paired rows on eval ${label(evalSet)}.`
        : conceptMode === "banzhaf"
          ? `Banzhaf(${focusPrimary}) averages the same paired deltas, but every coalition gets equal weight instead of each coalition size sharing weight equally.`
          : `Beta Shapley(${focusPrimary}; alpha=${betaAlpha}, beta=${betaBeta}) keeps the same paired deltas but redistributes weight across coalition sizes.`;
    lensGuide = {
      title:
        conceptMode === "shapley"
          ? "Average many local moves"
          : conceptMode === "banzhaf"
            ? "Equal weight on coalitions"
            : "Reweight coalition sizes",
      body:
        conceptMode === "shapley"
          ? "Shapley does not trust any single row pair. Instead it walks through every partial world on the active evaluation slice and averages the marginal contribution of the focus point."
          : conceptMode === "banzhaf"
            ? "Banzhaf stays in the same subset-pair universe as Shapley, but it treats each coalition equally rather than balancing the contribution of each coalition size."
            : "Beta Shapley stays in the semivalue family while letting you emphasize smaller or larger coalitions through the alpha and beta controls.",
    };
    stageReadouts = [
      {
        key: "selected",
        label: "Anchor cell",
        value: cleanSelectedValue.toFixed(3),
        note: `f(${label(Srow)}, ${label(evalSet)})`,
        tone: "primary",
      },
      {
        key: "answer",
        label: answerLabel,
        value: semivalueStats.phi.toFixed(4),
        note: questionSummary.trace,
        tone: "accent",
      },
      {
        key: "pairs",
        label: "Pair count",
        value: `${semivalueStats.cnt}`,
        note: `Matched partial worlds with and without ${focusPrimary}.`,
        tone: "quiet",
      },
      ...(conceptMode === "beta"
        ? [
            {
              key: "params",
              label: "Alpha / Beta",
              value: `${betaAlpha} / ${betaBeta}`,
              note: "These parameters decide which coalition sizes receive more weight.",
              tone: "quiet",
            },
          ]
        : []),
    ];
  } else if (conceptMode === "scaling") {
    questionSummary = {
      title: "Average across all training worlds of one size",
      question: `Holding eval ${label(evalSet)} fixed, what is the average score over every training world with ${k} item${k === 1 ? "" : "s"}?`,
      answerLabel: `Avg at k=${k}`,
      answerValue: scalingBucket.avg.toFixed(4),
      trace: `${scalingBucket.n} training worlds contribute to this bucket. The selected row still controls the highlighted cell, but not the headline average.`,
    };
    formulaLine = `Scaling average at k = ${k} means averaging f(S, ${label(evalSet)}) over every row whose size is ${k}.`;
    lensGuide = {
      title: "Collapse many rows into one curve",
      body:
        "Scaling turns the grid into a summary over row sizes. The selected cell still anchors your attention, but the headline number now comes from every row with the chosen size.",
    };
    stageReadouts = [
      {
        key: "selected",
        label: "Anchor cell",
        value: cleanSelectedValue.toFixed(3),
        note: `f(${label(Srow)}, ${label(evalSet)})`,
        tone: "primary",
      },
      {
        key: "answer",
        label: `Avg at k=${k}`,
        value: scalingBucket.avg.toFixed(4),
        note: questionSummary.trace,
        tone: "accent",
      },
      {
        key: "rows",
        label: "Rows in bucket",
        value: `${scalingBucket.n}`,
        note: `All rows with |S| = ${k} contribute to the scaling average.`,
        tone: "quiet",
      },
    ];
  } else if (conceptMode === "dp") {
    questionSummary = {
      title: "Bound one-row influence",
      question: `If ${focusPrimary} changes membership in train ${label(Srow)}, how much can the output move, and what Laplace scale would that imply at epsilon = ${epsilon.toFixed(1)}?`,
      answerLabel: "Suggested scale",
      answerValue: dpRecommendedScale.toFixed(4),
      trace: `Adjacent rows ${label(Srow)} and ${label(looMinus)} differ by ${dpLocalGap.toFixed(4)} on the selected cell and by at most ${dpColumnSensitivity.toFixed(4)} across this row pair.`,
    };
    formulaLine = `Sensitivity = max_E |f(${label(Srow)}, E) - f(${label(looMinus)}, E)| = ${dpColumnSensitivity.toFixed(4)}; Laplace scale b = sensitivity / epsilon = ${dpRecommendedScale.toFixed(4)}.`;
    lensGuide = {
      title: "Adjacent-row privacy lens",
      body:
        "Differential privacy mode treats the selected row and its leave-one-out neighbor as adjacent datasets. It then turns that observed row-pair sensitivity into a toy noise recommendation.",
    };
    stageReadouts = [
      {
        key: "local",
        label: "Current cell gap",
        value: dpLocalGap.toFixed(4),
        note: `|f(${label(Srow)}, ${label(evalSet)}) - f(${label(looMinus)}, ${label(evalSet)})|`,
        tone: "primary",
      },
      {
        key: "sens",
        label: "Row sensitivity",
        value: dpColumnSensitivity.toFixed(4),
        note: "Maximum gap across all evaluation slices for this adjacent row pair.",
        tone: "accent",
      },
      {
        key: "eps",
        label: "Epsilon",
        value: epsilon.toFixed(1),
        note: "Smaller epsilon demands a larger noise scale.",
        tone: "quiet",
      },
      {
        key: "scale",
        label: "Suggested scale",
        value: dpRecommendedScale.toFixed(4),
        note: "Toy Laplace scale for the observed row-pair sensitivity.",
        tone: "quiet",
      },
    ];
  } else if (conceptMode === "unlearning") {
    questionSummary = {
      title: "Delete and compare to exact retraining",
      question: `If ${focusPrimary} must be forgotten from train ${label(Srow)}, how far is the current cell from the exact retrain reference on ${label(looMinus)}?`,
      answerLabel: "Audit gap",
      answerValue: unlearningGap.toFixed(4),
      trace: `Exact retrain reference is ${label(looMinus)}. With tolerance ${auditTolerance.toFixed(2)}, this request ${unlearningPass ? "passes" : "fails"} the toy audit.`,
    };
    formulaLine = `Audit gap = |f(${label(Srow)}, ${label(evalSet)}) - f(${label(looMinus)}, ${label(evalSet)})| = |${cleanSelectedValue.toFixed(4)} - ${compareValueForLoo.toFixed(4)}| = ${unlearningGap.toFixed(4)}.`;
    lensGuide = {
      title: "Exact retrain reference",
      body:
        "Unlearning mode treats the leave-one-out world as the gold-standard retrain baseline. The point is not just to ask how much the score drops, but how close the current state is to the forget reference.",
    };
    stageReadouts = [
      {
        key: "current",
        label: "Current score",
        value: cleanSelectedValue.toFixed(3),
        note: `f(${label(Srow)}, ${label(evalSet)})`,
        tone: "primary",
      },
      {
        key: "reference",
        label: "Retrain reference",
        value: compareValueForLoo.toFixed(3),
        note: `f(${label(looMinus)}, ${label(evalSet)})`,
        tone: "accent",
      },
      {
        key: "gap",
        label: "Audit gap",
        value: unlearningGap.toFixed(4),
        note: `Exact gap against the forget reference with tolerance ${auditTolerance.toFixed(2)}.`,
        tone: "quiet",
      },
      {
        key: "status",
        label: "Toy audit",
        value: unlearningPass ? "Pass" : "Fail",
        note: "This is a visualization aid, not a certified unlearning guarantee.",
        tone: "quiet",
      },
    ];
  } else {
    const poisonTargetLabel = groupSet.length ? label(groupSet) : focusPrimary;
    questionSummary = {
      title: "Corrupt one point or coalition",
      question: `If rows containing ${poisonTargetLabel} are corrupted, how does the selected score move?`,
      answerLabel: "Attack delta",
      answerValue: attackDelta.toFixed(4),
      trace: poisonActive
        ? poisonRows.has(safeRowIdx)
          ? `Row ${label(Srow)} is currently attacked because it contains ${poisonTargetLabel}.`
          : `Row ${label(Srow)} is currently unaffected because it does not contain ${poisonTargetLabel}.`
        : "Turn the attack on to compare the clean reference score to the corrupted version.",
    };
    formulaLine = `Attack delta = f_attack(${label(Srow)}, ${label(evalSet)}) - f_clean(${label(Srow)}, ${label(evalSet)}) = ${operatorSelectedValue.toFixed(4)} - ${cleanSelectedValue.toFixed(4)} = ${attackDelta.toFixed(4)}.`;
    lensGuide = {
      title: "Operator vs reference worlds",
      body:
        "Poison mode adds an operator layer. Instead of moving to a neighboring row, you compare the clean score to the score after applying a toy corruption rule to every affected training world.",
    };
    stageReadouts = [
      {
        key: "clean",
        label: "Clean score",
        value: cleanSelectedValue.toFixed(3),
        note: `f_clean(${label(Srow)}, ${label(evalSet)})`,
        tone: "primary",
      },
      {
        key: "attack",
        label: "Attacked score",
        value: operatorSelectedValue.toFixed(3),
        note: `f_attack(${label(Srow)}, ${label(evalSet)})`,
        tone: "accent",
      },
      {
        key: "delta",
        label: "Attack delta",
        value: attackDelta.toFixed(4),
        note: questionSummary.trace,
        tone: "quiet",
      },
      {
        key: "rows",
        label: "Affected rows",
        value: `${poisonRows.size}`,
        note: "Rows containing the chosen point or coalition receive the toy corruption penalty.",
        tone: "quiet",
      },
    ];
  }

  const focusLabel =
    conceptMode === "group"
      ? groupSet.length
        ? label(groupSet)
        : "pick a group"
      : conceptMode === "poison" && groupSet.length
        ? label(groupSet)
        : focusPrimary;
  const currentTakeaway = (() => {
    if (conceptMode === "explore") {
      return `Train ${label(Srow)} on eval ${label(evalSet)} lands at ${selectedValue.toFixed(3)} on the current toy score.`;
    }
    if (conceptMode === "loo") {
      if (!Srow.includes(focusPrimary)) {
        return `${focusPrimary} is absent from ${label(Srow)}, so removing it changes nothing for this selected row/eval pair.`;
      }
      return `On this row and eval slice, removing ${focusPrimary} changes the score by ${formatSigned(looDelta)}.`;
    }
    if (conceptMode === "group") {
      if (!groupSet.length) {
        return "Pick a coalition first so the explorer can compare the selected row to the row with that group removed.";
      }
      if (!groupSet.some((token) => Srow.includes(token))) {
        return `${label(groupSet)} are not present in ${label(Srow)}, so the group-removal delta is zero here.`;
      }
      return `Removing ${label(groupSet)} together changes the selected score by ${formatSigned(looDelta)} on eval ${label(evalSet)}.`;
    }
    if (semivalueModes.has(conceptMode)) {
      return `${questionSummary.answerLabel} for ${focusPrimary} is ${questionSummary.answerValue} on eval ${label(evalSet)}, averaged across ${semivalueStats.cnt} partial-world comparisons.`;
    }
    if (conceptMode === "scaling") {
      return `Across every train world of size ${k}, the average score on eval ${label(evalSet)} is ${scalingBucket.avg.toFixed(4)}.`;
    }
    if (conceptMode === "dp") {
      return `This adjacent-row comparison suggests sensitivity ${dpColumnSensitivity.toFixed(4)} and a toy Laplace scale ${dpRecommendedScale.toFixed(4)} at epsilon ${epsilon.toFixed(1)}.`;
    }
    if (conceptMode === "unlearning") {
      return `The current row ${unlearningPass ? "stays within" : "exceeds"} the toy forget tolerance by an audit gap of ${unlearningGap.toFixed(4)}.`;
    }
    return poisonActive
      ? `With the attack active, the selected score moves by ${formatSigned(attackDelta)} relative to the clean reference.`
      : "Turn the attack on to compare the selected cell against its corrupted counterpart.";
  })();
  const compareChooserDisabled = !["explore", "loo", "group", "dp", "unlearning"].includes(conceptMode);
  const visibleComparePoint = compareChooserDisabled ? null : comparePoint;
  const comparePointLabel = visibleComparePoint
    ? `Train ${label(subs[visibleComparePoint.rowIndex] || [])} / Eval ${label(subs[visibleComparePoint.colIndex] || [])}`
    : "No comparison point chosen yet.";
  const comparePointValue = visibleComparePoint
    ? (displayMatrix[visibleComparePoint.rowIndex]?.[visibleComparePoint.colIndex] ?? 0)
    : null;
  const comparePointDelta = visibleComparePoint && comparePointValue !== null ? comparePointValue - selectedValue : null;
  const canonicalComparePoint =
    conceptMode === "loo" || conceptMode === "dp" || conceptMode === "unlearning"
      ? looMinusIdx >= 0 && looMinusIdx !== safeRowIdx
        ? { rowIndex: looMinusIdx, colIndex: safeColIdx }
        : null
      : conceptMode === "group"
        ? strikeMinusIdx >= 0 && strikeMinusIdx !== safeRowIdx
          ? { rowIndex: strikeMinusIdx, colIndex: safeColIdx }
          : null
        : null;
  const canonicalCompareLabel = canonicalComparePoint
    ? `Train ${label(subs[canonicalComparePoint.rowIndex] || [])} / Eval ${label(subs[canonicalComparePoint.colIndex] || [])}`
    : null;
  const comparePointMatchesCanonical = Boolean(
    visibleComparePoint &&
      canonicalComparePoint &&
      visibleComparePoint.rowIndex === canonicalComparePoint.rowIndex &&
      visibleComparePoint.colIndex === canonicalComparePoint.colIndex,
  );
  const comparePointKeepsEvalFixed = Boolean(
    visibleComparePoint &&
      canonicalComparePoint &&
      visibleComparePoint.colIndex === canonicalComparePoint.colIndex,
  );
  const jumpTrainOptions = useMemo(
    () => subs.map((subset, index) => ({ index, label: label(subset) })),
    [subs],
  );
  const jumpEvalOptions = useMemo(
    () => visibleColIndices.map((colIndex) => ({ index: colIndex, label: label(subs[colIndex] || []) })),
    [visibleColIndices, subs],
  );

  useEffect(() => {
    if (compareChooserDisabled && selectionArmed === "compare") {
      setSelectionArmed(null);
    }
  }, [compareChooserDisabled, selectionArmed]);

  const compareMarkerGuide = useMemo(() => {
    if (conceptMode === "explore") {
      return {
        summary: "Meaningful here: yes. In Explore mode a comparison marker is a true second cell for side-by-side reading.",
        rule: "Any second cell makes sense because you are contrasting two train/eval world pairs directly.",
        prompt: "Click any second cell to mark a manual comparison.",
        selectedNote: visibleComparePoint && comparePointValue !== null && comparePointDelta !== null
          ? `${comparePointLabel} scores ${comparePointValue.toFixed(4)}, which is ${formatSigned(comparePointDelta)} relative to the selected cell.`
          : "No comparison cell marked yet.",
        canUseCanonical: false,
      };
    }

    if (conceptMode === "loo") {
      return {
        summary: "Meaningful here: yes. Leave-one-out already has a built-in comparison neighbor, but a manual comparison marker can still help you inspect nearby alternatives.",
        rule: canonicalCompareLabel
          ? `Most meaningful cells keep eval ${label(evalSet)} fixed. The canonical leave-one-out cell is ${canonicalCompareLabel}.`
          : `${focusPrimary} is not in ${label(Srow)}, so there is no distinct leave-one-out comparison cell right now.`,
        prompt: canonicalCompareLabel
          ? `Click a cell to mark a manual comparison, or jump straight to ${canonicalCompareLabel}.`
          : "Click a cell to mark a manual comparison.",
        selectedNote: visibleComparePoint
          ? comparePointMatchesCanonical
            ? "Your marked cell matches the built-in leave-one-out comparison exactly."
            : comparePointKeepsEvalFixed
              ? "Your marked cell keeps the eval slice fixed, so it is still a sensible row comparison, but it is not the exact leave-one-out neighbor."
              : "Your marked cell changes the eval slice, so it will not match the built-in leave-one-out statistic."
          : "No comparison cell marked yet.",
        canUseCanonical: Boolean(canonicalComparePoint),
      };
    }

    if (conceptMode === "group") {
      return {
        summary: "Meaningful here: yes. Group leave-one-out also has one canonical comparison row, with the chosen coalition removed as a block.",
        rule: canonicalCompareLabel
          ? `Most meaningful cells keep eval ${label(evalSet)} fixed. The canonical group-removal cell is ${canonicalCompareLabel}.`
          : groupSet.length
            ? `None of ${label(groupSet)} are present in ${label(Srow)}, so there is no distinct group-removal comparison cell right now.`
            : "Choose a coalition first to create a canonical comparison cell.",
        prompt: canonicalCompareLabel
          ? `Click a cell to mark a manual comparison, or jump straight to ${canonicalCompareLabel}.`
          : "Click a cell to mark a manual comparison.",
        selectedNote: visibleComparePoint
          ? comparePointMatchesCanonical
            ? "Your marked cell matches the built-in group-removal comparison exactly."
            : comparePointKeepsEvalFixed
              ? "Your marked cell keeps the eval slice fixed, so it is still a sensible row comparison, but it is not the exact coalition-removal cell."
              : "Your marked cell changes the eval slice, so it will not match the built-in group-removal statistic."
          : "No comparison cell marked yet.",
        canUseCanonical: Boolean(canonicalComparePoint),
      };
    }

    if (conceptMode === "dp") {
      return {
        summary: "Meaningful here: yes. DP mode still starts from one adjacent-row comparison, then turns that row pair into a sensitivity story.",
        rule: canonicalCompareLabel
          ? `Most meaningful cells keep eval ${label(evalSet)} fixed. The adjacent-row anchor cell is ${canonicalCompareLabel}.`
          : `${focusPrimary} is not in ${label(Srow)}, so there is no distinct adjacent-row comparison cell right now.`,
        prompt: canonicalCompareLabel
          ? `Click a cell to mark a manual comparison, or jump straight to ${canonicalCompareLabel}.`
          : "Click a cell to mark a manual comparison.",
        selectedNote: visibleComparePoint
          ? comparePointMatchesCanonical
            ? "Your marked cell matches the current adjacent-row anchor exactly."
            : comparePointKeepsEvalFixed
              ? "Your marked cell keeps the eval slice fixed, so it is still a sensible privacy-side comparison, but it is not the exact adjacent-row anchor."
              : "Your marked cell changes the eval slice, so it will not match the cell-level adjacent-row anchor used in the DP readout."
          : "No comparison cell marked yet.",
        canUseCanonical: Boolean(canonicalComparePoint),
      };
    }

    if (conceptMode === "unlearning") {
      return {
        summary: "Meaningful here: yes. Unlearning compares the current row to the exact retrain world without the forget point.",
        rule: canonicalCompareLabel
          ? `Most meaningful cells keep eval ${label(evalSet)} fixed. The exact retrain reference cell is ${canonicalCompareLabel}.`
          : `${focusPrimary} is not in ${label(Srow)}, so there is no distinct exact-retrain comparison cell right now.`,
        prompt: canonicalCompareLabel
          ? `Click a cell to mark a manual comparison, or jump straight to ${canonicalCompareLabel}.`
          : "Click a cell to mark a manual comparison.",
        selectedNote: visibleComparePoint
          ? comparePointMatchesCanonical
            ? "Your marked cell matches the exact retrain reference used by the current unlearning readout."
            : comparePointKeepsEvalFixed
              ? "Your marked cell keeps the eval slice fixed, so it is still a sensible row comparison, but it is not the exact retrain reference."
              : "Your marked cell changes the eval slice, so it will not match the exact retrain reference used by the current unlearning readout."
          : "No comparison cell marked yet.",
        canUseCanonical: Boolean(canonicalComparePoint),
      };
    }

    if (semivalueModes.has(conceptMode)) {
      return {
        summary: "Meaningful here: not as a primary control. This mode averages many highlighted row pairs, so one extra marked cell does not drive the answer.",
        rule: "Use the highlighted rows and the inspector table to understand the real comparison set here.",
        prompt: `${questionMeta[conceptMode]} does not use a single comparison cell.`,
        selectedNote: `${questionMeta[conceptMode]} uses the whole active evaluation column.`,
        canUseCanonical: false,
      };
    }

    if (conceptMode === "scaling") {
      return {
        summary: "Meaningful here: not as a primary control. Scaling averages a whole layer of rows at once.",
        rule: "A single comparison cell is secondary to the highlighted bucket and the current scaling curve.",
        prompt: "Scaling mode does not use a single comparison cell.",
        selectedNote: `Scaling reads every row with |S| = ${k} on the active evaluation slice.`,
        canUseCanonical: false,
      };
    }

    return {
      summary: "Meaningful here: not much. Poison mode already compares the clean and attacked versions of the selected cell for you.",
      rule: "If you want a freeform second cell, switch to Explore or one of the local row-comparison modes.",
      prompt: "Poison mode does not use a separate comparison cell.",
      selectedNote: "The main comparison in Poison mode is clean versus attacked for the same selected cell.",
      canUseCanonical: false,
    };
  }, [
    conceptMode,
    visibleComparePoint,
    comparePointValue,
    comparePointDelta,
    comparePointLabel,
    comparePointMatchesCanonical,
    comparePointKeepsEvalFixed,
    canonicalComparePoint,
    canonicalCompareLabel,
    evalSet,
    focusPrimary,
    Srow,
    groupSet,
    k,
  ]);

  const markerPanelMessage = useMemo(() => {
    if (selectionArmed === "target") {
      return "Click a cell to move the target cell that the rest of the page is currently reading.";
    }
    if (selectionArmed === "compare") {
      return compareMarkerGuide.prompt;
    }
    if (semivalueModes.has(conceptMode)) {
      return `${questionMeta[conceptMode]} uses the entire active evaluation column.`;
    }
    if (conceptMode === "scaling") {
      return `Scaling values use the entire active evaluation column and group rows by k = ${k}.`;
    }
    if (conceptMode === "explore") {
      return "Click any cell to read it directly as one train/eval world pair.";
    }
    if (conceptMode === "poison") {
      return `Poison mode compares the clean and attacked versions of the current cell. Rows containing ${groupSet.length ? label(groupSet) : focusPrimary} are marked in operator view.`;
    }
    if (conceptMode === "dp") {
      return "DP mode compares the selected row to its leave-one-out neighbor and turns that gap into a noise recommendation.";
    }
    if (conceptMode === "unlearning") {
      return "Unlearning mode compares the current row to the exact retrain world without the requested point.";
    }
    if (visibleComparePoint) {
      return `Marked comparison cell: ${comparePointLabel}`;
    }
    return "The teal squiggle marks the current target cell. In the supported local modes, you can also mark an ochre comparison cell.";
  }, [selectionArmed, conceptMode, k, groupSet, focusPrimary, visibleComparePoint, comparePointLabel, compareMarkerGuide.prompt]);

  const settingsView = useMemo(
    () => ({
      conceptMode,
      tutorial: tutorialKind,
      universe: base,
      metric,
      realData: metric === "real" ? { mode: realDataMode, sample: realDataSample } : null,
      covertypeDomains:
        metric === "covertype"
          ? covertypeDomains.map(({ token, label: domainLabel, totalRows, trainRows, evalRows }) => ({
              token,
              label: domainLabel,
              totalRows,
              trainRows,
              evalRows,
            }))
          : null,
      palette: paletteName,
      focus: focusPrimary,
      focusSet,
      baselineTrain: { index: safeRowIdx, set: Srow },
      evalColumn: { index: safeColIdx, set: evalSet },
      edits: {
        poison: poisonActive,
      },
      betaShape: { alpha: betaAlpha, beta: betaBeta },
      dp: { epsilon },
      unlearning: { tolerance: auditTolerance },
      scalingK: k,
      showNumbers: showNums,
      showSingletonEvalCols,
      gridView: effectiveGridView,
      rows: subs.map((subset) => label(subset)),
    }),
    [
      conceptMode,
      tutorialKind,
      base,
      metric,
      realDataMode,
      realDataSample,
      covertypeDomains,
      paletteName,
      focusPrimary,
      focusSet,
      safeRowIdx,
      Srow,
      safeColIdx,
      evalSet,
      poisonActive,
      betaAlpha,
      betaBeta,
      epsilon,
      auditTolerance,
      k,
      showNums,
      showSingletonEvalCols,
      effectiveGridView,
      subs,
    ],
  );
  const settingsJson = useMemo(() => JSON.stringify(settingsView, null, 2), [settingsView]);
  const subsetLabels = useMemo(() => subs.map((subset) => label(subset)), [subs]);
  const visibleColumnLabels = useMemo(
    () => visibleColIndices.map((colIndex) => label(subs[colIndex] || [])),
    [visibleColIndices, subs],
  );
  const visibleMatrix = useMemo(
    () => analysisMatrix.map((row) => visibleColIndices.map((colIndex) => row[colIndex] ?? 0)),
    [analysisMatrix, visibleColIndices],
  );
  const exportPayload = useMemo(
    () => ({
      settings: settingsView,
      currentQuestion: questionSummary,
      formula: formulaLine,
      rowLabels: subsetLabels,
      columnLabels: visibleColumnLabels,
      matrix: visibleMatrix,
    }),
    [settingsView, questionSummary, formulaLine, subsetLabels, visibleColumnLabels, visibleMatrix],
  );
  const exportMatrixCsv = useMemo(
    () => buildMatrixCsv(subsetLabels, visibleColumnLabels, visibleMatrix),
    [subsetLabels, visibleColumnLabels, visibleMatrix],
  );

  const exportJson = () => {
    downloadTextFile(
      `counterfactual-config-${conceptMode}-${effectiveGridView}-${createExportStamp()}.json`,
      JSON.stringify(exportPayload, null, 2),
      "application/json;charset=utf-8",
    );
  };

  const exportCsv = () => {
    downloadTextFile(
      `counterfactual-matrix-${conceptMode}-${effectiveGridView}-${createExportStamp()}.csv`,
      exportMatrixCsv,
      "text/csv;charset=utf-8",
    );
  };

  const showInspector = conceptMode !== "explore";
  const canDecreaseCount = count > countMin;
  const canIncreaseCount = count < maxCountForMetric;
  const currentWorldLabel = effectiveGridView === "operator" ? "Operator view" : "Reference grid";
  const modeLabel = conceptMeta[conceptMode].label;
  const modeCopy = conceptMeta[conceptMode].description;
  const toolbarGuideCopy = conceptMode === "explore" ? "" : modeCopy;
  const editSummary = activeEditLabels.length
    ? `Active edit layer: ${activeEditLabels.join(" and ")}.`
    : "No attack layer is active, so the operator grid and the untouched reference grid currently match.";
  const evalColumnSummary = showSingletonEvalCols
    ? "Only singleton evaluation columns are shown. For pointwise-additive metrics, larger eval slices can be recovered from per-point scores; for other toy metrics this is just a decluttering view."
    : "All evaluation subsets are shown.";
  const centerCompactGrid = showSingletonEvalCols && visibleColIndices.length < subs.length;
  const displaySummary = [
    showNums ? "Raw values on" : "Raw values off",
    showSingletonEvalCols ? "singleton cols only" : "all eval cols",
  ].join(", ");

  useEffect(() => {
    const container = gridWrapRef.current;
    if (!container) return;
    const selectedCell = container.querySelector('[data-selected="true"]');
    if (!selectedCell) return;
    scrollChildIntoContainer(container, selectedCell);
  }, [safeRowIdx, safeColIdx, subs.length]);

  const hoveredRowIdx = hoverTarget?.rowIndex ?? null;
  const hoveredColIdx = hoverTarget?.colIndex ?? null;

  const previewGridTarget = (rowIndex, colIndex) => {
    setHoverTarget({ rowIndex, colIndex });
  };

  const clearGridPreview = () => {
    setHoverTarget(null);
  };

  const handleGridActionKey = (event, callback) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      callback();
    }
  };

  const handleCellClick = (rowIndex, colIndex) => {
    if (selectionArmed === "compare" && !compareChooserDisabled) {
      setComparePoint({ rowIndex, colIndex });
      setSelectionArmed(null);
      return;
    }
    setRowIdx(rowIndex);
    setColIdx(colIndex);
    setSelectionArmed(null);
  };

  const usesFocus = !["explore", "scaling"].includes(conceptMode);
  const focusHeading =
    conceptMode === "poison"
      ? "Attack target"
      : conceptMode === "unlearning"
        ? "Forget request"
        : conceptMode === "dp"
          ? "Adjacent contributor"
          : semivalueModes.has(conceptMode)
            ? "Value contributor"
            : conceptMode === "group"
              ? "Focus coalition"
              : "Focus contributor";
  const sidebarStatusChips = [
    modeLabel,
    `Train ${label(Srow)}`,
    `Eval ${label(evalSet)}`,
    usesFocus ? `Focus ${focusLabel}` : null,
    metricMeta[metric].short,
    conceptMode === "poison" ? currentWorldLabel : null,
    metric === "real" ? (realDataMode === "precomputed" ? "Precomputed matrix" : `Live sample ${realDataSample}`) : null,
    metric === "covertype" ? `${covertypeDomains.length} real domains` : null,
  ].filter(Boolean);

  const semivalueTable = semivalueModes.has(conceptMode)
    ? html`
        <div class="inspector-stack">
          <div class="inspector-row"><span class="inspector-key">Focus point</span><span class="inspector-value">${focusPrimary}</span></div>
          <div class="inspector-row"><span class="inspector-key">Evaluation slice</span><span class="inspector-value">${label(evalSet)}</span></div>
          <div class="inspector-row"><span class="inspector-key">${questionSummary.answerLabel}</span><span class="inspector-value">${semivalueStats.phi.toFixed(4)}</span></div>
          <div class="inspector-row"><span class="inspector-key">Paired worlds</span><span class="inspector-value">${semivalueStats.cnt}</span></div>
          ${conceptMode === "beta"
            ? html`
                <div class="inspector-row"><span class="inspector-key">Alpha</span><span class="inspector-value">${betaAlpha}</span></div>
                <div class="inspector-row"><span class="inspector-key">Beta</span><span class="inspector-value">${betaBeta}</span></div>
              `
            : null}
          ${semivalueStats.rows.length > 0
            ? html`
                <table class="small">
                  <thead>
                    <tr><th>|S|</th><th>Avg marginal delta</th><th>Weight</th><th>Contribution</th></tr>
                  </thead>
                  <tbody>
                    ${semivalueStats.rows.map(
                      (row) =>
                        html`<tr><td>${row.size}</td><td>${row.avg.toFixed(4)}</td><td>${row.weight.toFixed(3)}</td><td>${row.contribution.toFixed(4)}</td></tr>`,
                    )}
                  </tbody>
                </table>
              `
            : null}
        </div>
      `
    : null;

  const analysisDetailBlock = html`
    <section class=${`analysis-card ${computedFlash ? "computed-flash" : ""}`}>
      <div class="analysis-head">
        <div>
          <span class="summary-kicker">Inspector</span>
          <h3 class="card-title">Statistic details</h3>
        </div>
      </div>
      <div class="inspector-banner">
        <div class="inspector-banner-title">${lensGuide.title}</div>
        <div class="inspector-banner-copy">${lensGuide.body}</div>
      </div>
      <div class="equation-block">${formulaLine}</div>

      ${conceptMode === "loo"
        ? html`
            <div class="inspector-stack">
              <div class="inspector-row"><span class="inspector-key">Selected row</span><span class="inspector-value">${label(Srow)}</span></div>
              <div class="inspector-row"><span class="inspector-key">Comparison row</span><span class="inspector-value">${label(looMinus)}</span></div>
              <div class="inspector-row"><span class="inspector-key">Evaluation slice</span><span class="inspector-value">${label(evalSet)}</span></div>
              <div class="inspector-row"><span class="inspector-key">Delta</span><span class="inspector-value">${looDelta.toFixed(4)}</span></div>
            </div>
          `
        : null}

      ${conceptMode === "group"
        ? html`
            <div class="inspector-stack">
              <div class="inspector-row"><span class="inspector-key">Selected row</span><span class="inspector-value">${label(Srow)}</span></div>
              <div class="inspector-row"><span class="inspector-key">Focus group</span><span class="inspector-value">${groupSet.length ? label(groupSet) : "Choose a group"}</span></div>
              <div class="inspector-row"><span class="inspector-key">Row without group</span><span class="inspector-value">${label(strikeMinus)}</span></div>
              <div class="inspector-row"><span class="inspector-key">Delta</span><span class="inspector-value">${looDelta.toFixed(4)}</span></div>
            </div>
          `
        : null}

      ${semivalueModes.has(conceptMode) ? semivalueTable : null}

      ${conceptMode === "scaling"
        ? html`
            <div class="inspector-stack">
              <div class="inspector-row"><span class="inspector-key">Evaluation slice</span><span class="inspector-value">${label(evalSet)}</span></div>
              <div class="inspector-row"><span class="inspector-key">Bucket size</span><span class="inspector-value">|S| = ${k}</span></div>
              <div class="inspector-row"><span class="inspector-key">Rows in bucket</span><span class="inspector-value">${scalingBucket.n}</span></div>
              <div class="inspector-row"><span class="inspector-key">Average</span><span class="inspector-value">${scalingBucket.avg.toFixed(4)}</span></div>
              <div class="spark-wrap">
                <svg class="spark" viewBox="0 0 260 50">
                  <path d=${spark.d} fill="none" stroke="#FFD166" stroke-width="2" />
                  ${scalingAll.map((row, index) => {
                    const total = scalingAll.length || 1;
                    const width = 260;
                    const height = 50;
                    const pad = 4;
                    const x = pad + (index * (width - 2 * pad)) / Math.max(1, total - 1);
                    const normalized = spark.max === spark.min ? 0.5 : (row.avg - spark.min) / (spark.max - spark.min);
                    const y = pad + (1 - normalized) * (height - 2 * pad);
                    return html`<circle cx=${x} cy=${y} r="2.5" fill=${row.k === k ? "#68C6C1" : "#FFE0A6"} />`;
                  })}
                </svg>
              </div>
              <table class="small">
                <thead>
                  <tr><th>k</th><th>Avg f(S,E)</th><th>#rows</th></tr>
                </thead>
                <tbody>
                  ${scalingAll.map((row) => html`<tr><td>${row.k}</td><td>${row.avg.toFixed(4)}</td><td>${row.n}</td></tr>`)}
                </tbody>
              </table>
            </div>
          `
        : null}

      ${conceptMode === "dp"
        ? html`
            <div class="inspector-stack">
              <div class="inspector-row"><span class="inspector-key">Adjacent row</span><span class="inspector-value">${label(looMinus)}</span></div>
              <div class="inspector-row"><span class="inspector-key">Current cell gap</span><span class="inspector-value">${dpLocalGap.toFixed(4)}</span></div>
              <div class="inspector-row"><span class="inspector-key">Row sensitivity</span><span class="inspector-value">${dpColumnSensitivity.toFixed(4)}</span></div>
              <div class="inspector-row"><span class="inspector-key">Epsilon</span><span class="inspector-value">${epsilon.toFixed(1)}</span></div>
              <div class="inspector-row"><span class="inspector-key">Suggested Laplace scale</span><span class="inspector-value">${dpRecommendedScale.toFixed(4)}</span></div>
            </div>
          `
        : null}

      ${conceptMode === "unlearning"
        ? html`
            <div class="inspector-stack">
              <div class="inspector-row"><span class="inspector-key">Selected row</span><span class="inspector-value">${label(Srow)}</span></div>
              <div class="inspector-row"><span class="inspector-key">Forget point</span><span class="inspector-value">${focusPrimary}</span></div>
              <div class="inspector-row"><span class="inspector-key">Retrain reference</span><span class="inspector-value">${label(looMinus)}</span></div>
              <div class="inspector-row"><span class="inspector-key">Audit gap</span><span class="inspector-value">${unlearningGap.toFixed(4)}</span></div>
              <div class="inspector-row"><span class="inspector-key">Tolerance</span><span class="inspector-value">${auditTolerance.toFixed(2)}</span></div>
            </div>
          `
        : null}

      ${conceptMode === "poison"
        ? html`
            <div class="inspector-stack">
              <div class="inspector-row"><span class="inspector-key">Attack target</span><span class="inspector-value">${groupSet.length ? label(groupSet) : focusPrimary}</span></div>
              <div class="inspector-row"><span class="inspector-key">Reference score</span><span class="inspector-value">${cleanSelectedValue.toFixed(4)}</span></div>
              <div class="inspector-row"><span class="inspector-key">Attacked score</span><span class="inspector-value">${operatorSelectedValue.toFixed(4)}</span></div>
              <div class="inspector-row"><span class="inspector-key">Affected rows</span><span class="inspector-value">${poisonRows.size}</span></div>
              <div class="inspector-row"><span class="inspector-key">Current layer</span><span class="inspector-value">${effectiveGridView === "operator" ? "Operator" : "Reference"}</span></div>
            </div>
          `
        : null}
    </section>
  `;

  const modeControlsSection = html`
    <section class=${`selection-dock-section selection-dock-mode ${computedFlash ? "computed-flash" : ""}`} data-testid="question-controls">
      <div class="selection-dock-section-head">
        <div>
          <span class="summary-kicker">Mode controls</span>
          <h3 class="selection-dock-section-title">${questionMeta[conceptMode]}</h3>
        </div>
      </div>
      <p class="panel-copy">${modeCopy}</p>

      ${usesFocus
        ? html`
            <div class="control-cluster">
              <div class="control-head">${focusHeading}</div>
              <div class="ctrl-note">${focusTargetCopy}</div>
              <div class="focus-chip-row">
                ${base.map((token) => {
                  const active = focusSet.includes(token);
                  const handler = () => (allowsMultiFocus ? toggleFocus(token) : setFocusSet([token]));
                  return html`<button key=${`f-${token}`} class="btn" aria-pressed=${active} onClick=${handler}>${token}</button>`;
                })}
              </div>
            </div>
          `
        : html`
            <div class="control-cluster">
              <div class="control-head">How to use this mode</div>
              <div class="ctrl-note">Click any cell to set the train/eval pair. Explore mode keeps the question local instead of aggregating across many worlds.</div>
            </div>
          `}

      ${conceptMode === "beta"
        ? html`
            <div class="control-cluster">
              <div class="control-head">Beta-Shapley weights</div>
              <div class="slider-row">
                <label>Alpha</label>
                <input type="range" min="1" max="5" step="1" value=${betaAlpha} onInput=${(event) => setBetaAlpha(+event.target.value)} />
                <span class="pill">${betaAlpha}</span>
              </div>
              <div class="slider-row">
                <label>Beta</label>
                <input type="range" min="1" max="5" step="1" value=${betaBeta} onInput=${(event) => setBetaBeta(+event.target.value)} />
                <span class="pill">${betaBeta}</span>
              </div>
              <div class="ctrl-note">Increase alpha to emphasize larger coalitions; increase beta to emphasize smaller coalitions.</div>
            </div>
          `
        : null}

      ${conceptMode === "scaling"
        ? html`
            <div class="control-cluster">
              <div class="control-head">Bucket size</div>
              <div class="focus-chip-row">
                ${Array.from({ length: base.length + 1 }, (_, bucket) => html`
                  <button class="btn mini" aria-pressed=${k === bucket} onClick=${() => setK(bucket)}>k=${bucket}</button>
                `)}
              </div>
              <div class="summary-inline toolbar-pills">
                <span class="pill">${scalingBucket.n} rows in bucket</span>
                <button class="btn ghost mini" onClick=${() => setPlaying((previous) => !previous)}>${playing ? "Stop" : "Animate"}</button>
              </div>
              <div class="ctrl-note">Scaling averages the active evaluation slice across every training world whose size is k.</div>
            </div>
          `
        : null}

      ${conceptMode === "dp"
        ? html`
            <div class="control-cluster">
              <div class="control-head">Privacy budget</div>
              <div class="slider-row">
                <label>Epsilon</label>
                <input type="range" min="0.5" max="4" step="0.5" value=${epsilon} onInput=${(event) => setEpsilon(+event.target.value)} />
                <span class="pill">${epsilon.toFixed(1)}</span>
              </div>
              <div class="ctrl-note">Smaller epsilon means a tighter privacy budget and therefore a larger toy noise recommendation.</div>
            </div>
          `
        : null}

      ${conceptMode === "unlearning"
        ? html`
            <div class="control-cluster">
              <div class="control-head">Audit tolerance</div>
              <div class="slider-row">
                <label>Tolerance</label>
                <input
                  type="range"
                  min="0.05"
                  max="0.5"
                  step="0.05"
                  value=${auditTolerance}
                  onInput=${(event) => setAuditTolerance(+event.target.value)}
                />
                <span class="pill">${auditTolerance.toFixed(2)}</span>
              </div>
              <div class="ctrl-note">This toy threshold says how close the current score must stay to the exact retrain reference to count as a pass.</div>
            </div>
          `
        : null}

      ${conceptMode === "poison"
        ? html`
            <div class="control-cluster">
              <div class="control-head">Attack controls</div>
              <label class="checkbox-row">
                <input type="checkbox" checked=${poisonActive} onChange=${(event) => setPoisonActive(event.target.checked)} />
                Corrupt rows containing ${groupSet.length ? label(groupSet) : focusPrimary}.
              </label>
              <div class="summary-inline toolbar-pills">
                <span class="pill">Attack ${poisonActive ? "on" : "off"}</span>
                <span class="pill">${poisonRows.size} rows affected</span>
              </div>
              <div class="ctrl-note">Reference view shows the untouched grid; Operator view shows the toy corruption rule after the attack is applied.</div>
            </div>
          `
        : null}
    </section>
  `;

  const gridMarkerSection = html`
    <section class="selection-dock-section" data-testid="grid-marker-controls">
      <div class="selection-dock-section-head">
        <div>
          <span class="summary-kicker">Grid markers</span>
          <h3 class="selection-dock-section-title">Mark the cells you want to talk about.</h3>
        </div>
      </div>
      <div class="grid-marker-actions">
        <button class="btn mini" aria-pressed=${selectionArmed === "target"} onClick=${() => setSelectionArmed("target")}>
          Choose target cell
        </button>
        <button
          class="btn mini"
          aria-pressed=${selectionArmed === "compare"}
          disabled=${compareChooserDisabled}
          onClick=${() => setSelectionArmed("compare")}
        >
          Mark comparison cell
        </button>
        ${compareMarkerGuide.canUseCanonical
          ? html`
              <button class="btn ghost mini" onClick=${() => canonicalComparePoint && setComparePoint(canonicalComparePoint)}>
                Use built-in comparison
              </button>
            `
          : null}
      </div>
      <div class="toolbar-note">${markerPanelMessage}</div>
      <div class="grid-marker-guide">
        <div class="toolbar-label">Comparison marker</div>
        <div class="toolbar-note">${compareMarkerGuide.summary}</div>
        <div class="toolbar-note">${compareMarkerGuide.rule}</div>
        <div class="toolbar-note">${compareMarkerGuide.selectedNote}</div>
      </div>
    </section>
  `;

  const currentReadingSection = html`
    <section class="selection-dock-reading value-dock value-dock-tight" data-testid="value-dock">
      <div class="selection-dock-section-head selection-dock-reading-head">
        <div>
          <span class="summary-kicker">Current reading</span>
          <h3 class="panel-title">${questionSummary.title}</h3>
        </div>
        <span class="pill">${questionSummary.answerLabel}: ${questionSummary.answerValue}</span>
      </div>
      <p class="panel-copy">${questionSummary.question}</p>
      <div class="current-reading-status">
        <div class="toolbar-label">Selected state</div>
        <div class="summary-inline toolbar-pills">
          ${sidebarStatusChips.map((chip) => html`<span class="pill">${chip}</span>`)}
        </div>
      </div>
      <div class="stage-takeaway" data-testid="reading-takeaway">${currentTakeaway}</div>
      ${visibleComparePoint && comparePointValue !== null && comparePointDelta !== null
        ? html`
            <div class="compare-readout">
              <div class="compare-readout-head">
                <span class="stage-summary-label">Marked comparison</span>
                <span class="pill">${formatSigned(comparePointDelta)}</span>
              </div>
              <div class="compare-readout-value">${comparePointLabel}</div>
              <div class="compare-readout-copy">
                Score ${comparePointValue.toFixed(4)}. ${compareMarkerGuide.selectedNote}
              </div>
            </div>
          `
        : null}
      <div class="stage-summary-grid">
        ${stageReadouts.map(
          (entry) => html`
            <div key=${entry.key} class=${`stage-summary ${entry.tone}`}>
              <div class="stage-summary-label">${entry.label}</div>
              <div class="stage-summary-value">${entry.value}</div>
              <div class="stage-summary-note">${entry.note}</div>
            </div>
          `,
        )}
      </div>
    </section>
  `;

  const selectionDockBlock = html`
    <section class="stage-panel selection-dock" data-testid="grid-side-rail">
      <div class="panel-head">
        <div class="panel-heading-group">
          <span class="panel-step">3</span>
          <div>
            <span class="summary-kicker">Selection workspace</span>
            <h3 class="panel-title">Read, compare, and adjust one anchored train/eval pair.</h3>
          </div>
        </div>
      </div>
      <div class="selection-dock-grid">
        ${currentReadingSection}
        <div class="selection-dock-aside">
          ${modeControlsSection}
          ${gridMarkerSection}
        </div>
      </div>
    </section>
  `;

  return html`
    <div class="workspace-shell" data-testid="explorer-workspace" data-ready=${hydrated ? "true" : "false"}>
      <section class="workspace-toolbar" data-testid="explorer-toolbar">
        <div class="toolbar-bar">
          <div class="toolbar-guide">
            <div class="toolbar-guide-head">
              <span class="panel-step">1</span>
              <div>
                <span class="summary-kicker">Choose what you're exploring</span>
                ${toolbarGuideCopy ? html`<p class="toolbar-guide-copy">${toolbarGuideCopy}</p>` : null}
              </div>
            </div>
          </div>
        </div>

        <div class="toolbar-grid">
          <section class="toolbar-group toolbar-group-compact" data-testid="concept-controls">
            <label class="toolbar-select-field">
              <span class="toolbar-label">Question family</span>
              <select data-testid="concept-select" value=${conceptMode} onChange=${(event) => chooseConcept(event.target.value)}>
                ${conceptOrder.map((mode) => html`<option value=${mode}>${conceptMeta[mode].label}</option>`)}
              </select>
            </label>
            ${ToolbarHelp("What does this Question family ask?", modeCopy, "concept-help")}
          </section>

          <section class="toolbar-group" data-testid="metric-controls">
            <label class="toolbar-select-field">
              <span class="toolbar-label">Cell score</span>
              <select data-testid="metric-select" value=${metric} onChange=${(event) => setMetric(event.target.value)}>
                ${Object.entries(metricMeta).map(([value, meta]) => html`<option value=${value}>${meta.short}</option>`)}
              </select>
            </label>
            ${metric === "real"
              ? html`
                  <div class="segmented-row">
                    <button class="btn mini" aria-pressed=${realDataMode === "precomputed"} onClick=${switchToPrecomputedRealData}>Precomputed</button>
                    <button class="btn mini" aria-pressed=${realDataMode === "live"} onClick=${switchToLiveRealData}>Live</button>
                    <button class="btn ghost mini" disabled=${realDataMode !== "live"} onClick=${resampleRealData}>Resample</button>
                  </div>
                `
              : metric === "covertype"
                ? html`
                    <div class="toolbar-note">
                      A/B/C/D now map to real wilderness-area domains from UCI Covertype. This metric supports up to ${covertypeDomainMaxCount} domains in the grid.
                    </div>
                    <div class="summary-inline toolbar-pills">
                      ${covertypeDomains.map((domain) => html`<span class="pill">${domain.token} = ${domain.label} (${domain.totalRows} rows)</span>`)}
                    </div>
                  `
              : null}
            ${ToolbarHelp("What does this Cell score mean?", scoreProxyCopy, "metric-help")}
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
              <div class="toolbar-note">
                ${conceptMode === "poison"
                  ? `${editSummary} ${evalColumnSummary}`
                  : `${showNums ? "Raw values are visible, so each cell shows its numeric score as well as its color." : "Turn raw values on when you want to inspect the exact toy scores instead of just the color field."} ${evalColumnSummary}`}
              </div>
              <label class="toolbar-select-field">
                <span class="toolbar-label">Palette</span>
                <select value=${paletteName} onChange=${(event) => setPaletteName(event.target.value)}>
                  ${Object.keys(palettes).map((name) => html`<option value=${name}>${name}</option>`)}
                </select>
              </label>
            </div>
          </details>

          <details class=${`toolbar-group toolbar-expand ${presetFlash ? "preset-flash" : ""}`} data-testid="scene-controls">
            <summary class="toolbar-summary">
              <div class="toolbar-summary-copy">
                <span class="toolbar-summary-label">Walk me through an example for this Question family</span>
                <span class="toolbar-summary-title">
                  ${activeTutorial?.mode === conceptMode
                    ? activeTutorial.title
                    : `${visibleTutorials.length} scenes for ${questionMeta[conceptMode]}`}
                </span>
              </div>
              <div class="toolbar-summary-actions">
                <span class="pill">${visibleTutorials.length} presets</span>
                <span class="toolbar-summary-caret"></span>
              </div>
            </summary>
            <div class="toolbar-expanded">
              <div class="tutorials">
                ${visibleTutorials.map(
                  (tutorial) => html`
                    <button
                      key=${tutorial.id}
                      class=${`tutorial-btn ${tutorialKind === tutorial.id ? "active" : ""}`}
                      onClick=${() => runTutorial(tutorial.id)}
                    >
                      <span class="tutorial-title">${tutorial.title}</span>
                      <span class="tutorial-desc">${tutorial.summary}</span>
                    </button>
                  `,
                )}
              </div>
              <div class="tutorial-note">
                ${tutorialInfo && activeTutorial?.mode === conceptMode
                  ? html`
                      <div>
                        <div><b>Goal</b>: ${tutorialInfo.goal}</div>
                        <div><b>Action</b>: ${tutorialInfo.how}</div>
                        <div><b>Why it matters</b>: ${tutorialInfo.concept}</div>
                      </div>
                    `
                  : `Scenes for ${questionMeta[conceptMode]} preload a useful train/eval pair and the mode-specific controls.`}
              </div>
            </div>
          </details>

          ${conceptMode === "poison"
            ? html`
                <section class="toolbar-group" data-testid="world-layer-controls">
                  <div class="toolbar-label">World layer</div>
                  <div class="segmented-row">
                    <button class="btn mini" aria-pressed=${gridView === "operator"} onClick=${() => setGridView("operator")}>Operator</button>
                    <button class="btn mini" aria-pressed=${gridView === "real"} onClick=${() => setGridView("real")}>Reference</button>
                  </div>
                  <div class="toolbar-note">${worldLayerSummary}</div>
                </section>
              `
            : null}
        </div>
      </section>

      <div class="workspace-main">
        <section class="grid-card grid-card-outer" data-testid="explorer-grid-card">
          <div class="grid-card-head">
            <div class="panel-heading-group">
              <span class="panel-step">2</span>
              <div>
                <span class="summary-kicker">Counterfactual grid</span>
                <h2 class="grid-card-title">Choose a train row and eval slice.</h2>
                <p class="grid-card-copy">Click a row, column, or cell to anchor the pair you want to read.</p>
              </div>
            </div>
            <div class="grid-jump-controls grid-jump-controls-inline" data-testid="grid-jump-controls">
              <label class="grid-jump-field grid-jump-field-compact">
                <span class="toolbar-label">Train</span>
                <select data-testid="grid-train-select" value=${safeRowIdx} onChange=${(event) => setRowIdx(Number(event.target.value))}>
                  ${jumpTrainOptions.map((option) => html`<option value=${option.index}>${option.label}</option>`)}
                </select>
              </label>
              <label class="grid-jump-field grid-jump-field-compact">
                <span class="toolbar-label">Eval</span>
                <select data-testid="grid-eval-select" value=${safeColIdx} onChange=${(event) => setColIdx(Number(event.target.value))}>
                  ${jumpEvalOptions.map((option) => html`<option value=${option.index}>${option.label}</option>`)}
                </select>
              </label>
            </div>
          </div>

          <div class="grid-stage-shell">
            <div class="grid-stage-board">
              <div
                class="grid-wrap stage-grid"
                ref=${gridWrapRef}
                data-testid="explorer-grid"
                data-compact-cols=${centerCompactGrid ? "true" : "false"}
              >
                <div class="grid-matrix">
                  <div style="display:flex">
                    <div class="rl axis-corner" style="width:var(--grid-axis-w)" title="Use the plus and minus buttons to grow or shrink the toy universe.">
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
                            disabled=${!canDecreaseCount}
                            onClick=${() => setCount((previous) => Math.max(countMin, previous - 1))}
                            title="Remove one base point; rows and columns both shrink."
                          >
                            -
                          </button>
                          <span class="axis-corner-size" title="Toy universe size">${count}</span>
                          <button
                            class="axis-corner-btn"
                            type="button"
                            disabled=${!canIncreaseCount}
                            onClick=${() => setCount((previous) => Math.min(maxCountForMetric, previous + 1))}
                            title="Add one base point; rows and columns both grow."
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>
                    ${visibleColIndices.map((colIndex) => {
                      const colSet = subs[colIndex] || [];
                      const active = colIndex === safeColIdx;
                      const hovered = hoveredColIdx === colIndex;
                      return html`
                        <div
                          key=${`col-${colIndex}`}
                          class=${`cl ${active ? "axis-active" : ""} ${hovered ? "axis-hot" : ""}`}
                          role="button"
                          tabIndex="0"
                          aria-pressed=${active}
                          aria-label=${`Select evaluation slice ${label(colSet)}`}
                          title=${`Select evaluation slice ${label(colSet)}. Click any cell to set both train and eval at once.`}
                          onClick=${() => setColIdx(colIndex)}
                          onKeyDown=${(event) => handleGridActionKey(event, () => setColIdx(colIndex))}
                          onMouseEnter=${() => previewGridTarget(safeRowIdx, colIndex)}
                          onMouseLeave=${clearGridPreview}
                          onFocus=${() => previewGridTarget(safeRowIdx, colIndex)}
                          onBlur=${clearGridPreview}
                        >
                          ${formatColumnHeader(colIndex, colSet)}
                        </div>
                      `;
                    })}
                  </div>
                  ${subs.map((rowSet, rowIndex) => {
                    const rowActive = rowIndex === safeRowIdx;
                    const rowHovered = hoveredRowIdx === rowIndex;
                    return html`
                      <div style="display:flex" key=${`row-${rowIndex}`}>
                        <div
                          class=${`rl ${rowActive ? "axis-active" : ""} ${rowHovered ? "axis-hot" : ""}`}
                          role="button"
                          tabIndex="0"
                          aria-pressed=${rowActive}
                          aria-label=${`Select training world ${label(rowSet)}`}
                          title=${`Select training world ${label(rowSet)}. Click any cell to set both train and eval at once.`}
                          onClick=${() => setRowIdx(rowIndex)}
                          onKeyDown=${(event) => handleGridActionKey(event, () => setRowIdx(rowIndex))}
                          onMouseEnter=${() => previewGridTarget(rowIndex, safeColIdx)}
                          onMouseLeave=${clearGridPreview}
                          onFocus=${() => previewGridTarget(rowIndex, safeColIdx)}
                          onBlur=${clearGridPreview}
                        >
                          ${formatRowHeader(rowIndex, rowSet)}
                        </div>
                        <div class="rr">
                          ${visibleColIndices.map((colIndex) => {
                            const evSet = subs[colIndex] || [];
                            const value = displayMatrix[rowIndex]?.[colIndex] ?? 0;
                            const normalized = normalizeValue(value, dispMin, dispMax, 0.5);
                            const sizeK = rowSet.length === k;
                            const isSel = rowIndex === safeRowIdx && colIndex === safeColIdx;
                            const isTargetCell =
                              selectionArmed === "target" &&
                              pendingSelection === null &&
                              rowIndex === safeRowIdx &&
                              colIndex === safeColIdx;
                            const isCompareCell = Boolean(
                              visibleComparePoint &&
                                visibleComparePoint.rowIndex === rowIndex &&
                                visibleComparePoint.colIndex === colIndex,
                            );
                            const edited =
                              conceptMode === "poison" &&
                              effectiveGridView === "operator" &&
                              poisonRows.has(rowIndex) &&
                              colIndex === safeColIdx;

                            let thin = false;
                            let thick = false;
                            if (semivalueModes.has(conceptMode) && colIndex === safeColIdx) {
                              thin = thin || semivalueThinRows.has(rowIndex);
                              thick = thick || semivalueThickRows.has(rowIndex);
                            }
                            if (["loo", "dp", "unlearning"].includes(conceptMode) && colIndex === safeColIdx) {
                              if (rowIndex === safeRowIdx) thick = true;
                              if (looMinusIdx >= 0 && rowIndex === looMinusIdx) thin = true;
                            }
                            if (conceptMode === "group" && colIndex === safeColIdx) {
                              if (rowIndex === safeRowIdx) thick = true;
                              if (strikeMinusIdx >= 0 && rowIndex === strikeMinusIdx) thin = true;
                            }
                            if (conceptMode === "scaling" && colIndex === safeColIdx && sizeK) {
                              thin = true;
                            }
                            if (conceptMode === "poison" && colIndex === safeColIdx) {
                              if (rowIndex === safeRowIdx) thick = true;
                              if (poisonRows.has(rowIndex)) thin = true;
                            }

                            const highlight = thin || thick || isSel;
                            const previewingRow = hoveredRowIdx === rowIndex;
                            const previewingCol = hoveredColIdx === colIndex;
                            const previewingCell = previewingRow && previewingCol;
                            const classes = ["cell"];
                            if (isSel) classes.push("sel");
                            if (highlight) classes.push("cell-emph");
                            if (previewingRow || previewingCol) classes.push("cell-track");
                            if (previewingCell) classes.push("cell-hot");
                            if (edited) classes.push("cell-edited");
                            if (switchPulse && highlight) classes.push("cell-pulse");

                            return html`
                              <div
                                key=${`cell-${rowIndex}-${colIndex}`}
                                class=${classes.join(" ")}
                                data-selected=${isSel ? "true" : "false"}
                                data-target-cell=${isTargetCell ? "true" : "false"}
                                data-compare-cell=${isCompareCell ? "true" : "false"}
                                role="button"
                                tabIndex="0"
                                aria-pressed=${isSel}
                                aria-label=${`Train ${label(rowSet)}, evaluate ${label(evSet)}, score ${value.toFixed(3)}`}
                                title=${`Train ${label(rowSet)} | Eval ${label(evSet)} | value ${value.toFixed(3)}`}
                                onClick=${() => handleCellClick(rowIndex, colIndex)}
                                onKeyDown=${(event) => handleGridActionKey(event, () => handleCellClick(rowIndex, colIndex))}
                                onMouseEnter=${() => previewGridTarget(rowIndex, colIndex)}
                                onMouseLeave=${clearGridPreview}
                                onFocus=${() => previewGridTarget(rowIndex, colIndex)}
                                onBlur=${clearGridPreview}
                                style=${{ background: palette(normalized) }}
                              >
                                ${isTargetCell ? html`<div class="marker-ring marker-ring-target"></div>` : null}
                                ${isCompareCell ? html`<div class="marker-ring marker-ring-compare"></div>` : null}
                                ${thin ? html`<div class="ring ring-thin"></div>` : null}
                                ${thick ? html`<div class="ring ring-thick"></div>` : null}
                                ${edited ? html`<div class="edit-flag" title="Toy edit affects this row in operator view"></div>` : null}
                                ${showNums
                                  ? html`<div class="num" style=${{ color: normalized > 0.48 ? "#10273d" : "#f7fbff" }}>${value.toFixed(2)}</div>`
                                  : null}
                              </div>
                            `;
                          })}
                        </div>
                      </div>
                    `;
                  })}
                </div>
              </div>
            </div>
            ${selectionDockBlock}
          </div>

        </section>
      </div>

      ${showInspector ? analysisDetailBlock : null}

      <details class="toolbar-group toolbar-expand json-drawer" data-testid="settings-json">
        <summary class="toolbar-summary">
          <div class="toolbar-summary-copy">
            <span class="toolbar-summary-label">Full JSON</span>
            <span class="toolbar-summary-title">Current explorer state</span>
          </div>
          <div class="toolbar-summary-actions">
            <span class="pill">Export</span>
            <span class="toolbar-summary-caret"></span>
          </div>
        </summary>
        <div class="toolbar-expanded">
          <div class="export-actions">
            <button class="btn mini" onClick=${exportJson}>Export JSON</button>
            <button class="btn ghost mini" onClick=${exportCsv}>Export CSV</button>
          </div>
          <pre class="json-block">${settingsJson}</pre>
        </div>
      </details>
    </div>
  `;
}

export default App;
