import test from "node:test";
import assert from "node:assert/strict";

import { applyGridEdits, buildSubsetGrid } from "../src/lib/counterfactual-math.js";
import {
  buildConceptPlan,
  buildConceptPlans,
  cellsToIds,
  makeCellId,
} from "../src/lib/grid-concept-planner.js";

test("leave-one-out planner reports missing and ready cells", () => {
  const { matrix, subsets } = buildSubsetGrid(["A", "B", "C"], "jaccard");
  const rowIndex = subsets.findIndex((subset) => subset.join("") === "ABC");
  const colIndex = subsets.findIndex((subset) => subset.join("") === "C");

  const partial = buildConceptPlan({
    conceptId: "loo",
    matrix,
    subsets,
    universe: ["A", "B", "C"],
    rowIndex,
    colIndex,
    focusSet: ["B"],
    selectedCellIds: [makeCellId(rowIndex, colIndex)],
  });

  assert.equal(partial.status, "partial");
  assert.equal(partial.requiredCells.length, 2);
  assert.equal(partial.missingCells.length, 1);

  const ready = buildConceptPlan({
    conceptId: "loo",
    matrix,
    subsets,
    universe: ["A", "B", "C"],
    rowIndex,
    colIndex,
    focusSet: ["B"],
    selectedCellIds: cellsToIds(partial.requiredCells),
  });

  assert.equal(ready.status, "ready");
  assert.equal(ready.missingCells.length, 0);
  assert.match(ready.formula, /f\(ABC, C\)/);
});

test("shapley planner uses the whole active eval column for a focus item", () => {
  const universe = ["A", "B", "C"];
  const { matrix, subsets } = buildSubsetGrid(universe, "jaccard");
  const rowIndex = subsets.findIndex((subset) => subset.join("") === "ABC");
  const colIndex = subsets.findIndex((subset) => subset.join("") === "C");

  const plan = buildConceptPlan({
    conceptId: "shapley",
    matrix,
    subsets,
    universe,
    rowIndex,
    colIndex,
    focusSet: ["B"],
    selectedCellIds: [],
  });

  assert.equal(plan.status, "partial");
  assert.equal(plan.requiredCells.length, subsets.length);
  assert.equal(plan.missingCells.length, subsets.length);
  assert.match(plan.explanation, /without B/);
});

test("planner marks unavailable concepts separately from missing selections", () => {
  const universe = ["A", "B", "C"];
  const { matrix, subsets } = buildSubsetGrid(universe, "jaccard");
  const rowIndex = subsets.findIndex((subset) => subset.join("") === "A");
  const colIndex = subsets.findIndex((subset) => subset.join("") === "C");

  const plans = buildConceptPlans({
    matrix,
    subsets,
    universe,
    rowIndex,
    colIndex,
    focusSet: ["B"],
    selectedCellIds: [makeCellId(rowIndex, colIndex)],
    k: 2,
  });

  const loo = plans.find((plan) => plan.id === "loo");
  const group = plans.find((plan) => plan.id === "group");
  const scaling = plans.find((plan) => plan.id === "scaling");

  assert.equal(loo.status, "unavailable");
  assert.match(loo.unavailableReason, /not present/);
  assert.equal(group.status, "unavailable");
  assert.match(group.unavailableReason, /at least two/);
  assert.equal(scaling.status, "partial");
});

test("scaling variants reuse visible grid buckets", () => {
  const universe = ["A", "B", "C"];
  const { matrix, subsets } = buildSubsetGrid(universe, "jaccard");
  const rowIndex = subsets.findIndex((subset) => subset.join("") === "ABC");
  const colIndex = subsets.findIndex((subset) => subset.join("") === "C");

  const evalScaling = buildConceptPlan({
    conceptId: "eval-scaling",
    matrix,
    subsets,
    universe,
    rowIndex,
    colIndex,
    focusSet: ["B"],
    selectedCellIds: [],
    k: 2,
  });

  const diagonalScaling = buildConceptPlan({
    conceptId: "diagonal-scaling",
    matrix,
    subsets,
    universe,
    rowIndex,
    colIndex,
    focusSet: ["B"],
    selectedCellIds: [],
    k: 2,
  });

  assert.equal(evalScaling.requiredCells.length, 3);
  assert.equal(diagonalScaling.requiredCells.length, 3);
  assert.match(evalScaling.formula, /Avg f\(ABC, E\)/);
  assert.match(diagonalScaling.formula, /Avg f\(S, S\)/);
});

test("budget scan and interaction plans expose their required cells", () => {
  const universe = ["A", "B", "C"];
  const { matrix, subsets } = buildSubsetGrid(universe, "jaccard");
  const rowIndex = subsets.findIndex((subset) => subset.join("") === "ABC");
  const colIndex = subsets.findIndex((subset) => subset.join("") === "C");

  const budget = buildConceptPlan({
    conceptId: "budget",
    matrix,
    subsets,
    universe,
    rowIndex,
    colIndex,
    focusSet: ["B"],
    selectedCellIds: [],
    k: 2,
  });

  const interaction = buildConceptPlan({
    conceptId: "interaction",
    matrix,
    subsets,
    universe,
    rowIndex,
    colIndex,
    focusSet: ["B", "C"],
    selectedCellIds: [],
  });

  assert.equal(budget.requiredCells.length, 3);
  assert.match(budget.formula, /max f\(S, C\)/);
  assert.equal(interaction.requiredCells.length, 4);
  assert.equal(interaction.status, "partial");
  assert.match(interaction.formula, /f\(ABC, C\)/);
});

test("privacy and poisoning plans expose mechanism-specific counterfactuals", () => {
  const universe = ["A", "B", "C"];
  const { matrix, subsets } = buildSubsetGrid(universe, "jaccard");
  const rowIndex = subsets.findIndex((subset) => subset.join("") === "ABC");
  const colIndex = subsets.findIndex((subset) => subset.join("") === "C");
  const operatorMatrix = applyGridEdits(matrix, subsets, {
    focusSet: ["B"],
    poisonActive: true,
  });

  const privacy = buildConceptPlan({
    conceptId: "dp",
    matrix,
    subsets,
    universe,
    rowIndex,
    colIndex,
    focusSet: ["B"],
    selectedCellIds: [],
    epsilon: 2,
  });

  const poisoning = buildConceptPlan({
    conceptId: "poison",
    matrix: operatorMatrix,
    cleanMatrix: matrix,
    operatorMatrix,
    subsets,
    universe,
    rowIndex,
    colIndex,
    focusSet: ["B"],
    selectedCellIds: [],
    poisonActive: true,
  });

  assert.equal(privacy.status, "partial");
  assert.equal(privacy.requiredCells.length, subsets.length * 2);
  assert.match(privacy.formula, /epsilon/);
  assert.equal(poisoning.status, "partial");
  assert.ok(Math.abs(poisoning.value + 0.15) < 1e-9);
  assert.match(poisoning.formula, /f_operator/);
});
