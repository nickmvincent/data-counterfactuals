import {
  enumerateSubsets,
  evaluateMetric,
  subsetLabel,
  worldFromKey,
  worldKey,
} from "./lab-model.js";

const MAX_EXACT_CONCEPT_OBJECTS = 8;

export const TECHNICAL_CONCEPTS = [
  {
    id: "leave-one-out",
    label: "Leave-one-out",
    description: "Remove one training item while holding evaluation fixed.",
  },
  {
    id: "group-leave-one-out",
    label: "Group leave-one-out",
    description: "Remove a coalition of two or more training items together.",
  },
  {
    id: "evaluation-value",
    label: "Evaluation-set value",
    description: "Add one evaluation item while holding training fixed.",
  },
  {
    id: "pair-interaction",
    label: "Pair interaction",
    description: "Compare two items together against their separate marginal effects.",
  },
  {
    id: "data-shapley",
    label: "Data Shapley",
    description: "Average one item’s marginal contribution over every background coalition.",
  },
  {
    id: "banzhaf-value",
    label: "Banzhaf value",
    description: "Average the same marginal pairs with equal coalition weight.",
  },
  {
    id: "beta-shapley",
    label: "Beta Shapley",
    description: "Reweight marginal pairs toward different coalition sizes.",
  },
  {
    id: "training-scaling",
    label: "Training scaling step",
    description: "Compare mean score at adjacent training-set sizes.",
  },
  {
    id: "evaluation-scaling",
    label: "Evaluation scaling step",
    description: "Compare mean score at adjacent evaluation-set sizes.",
  },
  {
    id: "diagonal-scaling",
    label: "Diagonal scaling step",
    description: "Grow training and evaluation subsets together.",
  },
  {
    id: "budgeted-selection",
    label: "Budgeted subset scan",
    description: "Find the best observed training world under a size budget.",
  },
  {
    id: "unlearning-reference",
    label: "Exact-retrain reference",
    description: "Use retraining without one item as an unlearning reference world.",
  },
  {
    id: "local-sensitivity",
    label: "Neighbor sensitivity",
    description: "Measure the largest observed gap between neighboring training worlds.",
  },
];

function sorted(values) {
  return [...new Set(values || [])].sort((left, right) =>
    left.localeCompare(right),
  );
}

function world(train, evaluation) {
  return { train: sorted(train), eval: sorted(evaluation) };
}

function cleanWorld(value) {
  return world(value?.train || [], value?.eval || []);
}

function uniqueWorlds(values) {
  const seen = new Set();
  return values.filter((value) => {
    const key = worldKey(value);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function uniqueSubsets(values) {
  const seen = new Set();
  return values.filter((value) => {
    const key = sorted(value).join(",");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function uniqueCandidates(values) {
  const seen = new Set();
  return values.filter((candidate) => {
    const signature = JSON.stringify({
      a: candidate.required.a.map(worldKey).sort(),
      b: candidate.required.b.map(worldKey).sort(),
      either: candidate.required.either.map(worldKey).sort(),
    });
    if (seen.has(signature)) return false;
    seen.add(signature);
    return true;
  });
}

function combinations(values, size) {
  const output = [];
  const visit = (start, selected) => {
    if (selected.length === size) {
      output.push(selected);
      return;
    }
    for (let index = start; index < values.length; index += 1) {
      visit(index + 1, [...selected, values[index]]);
    }
  };
  visit(0, []);
  return output;
}

function average(state, values) {
  if (!values.length) return 0;
  return (
    values.reduce((sum, value) => sum + evaluateMetric(state, value), 0) /
    values.length
  );
}

function choose(total, count) {
  if (count < 0 || count > total) return 0;
  const safeCount = Math.min(count, total - count);
  let result = 1;
  for (let index = 1; index <= safeCount; index += 1) {
    result = (result * (total - safeCount + index)) / index;
  }
  return result;
}

function logGamma(value) {
  const coefficients = [
    0.9999999999998099,
    676.5203681218851,
    -1259.1392167224028,
    771.3234287776531,
    -176.6150291621406,
    12.507343278686905,
    -0.13857109526572012,
    0.00000998436957802,
    0.000000150563273515,
  ];
  if (value < 0.5) {
    return (
      Math.log(Math.PI) -
      Math.log(Math.sin(Math.PI * value)) -
      logGamma(1 - value)
    );
  }
  const shifted = value - 1;
  let sum = coefficients[0];
  for (let index = 1; index < coefficients.length; index += 1) {
    sum += coefficients[index] / (shifted + index);
  }
  const term = shifted + 7.5;
  return (
    0.5 * Math.log(2 * Math.PI) +
    (shifted + 0.5) * Math.log(term) -
    term +
    Math.log(sum)
  );
}

function betaFunction(alpha, beta) {
  return Math.exp(
    logGamma(alpha) + logGamma(beta) - logGamma(alpha + beta),
  );
}

function semivalue(state, subsets, focus, evaluation, mode) {
  const playerCount = state.objects.length;
  let weighted = 0;
  let totalWeight = 0;
  for (const subset of subsets) {
    if (subset.includes(focus)) continue;
    const withFocus = sorted([...subset, focus]);
    const delta =
      evaluateMetric(state, world(withFocus, evaluation)) -
      evaluateMetric(state, world(subset, evaluation));
    let weight = 0;
    if (mode === "shapley") {
      weight = 1 / (playerCount * choose(playerCount - 1, subset.length));
    } else if (mode === "banzhaf") {
      weight = 1 / 2 ** Math.max(0, playerCount - 1);
    } else {
      const bucketCount = choose(playerCount - 1, subset.length);
      const bucketWeight =
        choose(playerCount - 1, subset.length) *
        betaFunction(subset.length + 2, playerCount - 1 - subset.length + 2) /
        betaFunction(2, 2);
      weight = bucketCount ? bucketWeight / bucketCount : 0;
    }
    weighted += delta * weight;
    totalWeight += weight;
  }
  return totalWeight ? weighted / totalWeight : 0;
}

function candidate({ instance, roleA, roleB, a = [], b = [], either = [], value, formula }) {
  return {
    instance,
    roleA,
    roleB,
    required: {
      a: uniqueWorlds(a),
      b: uniqueWorlds(b),
      either: uniqueWorlds(either),
    },
    value,
    formula,
  };
}

function assessOrientation(current, selectedA, selectedB, swapped) {
  const requiredA = swapped ? current.required.b : current.required.a;
  const requiredB = swapped ? current.required.a : current.required.b;
  const setA = new Set(selectedA);
  const setB = new Set(selectedB);
  const union = new Set([...selectedA, ...selectedB]);
  const missingA = requiredA.filter((value) => !setA.has(worldKey(value)));
  const missingB = requiredB.filter((value) => !setB.has(worldKey(value)));
  const missingEither = current.required.either.filter(
    (value) => !union.has(worldKey(value)),
  );
  const requiredCount =
    requiredA.length + requiredB.length + current.required.either.length;
  const missingCount = missingA.length + missingB.length + missingEither.length;
  return {
    ...current,
    swapped,
    roleA: swapped ? current.roleB : current.roleA,
    roleB: swapped ? current.roleA : current.roleB,
    requiredCount,
    matchedCount: requiredCount - missingCount,
    missingCount,
    missingA,
    missingB,
    missingEither,
    progress: requiredCount ? (requiredCount - missingCount) / requiredCount : 1,
    status: missingCount ? "partial" : "ready",
  };
}

function compareAssessments(left, right) {
  if (left.status !== right.status) return left.status === "ready" ? -1 : 1;
  if (left.progress !== right.progress) return right.progress - left.progress;
  if (left.missingCount !== right.missingCount) {
    return left.missingCount - right.missingCount;
  }
  if (left.requiredCount !== right.requiredCount) {
    return left.requiredCount - right.requiredCount;
  }
  return left.instance.localeCompare(right.instance);
}

function planFamily(definition, candidates, selectedA, selectedB, unavailableReason = "") {
  if (!candidates.length) {
    return {
      ...definition,
      status: "unavailable",
      progress: 0,
      matchedCount: 0,
      requiredCount: 0,
      missingCount: 0,
      missingA: [],
      missingB: [],
      missingEither: [],
      readyInstances: 0,
      unavailableReason,
    };
  }
  const assessed = uniqueCandidates(candidates).map((current) => {
    const orientations = [
      assessOrientation(current, selectedA, selectedB, false),
      assessOrientation(current, selectedA, selectedB, true),
    ];
    orientations.sort(compareAssessments);
    return orientations[0];
  });
  assessed.sort(compareAssessments);
  return {
    ...definition,
    ...assessed[0],
    readyInstances: assessed.filter((item) => item.status === "ready").length,
  };
}

function selectedWorlds(state) {
  return uniqueWorlds(
    [...(state.selection?.worldA || []), ...(state.selection?.worldB || [])]
      .map(worldFromKey)
      .filter(Boolean)
      .map(cleanWorld),
  );
}

function localCandidates(state, anchors) {
  const ids = state.objects.map((item) => item.id);
  const loo = [];
  const groups = [];
  const evaluations = [];
  const interactions = [];

  for (const anchor of anchors) {
    for (const focus of ids) {
      const withFocus = anchor.train.includes(focus)
        ? anchor.train
        : sorted([...anchor.train, focus]);
      const withoutFocus = withFocus.filter((item) => item !== focus);
      const included = world(withFocus, anchor.eval);
      const removed = world(withoutFocus, anchor.eval);
      loo.push(
        candidate({
          instance: `Remove ${focus} from train ${subsetLabel(withFocus)} at eval ${subsetLabel(anchor.eval)}`,
          roleA: `with ${focus}`,
          roleB: `without ${focus}`,
          a: [included],
          b: [removed],
          value:
            evaluateMetric(state, included) - evaluateMetric(state, removed),
          formula: `f(${subsetLabel(withFocus)}, ${subsetLabel(anchor.eval)}) − f(${subsetLabel(withoutFocus)}, ${subsetLabel(anchor.eval)})`,
        }),
      );
    }

    for (const removedGroup of combinations(anchor.train, 2)) {
      const retained = anchor.train.filter(
        (item) => !removedGroup.includes(item),
      );
      const included = world(anchor.train, anchor.eval);
      const removed = world(retained, anchor.eval);
      groups.push(
        candidate({
          instance: `Remove group ${subsetLabel(removedGroup)} from train ${subsetLabel(anchor.train)}`,
          roleA: "coalition included",
          roleB: "coalition removed",
          a: [included],
          b: [removed],
          value:
            evaluateMetric(state, included) - evaluateMetric(state, removed),
          formula: `f(${subsetLabel(anchor.train)}, ${subsetLabel(anchor.eval)}) − f(${subsetLabel(retained)}, ${subsetLabel(anchor.eval)})`,
        }),
      );
    }

    for (const focus of ids) {
      const baseEval = anchor.eval.includes(focus)
        ? anchor.eval.filter((item) => item !== focus)
        : anchor.eval;
      const addedEval = sorted([...baseEval, focus]);
      const base = world(anchor.train, baseEval);
      const added = world(anchor.train, addedEval);
      evaluations.push(
        candidate({
          instance: `Add ${focus} to eval ${subsetLabel(baseEval)} with train ${subsetLabel(anchor.train)}`,
          roleA: "before eval addition",
          roleB: "after eval addition",
          a: [base],
          b: [added],
          value: evaluateMetric(state, added) - evaluateMetric(state, base),
          formula: `f(${subsetLabel(anchor.train)}, ${subsetLabel(addedEval)}) − f(${subsetLabel(anchor.train)}, ${subsetLabel(baseEval)})`,
        }),
      );
    }

    for (const pair of combinations(anchor.train, 2)) {
      const [left, right] = pair;
      const baseTrain = anchor.train.filter((item) => !pair.includes(item));
      const base = world(baseTrain, anchor.eval);
      const leftOnly = world(sorted([...baseTrain, left]), anchor.eval);
      const rightOnly = world(sorted([...baseTrain, right]), anchor.eval);
      const both = world(sorted([...baseTrain, left, right]), anchor.eval);
      const value =
        evaluateMetric(state, both) -
        evaluateMetric(state, leftOnly) -
        evaluateMetric(state, rightOnly) +
        evaluateMetric(state, base);
      interactions.push(
        candidate({
          instance: `Interaction of ${left} and ${right} over background ${subsetLabel(baseTrain)}`,
          roleA: "joint + background terms",
          roleB: "separate terms",
          a: [both, base],
          b: [leftOnly, rightOnly],
          value,
          formula: `f(${subsetLabel(both.train)}) − f(${subsetLabel(leftOnly.train)}) − f(${subsetLabel(rightOnly.train)}) + f(${subsetLabel(base.train)})`,
        }),
      );
    }
  }
  return { loo, groups, evaluations, interactions };
}

function exactCandidates(state, subsets, evaluations, trains) {
  const ids = state.objects.map((item) => item.id);
  const shapley = [];
  const banzhaf = [];
  const beta = [];
  const trainingScaling = [];
  const evaluationScaling = [];
  const diagonalScaling = [];
  const budget = [];

  for (const evaluation of evaluations) {
    for (const focus of ids) {
      const without = subsets.filter((subset) => !subset.includes(focus));
      const requiredA = without.map((train) => world(train, evaluation));
      const requiredB = without.map((train) =>
        world(sorted([...train, focus]), evaluation),
      );
      const shared = {
        instance: `${focus} at eval ${subsetLabel(evaluation)}`,
        roleA: `coalitions without ${focus}`,
        roleB: `matching coalitions with ${focus}`,
        a: requiredA,
        b: requiredB,
      };
      shapley.push(
        candidate({
          ...shared,
          value: semivalue(state, subsets, focus, evaluation, "shapley"),
          formula: `Σ Shapley-weighted [f(S∪{${focus}}) − f(S)]`,
        }),
      );
      banzhaf.push(
        candidate({
          ...shared,
          value: semivalue(state, subsets, focus, evaluation, "banzhaf"),
          formula: `mean [f(S∪{${focus}}) − f(S)]`,
        }),
      );
      beta.push(
        candidate({
          ...shared,
          value: semivalue(state, subsets, focus, evaluation, "beta"),
          formula: `Σ Beta(2,2)-weighted [f(S∪{${focus}}) − f(S)]`,
        }),
      );
    }

    for (let size = 0; size < ids.length; size += 1) {
      const layerA = subsets
        .filter((subset) => subset.length === size)
        .map((train) => world(train, evaluation));
      const layerB = subsets
        .filter((subset) => subset.length === size + 1)
        .map((train) => world(train, evaluation));
      trainingScaling.push(
        candidate({
          instance: `Train size ${size} → ${size + 1} at eval ${subsetLabel(evaluation)}`,
          roleA: `all size-${size} train worlds`,
          roleB: `all size-${size + 1} train worlds`,
          a: layerA,
          b: layerB,
          value: average(state, layerB) - average(state, layerA),
          formula: `mean|T|=${size + 1} f(T,E) − mean|T|=${size} f(T,E)`,
        }),
      );
    }

    for (let size = 1; size < ids.length; size += 1) {
      const candidates = subsets
        .filter((subset) => subset.length === size)
        .map((train) => world(train, evaluation));
      budget.push(
        candidate({
          instance: `Budget k=${size} at eval ${subsetLabel(evaluation)}`,
          roleA: "",
          roleB: "",
          either: candidates,
          value: Math.max(...candidates.map((value) => evaluateMetric(state, value))),
          formula: `max|T|=${size} f(T, ${subsetLabel(evaluation)})`,
        }),
      );
    }
  }

  for (const train of trains) {
    for (let size = 0; size < ids.length; size += 1) {
      const layerA = subsets
        .filter((subset) => subset.length === size)
        .map((evaluation) => world(train, evaluation));
      const layerB = subsets
        .filter((subset) => subset.length === size + 1)
        .map((evaluation) => world(train, evaluation));
      evaluationScaling.push(
        candidate({
          instance: `Eval size ${size} → ${size + 1} with train ${subsetLabel(train)}`,
          roleA: `all size-${size} eval worlds`,
          roleB: `all size-${size + 1} eval worlds`,
          a: layerA,
          b: layerB,
          value: average(state, layerB) - average(state, layerA),
          formula: `mean|E|=${size + 1} f(T,E) − mean|E|=${size} f(T,E)`,
        }),
      );
    }
  }

  for (let size = 0; size < ids.length; size += 1) {
    const layerA = subsets
      .filter((subset) => subset.length === size)
      .map((subset) => world(subset, subset));
    const layerB = subsets
      .filter((subset) => subset.length === size + 1)
      .map((subset) => world(subset, subset));
    diagonalScaling.push(
      candidate({
        instance: `Coupled size ${size} → ${size + 1}`,
        roleA: `size-${size} diagonal worlds`,
        roleB: `size-${size + 1} diagonal worlds`,
        a: layerA,
        b: layerB,
        value: average(state, layerB) - average(state, layerA),
        formula: `mean|S|=${size + 1} f(S,S) − mean|S|=${size} f(S,S)`,
      }),
    );
  }

  return {
    shapley,
    banzhaf,
    beta,
    trainingScaling,
    evaluationScaling,
    diagonalScaling,
    budget,
  };
}

export function deriveTechnicalConceptPlans(state) {
  const ids = state.objects.map((item) => item.id);
  const selected = selectedWorlds(state);
  const fullWorld = world(ids, ids);
  const anchors = uniqueWorlds([fullWorld, ...selected]).slice(0, 64);
  const evaluations = uniqueSubsets([
    ids,
    ...anchors.map((value) => value.eval),
  ]).slice(0, 12);
  const trains = uniqueSubsets([
    ids,
    ...anchors.map((value) => value.train),
  ]).slice(0, 12);
  const selectedA = state.selection?.worldA || [];
  const selectedB = state.selection?.worldB || [];
  const local = localCandidates(state, anchors);
  const exactAvailable = ids.length <= MAX_EXACT_CONCEPT_OBJECTS;
  const exact = exactAvailable
    ? exactCandidates(state, enumerateSubsets(ids), evaluations, trains)
    : null;
  const definition = (id) =>
    TECHNICAL_CONCEPTS.find((concept) => concept.id === id);
  const exactReason = `Exact full-lattice planning is available up to ${MAX_EXACT_CONCEPT_OBJECTS} data objects.`;

  const plans = [
    planFamily(definition("leave-one-out"), local.loo, selectedA, selectedB),
    planFamily(
      definition("group-leave-one-out"),
      local.groups,
      selectedA,
      selectedB,
      "At least two data objects are required.",
    ),
    planFamily(
      definition("evaluation-value"),
      local.evaluations,
      selectedA,
      selectedB,
    ),
    planFamily(
      definition("pair-interaction"),
      local.interactions,
      selectedA,
      selectedB,
      "At least two data objects are required.",
    ),
    planFamily(
      definition("data-shapley"),
      exact?.shapley || [],
      selectedA,
      selectedB,
      exactReason,
    ),
    planFamily(
      definition("banzhaf-value"),
      exact?.banzhaf || [],
      selectedA,
      selectedB,
      exactReason,
    ),
    planFamily(
      definition("beta-shapley"),
      exact?.beta || [],
      selectedA,
      selectedB,
      exactReason,
    ),
    planFamily(
      definition("training-scaling"),
      exact?.trainingScaling || [],
      selectedA,
      selectedB,
      exactReason,
    ),
    planFamily(
      definition("evaluation-scaling"),
      exact?.evaluationScaling || [],
      selectedA,
      selectedB,
      exactReason,
    ),
    planFamily(
      definition("diagonal-scaling"),
      exact?.diagonalScaling || [],
      selectedA,
      selectedB,
      exactReason,
    ),
    planFamily(
      definition("budgeted-selection"),
      exact?.budget || [],
      selectedA,
      selectedB,
      exactReason,
    ),
    planFamily(
      definition("unlearning-reference"),
      local.loo.map((item) => ({
        ...item,
        value: Math.abs(item.value),
        formula: `|${item.formula}|`,
      })),
      selectedA,
      selectedB,
    ),
    planFamily(
      definition("local-sensitivity"),
      local.loo.map((item) => ({
        ...item,
        value: Math.abs(item.value),
        formula: `|${item.formula}|`,
      })),
      selectedA,
      selectedB,
    ),
  ];

  plans.sort((left, right) => {
    if (left.status !== right.status) {
      if (left.status === "ready") return -1;
      if (right.status === "ready") return 1;
      if (left.status === "partial") return -1;
      if (right.status === "partial") return 1;
    }
    if (left.progress !== right.progress) return right.progress - left.progress;
    return left.label.localeCompare(right.label);
  });

  return {
    plans,
    readyCount: plans.filter((plan) => plan.status === "ready").length,
    partialCount: plans.filter((plan) => plan.status === "partial").length,
    unavailableCount: plans.filter((plan) => plan.status === "unavailable").length,
  };
}
