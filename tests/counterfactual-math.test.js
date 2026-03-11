import test from "node:test";
import assert from "node:assert/strict";

import {
  applyGridEdits,
  buildSubsetGrid,
  computeLooDelta,
  computeScalingStats,
  computeShapleyStats,
  createTutorialPresets,
  findSubsetIndex,
  selectAnalysisMatrix,
} from "../src/lib/counterfactual-math.js";

test("leave-one-out matches the direct row difference", () => {
  const items = ["A", "B", "C"];
  const { matrix, subsets } = buildSubsetGrid(items, "jaccard");
  const rowIndex = findSubsetIndex(subsets, ["A", "B", "C"]);
  const compareRowIndex = findSubsetIndex(subsets, ["A", "C"]);
  const colIndex = findSubsetIndex(subsets, ["A", "B", "C"]);

  const delta = computeLooDelta({
    matrix,
    rowIndex,
    colIndex,
    compareRowIndex,
  });

  assert.equal(delta, matrix[rowIndex][colIndex] - matrix[compareRowIndex][colIndex]);
});

test("Shapley weights sum to 1 and recover the known empty-eval example", () => {
  const items = ["A", "B", "C", "D"];
  const { matrix, subsets } = buildSubsetGrid(items, "jaccard");
  const stats = computeShapleyStats({
    matrix,
    subsets,
    focusItem: "B",
    evalColumnIndex: findSubsetIndex(subsets, []),
    playerCount: items.length,
  });

  assert.equal(stats.cnt, 8);
  assert.equal(stats.totalWeight, 1);
  assert.equal(stats.phi, -0.25);
});

test("operator and real matrices only diverge when edits are active", () => {
  const items = ["A", "B", "C"];
  const { matrix: baseMatrix, subsets } = buildSubsetGrid(items, "entropy");
  const untouchedOperator = applyGridEdits(baseMatrix, subsets, {
    focusSet: ["A"],
    poisonActive: false,
    noiseLevel: 0,
  });
  const editedOperator = applyGridEdits(baseMatrix, subsets, {
    focusSet: ["A"],
    poisonActive: true,
    noiseLevel: 0,
  });

  assert.deepEqual(selectAnalysisMatrix({
    baseMatrix,
    editedMatrix: untouchedOperator,
    gridView: "operator",
  }), baseMatrix);

  assert.notDeepEqual(editedOperator, baseMatrix);
  assert.deepEqual(selectAnalysisMatrix({
    baseMatrix,
    editedMatrix: editedOperator,
    gridView: "real",
  }), baseMatrix);
});

test("scaling stats preserve one row for the empty subset and combinatorial counts elsewhere", () => {
  const items = ["A", "B", "C"];
  const { matrix, subsets } = buildSubsetGrid(items, "inter");
  const scaling = computeScalingStats({
    matrix,
    subsets,
    maxSize: items.length,
    evalColumnIndex: findSubsetIndex(subsets, ["A", "B"]),
  });

  assert.deepEqual(scaling.map((row) => row.n), [1, 3, 3, 1]);
});

test("guided presets can all execute without missing setters", () => {
  const calls = [];
  const record = (name) => (value) => calls.push([name, value]);

  const presets = createTutorialPresets({
    setCount: record("count"),
    setMetric: record("metric"),
    setFocusSet: record("focus"),
    setK: record("k"),
    setShowNums: record("showNums"),
    setComputed: record("computed"),
    setPendingSelection: record("selection"),
    setPoisonActive: record("poison"),
    setNoiseLevel: record("noise"),
  });

  for (const preset of presets) preset.setup();

  assert.equal(presets.length, 5);
  assert.ok(calls.length > 0);
});
