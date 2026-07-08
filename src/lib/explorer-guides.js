import { findSubsetIndex, labelSubset as label } from "./counterfactual-math.js";

function formatValue(value) {
  return Number.isFinite(value) ? value.toFixed(4) : "0.0000";
}

function formatSigned(value) {
  if (!Number.isFinite(value)) return "0.0000";
  return `${value > 0 ? "+" : ""}${value.toFixed(4)}`;
}

export function sameCell(left, right) {
  return left?.rowIndex === right?.rowIndex && left?.colIndex === right?.colIndex;
}

export function validGuideCells(cells, subsets) {
  return (cells || []).filter(
    (cell) =>
      cell &&
      cell.rowIndex >= 0 &&
      cell.rowIndex < subsets.length &&
      cell.colIndex >= 0 &&
      cell.colIndex < subsets.length,
  );
}

export function buildCellNarration({ rowIndex, colIndex, previousRowIndex, previousColIndex, matrix, subsets }) {
  const rowSet = subsets[rowIndex] || [];
  const colSet = subsets[colIndex] || [];
  const nextValue = matrix[rowIndex]?.[colIndex] ?? 0;
  const previousValue = matrix[previousRowIndex]?.[previousColIndex] ?? nextValue;
  const delta = nextValue - previousValue;
  const deltaText = rowIndex === previousRowIndex && colIndex === previousColIndex
    ? "This is the current anchor square."
    : `That is a ${formatSigned(delta)} shift from the previous anchor.`;
  return `Now reading train ${label(rowSet)} against eval ${label(colSet)}: ${formatValue(nextValue)}. ${deltaText}`;
}

export function buildGuidedSteps({ guide, base, subsets, matrix, activePlan, safeTrainIdx, safeEvalIdx, evaluationInterval }) {
  if (!guide) return [];

  const indexFor = (tokens) => findSubsetIndex(subsets, tokens.filter((token) => base.includes(token)).sort());
  const fullSet = base.slice();
  const fullIndex = indexFor(fullSet);
  const anchorRowIndex = guide.id === "readGrid" && fullIndex >= 0 ? fullIndex : safeTrainIdx;
  const anchorColIndex = guide.id === "readGrid" && fullIndex >= 0 ? fullIndex : safeEvalIdx;
  const anchorCell = { rowIndex: anchorRowIndex, colIndex: anchorColIndex };
  const anchorValue = matrix[anchorRowIndex]?.[anchorColIndex] ?? 0;
  const reducedSet = fullSet.length > 1 ? fullSet.slice(0, -1) : fullSet;
  const removedToken = fullSet.find((token) => !reducedSet.includes(token)) || base[base.length - 1] || "";
  const reducedIndex = indexFor(reducedSet);
  const comparisonCell = reducedIndex >= 0
    ? { rowIndex: reducedIndex, colIndex: anchorColIndex }
    : anchorCell;
  const comparisonValue = matrix[comparisonCell.rowIndex]?.[comparisonCell.colIndex] ?? anchorValue;
  const fullEvalCell = fullIndex >= 0 && fullIndex !== safeEvalIdx
    ? { rowIndex: safeTrainIdx, colIndex: fullIndex }
    : comparisonCell;
  const fullEvalValue = matrix[fullEvalCell.rowIndex]?.[fullEvalCell.colIndex] ?? anchorValue;

  if (guide.mode === "explore") {
    if (guide.id === "evalConfidence") {
      return [
        {
          title: "Read one measured world",
          objective: guide.goal,
          action: `Click the highlighted ${label(subsets[safeTrainIdx] || [])} / ${label(subsets[safeEvalIdx] || [])} square.`,
          why: "The number is the score. The small band shows how much evaluation evidence supports that score.",
          targetCells: [anchorCell],
          result: `This square scores ${formatValue(anchorValue)}. The eval interval is ${
            evaluationInterval.available ? `${formatValue(evaluationInterval.lower)} to ${formatValue(evaluationInterval.upper)}` : "not available"
          }.`,
        },
        {
          title: "Hold training fixed",
          objective: "Now change the measurement side while keeping the row fixed.",
          action: `Click the highlighted eval comparison at train ${label(subsets[fullEvalCell.rowIndex] || [])} / eval ${label(subsets[fullEvalCell.colIndex] || [])}.`,
          why: "When the row stays fixed, the comparison is about what the evaluation world is measuring.",
          targetCells: [fullEvalCell],
          result: `The larger eval world scores ${formatValue(fullEvalValue)}. Compare its band to the first cell before trusting a tiny difference.`,
        },
        {
          title: "Keep exploring cleanly",
          objective: "Guided Mode can stop here without changing free exploration.",
          action: "Exit the guide when you want the compact RTS controls back.",
          why: "Explore Mode keeps all controls available without the explanatory layer.",
          targetCells: [],
          result: "You have seen how score and evaluation uncertainty live in the same square.",
        },
      ];
    }

    return [
      {
        title: "Define the square",
        objective: guide.goal,
        action: `Click the highlighted ${label(subsets[anchorRowIndex] || [])} / ${label(subsets[anchorColIndex] || [])} square.`,
        why: "Every square is one counterfactual world: row data used for training, column data used for evaluation.",
        targetCells: [anchorCell],
        result: `Train ${label(subsets[anchorRowIndex] || [])} evaluated on ${label(subsets[anchorColIndex] || [])} scores ${formatValue(anchorValue)}.`,
      },
      {
        title: "Change one side",
        objective: "A counterfactual comparison changes one part while holding the other still.",
        action: `Click ${label(subsets[comparisonCell.rowIndex] || [])} / ${label(subsets[comparisonCell.colIndex] || [])}.`,
        why: removedToken
          ? `Eval stays ${label(subsets[comparisonCell.colIndex] || [])}, so the shift comes from removing ${removedToken} from training.`
          : "The evaluation column stays fixed, so the comparison isolates the training row.",
        targetCells: [comparisonCell],
        result: `The comparison square scores ${formatValue(comparisonValue)}, a ${formatSigned(comparisonValue - anchorValue)} shift.`,
      },
      {
        title: "Name the pattern",
        objective: "Once a comparison is visible, a formal query can compute it for you.",
        action: "Open Mode when you want a named computation, or Exit Guide to keep exploring.",
        why: "The guide taught the board grammar; Explore Mode stays clean for open-ended play.",
        targetCells: [],
        result: guide.how,
      },
    ];
  }

  if (activePlan?.steps?.length) {
    const planSteps = activePlan.steps.slice(0, 4).map((step, index) => ({
      title: step.title,
      objective: index === 0 ? guide.goal : activePlan.label,
      action: step.body,
      why: activePlan.description,
      targetCells: validGuideCells(step.cells, subsets),
      result: index === activePlan.steps.length - 1
        ? activePlan.formula
        : `${activePlan.shortLabel || "This query"} needs the highlighted ingredient cells.`,
    }));
    return [
      ...planSteps,
      {
        title: "Read the answer",
        objective: "The highlighted cells are the ingredients for the current computation.",
        action: "Use the result in the Intel drawer when you want the full formula, or continue moving the anchor.",
        why: "Guided Mode explains the path; Compute Mode keeps the query available after the guide exits.",
        targetCells: validGuideCells(activePlan.requiredCells, subsets),
        result: activePlan.formula,
      },
    ];
  }

  return [
    {
      title: guide.title,
      objective: guide.goal,
      action: guide.how,
      why: guide.concept,
      targetCells: [anchorCell],
      result: `Current score: ${formatValue(anchorValue)}.`,
    },
  ];
}
