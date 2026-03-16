import test from "node:test";
import assert from "node:assert/strict";

import {
  applyGridEdits,
  buildSubsetGrid,
  computeLooDelta,
  computeScalingStats,
  computeSemivalueStats,
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

test("Banzhaf and Beta-Shapley reuse the same pair universe but different weights", () => {
  const items = ["A", "B", "C", "D"];
  const { matrix, subsets } = buildSubsetGrid(items, "jaccard");
  const evalColumnIndex = findSubsetIndex(subsets, ["A", "B", "C", "D"]);
  const banzhaf = computeSemivalueStats({
    matrix,
    subsets,
    focusItem: "B",
    evalColumnIndex,
    playerCount: items.length,
    mode: "banzhaf",
  });
  const beta = computeSemivalueStats({
    matrix,
    subsets,
    focusItem: "B",
    evalColumnIndex,
    playerCount: items.length,
    mode: "beta",
    alpha: 4,
    beta: 1,
  });

  assert.equal(banzhaf.cnt, 8);
  assert.equal(beta.cnt, 8);
  assert.ok(Math.abs(banzhaf.totalWeight - 1) < 1e-9);
  assert.ok(Math.abs(beta.totalWeight - 1) < 1e-9);
  assert.ok(beta.rows.at(-1).weight > beta.rows[0].weight);
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

test("real-data metric stays bounded and rewards fuller training coverage on the toy dataset", () => {
  const items = ["A", "B", "C", "D"];
  const { matrix, subsets } = buildSubsetGrid(items, "real");
  const fullIndex = findSubsetIndex(subsets, ["A", "B", "C", "D"]);
  const emptyIndex = findSubsetIndex(subsets, []);

  for (const row of matrix) {
    for (const value of row) {
      assert.ok(value >= 0 && value <= 1);
    }
  }

  assert.ok(matrix[fullIndex][fullIndex] >= matrix[emptyIndex][fullIndex]);
});

test("real-data metric supports stable precomputed grids and perturbed live resamples", () => {
  const items = ["A", "B", "C", "D"];
  const precomputedA = buildSubsetGrid(items, "real", { realDataMode: "precomputed" });
  const precomputedB = buildSubsetGrid(items, "real", { realDataMode: "precomputed" });
  const liveA = buildSubsetGrid(items, "real", { realDataMode: "live", realDataSample: 1 });
  const liveB = buildSubsetGrid(items, "real", { realDataMode: "live", realDataSample: 2 });

  assert.deepEqual(precomputedA.matrix, precomputedB.matrix);
  assert.notDeepEqual(liveA.matrix, liveB.matrix);
});

test("concept presets can all execute without missing setters", () => {
  const calls = [];
  const record = (name) => (value) => calls.push([name, value]);

  const presets = createTutorialPresets({
    setCount: record("count"),
    setMetric: record("metric"),
    setFocusSet: record("focus"),
    setK: record("k"),
    setConceptMode: record("mode"),
    setShowNums: record("showNums"),
    setPendingSelection: record("selection"),
    setPoisonActive: record("poison"),
    setGridView: record("gridView"),
    setBetaAlpha: record("alpha"),
    setBetaBeta: record("beta"),
    setEpsilon: record("epsilon"),
    setAuditTolerance: record("tolerance"),
  });

  for (const preset of presets) preset.setup();

  assert.equal(presets.length, 10);
  assert.ok(calls.length > 0);
});
