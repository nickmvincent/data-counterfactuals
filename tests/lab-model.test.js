import test from "node:test";
import assert from "node:assert/strict";

import {
  LAB_SCHEMA,
  METRICS,
  SCENARIOS,
  bestBudgetWorld,
  comparisonMatched,
  createExploreState,
  createInitialState,
  deriveComparison,
  deriveExploreComparisons,
  deriveWorkload,
  enumerateSubsets,
  evaluateMetric,
  formatCount,
  labReducer,
  layerAverages,
  parseLabState,
  serializeLabState,
  validateLabState,
  worldKey,
  worldFromKey,
} from "../src/lib/lab-model.js";

test("all prepared scenarios create deterministic, finite comparisons", () => {
  assert.equal(SCENARIOS.length, 8);
  for (const scenario of SCENARIOS) {
    const state = createInitialState(scenario.id);
    const comparison = deriveComparison(state);
    assert.equal(state.schema, LAB_SCHEMA);
    assert.ok(Number.isFinite(comparison.baselineScore));
    assert.ok(Number.isFinite(comparison.counterfactualScore));
    assert.ok(Number.isFinite(comparison.delta));
    assert.equal(comparisonMatched(state), false);

    const matched = labReducer(state, {
      type: "SET_EVIDENCE",
      evidence: [worldKey(state.baseline), worldKey(state.counterfactual)],
    });
    assert.equal(comparisonMatched(matched), true);
  }
});

test("the toy score functions match their transparent definitions", () => {
  const base = createInitialState();
  const sample = { train: ["A", "C"], eval: ["A", "B", "C"] };
  const metric = (id) => ({ ...base, metric: { id, parameters: {} } });

  assert.equal(evaluateMetric(metric("coverage"), sample), 2 / 3);
  assert.equal(evaluateMetric(metric("jaccard"), sample), 2 / 3);
  assert.equal(evaluateMetric(metric("raw-overlap"), sample), 2);

  const weighted = {
    ...metric("weighted-coverage"),
    objects: [
      { id: "A", label: "A", weight: 0.5 },
      { id: "B", label: "B", weight: 0.2 },
      { id: "C", label: "C", weight: 0.3 },
    ],
  };
  assert.equal(evaluateMetric(weighted, sample), 0.8);

  const poisoned = {
    ...metric("toy-poisoned-coverage"),
    advanced: { ...base.advanced, poisonPenalty: 0.2 },
  };
  assert.equal(
    evaluateMetric(poisoned, {
      train: ["A", "B", "C"],
      eval: ["A", "B", "C"],
      corrupted: ["B"],
    }),
    0.8,
  );
  assert.equal(METRICS.length, 6);
});

test("the SILO scene preserves the published observations without filling missing cells", () => {
  const state = createInitialState("silo-opt-out");
  const comparison = deriveComparison(state);

  assert.equal(comparison.baselineScore, 12.9);
  assert.equal(comparison.counterfactualScore, 16.5);
  assert.ok(Math.abs(comparison.delta - 3.6) < 1e-12);
  assert.equal(
    evaluateMetric(state, { train: ["R"], eval: [] }),
    null,
  );

  const study = SCENARIOS.find((scenario) => scenario.id === "silo-opt-out")
    .empirical;
  assert.equal(study.rows.length, 7);
  assert.equal(study.source.table, "Table 6");
});

test("JSON state round trips and invalid references are rejected atomically", () => {
  const state = createInitialState("coalition-strike");
  const serialized = serializeLabState(state);
  const parsed = parseLabState(serialized);
  assert.equal(parsed.ok, true);
  assert.deepEqual(parsed.value, validateLabState(state).value);

  const invalid = JSON.parse(serialized);
  invalid.counterfactual.train.push("MISSING");
  invalid.objects.push({ id: "A", label: "duplicate", weight: 1 });
  invalid.advanced.poisonPenalty = Number.POSITIVE_INFINITY;
  const result = validateLabState(invalid);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((message) => message.includes("duplicate")));
  assert.ok(result.errors.some((message) => message.includes("MISSING")));
  assert.ok(result.errors.some((message) => message.includes("poisonPenalty")));

  const missingEmpiricalSource = createInitialState();
  missingEmpiricalSource.metric = {
    id: "empirical-perplexity",
    parameters: {},
  };
  const empiricalResult = validateLabState(missingEmpiricalSource);
  assert.equal(empiricalResult.ok, false);
  assert.ok(
    empiricalResult.errors.some((message) =>
      message.includes("prepared empirical scenario"),
    ),
  );
});

test("workload tiers avoid enumerating huge spaces and report analytic counts", () => {
  let state = createInitialState();
  assert.equal(deriveWorkload(state).tier, "exact");

  for (let index = 0; index < 8; index += 1) {
    state = labReducer(state, { type: "ADD_OBJECT" });
  }
  assert.equal(state.objects.length, 11);
  assert.equal(deriveWorkload(state).tier, "windowed");

  for (let index = 0; index < 5; index += 1) {
    state = labReducer(state, { type: "ADD_OBJECT" });
  }
  const aggregate = deriveWorkload(state);
  assert.equal(state.objects.length, 16);
  assert.equal(aggregate.tier, "aggregate");
  assert.equal(formatCount(aggregate.worlds), "65,536");
  assert.throws(() => enumerateSubsets(state.objects.map((item) => item.id)));
});

test("scaling averages and the budgeted optimum are available without fake rows", () => {
  const scaling = createInitialState("scaling");
  const averages = layerAverages(scaling);
  assert.equal(averages.length, 6);
  assert.equal(averages[0].average, 0);
  assert.equal(averages.at(-1).average, 1);

  const budgeted = createInitialState("budget-selection");
  const best = bestBudgetWorld(budgeted);
  assert.deepEqual(best.train, ["A", "C"]);
  assert.equal(best.score, (0.32 + 0.26) / (0.32 + 0.26 + 0.25));
});

test("explore mode resets selection and classifies every A by B pairing", () => {
  let state = createExploreState();
  assert.equal(state.mode, "explore");
  assert.deepEqual(state.selection.worldA, []);
  assert.deepEqual(state.selection.worldB, []);

  const worlds = {
    leftTraining: { train: ["A", "B"], eval: ["A", "B", "C"] },
    leftEvaluation: { train: ["A", "B"], eval: ["A", "B"] },
    rightRemoval: { train: ["A"], eval: ["A", "B", "C"] },
    rightEvaluation: { train: ["A", "B"], eval: ["A", "B", "C"] },
  };
  state = {
    ...state,
    selection: {
      ...state.selection,
      worldA: [
        worldKey(worlds.leftTraining),
        worldKey(worlds.leftEvaluation),
      ],
      worldB: [
        worldKey(worlds.rightRemoval),
        worldKey(worlds.rightEvaluation),
      ],
    },
  };

  const analysis = deriveExploreComparisons(state);
  assert.equal(analysis.totalPairings, 4);
  assert.equal(analysis.counterfactualCount, 3);
  assert.equal(analysis.identicalCount, 1);
  assert.deepEqual(
    analysis.categories.map((item) => [item.id, item.count]),
    [
      ["training-removal", 1],
      ["evaluation-shift", 1],
      ["joint-shift", 1],
    ],
  );
  assert.equal(analysis.direction.negative, 3);
  assert.deepEqual(
    worldFromKey(worldKey(worlds.rightRemoval)),
    worlds.rightRemoval,
  );
});

test("explore cell assignment moves a cell between A and B", () => {
  let state = labReducer(createInitialState(), {
    type: "SET_MODE",
    mode: "explore",
  });
  const key = worldKey({ train: ["A"], eval: ["A", "B", "C"] });
  state = labReducer(state, { type: "TOGGLE_EXPLORE_WORLD", key });
  assert.deepEqual(state.selection.worldA, [key]);

  state = labReducer(state, { type: "SET_ACTIVE_WORLD", world: "b" });
  state = labReducer(state, { type: "TOGGLE_EXPLORE_WORLD", key });
  assert.deepEqual(state.selection.worldA, []);
  assert.deepEqual(state.selection.worldB, [key]);
});

test("concept recommendations can add missing evidence to both world sets", () => {
  let state = createExploreState();
  const worldA = worldKey({ train: ["A", "B", "C"], eval: ["A", "B", "C"] });
  const worldB = worldKey({ train: ["A", "C"], eval: ["A", "B", "C"] });
  state = labReducer(state, {
    type: "ADD_EXPLORE_WORLDS",
    worldA: [worldA],
    worldB: [worldB],
  });

  assert.deepEqual(state.selection.worldA, [worldA]);
  assert.deepEqual(state.selection.worldB, [worldB]);
});
