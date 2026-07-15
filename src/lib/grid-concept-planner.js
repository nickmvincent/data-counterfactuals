import {
  computeEvalAdditionStats,
  computeRowRemovalStats,
  computeScalingStats,
  computeSemivalueStats,
  findSubsetIndex,
  labelSubset,
} from "./counterfactual-math.js";

export const gridConcepts = [
  {
    id: "loo",
    label: "Leave-one-out",
    shortLabel: "LOO",
    description: "Compare one selected train/eval world to the train world with one focus item removed.",
  },
  {
    id: "eval",
    label: "Eval value",
    shortLabel: "Eval",
    description: "Hold training fixed and compare the current eval world to one with a focus item added.",
  },
  {
    id: "group",
    label: "Group leave-one-out",
    shortLabel: "Group LOO",
    description: "Remove a focus coalition from the selected training world as one block.",
  },
  {
    id: "interaction",
    label: "Pair interaction",
    shortLabel: "Interaction",
    description: "Measure whether two focus items are more or less valuable together than separately.",
  },
  {
    id: "shapley",
    label: "Shapley value",
    shortLabel: "Shapley",
    description: "Average a focus item's marginal contribution across every partial training world.",
  },
  {
    id: "banzhaf",
    label: "Banzhaf value",
    shortLabel: "Banzhaf",
    description: "Use the Shapley pair universe, but weight every coalition equally.",
  },
  {
    id: "beta",
    label: "Beta Shapley",
    shortLabel: "Beta",
    description: "Use the same pair universe with beta-binomial coalition-size weights.",
  },
  {
    id: "scaling",
    label: "Scaling law",
    shortLabel: "Scaling",
    description: "Average all training worlds of the same size against the active eval world.",
  },
  {
    id: "eval-scaling",
    label: "Eval scaling",
    shortLabel: "Eval scaling",
    description: "Average all eval worlds of the same size against the active training world.",
  },
  {
    id: "diagonal-scaling",
    label: "Diagonal scaling",
    shortLabel: "Diagonal",
    description: "Average worlds where the training and evaluation subsets grow together.",
  },
  {
    id: "budget",
    label: "Budgeted subset scan",
    shortLabel: "Budget scan",
    description: "Find the highest-scoring training world of a fixed size against the active eval world.",
  },
  {
    id: "unlearning",
    label: "Unlearning audit",
    shortLabel: "Unlearning",
    description: "Compare the selected world to the exact retrain world without the focus item.",
  },
];

export const gridConceptIds = gridConcepts.map((concept) => concept.id);

export function makeCellId(rowIndex, colIndex) {
  return `${rowIndex}:${colIndex}`;
}

export function parseCellId(id) {
  const [row, col] = String(id).split(":").map((part) => Number.parseInt(part, 10));
  if (!Number.isInteger(row) || !Number.isInteger(col)) return null;
  return { rowIndex: row, colIndex: col };
}

export function uniqueCells(cells = []) {
  const seen = new Set();
  const out = [];
  cells.forEach((cell) => {
    if (!cell) return;
    const id = makeCellId(cell.rowIndex, cell.colIndex);
    if (seen.has(id)) return;
    seen.add(id);
    out.push({ rowIndex: cell.rowIndex, colIndex: cell.colIndex });
  });
  return out;
}

function selectedSetFrom(value = []) {
  if (value instanceof Set) return value;
  return new Set(value);
}

function splitCellsBySelection(requiredCells, selectedCellIds) {
  const selected = selectedSetFrom(selectedCellIds);
  const presentCells = [];
  const missingCells = [];

  requiredCells.forEach((cell) => {
    if (selected.has(makeCellId(cell.rowIndex, cell.colIndex))) {
      presentCells.push(cell);
    } else {
      missingCells.push(cell);
    }
  });

  return { presentCells, missingCells };
}

function cellPhrase(cell, subsets) {
  return `train ${labelSubset(subsets[cell.rowIndex] || [])} / eval ${labelSubset(subsets[cell.colIndex] || [])}`;
}

function statusFor(requiredCells, selectedCellIds, unavailableReason = "") {
  if (unavailableReason) {
    return {
      status: "unavailable",
      presentCells: [],
      missingCells: requiredCells,
      unavailableReason,
    };
  }

  const { presentCells, missingCells } = splitCellsBySelection(requiredCells, selectedCellIds);
  return {
    status: missingCells.length ? "partial" : "ready",
    presentCells,
    missingCells,
    unavailableReason: "",
  };
}

function defaultSteps({ label, requiredCells, subsets, formula, explanation }) {
  const anchor = requiredCells[0];
  const rest = requiredCells.slice(1);
  return [
    {
      title: "Start with the anchor cell",
      body: anchor ? `Read ${cellPhrase(anchor, subsets)} as the starting score.` : "Choose an anchor cell first.",
      cells: anchor ? [anchor] : [],
    },
    {
      title: `Collect the cells for ${label}`,
      body: rest.length
        ? `The remaining ${rest.length} cell${rest.length === 1 ? "" : "s"} supply the comparison terms.`
        : "This computation only needs the anchor cell.",
      cells: requiredCells,
    },
    {
      title: "Compute the value",
      body: `${explanation} ${formula}`,
      cells: requiredCells,
    },
  ];
}

function buildPlan({
  id,
  label,
  shortLabel,
  description,
  requiredCells,
  selectedCellIds,
  subsets,
  value,
  formula,
  explanation,
  unavailableReason = "",
  steps,
}) {
  const cleanRequiredCells = uniqueCells(requiredCells);
  const status = statusFor(cleanRequiredCells, selectedCellIds, unavailableReason);

  return {
    id,
    label,
    shortLabel,
    description,
    value,
    formula,
    explanation,
    requiredCells: cleanRequiredCells,
    ...status,
    steps: steps || defaultSteps({ label, requiredCells: cleanRequiredCells, subsets, formula, explanation }),
  };
}

function focusPrimary(focusSet, universe) {
  return focusSet.find((token) => universe.includes(token)) || universe[0] || "A";
}

function groupFocus(focusSet, universe) {
  const allowed = new Set(universe);
  return [...new Set(focusSet.filter((token) => allowed.has(token)))].sort();
}

function formatValue(value) {
  return Number.isFinite(value) ? value.toFixed(4) : "0.0000";
}

function averageCells(matrix, cells) {
  if (!cells.length) return 0;
  return cells.reduce((sum, cell) => sum + (matrix[cell.rowIndex]?.[cell.colIndex] ?? 0), 0) / cells.length;
}

function cellsWithRowSize(subsets, subsetSize, colIndex) {
  return subsets
    .map((subset, index) => (subset.length === subsetSize ? { rowIndex: index, colIndex } : null))
    .filter(Boolean);
}

function cellsWithColSize(subsets, rowIndex, subsetSize) {
  return subsets
    .map((subset, index) => (subset.length === subsetSize ? { rowIndex, colIndex: index } : null))
    .filter(Boolean);
}

function diagonalCellsWithSize(subsets, subsetSize) {
  return subsets
    .map((subset, index) => (subset.length === subsetSize ? { rowIndex: index, colIndex: index } : null))
    .filter(Boolean);
}

export function describeCell({ cell, matrix, subsets }) {
  const trainSet = subsets[cell.rowIndex] || [];
  const evalSet = subsets[cell.colIndex] || [];
  const value = matrix[cell.rowIndex]?.[cell.colIndex] ?? 0;

  return {
    id: makeCellId(cell.rowIndex, cell.colIndex),
    title: `f(${labelSubset(trainSet)}, ${labelSubset(evalSet)}) = ${formatValue(value)}`,
    body: `Train on ${labelSubset(trainSet)}; evaluate on ${labelSubset(evalSet)}. This cell is the score for that exact train/eval world.`,
    value,
    trainSet,
    evalSet,
  };
}

export function buildConceptPlan({
  conceptId,
  matrix,
  subsets,
  universe,
  rowIndex,
  colIndex,
  focusSet = [],
  selectedCellIds = [],
  k = 2,
  betaAlpha = 2,
  betaBeta = 2,
}) {
  const concept = gridConcepts.find((entry) => entry.id === conceptId) || gridConcepts[0];
  const trainSet = subsets[rowIndex] || [];
  const evalSet = subsets[colIndex] || [];
  const focus = focusPrimary(focusSet, universe);
  const group = groupFocus(focusSet, universe);
  const anchor = { rowIndex, colIndex };

  if (concept.id === "loo" || concept.id === "unlearning") {
    const stats = computeRowRemovalStats({
      matrix,
      subsets,
      rowIndex,
      colIndex,
      tokensToRemove: focus ? [focus] : [],
    });
    const hasComparison = stats.compareRowIndex >= 0 && stats.compareRowIndex !== rowIndex;
    const requiredCells = hasComparison ? [anchor, { rowIndex: stats.compareRowIndex, colIndex }] : [anchor];
    const value = concept.id === "unlearning" ? Math.abs(stats.delta) : stats.delta;
    const formula =
      concept.id === "unlearning"
        ? `|f(${labelSubset(trainSet)}, ${labelSubset(evalSet)}) - f(${labelSubset(stats.compareSet)}, ${labelSubset(evalSet)})| = ${formatValue(value)}`
        : `f(${labelSubset(trainSet)}, ${labelSubset(evalSet)}) - f(${labelSubset(stats.compareSet)}, ${labelSubset(evalSet)}) = ${formatValue(value)}`;

    return buildPlan({
      ...concept,
      requiredCells,
      selectedCellIds,
      subsets,
      value,
      formula,
      explanation:
        concept.id === "unlearning"
          ? `The audit compares the current world to the exact retrain world without ${focus}.`
          : `Leave-one-out removes ${focus} from the training world and keeps eval fixed.`,
      unavailableReason: hasComparison ? "" : `${focus} is not present in train ${labelSubset(trainSet)}.`,
    });
  }

  if (concept.id === "eval") {
    const stats = computeEvalAdditionStats({
      matrix,
      subsets,
      rowIndex,
      colIndex,
      tokensToAdd: focus ? [focus] : [],
    });
    const hasComparison = stats.compareColIndex >= 0 && stats.compareColIndex !== colIndex;
    const requiredCells = hasComparison ? [anchor, { rowIndex, colIndex: stats.compareColIndex }] : [anchor];

    return buildPlan({
      ...concept,
      requiredCells,
      selectedCellIds,
      subsets,
      value: stats.delta,
      formula: `f(${labelSubset(trainSet)}, ${labelSubset(stats.compareSet)}) - f(${labelSubset(trainSet)}, ${labelSubset(evalSet)}) = ${formatValue(stats.delta)}`,
      explanation: `Eval value adds ${focus} to the evaluation world while training stays fixed.`,
      unavailableReason: hasComparison ? "" : `${focus} is already present in eval ${labelSubset(evalSet)}.`,
    });
  }

  if (concept.id === "group") {
    const removable = group.filter((token) => trainSet.includes(token));
    const stats = computeRowRemovalStats({
      matrix,
      subsets,
      rowIndex,
      colIndex,
      tokensToRemove: group,
    });
    const hasComparison = group.length >= 2 && removable.length > 0 && stats.compareRowIndex >= 0 && stats.compareRowIndex !== rowIndex;
    const requiredCells = hasComparison ? [anchor, { rowIndex: stats.compareRowIndex, colIndex }] : [anchor];

    return buildPlan({
      ...concept,
      requiredCells,
      selectedCellIds,
      subsets,
      value: stats.delta,
      formula: `f(${labelSubset(trainSet)}, ${labelSubset(evalSet)}) - f(${labelSubset(stats.compareSet)}, ${labelSubset(evalSet)}) = ${formatValue(stats.delta)}`,
      explanation: `Group leave-one-out removes ${labelSubset(group)} together while eval stays fixed.`,
      unavailableReason:
        group.length < 2
          ? "Choose at least two focus items for a coalition."
          : hasComparison
            ? ""
            : `${labelSubset(group)} does not overlap train ${labelSubset(trainSet)}.`,
    });
  }

  if (concept.id === "interaction") {
    const pair = group.slice(0, 2);
    const [left, right] = pair;
    const hasPair = pair.length === 2 && pair.every((token) => trainSet.includes(token));
    const baseSet = hasPair ? trainSet.filter((token) => !pair.includes(token)) : trainSet;
    const leftSet = hasPair ? [...baseSet, left].sort() : trainSet;
    const rightSet = hasPair ? [...baseSet, right].sort() : trainSet;
    const bothSet = hasPair ? [...baseSet, ...pair].sort() : trainSet;
    const baseRowIndex = findSubsetIndex(subsets, baseSet);
    const leftRowIndex = findSubsetIndex(subsets, leftSet);
    const rightRowIndex = findSubsetIndex(subsets, rightSet);
    const bothRowIndex = findSubsetIndex(subsets, bothSet);
    const requiredCells =
      hasPair && [baseRowIndex, leftRowIndex, rightRowIndex, bothRowIndex].every((index) => index >= 0)
        ? [
            { rowIndex: bothRowIndex, colIndex },
            { rowIndex: leftRowIndex, colIndex },
            { rowIndex: rightRowIndex, colIndex },
            { rowIndex: baseRowIndex, colIndex },
          ]
        : [anchor];
    const value =
      requiredCells.length === 4
        ? (matrix[bothRowIndex]?.[colIndex] ?? 0) -
          (matrix[leftRowIndex]?.[colIndex] ?? 0) -
          (matrix[rightRowIndex]?.[colIndex] ?? 0) +
          (matrix[baseRowIndex]?.[colIndex] ?? 0)
        : 0;

    return buildPlan({
      ...concept,
      requiredCells,
      selectedCellIds,
      subsets,
      value,
      formula: `f(${labelSubset(bothSet)}, ${labelSubset(evalSet)}) - f(${labelSubset(leftSet)}, ${labelSubset(evalSet)}) - f(${labelSubset(rightSet)}, ${labelSubset(evalSet)}) + f(${labelSubset(baseSet)}, ${labelSubset(evalSet)}) = ${formatValue(value)}`,
      explanation: `Pair interaction compares ${left || "one item"} and ${right || "another item"} together against their two separate marginal effects.`,
      unavailableReason:
        pair.length < 2
          ? "Choose two focus items for an interaction term."
          : hasPair
            ? ""
            : `Train ${labelSubset(trainSet)} must contain both ${labelSubset(pair)}.`,
      steps: [
        {
          title: `Start from the joint world ${labelSubset(bothSet)}`,
          body: `The current train row supplies the together term for ${labelSubset(pair)}.`,
          cells: requiredCells.slice(0, 1),
        },
        {
          title: "Collect the separate worlds",
          body: `Compare against worlds with only ${left || "one item"} or only ${right || "the other item"}.`,
          cells: requiredCells.slice(0, 3),
        },
        {
          title: "Add back the background world",
          body: `The background ${labelSubset(baseSet)} corrects for what the two separate rows counted twice.`,
          cells: requiredCells,
        },
      ],
    });
  }

  if (concept.id === "scaling") {
    const scalingRows = computeScalingStats({
      matrix,
      subsets,
      maxSize: universe.length,
      evalColumnIndex: colIndex,
    });
    const bucket = scalingRows.find((entry) => entry.k === k) || { avg: 0, n: 0 };
    const requiredCells = cellsWithRowSize(subsets, k, colIndex);

    return buildPlan({
      ...concept,
      requiredCells,
      selectedCellIds,
      subsets,
      value: bucket.avg,
      formula: `Avg f(S, ${labelSubset(evalSet)}) over |S| = ${k} = ${formatValue(bucket.avg)}`,
      explanation: `Scaling averages every selected eval-column cell whose training world has size ${k}.`,
      unavailableReason: requiredCells.length ? "" : `There are no rows of size ${k}.`,
      steps: [
        {
          title: `Fix eval ${labelSubset(evalSet)}`,
          body: "Scaling holds the evaluation world fixed and scans down one column.",
          cells: requiredCells,
        },
        {
          title: `Collect every row with ${k} item${k === 1 ? "" : "s"}`,
          body: `${bucket.n} training world${bucket.n === 1 ? "" : "s"} contribute to this bucket.`,
          cells: requiredCells,
        },
        {
          title: "Average the bucket",
          body: `The average is ${formatValue(bucket.avg)}.`,
          cells: requiredCells,
        },
      ],
    });
  }

  if (concept.id === "eval-scaling") {
    const requiredCells = cellsWithColSize(subsets, rowIndex, k);
    const value = averageCells(matrix, requiredCells);

    return buildPlan({
      ...concept,
      requiredCells,
      selectedCellIds,
      subsets,
      value,
      formula: `Avg f(${labelSubset(trainSet)}, E) over |E| = ${k} = ${formatValue(value)}`,
      explanation: `Eval scaling holds the training row fixed and averages every evaluation world of size ${k}.`,
      unavailableReason: requiredCells.length ? "" : `There are no eval columns of size ${k}.`,
      steps: [
        {
          title: `Fix train ${labelSubset(trainSet)}`,
          body: "Eval scaling scans across one row instead of down one column.",
          cells: requiredCells,
        },
        {
          title: `Collect every eval world with ${k} item${k === 1 ? "" : "s"}`,
          body: `${requiredCells.length} evaluation world${requiredCells.length === 1 ? "" : "s"} contribute to this bucket.`,
          cells: requiredCells,
        },
        {
          title: "Average the bucket",
          body: `The average is ${formatValue(value)}.`,
          cells: requiredCells,
        },
      ],
    });
  }

  if (concept.id === "diagonal-scaling") {
    const requiredCells = diagonalCellsWithSize(subsets, k);
    const value = averageCells(matrix, requiredCells);

    return buildPlan({
      ...concept,
      requiredCells,
      selectedCellIds,
      subsets,
      value,
      formula: `Avg f(S, S) over |S| = ${k} = ${formatValue(value)}`,
      explanation: `Diagonal scaling grows train and eval together, then averages the same-subset cells of size ${k}.`,
      unavailableReason: requiredCells.length ? "" : `There are no diagonal worlds of size ${k}.`,
      steps: [
        {
          title: "Stay on the diagonal",
          body: "Every selected cell uses the same subset for training and evaluation.",
          cells: requiredCells,
        },
        {
          title: `Collect every size-${k} diagonal cell`,
          body: `${requiredCells.length} coupled world${requiredCells.length === 1 ? "" : "s"} contribute to this bucket.`,
          cells: requiredCells,
        },
        {
          title: "Average the coupled worlds",
          body: `The diagonal average is ${formatValue(value)}.`,
          cells: requiredCells,
        },
      ],
    });
  }

  if (concept.id === "budget") {
    const requiredCells = cellsWithRowSize(subsets, k, colIndex);
    const bestCell = requiredCells.reduce(
      (best, cell) => {
        const value = matrix[cell.rowIndex]?.[cell.colIndex] ?? 0;
        return value > best.value ? { cell, value } : best;
      },
      { cell: null, value: -Infinity },
    );
    const bestSet = bestCell.cell ? subsets[bestCell.cell.rowIndex] || [] : [];
    const value = Number.isFinite(bestCell.value) ? bestCell.value : 0;

    return buildPlan({
      ...concept,
      requiredCells,
      selectedCellIds,
      subsets,
      value,
      formula: `max f(S, ${labelSubset(evalSet)}) over |S| = ${k} is ${formatValue(value)} at train ${labelSubset(bestSet)}`,
      explanation: `The budget scan treats k as a retained-data budget and looks for the highest-scoring row in the active eval column.`,
      unavailableReason: requiredCells.length ? "" : `There are no rows of size ${k}.`,
      steps: [
        {
          title: `Fix eval ${labelSubset(evalSet)}`,
          body: "The scan compares candidate training worlds against one evaluation column.",
          cells: requiredCells,
        },
        {
          title: `Look only at rows with ${k} item${k === 1 ? "" : "s"}`,
          body: `${requiredCells.length} candidate row${requiredCells.length === 1 ? "" : "s"} fit the budget.`,
          cells: requiredCells,
        },
        {
          title: `Read the top row ${labelSubset(bestSet)}`,
          body: `The highest observed score in this budget bucket is ${formatValue(value)}.`,
          cells: bestCell.cell ? [bestCell.cell] : requiredCells,
        },
      ],
    });
  }

  const semivalueMode = concept.id === "banzhaf" ? "banzhaf" : concept.id === "beta" ? "beta" : "shapley";
  const stats = computeSemivalueStats({
    matrix,
    subsets,
    focusItem: focus,
    evalColumnIndex: colIndex,
    playerCount: universe.length,
    mode: semivalueMode,
    alpha: betaAlpha,
    beta: betaBeta,
  });
  const requiredCells = stats.pairs.flatMap((pair) => [
    { rowIndex: pair.subsetIndex, colIndex },
    { rowIndex: pair.withFocusIndex, colIndex },
  ]);
  const formula =
    concept.id === "beta"
      ? `Beta(${focus}; alpha=${betaAlpha}, beta=${betaBeta}; eval ${labelSubset(evalSet)}) = ${formatValue(stats.phi)}`
      : `${concept.shortLabel}(${focus}; eval ${labelSubset(evalSet)}) = ${formatValue(stats.phi)}`;

  return buildPlan({
    ...concept,
    requiredCells,
    selectedCellIds,
    subsets,
    value: stats.phi,
    formula,
    explanation: `${concept.label} compares each row without ${focus} to the matching row with ${focus}, all in eval ${labelSubset(evalSet)}.`,
    unavailableReason: stats.pairs.length ? "" : `No subset pairs are available for ${focus}.`,
    steps: [
      {
        title: `Fix eval ${labelSubset(evalSet)}`,
        body: "All pair comparisons stay in the same evaluation column.",
        cells: requiredCells,
      },
      {
        title: `Pair worlds without and with ${focus}`,
        body: `${stats.pairs.length} row pair${stats.pairs.length === 1 ? "" : "s"} contribute to this value.`,
        cells: requiredCells,
      },
      {
        title: "Average the marginal changes",
        body: `${concept.label} applies its weighting rule and returns ${formatValue(stats.phi)}.`,
        cells: requiredCells,
      },
    ],
  });
}

export function buildConceptPlans(options) {
  return gridConcepts.map((concept) => buildConceptPlan({ ...options, conceptId: concept.id }));
}

export function rankConceptPlan(plan) {
  if (plan.status === "ready") return 0;
  if (plan.status === "partial") return 1;
  return 2;
}

export function cellsForColumn(subsets, colIndex) {
  return subsets.map((_, rowIndex) => ({ rowIndex, colIndex }));
}

export function cellsForRow(subsets, rowIndex, visibleColIndices = subsets.map((_, index) => index)) {
  return visibleColIndices.map((colIndex) => ({ rowIndex, colIndex }));
}

export function cellsForCurrentCell(rowIndex, colIndex) {
  return [{ rowIndex, colIndex }];
}

export function cellsToIds(cells = []) {
  return uniqueCells(cells).map((cell) => makeCellId(cell.rowIndex, cell.colIndex));
}
