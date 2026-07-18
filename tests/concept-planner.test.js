import test from "node:test";
import assert from "node:assert/strict";

import { deriveTechnicalConceptPlans } from "../src/lib/concept-planner.js";
import {
  createExploreState,
  labReducer,
  worldKey,
} from "../src/lib/lab-model.js";

function withSelections(state, worldA, worldB) {
  return {
    ...state,
    selection: {
      ...state.selection,
      worldA: worldA.map(worldKey),
      worldB: worldB.map(worldKey),
    },
  };
}

function plan(result, id) {
  return result.plans.find((item) => item.id === id);
}

test("an evaluation pair unlocks evaluation-set value", () => {
  const state = withSelections(
    createExploreState(),
    [{ train: [], eval: [] }],
    [{ train: [], eval: ["A"] }],
  );
  const result = deriveTechnicalConceptPlans(state);
  const evaluation = plan(result, "evaluation-value");

  assert.equal(evaluation.status, "ready");
  assert.equal(evaluation.progress, 1);
  assert.equal(evaluation.missingA.length, 0);
  assert.equal(evaluation.missingB.length, 0);
  assert.ok(result.readyCount >= 1);
});

test("one neighboring training pair unlocks several cross-cutting concepts", () => {
  const state = withSelections(
    createExploreState(),
    [{ train: ["A", "B", "C"], eval: ["A", "B", "C"] }],
    [{ train: ["A", "C"], eval: ["A", "B", "C"] }],
  );
  const result = deriveTechnicalConceptPlans(state);

  assert.equal(plan(result, "leave-one-out").status, "ready");
  assert.equal(plan(result, "unlearning-reference").status, "ready");
  assert.equal(plan(result, "local-sensitivity").status, "ready");
});

test("partial concepts report the exact cells still needed by side", () => {
  const state = withSelections(
    createExploreState(),
    [{ train: ["A", "B", "C"], eval: ["A", "B", "C"] }],
    [],
  );
  const leaveOneOut = plan(
    deriveTechnicalConceptPlans(state),
    "leave-one-out",
  );

  assert.equal(leaveOneOut.status, "partial");
  assert.equal(leaveOneOut.progress, 0.5);
  assert.equal(leaveOneOut.missingA.length, 0);
  assert.equal(leaveOneOut.missingB.length, 1);
});

test("Shapley-family plans require every without-and-with coalition pair", () => {
  let state = labReducer(createExploreState(), { type: "REMOVE_OBJECT" });
  const evaluation = ["A", "B"];
  state = withSelections(
    state,
    [
      { train: [], eval: evaluation },
      { train: ["B"], eval: evaluation },
    ],
    [
      { train: ["A"], eval: evaluation },
      { train: ["A", "B"], eval: evaluation },
    ],
  );
  let result = deriveTechnicalConceptPlans(state);

  assert.equal(plan(result, "data-shapley").status, "ready");
  assert.equal(plan(result, "banzhaf-value").status, "ready");
  assert.equal(plan(result, "beta-shapley").status, "ready");

  state = withSelections(
    state,
    [
      { train: [], eval: evaluation },
      { train: ["B"], eval: evaluation },
    ],
    [{ train: ["A"], eval: evaluation }],
  );
  result = deriveTechnicalConceptPlans(state);
  const shapley = plan(result, "data-shapley");
  assert.equal(shapley.status, "partial");
  assert.equal(shapley.progress, 0.75);
  assert.equal(shapley.missingB.length, 1);
});
