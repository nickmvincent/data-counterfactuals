import { h } from "preact";
import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import htm from "htm";
import {
  alphabet,
  buildSubsetGrid,
  computeRowRemovalStats,
  computeScalingStats,
  computeShapleyStats,
  findSubsetIndex,
  getPaperSubsetBuckets,
  labelSubset as label,
  normalizeValue,
  paperSubsetMaxCount,
} from "../lib/counterfactual-math.js";
import { scrollChildIntoContainer } from "../lib/scroll-helpers.js";

const html = htm.bind(h);

function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}

function hexToRgb(hex) {
  const normalized = hex.replace("#", "");
  const value = normalized.length === 3
    ? normalized.split("").map((char) => `${char}${char}`).join("")
    : normalized;
  return {
    r: Number.parseInt(value.slice(0, 2), 16),
    g: Number.parseInt(value.slice(2, 4), 16),
    b: Number.parseInt(value.slice(4, 6), 16),
  };
}

function rgbToCss({ r, g, b }) {
  return `rgb(${Math.round(r)} ${Math.round(g)} ${Math.round(b)})`;
}

function createPalette(stops) {
  const colors = stops.map(hexToRgb);
  return (input) => {
    const t = clamp01(input);
    const scaled = t * (colors.length - 1);
    const index = Math.min(colors.length - 2, Math.floor(scaled));
    const localT = scaled - index;
    const start = colors[index];
    const end = colors[index + 1];
    return rgbToCss({
      r: start.r + (end.r - start.r) * localT,
      g: start.g + (end.g - start.g) * localT,
      b: start.b + (end.b - start.b) * localT,
    });
  };
}

const palette = createPalette(["#17344f", "#2f5c7e", "#6d95b0", "#d4af6d", "#fff3d6"]);

const metricMeta = {
  jaccard: {
    short: "Jaccard",
    description: "Normalized overlap: a rough performance proxy when train and eval look similar, but still only set similarity.",
  },
  inter: {
    short: "|Intersection|",
    description: "Raw shared count: a coverage-style proxy that often grows with performance, but it also favors larger slices.",
  },
  entropy: {
    short: "Entropy",
    description: "Overlap turned into an uncertainty-style signal: useful for spotting middling overlap, not accuracy itself.",
  },
  papers: {
    short: "Paper subsets",
    description: "Precomputed score from real paper buckets in the local Semble cache.",
  },
};

const lensMeta = {
  ablation: {
    title: "Ablation edge",
    summary: "Highlight one single-step deletion from the selected training node.",
  },
  strike: {
    title: "Data strike path",
    summary: "Walk a multi-step removal path through the subset lattice.",
  },
  shapley: {
    title: "Shapley sweep",
    summary: "Highlight every edge that adds the focus point on the active evaluation slice.",
  },
  scaling: {
    title: "Scaling layer",
    summary: "Highlight every node at one fixed training-set size.",
  },
};

function subsetKey(subset) {
  return subset.join("|");
}

function canonicalEdgeKey(left, right) {
  return left < right ? `${left}:${right}` : `${right}:${left}`;
}

function columnRange(matrix, colIndex) {
  let min = Infinity;
  let max = -Infinity;

  for (const row of matrix) {
    const value = row[colIndex];
    if (!Number.isFinite(value)) continue;
    if (value < min) min = value;
    if (value > max) max = value;
  }

  if (!Number.isFinite(min)) min = 0;
  if (!Number.isFinite(max)) max = 1;
  return { min, max };
}

function formatSigned(value) {
  if (!Number.isFinite(value)) return "0.0000";
  return `${value > 0 ? "+" : ""}${value.toFixed(4)}`;
}

function changedToken(left, right) {
  const leftSet = new Set(left);
  for (const token of right) {
    if (!leftSet.has(token)) return token;
  }
  const rightSet = new Set(right);
  for (const token of left) {
    if (!rightSet.has(token)) return token;
  }
  return "";
}

function buildGraphGeometry(subsets, items) {
  const layers = Array.from({ length: items.length + 1 }, () => []);
  const indexByKey = new Map();

  subsets.forEach((subset, index) => {
    layers[subset.length].push({ index, subset, label: label(subset) });
    indexByKey.set(subsetKey(subset), index);
  });

  const slotWidth = 96;
  const slotHeight = 94;
  const maxLayerSize = Math.max(...layers.map((layer) => Math.max(1, layer.length)));
  const width = Math.max(720, 120 + (maxLayerSize - 1) * slotWidth);
  const height = 120 + items.length * slotHeight;
  const nodes = new Map();

  layers.forEach((layer, size) => {
    const span = (Math.max(1, layer.length) - 1) * slotWidth;
    const startX = width / 2 - span / 2;
    const y = 66 + size * slotHeight;
    layer.forEach((entry, layerIndex) => {
      const nodeWidth = Math.max(44, 22 + entry.label.length * 8);
      nodes.set(entry.index, {
        x: startX + layerIndex * slotWidth,
        y,
        width: nodeWidth,
        height: 34,
        label: entry.label,
      });
    });
  });

  const edges = [];
  subsets.forEach((subset, index) => {
    items.forEach((token) => {
      if (subset.includes(token)) return;
      const superset = [...subset, token].sort();
      const targetIndex = indexByKey.get(subsetKey(superset));
      if (typeof targetIndex !== "number") return;
      edges.push({
        id: `${index}-${targetIndex}`,
        from: index,
        to: targetIndex,
        token,
        key: canonicalEdgeKey(index, targetIndex),
      });
    });
  });

  return { width, height, nodes, edges };
}

function clampIndex(index, total) {
  if (!total) return 0;
  if (index < 0) return 0;
  if (index >= total) return total - 1;
  return index;
}

function App() {
  const countMin = 2;
  const countMax = 7;
  const [count, setCount] = useState(4);
  const [metric, setMetric] = useState("jaccard");
  const [lens, setLens] = useState("ablation");
  const [focusSet, setFocusSet] = useState(["B"]);
  const [k, setK] = useState(2);
  const [hydrated, setHydrated] = useState(false);
  const [hoveredNodeIndex, setHoveredNodeIndex] = useState(null);

  const scrollRef = useRef(null);
  const maxCountForMetric = metric === "papers" ? Math.min(countMax, paperSubsetMaxCount) : countMax;
  const base = useMemo(() => alphabet.slice(0, Math.min(count, maxCountForMetric)), [count, maxCountForMetric]);
  const paperSubsetBuckets = useMemo(
    () => (metric === "papers" ? getPaperSubsetBuckets(base) : []),
    [metric, base],
  );

  const { matrix, subsets } = useMemo(() => buildSubsetGrid(base, metric), [base, metric]);
  const fullSetIndex = useMemo(() => findSubsetIndex(subsets, base), [subsets, base]);
  const emptySetIndex = useMemo(() => findSubsetIndex(subsets, []), [subsets]);

  const [selectedIndex, setSelectedIndex] = useState(fullSetIndex >= 0 ? fullSetIndex : 0);
  const [evalIndex, setEvalIndex] = useState(fullSetIndex >= 0 ? fullSetIndex : 0);

  useEffect(() => {
    if (count > maxCountForMetric) setCount(maxCountForMetric);
  }, [count, maxCountForMetric]);

  useEffect(() => {
    const nextFocus = focusSet.filter((token) => base.includes(token));
    if (!nextFocus.length && base.length) {
      setFocusSet([base[Math.min(1, base.length - 1)]]);
      return;
    }
    if (nextFocus.length !== focusSet.length) {
      setFocusSet(nextFocus);
    }
  }, [base, focusSet]);

  useEffect(() => {
    if (lens !== "strike" && focusSet.length > 1) {
      setFocusSet((previous) => (previous.length ? [previous[0]] : base.length ? [base[0]] : []));
    }
  }, [lens, focusSet.length, base]);

  useEffect(() => {
    if (k > base.length) setK(base.length);
  }, [base.length, k]);

  useEffect(() => {
    const nextFullIndex = findSubsetIndex(subsets, base);
    setSelectedIndex(nextFullIndex >= 0 ? nextFullIndex : 0);
    setEvalIndex(nextFullIndex >= 0 ? nextFullIndex : 0);
  }, [count, subsets, base]);

  useEffect(() => {
    setHoveredNodeIndex((previous) => {
      if (previous === null) return previous;
      return previous >= subsets.length ? null : previous;
    });
  }, [subsets.length]);

  const safeSelectedIndex = clampIndex(selectedIndex, subsets.length);
  const safeEvalIndex = clampIndex(evalIndex, subsets.length);
  const selectedSet = subsets[safeSelectedIndex] || [];
  const evalSet = subsets[safeEvalIndex] || [];
  const focusPrimary = focusSet.find((token) => base.includes(token)) || base[0] || "A";
  const focusGroup = lens === "strike"
    ? focusSet.filter((token) => base.includes(token)).sort()
    : focusPrimary
      ? [focusPrimary]
      : [];

  const graph = useMemo(() => buildGraphGeometry(subsets, base), [subsets, base]);
  const { min: colMin, max: colMax } = useMemo(() => columnRange(matrix, safeEvalIndex), [matrix, safeEvalIndex]);

  const currentValue = matrix[safeSelectedIndex]?.[safeEvalIndex] ?? 0;
  const ablationStats = useMemo(
    () =>
      computeRowRemovalStats({
        matrix,
        subsets,
        rowIndex: safeSelectedIndex,
        colIndex: safeEvalIndex,
        tokensToRemove: focusPrimary ? [focusPrimary] : [],
      }),
    [matrix, subsets, safeSelectedIndex, safeEvalIndex, focusPrimary],
  );
  const ablationSet = ablationStats.compareSet;
  const ablationIndex = ablationStats.compareRowIndex;
  const ablationDelta = ablationStats.delta;

  const strikeStats = useMemo(
    () =>
      computeRowRemovalStats({
        matrix,
        subsets,
        rowIndex: safeSelectedIndex,
        colIndex: safeEvalIndex,
        tokensToRemove: focusGroup,
      }),
    [matrix, subsets, safeSelectedIndex, safeEvalIndex, focusGroup],
  );
  const strikePresent = strikeStats.removedTokens;
  const strikeTerminalSet = strikeStats.compareSet;
  const strikeTerminalIndex = strikeStats.compareRowIndex;
  const strikeDelta = strikeStats.delta;

  const strikePath = useMemo(() => {
    if (!strikePresent.length) return [safeSelectedIndex];
    const indices = [safeSelectedIndex];
    let cursor = [...selectedSet];
    strikePresent.forEach((token) => {
      cursor = cursor.filter((candidate) => candidate !== token);
      const nextIndex = findSubsetIndex(subsets, cursor);
      if (nextIndex >= 0) indices.push(nextIndex);
    });
    return indices;
  }, [strikePresent, safeSelectedIndex, selectedSet, subsets]);

  const shapleyStats = useMemo(
    () =>
      computeShapleyStats({
        matrix,
        subsets,
        focusItem: focusPrimary,
        evalColumnIndex: safeEvalIndex,
        playerCount: base.length,
      }),
    [matrix, subsets, focusPrimary, safeEvalIndex, base.length],
  );

  const scalingRows = useMemo(
    () =>
      computeScalingStats({
        matrix,
        subsets,
        maxSize: base.length,
        evalColumnIndex: safeEvalIndex,
      }),
    [matrix, subsets, base.length, safeEvalIndex],
  );
  const scalingBucket = scalingRows.find((entry) => entry.k === k) || { avg: 0, n: 0 };

  const removalWalks = useMemo(
    () =>
      selectedSet.map((token) => {
        const nextSet = selectedSet.filter((candidate) => candidate !== token);
        const nextIndex = findSubsetIndex(subsets, nextSet);
        const nextValue = nextIndex >= 0 ? (matrix[nextIndex]?.[safeEvalIndex] ?? currentValue) : currentValue;
        return {
          token,
          kind: focusPrimary === token ? "focus ablation" : "single deletion",
          nextLabel: label(nextSet),
          nextIndex,
          delta: currentValue - nextValue,
          nextValue,
        };
      }),
    [selectedSet, subsets, matrix, safeEvalIndex, currentValue, focusPrimary],
  );

  const additionWalks = useMemo(
    () =>
      base
        .filter((token) => !selectedSet.includes(token))
        .map((token) => {
          const nextSet = [...selectedSet, token].sort();
          const nextIndex = findSubsetIndex(subsets, nextSet);
          const nextValue = nextIndex >= 0 ? (matrix[nextIndex]?.[safeEvalIndex] ?? currentValue) : currentValue;
          return {
            token,
            kind: "augmentation",
            nextLabel: label(nextSet),
            nextIndex,
            delta: nextValue - currentValue,
            nextValue,
          };
        }),
    [base, selectedSet, subsets, matrix, safeEvalIndex, currentValue],
  );

  const highlightedNodes = new Set([safeSelectedIndex]);
  const highlightedEdges = new Set();
  const canJumpToAblation = ablationIndex >= 0 && ablationIndex !== safeSelectedIndex;
  const canJumpToStrikeTerminal = strikeTerminalIndex >= 0 && strikeTerminalIndex !== safeSelectedIndex;

  if (lens === "ablation" && ablationIndex >= 0 && selectedSet.includes(focusPrimary)) {
    highlightedNodes.add(ablationIndex);
    highlightedEdges.add(canonicalEdgeKey(safeSelectedIndex, ablationIndex));
  }

  if (lens === "strike" && strikePath.length > 1) {
    strikePath.forEach((index) => highlightedNodes.add(index));
    for (let step = 0; step < strikePath.length - 1; step += 1) {
      highlightedEdges.add(canonicalEdgeKey(strikePath[step], strikePath[step + 1]));
    }
  }

  if (lens === "shapley") {
    shapleyStats.pairs.forEach((pair) => {
      highlightedNodes.add(pair.subsetIndex);
      highlightedNodes.add(pair.withFocusIndex);
      highlightedEdges.add(canonicalEdgeKey(pair.subsetIndex, pair.withFocusIndex));
    });
  }

  if (lens === "scaling") {
    subsets.forEach((subset, index) => {
      if (subset.length === k) highlightedNodes.add(index);
    });
  }

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    const selectedNode = container.querySelector('[data-selected="true"]');
    if (!selectedNode) return;
    scrollChildIntoContainer(container, selectedNode);
  }, [safeSelectedIndex, safeEvalIndex, lens, count]);

  useEffect(() => {
    setHydrated(true);
  }, []);

  const questionBlock = useMemo(() => {
    if (lens === "ablation") {
      return {
        title: "Follow one ablation edge",
        answerLabel: "Ablation delta",
        answerValue: ablationDelta.toFixed(4),
        copy: selectedSet.includes(focusPrimary)
          ? `Move from train ${label(selectedSet)} to ${label(ablationSet)} while keeping eval ${label(evalSet)} fixed.`
          : `${focusPrimary} is not in ${label(selectedSet)}, so the highlighted ablation edge is currently unavailable.`,
        formula: `f(${label(selectedSet)}, ${label(evalSet)}) - f(${label(ablationSet)}, ${label(evalSet)}) = ${ablationDelta.toFixed(4)}`,
      };
    }

    if (lens === "strike") {
      return {
        title: "Walk a data strike path",
        answerLabel: "Strike delta",
        answerValue: strikeDelta.toFixed(4),
        copy: strikePresent.length
          ? `The path removes ${label(strikePresent)} one edge at a time until the selected training world reaches ${label(strikeTerminalSet)}.`
          : `None of ${label(focusGroup)} are present in ${label(selectedSet)}, so the strike path collapses to the selected node.`,
        formula: `f(${label(selectedSet)}, ${label(evalSet)}) - f(${label(strikeTerminalSet)}, ${label(evalSet)}) = ${strikeDelta.toFixed(4)}`,
      };
    }

    if (lens === "shapley") {
      return {
        title: "Average every edge that adds the focus point",
        answerLabel: "Shapley phi",
        answerValue: shapleyStats.phi.toFixed(4),
        copy: `The highlighted sweep marks every pair ${focusPrimary} can complete on eval ${label(evalSet)}.`,
        formula: `phi(${focusPrimary}; ${label(evalSet)}) averages ${shapleyStats.cnt} one-step additions in the subset lattice.`,
      };
    }

    return {
      title: "Collapse one layer of the lattice",
      answerLabel: `Average at k=${k}`,
      answerValue: scalingBucket.avg.toFixed(4),
      copy: `${scalingBucket.n} nodes with |train| = ${k} are highlighted on eval ${label(evalSet)}.`,
      formula: `Average f(S, ${label(evalSet)}) over every highlighted node whose size is ${k}.`,
    };
  }, [
    lens,
    ablationDelta,
    selectedSet,
    ablationSet,
    evalSet,
    focusPrimary,
    strikeDelta,
    strikePresent,
    strikeTerminalSet,
    focusGroup,
    shapleyStats.phi,
    shapleyStats.cnt,
    scalingBucket.avg,
    scalingBucket.n,
    k,
  ]);

  const previewNodeIndex = clampIndex(hoveredNodeIndex ?? safeSelectedIndex, subsets.length);
  const previewSet = subsets[previewNodeIndex] || [];
  const previewValue = matrix[previewNodeIndex]?.[safeEvalIndex] ?? 0;
  const graphCommandLabel = hoveredNodeIndex === null ? "Selected target" : "Hover preview";
  const graphCommandCopy =
    hoveredNodeIndex === null
      ? `Train ${label(selectedSet)} is locked in against eval ${label(evalSet)}. Click a node or use the command buttons to move.`
      : `Previewing train ${label(previewSet)} against eval ${label(evalSet)}. Click to commit this world.`;

  return html`
    <div class="graph-workspace" data-ready=${hydrated ? "true" : "false"}>
      <section class="graph-toolbar" data-testid="graph-explorer-toolbar">
        <div class="graph-toolbar-copyblock">
          <span class="graph-kicker">Graph explorer</span>
          <h2 class="graph-toolbar-title">Walk the subset lattice directly.</h2>
          <p class="graph-toolbar-copy">
            Instead of scanning the full train-by-eval matrix, fix an evaluation slice and move through the graph of possible training sets.
            Nodes are training worlds; one-step edges become ablations, augmentations, or steps inside a larger strike path.
          </p>
        </div>

        <div class="graph-toolbar-grid">
          <section class="graph-control-card">
            <div class="graph-control-label">Universe size</div>
            <div class="graph-stepper">
              <button class="graph-btn mini" type="button" data-testid="graph-count-decrease" disabled=${count <= countMin} onClick=${() => setCount((previous) => Math.max(countMin, previous - 1))}>-</button>
              <span class="graph-stepper-value" data-testid="graph-count-value">${count} datasets</span>
              <button class="graph-btn mini" type="button" data-testid="graph-count-increase" disabled=${count >= maxCountForMetric} onClick=${() => setCount((previous) => Math.min(maxCountForMetric, previous + 1))}>+</button>
            </div>
            <div class="graph-control-note">The graph has ${subsets.length} nodes once every possible subset is enumerated.</div>
          </section>

          <section class="graph-control-card">
            <div class="graph-control-label">Score rule</div>
            <div class="graph-segmented-row">
              <button class="graph-btn" type="button" aria-pressed=${metric === "jaccard"} onClick=${() => setMetric("jaccard")}>Jaccard</button>
              <button class="graph-btn" type="button" aria-pressed=${metric === "inter"} onClick=${() => setMetric("inter")}>|Intersection|</button>
              <button class="graph-btn" type="button" aria-pressed=${metric === "entropy"} onClick=${() => setMetric("entropy")}>Entropy</button>
              <button class="graph-btn" type="button" aria-pressed=${metric === "papers"} onClick=${() => setMetric("papers")}>Paper subsets</button>
            </div>
            <div class="graph-control-note">${metricMeta[metric].description}</div>
            ${metric === "papers"
              ? html`
                  <div class="graph-control-note">
                    A/B/C/... now map to real paper buckets from the local Semble cache. This metric supports up to ${maxCountForMetric} buckets in the graph.
                  </div>
                  <div class="graph-pill-row">
                    ${paperSubsetBuckets.map((bucket) => html`<span class="graph-pill">${bucket.token} = ${bucket.label} (${bucket.paperCount})</span>`)}
                  </div>
                `
              : null}
          </section>

          <section class="graph-control-card">
            <div class="graph-control-label">Graph lens</div>
            <div class="graph-segmented-row">
              <button class="graph-btn" type="button" aria-pressed=${lens === "ablation"} onClick=${() => setLens("ablation")}>Ablation edge</button>
              <button class="graph-btn" type="button" aria-pressed=${lens === "strike"} onClick=${() => setLens("strike")}>Data strike path</button>
              <button class="graph-btn" type="button" aria-pressed=${lens === "shapley"} onClick=${() => setLens("shapley")}>Shapley sweep</button>
              <button class="graph-btn" type="button" aria-pressed=${lens === "scaling"} onClick=${() => setLens("scaling")}>Scaling layer</button>
            </div>
            <div class="graph-control-note">${lensMeta[lens].summary}</div>
          </section>

          <section class="graph-control-card">
            <label class="graph-select-label">
              <span class="graph-control-label">Training world</span>
              <select data-testid="graph-train-select" value=${safeSelectedIndex} onChange=${(event) => setSelectedIndex(Number(event.target.value))}>
                ${subsets.map((subset, index) => html`<option key=${`train-${index}`} value=${index}>${label(subset)}</option>`)}
              </select>
            </label>
            <div class="graph-control-note">Clicking a node in the lattice updates this too.</div>
          </section>

          <section class="graph-control-card">
            <label class="graph-select-label">
              <span class="graph-control-label">Evaluation slice</span>
              <select data-testid="graph-eval-select" value=${safeEvalIndex} onChange=${(event) => setEvalIndex(Number(event.target.value))}>
                ${subsets.map((subset, index) => html`<option key=${`eval-${index}`} value=${index}>${label(subset)}</option>`)}
              </select>
            </label>
            <div class="graph-inline-actions">
              <button class="graph-btn mini" type="button" onClick=${() => setEvalIndex(safeSelectedIndex)}>Mirror train</button>
              <button class="graph-btn mini" type="button" onClick=${() => fullSetIndex >= 0 && setEvalIndex(fullSetIndex)}>Use full set</button>
            </div>
          </section>

          ${lens === "scaling"
            ? html`
                <section class="graph-control-card">
                  <div class="graph-control-label">Layer size</div>
                  <div class="graph-segmented-row">
                    ${Array.from({ length: base.length + 1 }, (_, bucket) => html`
                      <button class="graph-btn mini" type="button" aria-pressed=${k === bucket} onClick=${() => setK(bucket)}>k=${bucket}</button>
                    `)}
                  </div>
                  <div class="graph-control-note">${scalingBucket.n} nodes live in the highlighted layer.</div>
                </section>
              `
            : html`
                <section class="graph-control-card">
                  <div class="graph-control-label">${lens === "strike" ? "Strike group" : "Focus contributor"}</div>
                  <div class="graph-token-row" data-testid="graph-focus-tokens">
                    ${base.map((token) => {
                      const active = focusSet.includes(token);
                      const toggle = () => {
                        if (lens === "strike") {
                          setFocusSet((previous) =>
                            previous.includes(token)
                              ? previous.length === 1
                                ? previous
                                : previous.filter((candidate) => candidate !== token)
                              : [...previous, token].sort(),
                          );
                          return;
                        }
                        setFocusSet([token]);
                      };
                      return html`<button key=${token} class="graph-btn token" type="button" aria-pressed=${active} onClick=${toggle}>${token}</button>`;
                    })}
                  </div>
                  <div class="graph-control-note">
                    ${lens === "strike"
                      ? "Choose one or more datasets to remove as a coordinated strike path."
                      : "Choose the dataset whose edge additions or deletions you want to inspect."}
                  </div>
                </section>
              `}
        </div>
      </section>

      <section class="graph-stage">
        <div class="graph-canvas-card">
          <div class="graph-card-head">
            <div>
              <span class="graph-kicker">Subset lattice</span>
              <h3 class="graph-card-title">Nodes are training sets; colors read off the active eval slice.</h3>
            </div>
            <div class="graph-pill-row">
              <span class="graph-pill">${lensMeta[lens].title}</span>
              <span class="graph-pill" data-testid="graph-pill-train">Train ${label(selectedSet)}</span>
              <span class="graph-pill" data-testid="graph-pill-eval">Eval ${label(evalSet)}</span>
              <span class="graph-pill" data-testid="graph-pill-metric">${metricMeta[metric].short}</span>
            </div>
          </div>

          <div class="graph-legend">
            <span class="graph-legend-item"><span class="graph-legend-swatch selected"></span>Selected train node</span>
            <span class="graph-legend-item"><span class="graph-legend-swatch eval"></span>Active eval slice</span>
            <span class="graph-legend-item"><span class="graph-legend-swatch highlighted"></span>Current walk</span>
            <span class="graph-legend-item"><span class="graph-legend-swatch neutral"></span>Unselected edit edge</span>
          </div>

          <div class="graph-command-readout">
            <span class="graph-control-label">${graphCommandLabel}</span>
            <span class="graph-command-value">Train ${label(previewSet)} | Eval ${label(evalSet)} | Score ${previewValue.toFixed(4)}</span>
            <span class="graph-command-note">${graphCommandCopy}</span>
          </div>

          <div class="graph-scroll" ref=${scrollRef}>
            <svg
              class="graph-lattice"
              data-testid="explorer-graph"
              viewBox=${`0 0 ${graph.width} ${graph.height}`}
              aria-label="Subset lattice"
            >
              ${graph.edges.map((edge) => {
                const from = graph.nodes.get(edge.from);
                const to = graph.nodes.get(edge.to);
                if (!from || !to) return null;
                const highlighted = highlightedEdges.has(edge.key);
                const pathToken = changedToken(subsets[edge.from] || [], subsets[edge.to] || []);
                return html`
                  <g key=${edge.id} class=${`graph-edge ${highlighted ? "is-highlighted" : ""}`}>
                    <line
                      x1=${from.x}
                      y1=${from.y + from.height / 2 - 2}
                      x2=${to.x}
                      y2=${to.y - to.height / 2 + 2}
                    />
                    ${highlighted
                      ? html`
                          <text x=${(from.x + to.x) / 2} y=${(from.y + to.y) / 2 - 6} text-anchor="middle">
                            ${pathToken}
                          </text>
                        `
                      : null}
                  </g>
                `;
              })}

              ${subsets.map((_, index) => {
                const node = graph.nodes.get(index);
                if (!node) return null;
                const value = matrix[index]?.[safeEvalIndex] ?? 0;
                const normalized = normalizeValue(value, colMin, colMax, 0.5);
                const selected = index === safeSelectedIndex;
                const highlighted = highlightedNodes.has(index);
                const hovered = index === hoveredNodeIndex;
                const evalMirrored = index === safeEvalIndex;
                return html`
                  <g
                    key=${`node-${index}`}
                    class=${`graph-node ${selected ? "is-selected" : ""} ${highlighted ? "is-highlighted" : ""} ${hovered ? "is-hovered" : ""} ${evalMirrored ? "is-eval" : ""}`}
                    transform=${`translate(${node.x}, ${node.y})`}
                    onClick=${() => setSelectedIndex(index)}
                    onKeyDown=${(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        setSelectedIndex(index);
                      }
                    }}
                    onMouseEnter=${() => setHoveredNodeIndex(index)}
                    onMouseLeave=${() => setHoveredNodeIndex(null)}
                    onFocus=${() => setHoveredNodeIndex(index)}
                    onBlur=${() => setHoveredNodeIndex(null)}
                    data-selected=${selected ? "true" : "false"}
                    role="button"
                    tabIndex="0"
                    aria-label=${`Select training world ${node.label}`}
                  >
                    <rect
                      class="graph-node-halo"
                      x=${-node.width / 2 - 5}
                      y=${-node.height / 2 - 5}
                      width=${node.width + 10}
                      height=${node.height + 10}
                      rx="20"
                    />
                    <rect
                      class="graph-node-plate"
                      x=${-node.width / 2}
                      y=${-node.height / 2}
                      width=${node.width}
                      height=${node.height}
                      rx="16"
                      fill=${palette(normalized)}
                    />
                    <rect
                      class="graph-node-frame"
                      x=${-node.width / 2 + 2}
                      y=${-node.height / 2 + 2}
                      width=${Math.max(0, node.width - 4)}
                      height=${Math.max(0, node.height - 4)}
                      rx="13"
                    />
                    ${evalMirrored
                      ? html`<circle class="graph-node-eval" cx=${node.width / 2 - 10} cy=${-node.height / 2 + 10} r="4"></circle>`
                      : null}
                    <text x="0" y="5" text-anchor="middle">${node.label}</text>
                  </g>
                `;
              })}
            </svg>
          </div>

          <div class="graph-footnote">
            Midpoint nodes can get wide as the universe grows. The canvas scrolls horizontally so the full lattice stays inspectable.
          </div>
        </div>

        <div class="graph-sidepanels">
          <section class="graph-panel" data-testid="graph-lens-panel">
            <div class="graph-panel-head">
              <div>
                <span class="graph-kicker">Current lens</span>
                <h3 class="graph-panel-title">${questionBlock.title}</h3>
              </div>
              <span class="graph-answer-pill">${questionBlock.answerLabel}: ${questionBlock.answerValue}</span>
            </div>
            <p class="graph-panel-copy">${questionBlock.copy}</p>
            <div class="graph-stat-grid">
              <div class="graph-stat">
                <span class="graph-stat-label">Selected score</span>
                <span class="graph-stat-value" data-testid="graph-selected-score">${currentValue.toFixed(4)}</span>
              </div>
              <div class="graph-stat">
                <span class="graph-stat-label">Train node</span>
                <span class="graph-stat-value" data-testid="graph-selected-train">${label(selectedSet)}</span>
              </div>
              <div class="graph-stat">
                <span class="graph-stat-label">Eval slice</span>
                <span class="graph-stat-value" data-testid="graph-selected-eval">${label(evalSet)}</span>
              </div>
              <div class="graph-stat">
                <span class="graph-stat-label">Node degree</span>
                <span class="graph-stat-value">${selectedSet.length + additionWalks.length}</span>
              </div>
            </div>
            <div class="graph-inline-actions graph-action-row" data-testid="graph-quick-actions">
              <button class="graph-btn mini" type="button" onClick=${() => emptySetIndex >= 0 && setSelectedIndex(emptySetIndex)}>Use empty train</button>
              <button class="graph-btn mini" type="button" onClick=${() => fullSetIndex >= 0 && setSelectedIndex(fullSetIndex)}>Use full train</button>
              <button class="graph-btn mini" type="button" onClick=${() => setSelectedIndex(safeEvalIndex)}>Use eval as train</button>
              ${lens === "ablation"
                ? html`
                    <button class="graph-btn mini" type="button" disabled=${!canJumpToAblation} onClick=${() => canJumpToAblation && setSelectedIndex(ablationIndex)}>
                      Jump to without ${focusPrimary}
                    </button>
                  `
                : null}
              ${lens === "strike"
                ? html`
                    <button class="graph-btn mini" type="button" disabled=${!canJumpToStrikeTerminal} onClick=${() => canJumpToStrikeTerminal && setSelectedIndex(strikeTerminalIndex)}>
                      Jump to strike remainder
                    </button>
                  `
                : null}
            </div>
            <div class="graph-formula">${questionBlock.formula}</div>
            ${lens === "strike"
              ? html`
                  <div class="graph-path-strip" data-testid="graph-path-strip">
                    ${strikePath.map((index, step) => html`
                      <button
                        key=${`step-${index}`}
                        class="graph-btn mini graph-path-node"
                        type="button"
                        onClick=${() => setSelectedIndex(index)}
                      >
                        ${label(subsets[index] || [])}${step < strikePath.length - 1 ? " ->" : ""}
                      </button>
                    `)}
                  </div>
                `
              : null}
            ${lens === "shapley" && shapleyStats.rows.length
              ? html`
                  <table class="graph-table">
                    <thead>
                      <tr><th>|S|</th><th>Avg delta</th><th>Edges</th></tr>
                    </thead>
                    <tbody>
                      ${shapleyStats.rows.map((row) => html`
                        <tr key=${`shape-${row.size}`}>
                          <td>${row.size}</td>
                          <td>${row.avg.toFixed(4)}</td>
                          <td>${row.n}</td>
                        </tr>
                      `)}
                    </tbody>
                  </table>
                `
              : null}
            ${lens === "scaling"
              ? html`
                  <table class="graph-table">
                    <thead>
                      <tr><th>k</th><th>Avg score</th><th>Nodes</th></tr>
                    </thead>
                    <tbody>
                      ${scalingRows.map((row) => html`
                        <tr key=${`layer-${row.k}`} class=${row.k === k ? "is-active" : ""}>
                          <td>${row.k}</td>
                          <td>${row.avg.toFixed(4)}</td>
                          <td>${row.n}</td>
                        </tr>
                      `)}
                    </tbody>
                  </table>
                `
              : null}
          </section>

          <section class="graph-panel">
            <div class="graph-panel-head">
              <div>
                <span class="graph-kicker">One-step edits</span>
                <h3 class="graph-panel-title">Neighbors of ${label(selectedSet)}</h3>
              </div>
              <span class="graph-pill">Eval ${label(evalSet)}</span>
            </div>
            <div class="graph-neighbor-columns">
              <div>
                <div class="graph-neighbor-title">Single deletions</div>
                <ul class="graph-neighbor-list" data-testid="graph-removal-neighbors">
                  ${removalWalks.length
                    ? removalWalks.map((entry) => html`
                        <li key=${`drop-${entry.token}`}>
                          <button
                            class="graph-neighbor-button"
                            type="button"
                            onClick=${() => entry.nextIndex >= 0 && setSelectedIndex(entry.nextIndex)}
                            disabled=${entry.nextIndex < 0}
                          >
                            <span class="graph-neighbor-main">-${entry.token} -> ${entry.nextLabel}</span>
                            <span class="graph-neighbor-meta">${entry.kind} | ${formatSigned(-entry.delta)}</span>
                          </button>
                        </li>
                      `)
                    : html`<li>No deletions available from the empty set.</li>`}
                </ul>
              </div>
              <div>
                <div class="graph-neighbor-title">Single additions</div>
                <ul class="graph-neighbor-list" data-testid="graph-addition-neighbors">
                  ${additionWalks.length
                    ? additionWalks.map((entry) => html`
                        <li key=${`add-${entry.token}`}>
                          <button
                            class="graph-neighbor-button"
                            type="button"
                            onClick=${() => entry.nextIndex >= 0 && setSelectedIndex(entry.nextIndex)}
                            disabled=${entry.nextIndex < 0}
                          >
                            <span class="graph-neighbor-main">+${entry.token} -> ${entry.nextLabel}</span>
                            <span class="graph-neighbor-meta">${entry.kind} | ${formatSigned(entry.delta)}</span>
                          </button>
                        </li>
                      `)
                    : html`<li>The full training set has no outgoing augmentation edges.</li>`}
                </ul>
              </div>
            </div>
          </section>
        </div>
      </section>
    </div>
  `;
}

export default App;
