export const SILO_OPT_OUT_STUDY = {
  id: "silo-table-6",
  title: "SILO data opt-out experiment",
  metricLabel: "Perplexity",
  metricShortLabel: "ppl",
  direction: "lower is better",
  scoreDomain: [12.9, 16.5],
  axisLabels: {
    train: "DATASTORE ACCESS",
    eval: "HELD-OUT EVALUATION",
  },
  subsetLabels: {
    train: {
      "": "without related",
      R: "with related",
    },
    eval: {
      "": "unmeasured",
      R: "7-book avg",
    },
  },
  worldLabels: {
    baseline: "Related books available",
    counterfactual: "Related books removed",
  },
  observedWorlds: [
    {
      world: { train: ["R"], eval: ["R"] },
      value: 12.9,
    },
    {
      world: { train: [], eval: ["R"] },
      value: 16.5,
    },
  ],
  rows: [
    { evaluation: "Held-out book 1", withRelated: 13.0, afterRemoval: 15.2 },
    { evaluation: "Held-out book 2", withRelated: 12.4, afterRemoval: 16.7 },
    { evaluation: "Held-out book 3", withRelated: 11.4, afterRemoval: 15.6 },
    { evaluation: "Held-out book 4", withRelated: 12.9, afterRemoval: 16.8 },
    { evaluation: "Held-out book 5", withRelated: 13.2, afterRemoval: 16.9 },
    { evaluation: "Held-out book 6", withRelated: 12.8, afterRemoval: 16.5 },
    { evaluation: "Held-out book 7", withRelated: 15.1, afterRemoval: 17.8 },
  ],
  aggregate: {
    evaluation: "Average",
    withRelated: 12.9,
    afterRemoval: 16.5,
  },
  method:
    "SILO pdsw 1.3B with a fixed 1.024B-token retrieval datastore. Each evaluated book is absent from both datastores; the comparison changes whether the other six books in its series are available for retrieval.",
  source: {
    title: "SILO Language Models: Isolating Legal Risk In a Nonparametric Datastore",
    venue: "ICLR 2024",
    table: "Table 6",
    url: "https://arxiv.org/pdf/2308.04430#page=13",
    codeUrl: "https://github.com/kernelmachine/silo-lm",
  },
};
