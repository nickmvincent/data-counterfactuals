import { h } from "preact";
import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import htm from "htm";
import {
  alphabet,
  applyGridEdits,
  buildSubsetGrid,
  computeLooDelta,
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

const palettes = {
  "Blue->Yellow": (t) => `hsl(${210 - 150 * t} 90% ${48 + 14 * (t - 0.5)}%)`,
  "Viridis-ish": (t) => {
    const hue = 260 - 160 * t;
    const saturation = 65 + 25 * t;
    const lightness = 30 + 35 * t;
    return `hsl(${hue} ${saturation}% ${lightness}%)`;
  },
  Greys: (t) => {
    const lightness = 18 + 64 * t;
    return `hsl(220 10% ${lightness}%)`;
  },
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
  loo: "Leave-one-out",
  group: "Group leave-one-out",
  shapley: "Shapley value",
  scaling: "Scaling law",
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
      "The row chooses which training world you are looking at right now. The focus chips choose which point or group the question talks about. Picking B does not move you to row B; it tells leave-one-out, group, or Shapley views which member to value.",
  },
  {
    question: "Do I need to read every highlighted cell?",
    answer:
      "No. Start with the selected row, selected column, and question card. The amber and cyan rings only mark the cells the current statistic compares, so they are there to narrow your attention rather than widen it.",
  },
  {
    question: "Why do some answers come out as zero?",
    answer:
      "A zero often means the selected point or group is not actually present in the chosen training world, so removing it changes nothing. In scaling mode, the headline average may also stay flat when many same-size worlds behave similarly.",
  },
  {
    question: "What changes in Operator view?",
    answer:
      "Operator view applies toy edits like poisoning or added noise before the grid is rendered. Real world always shows the untouched reference matrix, even if the edit toggles are still switched on.",
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

function formatColumnHeader(index) {
  return `${index}`;
}

function formatRowHeader(index, subset) {
  const full = label(subset);
  if (full.length <= 2) return `${index}:${full}`;
  return `${index}:${full.slice(0, 2)}...`;
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
  const [count, setCount] = useState(4);
  const base = useMemo(() => alphabet.slice(0, count), [count]);

  const [metric, setMetric] = useState("jaccard");
  const [paletteName, setPaletteName] = useState("Blue->Yellow");
  const palette = palettes[paletteName];

  const [uiMode, setUiMode] = useState("simple");
  const [gridView, setGridView] = useState("operator");
  const [focusSet, setFocusSet] = useState(["A"]);
  const [k, setK] = useState(2);
  const [showNums, setShowNums] = useState(false);
  const [tutorialKind, setTutorialKind] = useState(null);
  const [tutorialInfo, setTutorialInfo] = useState(null);
  const [pendingSelection, setPendingSelection] = useState(null);
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
  const effectiveShowNums = uiMode === "advanced" ? showNums : false;
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
        ? `Operator view is active, so the grid is drawn after ${activeEditLabels.join(" and ")}.`
        : "Operator view is active, but no edit toggles are on yet."
      : activeEditLabels.length
        ? "Real world is active, so you are seeing the untouched reference matrix even though edits are toggled on."
        : "No edit toggles are active, so Operator and Real world currently match.";
  const simpleModeSummary = activeEditLabels.length
    ? "Simple mode stays on the untouched reference grid, so any advanced edit toggles are parked until you switch back to Advanced mode."
    : "Simple mode keeps the untouched reference grid in view and hides operator-only controls until you ask for them.";
  const worldModeSummary = uiMode === "advanced" ? advancedWorldSummary : simpleModeSummary;

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

  const sceneSteps = [
    {
      step: "1",
      title: "Training world",
      value: label(Srow),
      detail: "Rows enumerate possible training sets. Click a row label or any cell to switch worlds.",
    },
    {
      step: "2",
      title: "Evaluation slice",
      value: label(evalSet),
      detail: "Columns are what you test the model on after training on the chosen row.",
    },
    {
      step: "3",
      title: "Point or group in focus",
      value: computed === "group" ? (groupSet.length ? label(groupSet) : "Pick 2+") : focusPrimary,
      detail:
        computed === "group"
          ? "The focus chips define the group the question talks about. They do not choose the row."
          : "The focus chip chooses the member the question talks about. It does not choose the row.",
    },
    {
      step: "4",
      title: "World assumptions",
      value:
        effectiveGridView === "operator" ? "Operator view" : uiMode === "advanced" ? "Real world" : "Reference grid",
      detail: worldModeSummary,
    },
  ];

  const compareRowIndex = computed === "group" ? strikeMinusIdx : looMinusIdx;
  const compareRowSet = compareRowIndex >= 0 ? subs[compareRowIndex] || [] : [];
  const compareValue = compareRowIndex >= 0 ? (displayMatrix[compareRowIndex]?.[safeColIdx] ?? selectedValue) : selectedValue;
  const focusLabel = computed === "group" ? (groupSet.length ? label(groupSet) : "pick a group") : focusPrimary;

  const stageReadouts = useMemo(() => {
    const cards = [
      {
        key: "selected",
        label: "Selected cell",
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

  const highlightSummary = useMemo(() => {
    if (computed === "loo") {
      return `On the active evaluation column, cyan marks the selected training world and amber marks the same column after removing ${focusPrimary}.`;
    }
    if (computed === "group") {
      return groupSet.length
        ? `On the active evaluation column, cyan marks ${label(Srow)} and amber marks the row after removing ${label(groupSet)}.`
        : "Pick multiple focus chips and the grid will show the selected row beside the row with that whole group removed.";
    }
    if (computed === "shapley") {
      return `On the active evaluation column, amber rings mark partial worlds S and cyan rings mark the matching worlds S + ${focusPrimary}.`;
    }
    return `Amber rings sweep down the active evaluation column for every row whose size is ${k}. The white outline still marks the one row you clicked.`;
  }, [computed, focusPrimary, groupSet, Srow, k]);

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
          <span class="summary-kicker">Read the statistic</span>
          <h3 class="card-title">${lensGuide.title}</h3>
        </div>
        <span class="pill">${questionMeta[computed]}</span>
      </div>
      <p class="analysis-copy">${lensGuide.body}</p>
      <div class="equation-block">${formulaLine}</div>

      ${computed === "shapley"
        ? html`
            <div class="analysis-stack">
              <div class="analysis-note">
                <b>Shapley value</b> averages how much adding ${focusPrimary} changes the score on eval ${label(evalSet)}.
              </div>
              <div class="analysis-note">
                <b>phi</b> = <b>${shapleyStats.phi.toFixed(4)}</b> from <b>${shapleyStats.cnt}</b> paired training worlds.
              </div>
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
            <div class="analysis-stack">
              <div class="analysis-note">
                <b>Leave-one-out</b> compares the selected training world with the nearest world that drops ${focusPrimary}.
              </div>
              <div class="analysis-note">S = <b>${label(Srow)}</b>; S\\{${focusPrimary}} = <b>${label(looMinus)}</b>; E = <b>${label(evalSet)}</b></div>
              <div class="analysis-note">Delta = <b>${looDelta.toFixed(4)}</b></div>
            </div>
          `
        : null}

      ${computed === "group"
        ? html`
            <div class="analysis-stack">
              <div class="analysis-note">
                <b>Group leave-one-out</b> removes the chosen coalition together instead of one member at a time.
              </div>
              <div class="analysis-note">G = <b>${groupSet.length ? label(groupSet) : "choose a group"}</b>; S\\G = <b>${label(strikeMinus)}</b>; E = <b>${label(evalSet)}</b></div>
              <div class="analysis-note">Delta = <b>${looDelta.toFixed(4)}</b></div>
            </div>
          `
        : null}

      ${computed === "scaling"
        ? html`
            <div class="analysis-stack">
              <div class="analysis-note">
                <b>Scaling</b> ignores the selected row for the headline and averages every row with <b>|S| = ${k}</b>.
              </div>
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
  const currentWorldLabel = effectiveGridView === "operator" ? "Operator view" : uiMode === "advanced" ? "Real world" : "Reference grid";
  const modeLabel = uiMode === "simple" ? "Simple mode" : "Advanced mode";
  const modeCopy =
    uiMode === "simple"
      ? "Stay here when you want the cleanest distillation: one reference grid, the essential scene controls, and the explanation of the active question."
      : "Use Advanced mode when you want to compare edited and untouched worlds, layer in toy interventions, inspect raw state, and export the current configuration.";
  const focusModeCopy =
    computed === "group"
      ? "Group mode keeps multiple focus chips active so you can remove a coalition at once."
      : "Single-point modes keep one focus chip active so the question stays about one contributor at a time.";
  const sceneFacts = [
    { label: "Train world", value: label(Srow) },
    { label: "Evaluation slice", value: label(evalSet) },
    { label: "Focus", value: focusLabel },
    { label: "Score rule", value: metricMeta[metric].short },
  ];

  useEffect(() => {
    const container = gridWrapRef.current;
    if (!container) return;
    const selectedCell = container.querySelector('[data-selected="true"]');
    if (!selectedCell) return;
    selectedCell.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [safeRowIdx, safeColIdx, subs.length]);

  return html`
    <div class="workspace-shell">
      <section class=${`explorer-hero ${presetFlash ? "preset-flash" : ""}`}>
        <div class="hero-copy">
          <span class="summary-kicker">Interactive workspace</span>
          <h2 class="hero-title">Keep one counterfactual scene in view while the question changes.</h2>
          <p class="hero-lede">
            Rows are training worlds and columns are evaluation slices. Start by choosing the question, lock in the scene, then use
            the highlights in the grid to see exactly which comparison the statistic is making.
          </p>
          <div class="summary-inline">
            <span class="pill">Rows = training worlds</span>
            <span class="pill">Columns = evaluation slices</span>
            <span class="pill">Click any cell to move row and column together</span>
          </div>
          <div class="status-banner">
            <b>Current scene:</b> ${questionSummary.question}
          </div>
        </div>

        <div class="hero-stack">
          <section class="hero-card">
            <div class="card-head">
              <div>
                <span class="summary-kicker">Guided starts</span>
                <h3 class="card-title">Jump to a recognizable example</h3>
              </div>
            </div>
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
                      <div><b>What we do</b>: ${tutorialInfo.how}</div>
                      <div><b>Concept</b>: ${tutorialInfo.concept}</div>
                    </div>
                  `
                : "Pick a preset and the explorer will move to a meaningful configuration instead of starting from a blank control state."}
            </div>
          </section>
        </div>
      </section>

      <section class="workspace-layout">
        <aside class="control-column">
          <section class=${`panel-card ${computedFlash ? "computed-flash" : ""}`}>
            <div class="panel-head">
              <span class="panel-step">1</span>
              <div>
                <span class="summary-kicker">Question</span>
                <h3 class="panel-title">Choose the counterfactual lens.</h3>
              </div>
            </div>
            <p class="panel-copy">Switch the statistic first so the rest of the workspace is answering a clear question.</p>
            <div class="segmented-row question-button-row">
              <button class="btn" aria-pressed=${computed === "loo"} onClick=${() => setComputed("loo")}>Leave-one-out</button>
              <button class="btn" aria-pressed=${computed === "group"} onClick=${() => setComputed("group")}>Group LOO</button>
              <button class="btn" aria-pressed=${computed === "shapley"} onClick=${() => setComputed("shapley")}>Shapley</button>
              <button class="btn" aria-pressed=${computed === "scaling"} onClick=${() => setComputed("scaling")}>Scaling</button>
            </div>

            <div class="control-cluster">
              <div class="control-head">
                Focus tokens
                ${InfoTip("The focus chips choose which point or group the current lens talks about. They do not choose the selected row.")}
              </div>
              <div class="ctrl-note">${focusModeCopy}</div>
              <div class="focus-chip-row">
                ${base.map((token) => {
                  const active = focusSet.includes(token);
                  const handler = () => (computed === "group" ? toggleFocus(token) : setFocusSet([token]));
                  return html`<button key=${`f-${token}`} class="btn" aria-pressed=${active} onClick=${handler}>${token}</button>`;
                })}
              </div>
            </div>

            ${computed === "scaling"
              ? html`
                  <div class="control-cluster">
                    <div class="control-head">Bucket size</div>
                    <div class="slider-row">
                      <input type="range" min="0" max=${base.length} value=${k} onInput=${(event) => setK(+event.target.value)} />
                      <span class="pill">k = ${k}</span>
                      <button class="btn ghost" onClick=${() => setPlaying((previous) => !previous)}>${playing ? "Stop" : "Animate"}</button>
                    </div>
                    <div class="ctrl-note">Scaling averages the active evaluation slice across every training world whose size is k.</div>
                  </div>
                `
              : null}

            <div class="inline-note">${questionSummary.trace}</div>
          </section>

          <section class="panel-card">
            <div class="panel-head">
              <span class="panel-step">2</span>
              <div>
                <span class="summary-kicker">Scene</span>
                <h3 class="panel-title">Lock in the training world and evaluation slice.</h3>
              </div>
            </div>
            <p class="panel-copy">Use the selectors for deliberate jumps, then click directly in the grid when you want to inspect nearby worlds.</p>

            <div class="control-grid">
              <div class="control-field">
                <div class="control-label">
                  Training world
                  ${InfoTip("Choose the active training subset. Leave-one-out style comparisons are anchored to this row.")}
                </div>
                <select value=${rowIdx} onChange=${(event) => setRowIdx(+event.target.value)}>
                  ${subs.map(
                    (subset, index) => html`<option value=${index} key=${`r-${index}`}>${index}. ${label(subset)}</option>`,
                  )}
                </select>
              </div>

              <div class="control-field">
                <div class="control-label">
                  Evaluation slice
                  ${InfoTip("Choose which evaluation subset provides the active column and the slice used by the summary cards.")}
                </div>
                <select value=${colIdx} onChange=${(event) => setColIdx(+event.target.value)}>
                  ${subs.map(
                    (subset, index) => html`<option value=${index} key=${`c-${index}`}>${index}. ${label(subset)}</option>`,
                  )}
                </select>
              </div>

              <div class="control-field">
                <div class="control-label">
                  Toy universe size
                  ${InfoTip("How many base points exist (A, B, C...). Rows and columns grow as the powerset of this toy universe.")}
                </div>
                <div class="slider-row">
                  <input type="range" min="2" max="8" value=${count} onInput=${(event) => setCount(+event.target.value)} />
                  <span class="pill">${count}</span>
                </div>
              </div>

              <div class="control-field control-field-full">
                <div class="control-label">
                  Cell score
                  ${InfoTip("Jaccard = overlap divided by union. |Intersection| = raw count. Entropy = binary entropy of the overlap.")}
                </div>
                <div class="segmented-row">
                  <button class="btn" aria-pressed=${metric === "jaccard"} onClick=${() => setMetric("jaccard")}>Jaccard</button>
                  <button class="btn" aria-pressed=${metric === "inter"} onClick=${() => setMetric("inter")}>|Intersection|</button>
                  <button class="btn" aria-pressed=${metric === "entropy"} onClick=${() => setMetric("entropy")}>Entropy</button>
                </div>
                <div class="control-note">Current score means: ${metricMeta[metric].description}.</div>
              </div>
            </div>
          </section>
        </aside>

        <div class="workspace-main">
          <section class="workspace-toolbar">
            <div class="toolbar-bar">
              <div class="toolbar-lights" aria-hidden="true">
                <span></span>
                <span></span>
                <span></span>
              </div>
              <div class="toolbar-title-group">
                <span class="toolbar-title">Explorer Console</span>
                <span class="toolbar-subtitle">${questionSummary.answerLabel}</span>
              </div>
              <span class="toolbar-status">${currentWorldLabel}</span>
            </div>

            <div class="toolbar-grid">
              <section class="toolbar-group">
                <div class="toolbar-label">Mode</div>
                <div class="segmented-row mode-toggle">
                  <button class="btn mini" aria-pressed=${uiMode === "simple"} onClick=${() => setUiMode("simple")}>Simple</button>
                  <button class="btn mini" aria-pressed=${uiMode === "advanced"} onClick=${() => setUiMode("advanced")}>Advanced</button>
                </div>
                <div class="toolbar-note">${modeCopy}</div>
              </section>

              ${uiMode === "advanced"
                ? html`
                    <section class="toolbar-group">
                      <div class="toolbar-label">
                        World layer
                        ${InfoTip("Operator view shows the edited matrix; Real world shows the untouched reference matrix.")}
                      </div>
                      <div class="segmented-row">
                        <button class="btn mini" aria-pressed=${gridView === "operator"} onClick=${() => setGridView("operator")}>Operator</button>
                        <button class="btn mini" aria-pressed=${gridView === "real"} onClick=${() => setGridView("real")}>Reference</button>
                      </div>
                      <div class="toolbar-note">${advancedWorldSummary}</div>
                    </section>

                    <section class="toolbar-group">
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

                    <section class="toolbar-group">
                      <div class="toolbar-label">
                        Display
                        ${InfoTip("These controls only change how the grid is rendered, not the underlying counterfactual question.")}
                      </div>
                      <label class="checkbox-row">
                        <input type="checkbox" checked=${showNums} onChange=${(event) => setShowNums(event.target.checked)} />
                        Show cell values
                      </label>
                      <select value=${paletteName} onChange=${(event) => setPaletteName(event.target.value)}>
                        ${Object.keys(palettes).map((name) => html`<option value=${name}>${name}</option>`)}
                      </select>
                      <div class="toolbar-note">${editSummary}</div>
                    </section>

                    <section class="toolbar-group toolbar-group-actions">
                      <div class="toolbar-label">
                        Export
                        ${InfoTip("Downloads use the current question, live config, and whichever matrix is on screen right now.")}
                      </div>
                      <div class="export-actions">
                        <button class="btn mini" onClick=${exportJson}>Export JSON</button>
                        <button class="btn ghost mini" onClick=${exportCsv}>Export CSV</button>
                      </div>
                      <details class="guide-details toolbar-drawer">
                        <summary>Inspect live settings</summary>
                        <div class="ctrl-note">This is the same state currently driving the figure below.</div>
                        <pre class="json-block">${settingsJson}</pre>
                      </details>
                    </section>
                  `
                : html`
                    <section class="toolbar-group toolbar-group-note">
                      <div class="toolbar-label">Workspace status</div>
                      <div class="toolbar-note">
                        Simple mode keeps the reference grid front and center. Switch to Advanced when you want operator layers, toy edits,
                        palette controls, and exports.
                      </div>
                      <div class="summary-inline toolbar-pills">
                        <span class="pill">Reference grid</span>
                        <span class="pill">Minimal chrome</span>
                        <span class="pill">Advanced tools parked</span>
                      </div>
                    </section>
                  `}
            </div>
          </section>

          <section class="stage-panel">
            <div class="panel-head stage-head">
              <div>
                <span class="summary-kicker">Live figure</span>
                <h2 class="stage-title">${questionSummary.title}</h2>
              </div>
              <div class="grid-meta-strip">
                <span class="pill">${questionMeta[computed]}</span>
                <span class="pill">${modeLabel}</span>
                <span class="pill">${currentWorldLabel}</span>
              </div>
            </div>
            <p class="stage-copy">${questionSummary.question}</p>

            <div class="scene-fact-grid">
              ${sceneFacts.map(
                (entry) => html`
                  <div key=${entry.label} class="scene-fact">
                    <div class="scene-fact-label">${entry.label}</div>
                    <div class="scene-fact-value">${entry.value}</div>
                  </div>
                `,
              )}
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

          <section class="grid-card grid-card-outer">
            <div class="grid-card-head">
              <div>
                <span class="summary-kicker">Counterfactual grid</span>
                <h3 class="grid-card-title">Rows are worlds; columns are slices.</h3>
                <p class="grid-card-copy">${highlightSummary}</p>
              </div>
              <div class="grid-meta-strip">
                <span class="pill">${metricMeta[metric].short}</span>
                <span class="pill">Train ${label(Srow)}</span>
                <span class="pill">Eval ${label(evalSet)}</span>
                ${uiMode === "advanced" ? html`<span class="pill">${paletteName}</span>` : null}
                ${uiMode === "advanced" ? html`<span class="pill">${effectiveShowNums ? "Numbers on" : "Color only"}</span>` : null}
              </div>
            </div>

            <div class="grid-wrap stage-grid" ref=${gridWrapRef}>
              <div style="display:flex">
                <div class="rl" style="width:var(--grid-axis-w)"></div>
                ${subs.map((colSet, colIndex) => {
                  const active = colIndex === safeColIdx;
                  return html`
                    <div
                      key=${`col-${colIndex}`}
                      class=${`cl ${active ? "axis-active" : ""}`}
                      title=${`Col ${colIndex}: ${label(colSet)}`}
                      onClick=${() => setColIdx(colIndex)}
                    >
                      ${formatColumnHeader(colIndex)}
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
                      title=${`Row ${rowIndex}: ${label(rowSet)}`}
                      onClick=${() => setRowIdx(rowIndex)}
                    >
                      ${formatRowHeader(rowIndex, rowSet)}
                    </div>
                    ${subs.map((evSet, colIndex) => {
                      const value = displayMatrix[rowIndex][colIndex];
                      const normalized = normalizeValue(value, dispMin, dispMax, 0.5);
                      const isSel = rowIndex === safeRowIdx && colIndex === safeColIdx;
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
                          title=${`Train ${label(rowSet)} | Eval ${label(evSet)} | value ${value.toFixed(3)}`}
                          onClick=${() => {
                            setRowIdx(rowIndex);
                            setColIdx(colIndex);
                          }}
                          style=${{ background: palette(normalized) }}
                        >
                          ${thin ? html`<div class="ring ring-thin"></div>` : null}
                          ${thick ? html`<div class="ring ring-thick"></div>` : null}
                          ${edited ? html`<div class="edit-flag" title="Toy edit affects this row in operator view"></div>` : null}
                          ${effectiveShowNums
                            ? html`<div class="num" style=${{ color: normalized > 0.56 ? "#1f1a16" : "#fffaf2" }}>${value.toFixed(2)}</div>`
                            : null}
                        </div>
                      `;
                    })}
                  </div>
                `;
              })}
            </div>

            <div class="comparison-legend">
              <div>
                <b>White outline:</b> selected cell. <b>Amber ring:</b> comparison source. <b>Cyan ring:</b> comparison partner.
                ${uiMode === "advanced" ? html` <b>Red corner:</b> toy edit touches that row in operator view.` : null}
              </div>
              <div><b>Axis ids:</b> column headers use subset ids for readability at larger grid sizes; the full active row and column labels stay spelled out above.</div>
              <div>${formulaLine}</div>
            </div>
          </section>

          <div class="inspector-grid">
            ${analysisDetailBlock}

            <section class="analysis-card">
              <div class="analysis-head">
                <div>
                  <span class="summary-kicker">Reading guide</span>
                  <h3 class="card-title">Use the figure in a steady order.</h3>
                </div>
              </div>
              <div class="guide-list">
                ${sceneSteps.map(
                  (entry) => html`
                    <div class="guide-item" key=${entry.step}>
                      <span class="panel-step">${entry.step}</span>
                      <div>
                        <div class="guide-item-label">${entry.title}</div>
                        <div class="guide-item-value">${entry.value}</div>
                        <div class="guide-item-note">${entry.detail}</div>
                      </div>
                    </div>
                  `,
                )}
              </div>
              <div class="story-note">${highlightSummary}</div>
            </section>
          </div>
        </div>
      </section>

      <section class="support-card">
        <div class="panel-head">
          <div>
            <span class="summary-kicker">Questions</span>
            <h3 class="panel-title">Keep the explanation close to the interaction.</h3>
          </div>
        </div>
        <p class="panel-copy">
          Most first-pass confusion comes from mixing up worlds, slices, and focus points. These answers stay attached to the
          workspace so you do not have to leave the figure to recover the mental model.
        </p>

        <div class="faq-stack">
          ${faqEntries.map(
            (entry, index) => html`
              <details key=${entry.question} open=${index === 0}>
                <summary>${entry.question}</summary>
                <div class="control-note">${entry.answer}</div>
              </details>
              `,
            )}
        </div>
      </section>
    </div>
  `;
}

export default App;
