import test from "node:test";
import assert from "node:assert/strict";

import {
  conceptAtlasEntries,
  conceptAtlasIds,
  conceptComparisonCards,
  conceptComparisonIds,
  getConceptAtlasEntry,
  getConceptComparisons,
} from "../src/lib/concept-atlas.js";
import {
  conceptSpecIds,
  conceptSpecs,
  graphLensIds,
  graphLensSpecs,
  playableConceptIds,
  visualGrammarEntries,
} from "../src/lib/concept-lens-specs.js";
import { gridConceptIds } from "../src/lib/grid-concept-planner.js";

test("concept atlas covers every playable explorer concept plus baseline exploration", () => {
  assert.deepEqual(conceptAtlasIds, ["explore", ...gridConceptIds]);
  assert.deepEqual(conceptAtlasIds, conceptSpecIds);
  assert.deepEqual(gridConceptIds, playableConceptIds);

  for (const entry of conceptAtlasEntries) {
    assert.ok(entry.name);
    assert.ok(entry.definition);
    assert.ok(entry.formula);
    assert.ok(entry.gridMove);
    assert.ok(entry.graphMove);
    assert.ok(entry.assumptions.length >= 2);
    assert.ok(entry.related.length >= 3);
  }
});

test("shared concept and lens specs provide the UI vocabulary", () => {
  assert.deepEqual(graphLensIds, ["ablation", "strike", "interaction", "shapley", "scaling", "eval-scaling", "dp", "poison"]);
  assert.equal(visualGrammarEntries.length, 12);

  for (const spec of conceptSpecs) {
    assert.ok(spec.label);
    assert.ok(spec.shortLabel);
    assert.ok(spec.description);
    assert.ok(spec.formula);
  }

  for (const lens of graphLensSpecs) {
    assert.ok(conceptSpecIds.includes(lens.conceptId), `${lens.id} points at missing concept ${lens.conceptId}`);
    assert.ok(lens.title);
    assert.ok(lens.tab);
    assert.ok(lens.summary);
  }
});

test("concept atlas lookup falls back to baseline exploration", () => {
  assert.equal(getConceptAtlasEntry("dp").name, "Differential privacy");
  assert.equal(getConceptAtlasEntry("unknown").id, "explore");
});

test("concept comparison cards connect distinct technical fields through grid moves", () => {
  assert.deepEqual(conceptComparisonIds, [
    "shapley-influence",
    "dp-unlearning",
    "strikes-poisoning",
    "scaling-datamodels",
  ]);

  for (const card of conceptComparisonCards) {
    assert.ok(card.title);
    assert.ok(card.left);
    assert.ok(card.right);
    assert.ok(card.sharedGridMove);
    assert.ok(card.distinction);
    assert.ok(card.bridge);
    assert.ok(card.caution);
    assert.ok(card.relatedConceptIds.length >= 2);
    for (const conceptId of card.relatedConceptIds) {
      assert.ok(conceptAtlasIds.includes(conceptId), `${card.id} references missing concept ${conceptId}`);
    }
  }
});

test("concept comparison lookup scopes cards to the active atlas concept", () => {
  assert.deepEqual(getConceptComparisons("dp").map((card) => card.id), ["dp-unlearning"]);
  assert.deepEqual(getConceptComparisons("poison").map((card) => card.id), ["strikes-poisoning"]);
  assert.equal(getConceptComparisons("explore").length, conceptComparisonCards.length);
});
