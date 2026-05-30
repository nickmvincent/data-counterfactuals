import { conceptSpecs, getConceptSpec } from "./concept-lens-specs.js";

export const conceptAtlasEntries = conceptSpecs.map((entry) => ({
  id: entry.id,
  name: entry.label,
  family: entry.family,
  definition: entry.definition,
  formula: entry.formula,
  gridMove: entry.gridMove,
  graphMove: entry.graphMove,
  assumptions: entry.assumptions,
  related: entry.related,
}));

export const conceptAtlasIds = conceptAtlasEntries.map((entry) => entry.id);

export const conceptComparisonCards = [
  {
    id: "shapley-influence",
    title: "Shapley value vs influence functions",
    left: "Shapley-style data valuation",
    right: "Influence-style local approximation",
    relatedConceptIds: ["loo", "shapley", "banzhaf", "beta"],
    sharedGridMove: "Both ask what changes when a training item is removed or added.",
    distinction: "Shapley averages many exact subset counterfactuals; influence functions approximate a local effect around one trained model.",
    bridge: "In the grid metaphor, influence is closest to a cheap estimate of nearby row edges, while Shapley is a weighted sweep over many such edges.",
    caution: "Do not treat influence estimates as full coalitional values unless the approximation assumptions are justified.",
  },
  {
    id: "dp-unlearning",
    title: "Differential privacy vs unlearning",
    left: "Differential privacy",
    right: "Machine unlearning",
    relatedConceptIds: ["dp", "unlearning", "loo"],
    sharedGridMove: "Both care about neighboring worlds that differ by one record.",
    distinction: "DP bounds what can be inferred across neighboring worlds before the fact; unlearning audits whether a deletion behaves like retraining after the fact.",
    bridge: "The grid helps show the common neighbor relation, then the mechanism layer decides whether the question is privacy leakage or deletion compliance.",
    caution: "A small grid gap is not a privacy guarantee, and a DP mechanism is not automatically an exact unlearning procedure.",
  },
  {
    id: "strikes-poisoning",
    title: "Data strikes vs data poisoning",
    left: "Withholding or removal",
    right: "Corruption or strategic edits",
    relatedConceptIds: ["group", "poison", "budget"],
    sharedGridMove: "Both model strategic actors changing the data available to a system.",
    distinction: "A strike moves to a reduced-data world; poisoning overlays an altered operator world on top of the clean data world.",
    bridge: "In the grid, strikes are row paths through subset removal, while poisoning is a clean-vs-operator matrix comparison.",
    caution: "These can have similar leverage goals but different ethics, threat models, and technical defenses.",
  },
  {
    id: "scaling-datamodels",
    title: "Scaling laws vs datamodels",
    left: "Aggregate scaling curves",
    right: "Predictive subset-response models",
    relatedConceptIds: ["scaling", "eval-scaling", "diagonal-scaling", "budget"],
    sharedGridMove: "Both summarize behavior across many data worlds rather than one local deletion.",
    distinction: "Scaling laws compress worlds by size; datamodels try to predict outcomes from which data points are present.",
    bridge: "A filled grid can feed both: layer averages produce scaling summaries, while the full pattern can train a surrogate over subset membership.",
    caution: "Layer averages can hide composition effects that a datamodel may reveal.",
  },
];

export const conceptComparisonIds = conceptComparisonCards.map((entry) => entry.id);

export function getConceptAtlasEntry(id) {
  const spec = getConceptSpec(id);
  return conceptAtlasEntries.find((entry) => entry.id === spec.id) || conceptAtlasEntries[0];
}

export function getConceptComparisons(conceptId) {
  if (!conceptId || conceptId === "explore") return conceptComparisonCards;
  return conceptComparisonCards.filter((entry) => entry.relatedConceptIds.includes(conceptId));
}
