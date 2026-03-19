import test from "node:test";
import assert from "node:assert/strict";

import { runExplorerApiRequest } from "../src/lib/explorer-api.js";

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
});
