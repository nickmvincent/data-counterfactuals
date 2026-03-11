import test from "node:test";
import assert from "node:assert/strict";

import {
  buildDecisionBoundary,
  buildModelRun,
  metricMatrixFor,
  predictProbability,
  scenarioConfigs,
  subsetDefs,
} from "../public/advanced-simulator-core.js";

test("advanced simulator metrics stay finite and confusion counts match eval sizes", () => {
  const { resultMatrix, scenarioDataMap } = buildModelRun(0);

  for (let rowIndex = 0; rowIndex < resultMatrix.length; rowIndex += 1) {
    for (let colIndex = 0; colIndex < resultMatrix[rowIndex].length; colIndex += 1) {
      const cell = resultMatrix[rowIndex][colIndex];
      const evalSize = scenarioDataMap.get(scenarioConfigs[colIndex].id).length;
      const stats = cell.stats;
      const metrics = [stats.accuracy, stats.precision, stats.recall, stats.f1];

      for (const value of metrics) {
        assert.ok(Number.isFinite(value));
        assert.ok(value >= 0 && value <= 1);
      }

      const total = stats.counts.tp + stats.counts.fp + stats.counts.tn + stats.counts.fn;
      assert.equal(total, evalSize);
      assert.ok(Number.isFinite(cell.model.loss));
      assert.ok(cell.model.iterations > 0);
    }
  }
});

test("fixed-seed regression keeps the flagship ABCD/alpha accuracy stable", () => {
  const { resultMatrix } = buildModelRun(0);
  const rowIndex = subsetDefs.findIndex((subset) => subset.id === "ABCD");
  const colIndex = scenarioConfigs.findIndex((scenario) => scenario.id === "alpha");
  const accuracy = resultMatrix[rowIndex][colIndex].stats.accuracy;

  assert.ok(Math.abs(accuracy - 0.9642857142857143) < 1e-12);
});

test("metric matrix helper preserves board dimensions", () => {
  const { resultMatrix } = buildModelRun(0);
  const metricMatrix = metricMatrixFor(resultMatrix, "recall");

  assert.equal(metricMatrix.length, subsetDefs.length);
  assert.equal(metricMatrix[0].length, scenarioConfigs.length);
});

test("decision boundary and probabilities remain well-defined in raw feature space", () => {
  const { resultMatrix, scenarioDataMap } = buildModelRun(0);
  const model = resultMatrix[0][0].model;
  const boundary = buildDecisionBoundary(model);
  const sample = scenarioDataMap.get(scenarioConfigs[0].id)[0];
  const probability = predictProbability(model, sample);

  assert.ok(Number.isFinite(boundary.bias));
  assert.ok(Number.isFinite(boundary.xCoeff));
  assert.ok(Number.isFinite(boundary.yCoeff));
  assert.ok(probability >= 0 && probability <= 1);
});
