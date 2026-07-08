import assert from "node:assert/strict";
import test from "node:test";
import {
  buildPostTrainingModel,
  findPostTrainingOption,
  formatPostTrainingPercent,
  governanceOptions,
  interventionOptions,
  signalOptions,
} from "../src/lib/post-training-model.js";

test("post-training model keeps toy scores bounded and labeled", () => {
  const model = buildPostTrainingModel({
    signal: findPostTrainingOption(signalOptions, "preferences"),
    intervention: findPostTrainingOption(interventionOptions, "include"),
    governance: findPostTrainingOption(governanceOptions, "licensed"),
    participation: 85,
  });

  assert.equal(model.stageScores.length, 5);
  assert.equal(model.metrics.length, 4);
  assert.match(model.summary, /baseline/);

  for (const stage of model.stageScores) {
    assert.ok(stage.score >= 0 && stage.score <= 1, `${stage.id} score should stay bounded`);
  }

  for (const metric of model.metrics) {
    assert.ok(metric.value >= 0 && metric.value <= 1, `${metric.label} metric should stay bounded`);
  }
});

test("post-training withholding shifts the toy readout toward access leverage", () => {
  const baseSignal = findPostTrainingOption(signalOptions, "preferences");
  const collective = findPostTrainingOption(governanceOptions, "collective");
  const includeModel = buildPostTrainingModel({
    signal: baseSignal,
    intervention: findPostTrainingOption(interventionOptions, "include"),
    governance: collective,
    participation: 85,
  });
  const withholdModel = buildPostTrainingModel({
    signal: baseSignal,
    intervention: findPostTrainingOption(interventionOptions, "withhold"),
    governance: collective,
    participation: 85,
  });

  const metricValue = (model, label) => model.metrics.find((metric) => metric.label === label)?.value || 0;

  assert.ok(metricValue(withholdModel, "Governance leverage") > metricValue(includeModel, "Governance leverage"));
  assert.ok(metricValue(withholdModel, "Behavior steering") < metricValue(includeModel, "Behavior steering"));
  assert.match(withholdModel.summary, /bargaining power/);
});

test("post-training percent formatting clamps display values", () => {
  assert.equal(formatPostTrainingPercent(-0.5), "0%");
  assert.equal(formatPostTrainingPercent(0.456), "46%");
  assert.equal(formatPostTrainingPercent(1.4), "100%");
});
