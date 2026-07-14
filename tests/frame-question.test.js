import test from "node:test";
import assert from "node:assert/strict";
import { buildFrameQuestion, getRoleCompatibilityNote } from "../src/lib/frame-question.js";
import { interventionOptions, unitOptions } from "../src/lib/research-content.js";

test("every framing intervention and unit combination is grammatical", () => {
  for (const intervention of interventionOptions) {
    for (const unit of unitOptions) {
      const result = buildFrameQuestion({
        interventionId: intervention.id,
        unitLabel: unit.label,
        outcomeLabel: "model performance",
        roleLabel: "Training data",
      });

      assert.ok(result.title.length > unit.label.length);
      assert.match(result.question, /^How does model performance change when we /);
      assert.doesNotMatch(result.title, /terms (a|one) /i);
      assert.doesNotMatch(result.question, /terms (a|one) /i);
      assert.doesNotMatch(result.title, /evaluation (a|one) /i);
      assert.doesNotMatch(result.question, /evaluation (a|one) /i);
    }
  }
});

test("role compatibility notes flag role-specific interventions", () => {
  assert.equal(getRoleCompatibilityNote("access", "relicense"), "");
  assert.equal(getRoleCompatibilityNote("evaluation", "reserve"), "");
  assert.match(getRoleCompatibilityNote("training", "relicense"), /access-and-governance/);
  assert.match(getRoleCompatibilityNote("training", "reserve"), /evaluation-role/);
});
