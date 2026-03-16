import { h } from "preact";
import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import htm from "htm";
import {
  alphabet,
  applyGridEdits,
  buildSubsetGrid,
  computeLooDelta,
  computeSemivalueStats,
  computeScalingStats,
  computeShapleyStats,
  createTutorialPresets,
  findSubsetIndex,
  labelSubset as label,
  matrixRange,
  normalizeValue,
  selectAnalysisMatrix,
} from "../lib/counterfactual-math.js";

const html = htm.bind(h);

const InfoTip = (text) => html`<span class="info-tip" title=${text}>i</span>`;

function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}

function hexToRgb(hex) {
  const normalized = hex.replace("#", "");
  const value = normalized.length === 3
    ? normalized.split("").map((char) => `${char}${char}`).join("")
    : normalized;
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
    description: "overlap divided by union",
  },
  inter: {
    short: "|Intersection|",
    name: "Raw overlap count",
    description: "the number of shared items",
  },
  entropy: {
    short: "Entropy",
    name: "Binary entropy of overlap",
    description: "a noisier-looking uncertainty score derived from the overlap",
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
  dp: "Differential privacy",
  unlearning: "Machine unlearning",
  poison: "Data poisoning",
};

const conceptOrder = ["explore", "loo", "group", "shapley", "banzhaf", "beta", "scaling", "dp", "unlearning", "poison"];
const semivalueModes = new Set(["shapley", "banzhaf", "beta"]);
const multiFocusModes = new Set(["group", "poison"]);

const conceptMeta = {
  explore: {
    label: "Explore",
    description:
      "Start from one cell at a time. Click a row/column pair and read it directly as train on the row world, evaluate on the column slice.",
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
      "Frame deletion as a forget request: compare the current row to the exact retrain world where the requested point was never present.",
  },
  poison: {
    label: "Poison",
    description:
      "Switch to an operator lens: corrupt rows containing the chosen point or coalition, then compare the attacked score to the clean reference.",
  },
};

const faqEntries = [
  {
    question: "Why are there so many rows and columns?",
    answer:
      "This toy enumerates every subset of A, B, C, and so on so you can see the whole space of training worlds and evaluation slices. Real systems rarely compute the full grid; the powerset here is a teaching scaffold.",
  },
  {
    question: "What is the difference between the focus chips and the selected row?",
    answer:
      "The target cell chooses the train/eval location you are looking at right now. The focus chips choose which point or group the question talks about. Picking B does not move you to row B; it tells leave-one-out, group, or Shapley views which member to value.",
  },
  {
    question: "Do I need to read every highlighted cell?",
    answer:
      "No. Start with the squiggled target cell, the active column, and the question card. The extra rings only mark the cells the current statistic compares, so they are there to narrow your attention rather than widen it.",
  },
  {
    question: "Why do some answers come out as zero?",
    answer:
      "A zero often means the selected point or group is not actually present in the chosen training world, so removing it changes nothing. In scaling mode, the headline average may also stay flat when many same-size worlds behave similarly.",
  },
  {
    question: "What is the difference between Edited view and Original?",
    answer:
      "Edited view applies toy edits like poisoning or added noise before the grid is rendered. Original always shows the untouched reference matrix, even if the edit toggles are still switched on.",
  },
];

function useGrid(items, metric) {
  return useMemo(() => {
    const grid = buildSubsetGrid(items, metric);
    return { matrix: grid.matrix, subsets: grid.subsets };
  }, [items, metric]);
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

function buildMatrixCsv(labels, matrix) {
  const header = ["train/eval", ...labels].map(csvEscape).join(",");
  const rows = matrix.map((row, rowIndex) =>
    [labels[rowIndex], ...row.map((value) => value.toFixed(6))].map(csvEscape).join(","),
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

function App() {
  const countMin = 2;
  const countMax = 8;
  const [count, setCount] = useState(4);
  const base = useMemo(() => alphabet.slice(0, count), [count]);

  const [metric, setMetric] = useState("jaccard");
  const [paletteName, setPaletteName] = useState("Clear daylight");
  const palette = palettes[paletteName];

  const [uiMode, setUiMode] = useState("guided");
  const [gridView, setGridView] = useState("operator");
  const [focusSet, setFocusSet] = useState(["A"]);
  const [k, setK] = useState(2);
  const [showNums, setShowNums] = useState(false);
  const [tutorialKind, setTutorialKind] = useState(null);
  const [tutorialInfo, setTutorialInfo] = useState(null);
  const [pendingSelection, setPendingSelection] = useState(null);
  const [selectionArmed, setSelectionArmed] = useState(null);
  const [comparePoint, setComparePoint] = useState(null);
  const [poisonActive, setPoisonActive] = useState(false);
  const [noiseLevel, setNoiseLevel] = useState(0);
  const [editorMode, setEditorMode] = useState("poison");
  const [presetFlash, setPresetFlash] = useState(false);
  const [computedFlash, setComputedFlash] = useState(false);
  const [switchPulse, setSwitchPulse] = useState(false);
  const [computed, setComputed] = useState("shapley");
  const [playing, setPlaying] = useState(false);

  const presetFlashRef = useRef(null);
  const animRef = useRef(null);
  const gridWrapRef = useRef(null);

  const resetEdits = () => {
    setPoisonActive(false);
    setNoiseLevel(0);
  };

  const { matrix: baseMatrix, subsets: subs } = useGrid(base, metric);
  const [rowIdx, setRowIdx] = useState(1);
  const [colIdx, setColIdx] = useState(1);

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

  const focusPrimary = focusSet.find((token) => base.includes(token)) || base[0] || "A";
  const groupSet = computed === "group" ? focusSet.filter((token) => base.includes(token)) : [];

  useEffect(() => {
    if (computed !== "group" && focusSet.length > 1) {
      setFocusSet((previous) => (previous.length ? [previous[0]] : base.length ? [base[0]] : []));
    }
  }, [computed, focusSet.length, base]);

  const toggleFocus = (token) =>
    setFocusSet((previous) =>
      previous.includes(token)
        ? previous.filter((candidate) => candidate !== token)
        : [...previous, token].sort(),
    );

  const clampIndex = (index, total) => {
    if (!total) return 0;
    if (index < 0) return 0;
    if (index >= total) return total - 1;
    return index;
  };

  const safeRowIdx = clampIndex(rowIdx, subs.length);
  const safeColIdx = clampIndex(colIdx, subs.length);

  useEffect(() => {
    if (rowIdx !== safeRowIdx) setRowIdx(safeRowIdx);
  }, [rowIdx, safeRowIdx]);

  useEffect(() => {
    if (colIdx !== safeColIdx) setColIdx(safeColIdx);
  }, [colIdx, safeColIdx]);

  const tutorialPresets = useMemo(
    () =>
      createTutorialPresets({
        setCount,
        setMetric,
        setFocusSet,
        setK,
        setShowNums,
        setComputed,
        setPendingSelection,
        setPoisonActive,
        setNoiseLevel,
        setEditorMode,
      }),
    [],
  );
  const activeTutorial = tutorialPresets.find((entry) => entry.id === tutorialKind) || null;

  const runTutorial = (id) => {
    const preset = tutorialPresets.find((entry) => entry.id === id);
    if (!preset) return;
    setPlaying(false);
    resetEdits();
    preset.setup();
    setTutorialKind(id);
    setTutorialInfo({ goal: preset.goal, how: preset.how, concept: preset.concept });
    if (presetFlashRef.current) clearTimeout(presetFlashRef.current);
    setPresetFlash(true);
    presetFlashRef.current = setTimeout(() => setPresetFlash(false), 900);
  };

  const findIdx = (subset) => findSubsetIndex(subs, subset);

  const matrix = useMemo(
    () =>
      applyGridEdits(baseMatrix, subs, {
        focusSet,
        poisonActive,
        noiseLevel,
      }),
    [baseMatrix, subs, focusSet, poisonActive, noiseLevel],
  );

  const operatorRange = useMemo(() => matrixRange(matrix), [matrix]);
  const baseRange = useMemo(() => matrixRange(baseMatrix), [baseMatrix]);
  const effectiveGridView = uiMode === "advanced" ? gridView : "real";
  const effectiveShowNums = showNums;
  const analysisMatrix = selectAnalysisMatrix({ baseMatrix, editedMatrix: matrix, gridView: effectiveGridView });
  const displayMatrix = analysisMatrix;
  const { min: dispMin, max: dispMax } = effectiveGridView === "real" ? baseRange : operatorRange;
  const Srow = subs[safeRowIdx] || [];
  const evalSet = subs[safeColIdx] || [];
  const hasGroup = computed === "group" && groupSet.length > 0;
  const strikeMinus = hasGroup ? Srow.filter((token) => !groupSet.includes(token)) : [];
  const strikeMinusIdx = hasGroup ? findIdx(strikeMinus) : -1;
  const looMinus = hasGroup ? strikeMinus : Srow.filter((token) => token !== focusPrimary);
  const looMinusIdx = findIdx(looMinus);
  const selectedValue = displayMatrix[safeRowIdx]?.[safeColIdx] ?? 0;

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
    setComputedFlash(true);
    setSwitchPulse(true);
    const flashTimer = setTimeout(() => setComputedFlash(false), 850);
    const pulseTimer = setTimeout(() => setSwitchPulse(false), 650);
    return () => {
      clearTimeout(flashTimer);
      clearTimeout(pulseTimer);
    };
  }, [computed, safeColIdx, safeRowIdx]);

  useEffect(() => () => {
    if (presetFlashRef.current) clearTimeout(presetFlashRef.current);
  }, []);

  const shapleyStats = useMemo(
    () =>
      computeShapleyStats({
        matrix: analysisMatrix,
        subsets: subs,
        focusItem: focusPrimary,
        evalColumnIndex: safeColIdx,
        playerCount: base.length,
      }),
    [analysisMatrix, focusPrimary, base.length, safeColIdx, subs],
  );
  const shapleyPairs = shapleyStats.pairs;

  const looDelta = useMemo(
    () =>
      computeLooDelta({
        matrix: analysisMatrix,
        rowIndex: safeRowIdx,
        colIndex: safeColIdx,
        compareRowIndex: looMinusIdx,
      }),
    [analysisMatrix, safeRowIdx, safeColIdx, looMinusIdx],
  );

  const scalingAll = useMemo(
    () =>
      computeScalingStats({
        matrix: analysisMatrix,
        subsets: subs,
        maxSize: base.length,
        evalColumnIndex: safeColIdx,
      }),
    [analysisMatrix, base.length, safeColIdx, subs],
  );
  const scalingBucket = scalingAll.find((entry) => entry.k === k) || { avg: 0, n: 0 };
  const spark = useMemo(() => {
    const values = scalingAll.map((entry) => entry.avg);
    return sparkPath(values, 260, 50, 4);
  }, [scalingAll]);

  const settingsView = useMemo(
    () => ({
      uiMode,
      tutorial: tutorialKind,
      universe: base,
      metric,
      palette: paletteName,
      focus: focusPrimary,
      focusSet,
      baselineTrain: { index: safeRowIdx, set: Srow },
      evalColumn: { index: safeColIdx, set: evalSet },
      computed,
      edits: {
        mode: editorMode,
        poison: poisonActive,
        noiseLevel,
      },
      scalingK: k,
      showNumbers: effectiveShowNums,
      gridView: effectiveGridView,
      advancedGridView: gridView,
      rows: subs.map((subset) => label(subset)),
    }),
    [
      uiMode,
      tutorialKind,
      base,
      metric,
      paletteName,
      focusPrimary,
      focusSet,
      safeRowIdx,
      Srow,
      safeColIdx,
      evalSet,
      computed,
      editorMode,
      poisonActive,
      noiseLevel,
      k,
      effectiveShowNums,
      effectiveGridView,
      gridView,
      subs,
    ],
  );
  const settingsJson = useMemo(() => JSON.stringify(settingsView, null, 2), [settingsView]);

  useEffect(() => {
    if (!playing) return undefined;
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
  }, [playing, base.length]);

  const shapleyThinRows = useMemo(
    () => new Set(shapleyPairs.map((pair) => pair.subsetIndex)),
    [shapleyPairs],
  );
  const shapleyThickRows = useMemo(
    () => new Set(shapleyPairs.map((pair) => pair.withFocusIndex)),
    [shapleyPairs],
  );
  const poisonRows = useMemo(() => {
    const out = new Set();
    if (!poisonActive) return out;
    subs.forEach((subset, index) => {
      if (focusSet.some((token) => subset.includes(token))) out.add(index);
    });
    return out;
  }, [poisonActive, subs, focusSet]);

  const activeEditLabels = [];
  if (poisonActive) {
    activeEditLabels.push(
      `poisoning every row that contains ${computed === "group" && groupSet.length ? label(groupSet) : focusPrimary}`,
    );
  }
  if (noiseLevel > 0) {
    activeEditLabels.push(noiseLevel === 1 ? "light noise" : "heavy noise");
  }

  const advancedWorldSummary =
    gridView === "operator"
      ? activeEditLabels.length
        ? `Edited view is active, so the grid is drawn after ${activeEditLabels.join(" and ")}.`
        : "Edited view is active, but no edit toggles are on yet."
      : activeEditLabels.length
        ? "Original is active, so you are seeing the untouched reference matrix even though edits are toggled on."
        : "No edit toggles are active, so Edited view and Original currently match.";

  const focusTargetBadge =
    computed === "group"
      ? groupSet.length
        ? `Coalition ${label(groupSet)}`
        : "Choose 2+ tokens"
      : `Asking about ${focusPrimary}`;

  const focusTargetCopy =
    computed === "group"
      ? groupSet.length
        ? `The current question treats ${label(groupSet)} as one coalition. Changing these tokens changes who gets removed together; it does not move the selected train row ${label(Srow)}.`
        : `Pick two or more tokens to ask what happens when that coalition leaves train ${label(Srow)} together. This control changes the question, not the selected row.`
      : `The current question is about ${focusPrimary}. Clicking another token changes who is being removed, added, or valued, while the selected train row stays ${label(Srow)} until you change it on the grid.`;

  const scoreProxyCopy =
    `Each cell is a toy proxy for "retrain on ${label(Srow)} and evaluate on ${label(evalSet)}." ` +
    `${metricMeta[metric].short} is just the stand-in score we use so you can inspect the comparison structure without running real retrain experiments.`;

  const questionSummary = useMemo(() => {
    if (computed === "loo") {
      return {
        title: "Remove one point from the selected training world",
        question: `If ${focusPrimary} disappeared from train ${label(Srow)} while eval ${label(evalSet)} stays fixed, how much would the score move?`,
        answerLabel: "LOO delta",
        answerValue: looDelta.toFixed(4),
        trace: Srow.includes(focusPrimary)
          ? `We compare the selected row ${label(Srow)} against ${label(looMinus)} at eval ${label(evalSet)}.`
          : `${focusPrimary} is not in ${label(Srow)}, so removing it leaves the selected row unchanged here.`,
      };
    }

    if (computed === "group") {
      return {
        title: "Remove a group together",
        question: groupSet.length
          ? `If group ${label(groupSet)} walked out of train ${label(Srow)} while eval ${label(evalSet)} stays fixed, what would happen?`
          : "Pick multiple focus chips to turn this into a group-removal question.",
        answerLabel: "Group delta",
        answerValue: looDelta.toFixed(4),
        trace: groupSet.length
          ? groupSet.some((token) => Srow.includes(token))
            ? `We compare ${label(Srow)} against ${label(strikeMinus)} after removing the chosen group.`
            : `None of ${label(groupSet)} are present in ${label(Srow)}, so the selected group cannot change this row.`
          : "Group mode is most useful once you choose a multi-point group above the grid.",
      };
    }

    if (computed === "shapley") {
      return {
        title: "Average one point's marginal contribution across many worlds",
        question: `Across every partial training world and fixed eval ${label(evalSet)}, how much does adding ${focusPrimary} help on average?`,
        answerLabel: "Shapley phi",
        answerValue: shapleyStats.phi.toFixed(4),
        trace: `${shapleyStats.cnt} row-pairs contribute to this estimate. The rings show the exact before-and-after comparisons.`,
      };
    }

    return {
      title: "Average across all training worlds of one size",
      question: `Holding eval ${label(evalSet)} fixed, what is the average score over every training world with ${k} item${k === 1 ? "" : "s"}?`,
      answerLabel: `Avg at k=${k}`,
      answerValue: scalingBucket.avg.toFixed(4),
      trace: `${scalingBucket.n} training worlds contribute to this bucket. The selected row still controls the highlighted cell, but not the headline average.`,
    };
  }, [
    computed,
    focusPrimary,
    Srow,
    evalSet,
    looDelta,
    looMinus,
    groupSet,
    strikeMinus,
    shapleyStats.phi,
    shapleyStats.cnt,
    k,
    scalingBucket.avg,
    scalingBucket.n,
  ]);

  const compareRowIndex = computed === "group" ? strikeMinusIdx : looMinusIdx;
  const compareRowSet = compareRowIndex >= 0 ? subs[compareRowIndex] || [] : [];
  const compareValue = compareRowIndex >= 0 ? (displayMatrix[compareRowIndex]?.[safeColIdx] ?? selectedValue) : selectedValue;
  const focusLabel = computed === "group" ? (groupSet.length ? label(groupSet) : "pick a group") : focusPrimary;
  const compareChooserDisabled = computed === "shapley" || computed === "scaling";
  const visibleComparePoint = compareChooserDisabled ? null : comparePoint;
  const comparePointLabel = visibleComparePoint
    ? `Train ${label(subs[visibleComparePoint.rowIndex] || [])} / Eval ${label(subs[visibleComparePoint.colIndex] || [])}`
    : "No comparison point chosen yet.";

  useEffect(() => {
    if (compareChooserDisabled && selectionArmed === "compare") {
      setSelectionArmed(null);
    }
  }, [compareChooserDisabled, selectionArmed]);

  const markerPanelMessage = useMemo(() => {
    if (selectionArmed === "target") {
      return "Click a cell to mark the data point we are going to value.";
    }
    if (selectionArmed === "compare") {
      return "Click a cell to mark the point of comparison.";
    }
    if (computed === "shapley") {
      return "Shapley values use the entire active evaluation column.";
    }
    if (computed === "scaling") {
      return `Scaling values use the entire active evaluation column and group rows by k = ${k}.`;
    }
    if (visibleComparePoint) {
      return `Comparison point marked at ${comparePointLabel}`;
    }
    return "The teal squiggle marks the current target cell. In leave-one-out and group views, you can add an ochre comparison point too.";
  }, [selectionArmed, computed, k, visibleComparePoint, comparePointLabel]);

  const stageReadouts = useMemo(() => {
    const cards = [
      {
        key: "selected",
        label: "Target cell",
        value: selectedValue.toFixed(3),
        note: `f(${label(Srow)}, ${label(evalSet)})`,
        tone: "primary",
      },
      {
        key: "answer",
        label: questionSummary.answerLabel,
        value: questionSummary.answerValue,
        note: questionSummary.trace,
        tone: "accent",
      },
    ];

    if (computed === "loo") {
      cards.push({
        key: "compare",
        label: `Without ${focusPrimary}`,
        value: compareValue.toFixed(3),
        note:
          compareRowIndex >= 0
            ? `f(${label(compareRowSet)}, ${label(evalSet)})`
            : `${focusPrimary} is absent, so the comparison row matches the selected one.`,
        tone: "quiet",
      });
      return cards;
    }

    if (computed === "group") {
      cards.push({
        key: "compare",
        label: groupSet.length ? `Without ${label(groupSet)}` : "Comparison row",
        value: compareValue.toFixed(3),
        note:
          compareRowIndex >= 0
            ? `f(${label(compareRowSet)}, ${label(evalSet)})`
            : "Choose at least two focus chips to create a group comparison.",
        tone: "quiet",
      });
      return cards;
    }

    if (computed === "shapley") {
      cards.push({
        key: "pairs",
        label: "Pair count",
        value: `${shapleyStats.cnt}`,
        note: `Matched partial worlds with and without ${focusPrimary}.`,
        tone: "quiet",
      });
      return cards;
    }

    cards.push({
      key: "rows",
      label: "Rows in bucket",
      value: `${scalingBucket.n}`,
      note: `All rows with |S| = ${k} contribute to the scaling average.`,
      tone: "quiet",
    });
    return cards;
  }, [
    selectedValue,
    Srow,
    evalSet,
    questionSummary.answerLabel,
    questionSummary.answerValue,
    questionSummary.trace,
    computed,
    focusPrimary,
    compareValue,
    compareRowIndex,
    compareRowSet,
    groupSet,
    shapleyStats.cnt,
    scalingBucket.n,
    k,
  ]);

  const formulaLine = useMemo(() => {
    if (computed === "loo") {
      return `LOO delta = f(${label(Srow)}, ${label(evalSet)}) - f(${label(looMinus)}, ${label(evalSet)}) = ${selectedValue.toFixed(4)} - ${compareValue.toFixed(4)} = ${looDelta.toFixed(4)}`;
    }
    if (computed === "group") {
      const compareLabel = groupSet.length ? label(strikeMinus) : "S\\G";
      return `Group delta = f(${label(Srow)}, ${label(evalSet)}) - f(${compareLabel}, ${label(evalSet)}) = ${selectedValue.toFixed(4)} - ${compareValue.toFixed(4)} = ${looDelta.toFixed(4)}`;
    }
    if (computed === "shapley") {
      return `Shapley phi(${focusPrimary}) averages the marginal change from adding ${focusPrimary} across ${shapleyStats.cnt} paired rows on eval ${label(evalSet)}.`;
    }
    return `Scaling average at k = ${k} means averaging f(S, ${label(evalSet)}) over every row whose size is ${k}.`;
  }, [
    computed,
    Srow,
    evalSet,
    looMinus,
    selectedValue,
    compareValue,
    looDelta,
    groupSet,
    strikeMinus,
    focusPrimary,
    shapleyStats.cnt,
    k,
  ]);

  const lensGuide = useMemo(() => {
    if (computed === "loo") {
      return {
        title: "Nearest-neighbor comparison",
        body:
          "Leave-one-out is the most local move in the grid. You keep the evaluation slice fixed and step from the selected training row to the nearby row with one member removed.",
      };
    }
    if (computed === "group") {
      return {
        title: "Coordinated removal",
        body:
          "Group leave-one-out asks whether several contributors matter together. The grid shows the selected world next to the world that remains after removing the chosen group as a block.",
      };
    }
    if (computed === "shapley") {
      return {
        title: "Average many local moves",
        body:
          "Shapley does not trust any single row pair. Instead it walks through every partial world on the active evaluation slice and averages the marginal contribution of the focus point.",
      };
    }
    return {
      title: "Collapse many rows into one curve",
      body:
        "Scaling turns the grid into a summary over row sizes. The selected cell still anchors your attention, but the headline number now comes from every row with the chosen size.",
    };
  }, [computed]);

  const editSummary = activeEditLabels.length
    ? `Active edit layer: ${activeEditLabels.join(" and ")}.`
    : "No toy edits are active, so the operator grid and the untouched reference grid currently match.";
  const poisonTargetLabel = computed === "group" && groupSet.length ? label(groupSet) : focusPrimary;
  const noiseStateLabel = ["Off", "DP-ish", "Heavy"][noiseLevel];
  const subsetLabels = useMemo(() => subs.map((subset) => label(subset)), [subs]);
  const canDecreaseCount = count > countMin;
  const canIncreaseCount = count < countMax;
  const isGuidedMode = uiMode === "guided";
  const isAdvancedMode = uiMode === "advanced";
  const showInspector = uiMode !== "simple";
  const gridSelectionHint =
    "Click a row label to choose the training world, a column label to choose the evaluation slice, or any cell to set both at once. Use the chooser buttons below the grid to mark a target or comparison point.";
  const exportPayload = useMemo(
    () => ({
      settings: settingsView,
      currentQuestion: questionSummary,
      formula: formulaLine,
      rowLabels: subsetLabels,
      columnLabels: subsetLabels,
      matrix: analysisMatrix,
    }),
    [settingsView, questionSummary, formulaLine, subsetLabels, analysisMatrix],
  );
  const exportMatrixCsv = useMemo(() => buildMatrixCsv(subsetLabels, analysisMatrix), [subsetLabels, analysisMatrix]);

  const exportJson = () => {
    downloadTextFile(
      `counterfactual-config-${computed}-${effectiveGridView}-${createExportStamp()}.json`,
      JSON.stringify(exportPayload, null, 2),
      "application/json;charset=utf-8",
    );
  };

  const exportCsv = () => {
    downloadTextFile(
      `counterfactual-matrix-${computed}-${effectiveGridView}-${createExportStamp()}.csv`,
      exportMatrixCsv,
      "text/csv;charset=utf-8",
    );
  };

  const analysisDetailBlock = html`
    <section class=${`analysis-card ${computedFlash ? "computed-flash" : ""}`}>
      <div class="analysis-head">
        <div>
          <span class="summary-kicker">Inspector</span>
          <h3 class="card-title">Statistic details</h3>
        </div>
        <span class="pill">${questionMeta[computed]}</span>
      </div>
      <div class="inspector-banner">
        <div class="inspector-banner-title">${lensGuide.title}</div>
        <div class="inspector-banner-copy">${lensGuide.body}</div>
      </div>
      <div class="equation-block">${formulaLine}</div>

      ${computed === "shapley"
        ? html`
            <div class="inspector-stack">
              <div class="inspector-row"><span class="inspector-key">Focus point</span><span class="inspector-value">${focusPrimary}</span></div>
              <div class="inspector-row"><span class="inspector-key">Evaluation slice</span><span class="inspector-value">${label(evalSet)}</span></div>
              <div class="inspector-row"><span class="inspector-key">phi</span><span class="inspector-value">${shapleyStats.phi.toFixed(4)}</span></div>
              <div class="inspector-row"><span class="inspector-key">Paired worlds</span><span class="inspector-value">${shapleyStats.cnt}</span></div>
              ${shapleyStats.rows.length > 0
                ? html`
                    <table class="small">
                      <thead>
                        <tr><th>|S|</th><th>Avg marginal delta</th><th>#pairs</th></tr>
                      </thead>
                      <tbody>
                        ${shapleyStats.rows.map(
                          (row) => html`<tr><td>${row.size}</td><td>${row.avg.toFixed(4)}</td><td>${row.n}</td></tr>`,
                        )}
                      </tbody>
                    </table>
                  `
                : null}
            </div>
          `
        : null}

      ${computed === "loo"
        ? html`
            <div class="inspector-stack">
              <div class="inspector-row"><span class="inspector-key">Selected row</span><span class="inspector-value">${label(Srow)}</span></div>
              <div class="inspector-row"><span class="inspector-key">Comparison row</span><span class="inspector-value">${label(looMinus)}</span></div>
              <div class="inspector-row"><span class="inspector-key">Evaluation slice</span><span class="inspector-value">${label(evalSet)}</span></div>
              <div class="inspector-row"><span class="inspector-key">Delta</span><span class="inspector-value">${looDelta.toFixed(4)}</span></div>
            </div>
          `
        : null}

      ${computed === "group"
        ? html`
            <div class="inspector-stack">
              <div class="inspector-row"><span class="inspector-key">Selected row</span><span class="inspector-value">${label(Srow)}</span></div>
              <div class="inspector-row"><span class="inspector-key">Focus group</span><span class="inspector-value">${groupSet.length ? label(groupSet) : "Choose a group"}</span></div>
              <div class="inspector-row"><span class="inspector-key">Row without group</span><span class="inspector-value">${label(strikeMinus)}</span></div>
              <div class="inspector-row"><span class="inspector-key">Delta</span><span class="inspector-value">${looDelta.toFixed(4)}</span></div>
            </div>
          `
        : null}

      ${computed === "scaling"
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
                    const minValue = Math.min(...scalingAll.map((entry) => entry.avg));
                    const maxValue = Math.max(...scalingAll.map((entry) => entry.avg));
                    const width = 260;
                    const height = 50;
                    const pad = 4;
                    const x = pad + (index * (width - 2 * pad)) / Math.max(1, total - 1);
                    const normalized = maxValue === minValue ? 0.5 : (row.avg - minValue) / (maxValue - minValue);
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
                  ${scalingAll.map(
                    (row) => html`<tr><td>${row.k}</td><td>${row.avg.toFixed(4)}</td><td>${row.n}</td></tr>`,
                  )}
                </tbody>
              </table>
            </div>
          `
        : null}
    </section>
  `;
  const currentWorldLabel = effectiveGridView === "operator" ? "Edited view" : uiMode === "advanced" ? "Original" : "Reference grid";
  const modeLabel =
    uiMode === "simple" ? "Simple explore" : uiMode === "guided" ? "Guided" : "Advanced explore";
  const modeCopy =
    uiMode === "simple"
      ? "Keep the explorer lean: choose a score rule, click the grid to set train and eval, and inspect the current value. Switch to Guided mode for step-by-step tutorial presets."
      : uiMode === "guided"
        ? "Guided mode keeps the grid visible but adds presets and the statistic walkthroughs so the explorer can teach as you move."
        : "Advanced explore unlocks world-layer comparisons, toy edits, export tools, palette controls, and the raw state inspector.";

  useEffect(() => {
    const container = gridWrapRef.current;
    if (!container) return;
    const selectedCell = container.querySelector('[data-selected="true"]');
    if (!selectedCell) return;
    selectedCell.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [safeRowIdx, safeColIdx, subs.length]);

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

  return html`
    <div class="workspace-shell">
      <section class="workspace-toolbar" data-testid="explorer-toolbar">
        <div class="toolbar-bar">
          <div class="toolbar-guide">
            <span class="summary-kicker">Workspace mode</span>
            <p class="toolbar-guide-copy">${modeCopy}</p>
          </div>
          <div class="summary-inline toolbar-status-row">
            <span class="pill">${modeLabel}</span>
            <span class="pill">${currentWorldLabel}</span>
            <span class="pill">${metricMeta[metric].short}</span>
            <span class="pill">${effectiveShowNums ? "Raw values on" : "Color scale"}</span>
          </div>
        </div>

        <div class="toolbar-grid">
          <section class="toolbar-group" data-testid="workspace-controls">
            <div class="toolbar-label">Explore mode</div>
            <div class="segmented-row mode-toggle">
              <button class="btn mini" aria-pressed=${uiMode === "simple"} onClick=${() => setUiMode("simple")}>Simple explore</button>
              <button class="btn mini" aria-pressed=${uiMode === "guided"} onClick=${() => setUiMode("guided")}>Guided</button>
              <button class="btn mini" aria-pressed=${uiMode === "advanced"} onClick=${() => setUiMode("advanced")}>Advanced explore</button>
            </div>
            <div class="toolbar-note">${modeCopy}</div>
          </section>

          <section class="toolbar-group" data-testid="metric-controls">
            <div class="toolbar-label">
              Cell score
              ${InfoTip("Each cell is a toy proxy for retraining on the row world and evaluating on the column slice. Jaccard = overlap divided by union. |Intersection| = raw count. Entropy = binary entropy of the overlap.")}
            </div>
            <div class="segmented-row">
              <button class="btn" aria-pressed=${metric === "jaccard"} onClick=${() => setMetric("jaccard")}>Jaccard</button>
              <button class="btn" aria-pressed=${metric === "inter"} onClick=${() => setMetric("inter")}>|Intersection|</button>
              <button class="btn" aria-pressed=${metric === "entropy"} onClick=${() => setMetric("entropy")}>Entropy</button>
            </div>
            <div class="toolbar-note">${scoreProxyCopy}</div>
          </section>

          <section class="toolbar-group toolbar-group-actions" data-testid="display-controls">
            <div class="toolbar-label">
              Display
              ${InfoTip("These controls only change how the grid is rendered, not the underlying counterfactual question.")}
            </div>
            <label class="checkbox-row">
              <input type="checkbox" checked=${showNums} onChange=${(event) => setShowNums(event.target.checked)} />
              Show raw values
            </label>
            ${isAdvancedMode
              ? html`
                  <select value=${paletteName} onChange=${(event) => setPaletteName(event.target.value)}>
                    ${Object.keys(palettes).map((name) => html`<option value=${name}>${name}</option>`)}
                  </select>
                  <div class="export-actions">
                    <button class="btn mini" onClick=${exportJson}>Export JSON</button>
                    <button class="btn ghost mini" onClick=${exportCsv}>Export CSV</button>
                  </div>
                `
              : null}
            <div class="toolbar-note">
              ${isAdvancedMode
                ? editSummary
                : "Turn raw values on when you want to inspect the exact toy scores instead of just the color field."}
            </div>
            ${isAdvancedMode
              ? html`
                  <details class="guide-details toolbar-drawer">
                    <summary>Inspect live settings</summary>
                    <div class="ctrl-note">This is the same state currently driving the figure below.</div>
                    <pre class="json-block">${settingsJson}</pre>
                  </details>
                `
              : null}
          </section>

          ${isGuidedMode
            ? html`
                <section class=${`toolbar-group toolbar-expand ${presetFlash ? "preset-flash" : ""}`} data-testid="guided-controls">
                  <div class="toolbar-label">Guided paths</div>
                  <div class="tutorials">
                    ${tutorialPresets.map(
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
                    ${tutorialInfo
                      ? html`
                          <div>
                            <div><b>Goal</b>: ${tutorialInfo.goal}</div>
                            <div><b>Action</b>: ${tutorialInfo.how}</div>
                            <div><b>Why it matters</b>: ${tutorialInfo.concept}</div>
                          </div>
                        `
                      : "Load a preset to jump straight to a useful scene instead of building one from scratch."}
                  </div>
                </section>
              `
            : null}

          ${isAdvancedMode
            ? html`
                <section class="toolbar-group" data-testid="world-layer-controls">
                  <div class="toolbar-label">
                    World layer
                    ${InfoTip("Operator view shows the edited matrix; Real world shows the untouched reference matrix.")}
                  </div>
                  <div class="segmented-row">
                    <button class="btn mini" aria-pressed=${gridView === "operator"} onClick=${() => setGridView("operator")} title="Show the grid after toy edits (poison, noise) are applied">Edited view</button>
                    <button class="btn mini" aria-pressed=${gridView === "real"} onClick=${() => setGridView("real")} title="Show the untouched reference matrix, regardless of edit toggles">Original</button>
                  </div>
                  <div class="toolbar-note">${advancedWorldSummary}</div>
                </section>
                <section class="toolbar-group" data-testid="toy-edit-controls">
                  <div class="toolbar-label">
                    Toy edits
                    ${InfoTip("Apply toy edits before rendering the operator view. The real-world layer remains untouched.")}
                  </div>
                  <div class="segmented-row">
                    <button class="btn mini" aria-pressed=${editorMode === "poison"} onClick=${() => setEditorMode("poison")}>Poison</button>
                    <button class="btn mini" aria-pressed=${editorMode === "noise"} onClick=${() => setEditorMode("noise")}>Noise</button>
                    <button class="btn ghost mini" onClick=${resetEdits}>Reset</button>
                  </div>
                  ${editorMode === "poison"
                    ? html`
                        <label class="checkbox-row">
                          <input type="checkbox" checked=${poisonActive} onChange=${(event) => setPoisonActive(event.target.checked)} />
                          Corrupt rows containing ${poisonTargetLabel}.
                        </label>
                      `
                    : html`
                        <div class="slider-row">
                          <label>Noise level</label>
                          <input type="range" min="0" max="2" value=${noiseLevel} onInput=${(event) => setNoiseLevel(+event.target.value)} />
                          <span class="pill">${noiseStateLabel}</span>
                        </div>
                      `}
                  <div class="summary-inline toolbar-pills">
                    <span class="pill">Poison ${poisonActive ? "on" : "off"}</span>
                    <span class="pill">Noise ${noiseStateLabel}</span>
                  </div>
                </section>
              `
            : null}
        </div>
      </section>

      <section class="grid-card grid-card-outer" data-testid="explorer-grid-card">
        <div class="grid-card-head">
          <div>
            <span class="summary-kicker">Counterfactual grid</span>
            <h2 class="grid-card-title">Rows are worlds; columns are slices.</h2>
          </div>
          <div class="grid-meta-strip">
            <span class="pill">${metricMeta[metric].short}</span>
            <span class="pill">${modeLabel}</span>
            <span class="pill">Train ${label(Srow)}</span>
            <span class="pill">Eval ${label(evalSet)}</span>
            <span class="pill">${questionMeta[computed]}</span>
            <span class="pill">${effectiveShowNums ? "Raw values on" : "Color only"}</span>
            ${isAdvancedMode ? html`<span class="pill">${paletteName}</span>` : null}
          </div>
        </div>

        <div class="grid-toolbar-strip">
          <div class="grid-selection-note" title=${gridSelectionHint}>${gridSelectionHint}</div>
        </div>

        <div class="grid-wrap stage-grid" ref=${gridWrapRef} data-testid="explorer-grid">
          <div style="display:flex">
            <div class="rl axis-corner" style="width:var(--grid-axis-w)" title=${`${gridSelectionHint} Use the plus and minus buttons to grow or shrink the toy universe.`}>
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
                    onClick=${() => setCount((previous) => Math.min(countMax, previous + 1))}
                    title="Add one base point; rows and columns both grow."
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
            ${subs.map((colSet, colIndex) => {
              const active = colIndex === safeColIdx;
              return html`
                <div
                  key=${`col-${colIndex}`}
                  class=${`cl ${active ? "axis-active" : ""}`}
                  title=${`Select evaluation slice ${label(colSet)}. Click any cell to set both train and eval at once.`}
                  onClick=${() => setColIdx(colIndex)}
                >
                  ${formatColumnHeader(colIndex, colSet)}
                </div>
              `;
            })}
          </div>

          ${subs.map((rowSet, rowIndex) => {
            const sizeK = rowSet.length === k;
            const selected = rowIndex === safeRowIdx;
            return html`
              <div key=${`row-${rowIndex}`} style="display:flex">
                <div
                  class=${`rl ${selected ? "axis-active" : ""}`}
                  title=${`Select training world ${label(rowSet)}. Click any cell to set both train and eval at once.`}
                  onClick=${() => setRowIdx(rowIndex)}
                >
                  ${formatRowHeader(rowIndex, rowSet)}
                </div>
                ${subs.map((evSet, colIndex) => {
                  const value = displayMatrix[rowIndex][colIndex];
                  const normalized = normalizeValue(value, dispMin, dispMax, 0.5);
                  const isSel = rowIndex === safeRowIdx && colIndex === safeColIdx;
                  const isTargetCell = isSel;
                  const isCompareCell = Boolean(
                    visibleComparePoint
                      && visibleComparePoint.rowIndex === rowIndex
                      && visibleComparePoint.colIndex === colIndex,
                  );
                  const edited = uiMode === "advanced" && gridView === "operator" && poisonRows.has(rowIndex) && colIndex === safeColIdx;

                  let thin = false;
                  let thick = false;
                  if (computed === "shapley" && colIndex === safeColIdx) {
                    thin = thin || shapleyThinRows.has(rowIndex);
                    thick = thick || shapleyThickRows.has(rowIndex);
                  }
                  if (computed === "loo" && colIndex === safeColIdx) {
                    if (rowIndex === safeRowIdx) thick = true;
                    if (compareRowIndex >= 0 && rowIndex === compareRowIndex) thin = true;
                  }
                  if (computed === "group" && colIndex === safeColIdx) {
                    if (rowIndex === safeRowIdx) thick = true;
                    if (strikeMinusIdx >= 0 && rowIndex === strikeMinusIdx) thin = true;
                  }
                  if (computed === "scaling" && colIndex === safeColIdx && sizeK) {
                    thin = true;
                  }

                  const highlight = thin || thick || isSel;
                  const classes = ["cell"];
                  if (isSel) classes.push("sel");
                  if (highlight) classes.push("cell-emph");
                  if (edited) classes.push("cell-edited");
                  if (switchPulse && highlight) classes.push("cell-pulse");

                  return html`
                    <div
                      key=${`cell-${rowIndex}-${colIndex}`}
                      class=${classes.join(" ")}
                      data-selected=${isSel ? "true" : "false"}
                      data-target-cell=${isTargetCell ? "true" : "false"}
                      data-compare-cell=${isCompareCell ? "true" : "false"}
                      title=${`Train ${label(rowSet)} | Eval ${label(evSet)} | value ${value.toFixed(3)}`}
                      onClick=${() => handleCellClick(rowIndex, colIndex)}
                      style=${{ background: palette(normalized) }}
                    >
                      ${isTargetCell ? html`<div class="marker-ring marker-ring-target"></div>` : null}
                      ${isCompareCell ? html`<div class="marker-ring marker-ring-compare"></div>` : null}
                      ${thin ? html`<div class="ring ring-thin"></div>` : null}
                      ${thick ? html`<div class="ring ring-thick"></div>` : null}
                      ${edited ? html`<div class="edit-flag" title="Toy edit affects this row in operator view"></div>` : null}
                      ${effectiveShowNums
                        ? html`<div class="num" style=${{ color: normalized > 0.48 ? "#10273d" : "#f7fbff" }}>${value.toFixed(2)}</div>`
                        : null}
                    </div>
                  `;
                })}
              </div>
            `;
          })}
        </div>

        <div class="grid-marker-panel" data-testid="grid-marker-controls">
          <div class="grid-marker-head">
            <div>
              <span class="summary-kicker">Grid markers</span>
              <div class="grid-marker-title">Mark the cells you want to talk about.</div>
            </div>
            <div class="summary-inline toolbar-pills">
              <span class="pill">Target Train ${label(Srow)} / Eval ${label(evalSet)}</span>
              ${visibleComparePoint
                ? html`<span class="pill">Compare ${comparePointLabel}</span>`
                : null}
            </div>
          </div>
          <div class="grid-marker-actions">
            <button class="btn mini" aria-pressed=${selectionArmed === "target"} onClick=${() => setSelectionArmed("target")}>
              Choose the data point we're going to value
            </button>
            <button
              class="btn mini"
              aria-pressed=${selectionArmed === "compare"}
              disabled=${compareChooserDisabled}
              onClick=${() => setSelectionArmed("compare")}
            >
              Choose point to compare
            </button>
          </div>
          <div class="toolbar-note">${markerPanelMessage}</div>
        </div>
      </section>

      <div class="workspace-footer">
        <section class="stage-panel value-dock" data-testid="value-dock">
          <div class="panel-head">
            <div>
              <span class="summary-kicker">Current reading</span>
              <h3 class="panel-title">${questionSummary.title}</h3>
            </div>
            <span class="pill">${questionSummary.answerLabel}: ${questionSummary.answerValue}</span>
          </div>
          <p class="panel-copy">${questionSummary.question}</p>
          <div class="summary-inline toolbar-pills">
            <span class="pill">Train ${label(Srow)}</span>
            <span class="pill">Eval ${label(evalSet)}</span>
            <span class="pill">Focus ${focusLabel}</span>
            <span class="pill">${metricMeta[metric].short}</span>
          </div>
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

        <section class=${`stage-panel question-dock ${computedFlash ? "computed-flash" : ""}`} data-testid="question-controls">
          <div class="panel-head">
            <div>
              <span class="summary-kicker">Question controls</span>
              <h3 class="panel-title">What counterfactual are we asking?</h3>
            </div>
            <span class="pill">${questionMeta[computed]}</span>
          </div>
          <div class="segmented-row question-button-row">
            <button class="btn" aria-pressed=${computed === "loo"} onClick=${() => setComputed("loo")}>Leave-one-out</button>
            <button class="btn" aria-pressed=${computed === "group"} onClick=${() => setComputed("group")}>Group LOO</button>
            <button class="btn" aria-pressed=${computed === "shapley"} onClick=${() => setComputed("shapley")}>Shapley</button>
            <button class="btn" aria-pressed=${computed === "scaling"} onClick=${() => setComputed("scaling")}>Scaling</button>
          </div>

          <div class="control-cluster">
            <div class="control-head">
              Focus contributor
              ${InfoTip("Pick the contributor whose effect you want to ask about. This changes who is being removed, added, or valued; it does not change the selected train row.")}
            </div>
            <div class="ctrl-note">${focusTargetCopy}</div>
            <div class="focus-chip-row">
              ${base.map((token) => {
                const active = focusSet.includes(token);
                const handler = () => (computed === "group" ? toggleFocus(token) : setFocusSet([token]));
                return html`<button key=${`f-${token}`} class="btn" aria-pressed=${active} onClick=${handler}>${token}</button>`;
              })}
            </div>
            <div class="summary-inline toolbar-pills">
              <span class="pill">${focusTargetBadge}</span>
              <span class="pill">${computed === "group" ? "Changes the coalition" : "Changes the contributor"}</span>
            </div>
          </div>

          ${computed === "scaling"
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
        </section>
      </div>

      ${showInspector ? analysisDetailBlock : null}

      <details class="analysis-card support-drawer" data-testid="reading-help">
        <summary>Reading help</summary>
        <p class="analysis-copy">Quick answers stay nearby so you can recover the mental model without leaving the grid.</p>
        <div class="faq-stack">
          ${faqEntries.map(
            (entry) => html`
              <div key=${entry.question} class="inspector-banner">
                <div class="inspector-banner-title">${entry.question}</div>
                <div class="inspector-banner-copy">${entry.answer}</div>
              </div>
            `,
          )}
        </div>
      </details>
    </div>
  `;
}

export default App;
