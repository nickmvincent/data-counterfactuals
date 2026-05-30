import test from "node:test";
import assert from "node:assert/strict";

import { runExplorerApiRequest } from "../src/lib/explorer-api.js";
import { graphLensIds } from "../src/lib/concept-lens-specs.js";
import { gridConceptIds } from "../src/lib/grid-concept-planner.js";

test("grid matrix requests can return the operator-view matrix", () => {
  const response = runExplorerApiRequest({
    explorer: "grid",
    response: "matrix",
    count: 4,
    metric: "jaccard",
    conceptMode: "poison",
    gridView: "operator",
    poisonActive: true,
    focusSet: ["A"],
    train: "ABCD",
    eval: "ABCD",
  });

  assert.equal(response.explorer, "grid");
  assert.equal(response.response, "matrix");
  assert.equal(response.selection.value, 0.85);
  assert.equal(response.answer.label, "Attack delta");
  assert.equal(response.answer.value, -0.15);
});

test("grid cell requests accept subset arrays and return the selected cell", () => {
  const response = runExplorerApiRequest({
    explorer: "grid",
    response: "cell",
    state: {
      count: 4,
      metric: "inter",
      train: ["A", "B", "C"],
      eval: "AB",
    },
  });

  assert.equal(response.explorer, "grid");
  assert.equal(response.response, "cell");
  assert.equal(response.selection.train, "ABC");
  assert.equal(response.selection.eval, "AB");
  assert.equal(response.value, 2);
  assert.equal(response.evaluation.interval.available, true);
  assert.equal(response.evaluation.unitCount, 2);
});

test("graph answer requests mirror the graph explorer's ablation lens", () => {
  const response = runExplorerApiRequest({
    explorer: "graph",
    response: "answer",
    count: 4,
    metric: "jaccard",
    lens: "ablation",
    focusSet: ["B"],
    train: "ABCD",
    eval: "ABCD",
  });

  assert.equal(response.explorer, "graph");
  assert.equal(response.answer.label, "Ablation delta");
  assert.equal(response.answer.value, 0.25);
  assert.match(response.answer.formula, /ABCD/);
  assert.equal(response.evaluation.interval.available, true);
});

test("graph API accepts every graph lens and preserves lens-specific answers", () => {
  const expectedLabels = {
    ablation: "Ablation delta",
    strike: "Strike delta",
    interaction: "Interaction",
    shapley: "Shapley phi",
    scaling: "Average at k=2",
    "eval-scaling": "Eval avg k=2",
    dp: "Scale",
    poison: "Attack delta",
  };

  assert.deepEqual(Object.keys(expectedLabels), graphLensIds);

  for (const [lens, label] of Object.entries(expectedLabels)) {
    const response = runExplorerApiRequest({
      explorer: "graph",
      response: "answer",
      count: 4,
      metric: "jaccard",
      lens,
      focusSet: ["B", "C"],
      train: "ABCD",
      eval: "AB",
      k: 2,
      epsilon: 1.5,
      poisonActive: true,
      gridView: "operator",
    });

    assert.equal(response.normalizedState.lens, lens);
    assert.equal(response.answer.label, label);
    assert.equal(typeof response.answer.value, "number");
  }
});

test("covertype requests expose the real domain legend in graph responses", () => {
  const response = runExplorerApiRequest({
    explorer: "graph",
    response: "answer",
    count: 4,
    metric: "covertype",
    lens: "strike",
    focusSet: ["B"],
    train: "ABCD",
    eval: "ABCD",
  });

  assert.equal(response.explorer, "graph");
  assert.equal(response.normalizedState.metric, "covertype");
  assert.equal(response.subsetLegend.length, 4);
  assert.deepEqual(
    response.subsetLegend.map((domain) => domain.token),
    ["A", "B", "C", "D"],
  );
  assert.equal(response.subsetLegend[0].label, "Rawah");
  assert.ok(response.evaluation.unitCount > 1000);
});

test("requests can override evaluation confidence interval counts", () => {
  const response = runExplorerApiRequest({
    explorer: "grid",
    response: "cell",
    count: 4,
    metric: "real",
    train: "ABCD",
    eval: "AB",
    evaluationUnitCount: 40,
    confidenceLevel: 0.9,
  });

  assert.equal(response.evaluation.confidenceLevel, 0.9);
  assert.equal(response.evaluation.unitCount, 40);
  assert.equal(response.evaluation.interval.method, "wilson");
  assert.equal(response.evaluation.interval.available, true);
  assert.ok(response.evaluation.interval.lower <= response.value);
  assert.ok(response.evaluation.interval.upper >= response.value);
});

test("grid API uses the same count cap as the unified explorer", () => {
  const response = runExplorerApiRequest({
    explorer: "grid",
    response: "cell",
    count: 8,
    metric: "jaccard",
    train: "ABCDEFGH",
    eval: "ABCDEFGH",
  });

  assert.equal(response.normalizedState.count, 7);
  assert.equal(response.selection.train, "ABCDEFG");
  assert.equal(response.selection.eval, "ABCDEFG");
});

test("grid API accepts every playable concept mode", () => {
  for (const conceptMode of gridConceptIds) {
    const response = runExplorerApiRequest({
      explorer: "grid",
      response: "answer",
      count: 3,
      metric: "jaccard",
      conceptMode,
      focusSet: ["B", "C"],
      train: "ABC",
      eval: "A",
      k: 2,
      poisonActive: true,
      gridView: "operator",
    });

    assert.equal(response.normalizedState.conceptMode, conceptMode);
    assert.notEqual(response.answer.label, "Cell score");
    assert.equal(typeof response.answer.value, "number");
  }
});
