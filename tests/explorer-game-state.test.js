import test from "node:test";
import assert from "node:assert/strict";

import {
  buildExplorerHref,
  buildExplorerShareUrl,
  createExplorerGameStateSearch,
  graphLensToGridMode,
  gridModeToGraphLens,
  hasExplorerGameStateParams,
  normalizeSharedTokens,
  parseExplorerGameState,
  parseSharedCount,
} from "../src/lib/explorer-game-state.js";

test("shared explorer state parses compact URL subsets and compatible lenses", () => {
  const state = parseExplorerGameState("?count=4&metric=inter&mode=group&train=cba&eval=empty&focus=ddca&k=2&epsilon=1.5&audit=0.2&poison=1&gridView=operator");

  assert.equal(state.count, "4");
  assert.equal(state.metric, "inter");
  assert.equal(state.mode, "group");
  assert.equal(state.lens, "strike");
  assert.deepEqual(state.trainSet, ["A", "B", "C"]);
  assert.deepEqual(state.evalSet, []);
  assert.deepEqual(state.focusSet, ["A", "C", "D"]);
  assert.equal(state.k, "2");
  assert.equal(state.epsilon, "1.5");
  assert.equal(state.auditTolerance, "0.2");
  assert.equal(state.poisonActive, "1");
  assert.equal(state.gridView, "operator");
});

test("shared explorer state writes stable links while preserving unrelated params", () => {
  const search = createExplorerGameStateSearch(
    {
      count: 3,
      metric: "inter",
      mode: "eval",
      lens: "ablation",
      trainSet: ["C", "A", "B"],
      evalSet: ["C"],
      focusSet: ["B"],
      k: 1,
      epsilon: 2,
      auditTolerance: 0.25,
      poisonActive: false,
      gridView: "real",
    },
    "?source=demo&count=8",
  );

  assert.equal(search, "?source=demo&count=3&metric=inter&mode=eval&lens=ablation&train=ABC&eval=C&focus=B&k=1&epsilon=2&audit=0.25&poison=0&gridView=real");
  assert.equal(buildExplorerHref("/graph", { count: 2, trainSet: [], evalSet: ["A"] }), "/graph?count=2&train=empty&eval=A");
  assert.equal(
    buildExplorerShareUrl("/grid", { count: 3, mode: "loo", trainSet: ["A"], evalSet: ["C"] }, "https://example.test"),
    "https://example.test/grid?count=3&mode=loo&train=A&eval=C",
  );
  assert.equal(hasExplorerGameStateParams("?source=demo"), false);
  assert.equal(hasExplorerGameStateParams("?source=demo&train=ABC"), true);
});

test("shared explorer state normalizes cross-view choices", () => {
  assert.equal(gridModeToGraphLens("group"), "strike");
  assert.equal(gridModeToGraphLens("eval"), "ablation");
  assert.equal(gridModeToGraphLens("interaction"), "interaction");
  assert.equal(gridModeToGraphLens("eval-scaling"), "eval-scaling");
  assert.equal(gridModeToGraphLens("dp"), "dp");
  assert.equal(gridModeToGraphLens("poison"), "poison");
  assert.equal(gridModeToGraphLens("unlearning"), "dp");
  assert.equal(graphLensToGridMode("shapley"), "shapley");
  assert.equal(graphLensToGridMode("interaction"), "interaction");
  assert.equal(graphLensToGridMode("eval-scaling"), "eval-scaling");
  assert.equal(graphLensToGridMode("dp"), "dp");
  assert.equal(graphLensToGridMode("poison"), "poison");
  assert.equal(graphLensToGridMode("ablation"), "loo");
  assert.deepEqual(normalizeSharedTokens(["D", "A", "A"], ["A", "B", "C"], ["B"]), ["A"]);
  assert.deepEqual(normalizeSharedTokens(["D"], ["A", "B", "C"], ["B"]), ["B"]);
  assert.equal(parseSharedCount("99", 4, 2, 7), 7);
  assert.equal(parseSharedCount("nope", 4, 2, 7), 4);
});

test("shared explorer state resolves incompatible mode and lens pairs", () => {
  const state = parseExplorerGameState("?mode=eval&lens=poison&poison=1&gridView=operator");

  assert.equal(state.mode, "eval");
  assert.equal(state.lens, "ablation");
  assert.equal(state.poisonActive, "1");
  assert.equal(state.gridView, "operator");
});
