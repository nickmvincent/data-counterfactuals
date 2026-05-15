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
  const state = parseExplorerGameState("?count=4&metric=inter&mode=group&train=cba&eval=empty&focus=ddca&k=2");

  assert.equal(state.count, "4");
  assert.equal(state.metric, "inter");
  assert.equal(state.mode, "group");
  assert.equal(state.lens, "strike");
  assert.deepEqual(state.trainSet, ["A", "B", "C"]);
  assert.deepEqual(state.evalSet, []);
  assert.deepEqual(state.focusSet, ["A", "C", "D"]);
  assert.equal(state.k, "2");
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
    },
    "?source=demo&count=8",
  );

  assert.equal(search, "?source=demo&count=3&metric=inter&mode=eval&lens=ablation&train=ABC&eval=C&focus=B&k=1");
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
  assert.equal(graphLensToGridMode("shapley"), "shapley");
  assert.equal(graphLensToGridMode("ablation"), "loo");
  assert.deepEqual(normalizeSharedTokens(["D", "A", "A"], ["A", "B", "C"], ["B"]), ["A"]);
  assert.deepEqual(normalizeSharedTokens(["D"], ["A", "B", "C"], ["B"]), ["B"]);
  assert.equal(parseSharedCount("99", 4, 2, 7), 7);
  assert.equal(parseSharedCount("nope", 4, 2, 7), 4);
});
