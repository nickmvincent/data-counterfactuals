import { useEffect, useMemo, useReducer, useRef, useState } from "preact/hooks";
import {
  DEFAULT_SCENARIO_ID,
  EXPLAINER_STORAGE_KEY,
  METRICS,
  SCENARIOS,
  STORAGE_KEY,
  bestBudgetWorld,
  comparisonMatched,
  createInitialState,
  deriveExploreComparisons,
  deriveComparison,
  deriveWorkload,
  evaluateMetric,
  formatBytes,
  formatCount,
  getDisplaySubsets,
  getEmpiricalStudy,
  getGraphEdges,
  getScenario,
  getScenarioNotes,
  labReducer,
  layerAverages,
  parseLabState,
  serializeLabState,
  subsetLabel,
  worldKey,
  worldLabel,
  worldFromKey,
} from "../lib/lab-model.js";
import { deriveTechnicalConceptPlans } from "../lib/concept-planner.js";
import "../styles/lab.css";

function setsEqual(left, right) {
  if (left.length !== right.length) return false;
  const values = new Set(left);
  return right.every((value) => values.has(value));
}

function scoreLabel(score, metricId) {
  if (!Number.isFinite(score)) return "—";
  if (metricId === "raw-overlap") return score.toFixed(0);
  if (metricId === "empirical-perplexity") return score.toFixed(1);
  return score.toFixed(2);
}

function deltaLabel(delta, metricId) {
  if (!Number.isFinite(delta)) return "—";
  const prefix = delta > 0 ? "+" : "";
  return `${prefix}${scoreLabel(delta, metricId)}`;
}

function useReducedMotion(state) {
  const [systemPreference, setSystemPreference] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setSystemPreference(media.matches);
    update();
    media.addEventListener?.("change", update);
    return () => media.removeEventListener?.("change", update);
  }, []);

  return state.display.reducedMotionOverride ?? systemPreference;
}

function normalizedScore(state, score) {
  if (!Number.isFinite(score)) return null;
  const study = getEmpiricalStudy(state);
  if (study?.scoreDomain) {
    const [minimum, maximum] = study.scoreDomain;
    if (maximum === minimum) return 1;
    return Math.max(0, Math.min(1, (maximum - score) / (maximum - minimum)));
  }
  return Math.max(0, Math.min(1, score));
}

function colorForScore(state, score) {
  const normalized = normalizedScore(state, score);
  if (normalized === null) return "#09140f";
  const hue = 154 + normalized * 44;
  const saturation = 47 + normalized * 22;
  const lightness = 18 + normalized * 43;
  return `hsl(${hue} ${saturation}% ${lightness}%)`;
}

function subsetDisplayLabel(state, values, axis) {
  const study = getEmpiricalStudy(state);
  const key = [...values].sort((a, b) => a.localeCompare(b)).join(",");
  return study?.subsetLabels?.[axis]?.[key] || subsetLabel(values);
}

function evidenceWorldLabel(state, kind) {
  const study = getEmpiricalStudy(state);
  if (study?.worldLabels?.[kind]) return study.worldLabels[kind];
  return worldLabel(kind === "baseline" ? state.baseline : state.counterfactual);
}

function makeWorldForSubset(state, train, evaluation) {
  const corrupted =
    setsEqual(train, state.counterfactual.train) &&
    setsEqual(evaluation, state.counterfactual.eval)
      ? state.counterfactual.corrupted || []
      : [];
  return { train, eval: evaluation, ...(corrupted.length ? { corrupted } : {}) };
}

function drawRoundedRect(ctx, x, y, width, height, radius) {
  const safeRadius = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, safeRadius);
}

function drawGrid(
  ctx,
  state,
  bounds,
  trainSubsets,
  evalSubsets,
  alpha,
  hitTargets,
  pulse,
) {
  if (alpha <= 0.01) return new Map();

  const { width, height } = bounds;
  const left = 84;
  const top = 54;
  const availableWidth = Math.max(160, width - left - 26);
  const availableHeight = Math.max(160, height - top - 46);
  const cellWidth = Math.min(
    getEmpiricalStudy(state) ? 140 : 64,
    availableWidth / Math.max(evalSubsets.length, 1),
  );
  const cellHeight = Math.min(46, availableHeight / Math.max(trainSubsets.length, 1));
  const gridWidth = cellWidth * evalSubsets.length;
  const gridHeight = cellHeight * trainSubsets.length;
  const originX = left + Math.max(0, (availableWidth - gridWidth) / 2);
  const originY = top + Math.max(0, (availableHeight - gridHeight) / 2);
  const rowCenters = new Map();

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.font = "600 11px ui-monospace, SFMono-Regular, Menlo, monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#9bb7ab";
  evalSubsets.forEach((evaluation, column) => {
    const x = originX + column * cellWidth + cellWidth / 2;
    ctx.fillText(subsetDisplayLabel(state, evaluation, "eval"), x, originY - 19);
  });
  ctx.save();
  ctx.translate(18, originY + gridHeight / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillStyle = "#6f8e82";
  ctx.font = "700 9px ui-monospace, SFMono-Regular, Menlo, monospace";
  ctx.letterSpacing = "0.12em";
  ctx.fillText(getEmpiricalStudy(state)?.axisLabels.train || "TRAINING WORLDS", 0, 0);
  ctx.restore();
  ctx.fillStyle = "#6f8e82";
  ctx.font = "700 9px ui-monospace, SFMono-Regular, Menlo, monospace";
  ctx.fillText(
    getEmpiricalStudy(state)?.axisLabels.eval || "EVALUATION WORLDS",
    originX + gridWidth / 2,
    14,
  );

  trainSubsets.forEach((train, row) => {
    const y = originY + row * cellHeight;
    const centerY = y + cellHeight / 2;
    rowCenters.set(train.join(","), {
      x: originX - 22,
      y: centerY,
    });
    ctx.textAlign = "right";
    ctx.fillStyle = "#a7c0b6";
    ctx.font = "600 11px ui-monospace, SFMono-Regular, Menlo, monospace";
    ctx.fillText(subsetDisplayLabel(state, train, "train"), originX - 10, centerY);

    evalSubsets.forEach((evaluation, column) => {
      const x = originX + column * cellWidth;
      const currentWorld = makeWorldForSubset(state, train, evaluation);
      const score = evaluateMetric(state, currentWorld);
      const observed = Number.isFinite(score);
      const key = worldKey(currentWorld);
      const groupA = state.mode === "explore" && state.selection.worldA.includes(key);
      const groupB = state.mode === "explore" && state.selection.worldB.includes(key);
      const selected =
        state.mode === "explore"
          ? groupA || groupB
          : state.selection.evidence.includes(key);
      const baseline =
        state.mode === "guided" && key === worldKey(state.baseline);
      const counterfactual =
        state.mode === "guided" && key === worldKey(state.counterfactual);

      ctx.fillStyle = colorForScore(state, score);
      drawRoundedRect(
        ctx,
        x + 2,
        y + 2,
        Math.max(3, cellWidth - 4),
        Math.max(3, cellHeight - 4),
        Math.min(7, cellHeight / 4),
      );
      ctx.fill();

      if (!observed) {
        ctx.save();
        drawRoundedRect(
          ctx,
          x + 2,
          y + 2,
          Math.max(3, cellWidth - 4),
          Math.max(3, cellHeight - 4),
          Math.min(7, cellHeight / 4),
        );
        ctx.clip();
        ctx.strokeStyle = "rgba(154, 196, 177, 0.12)";
        ctx.lineWidth = 1;
        for (let offset = -cellHeight; offset < cellWidth; offset += 9) {
          ctx.beginPath();
          ctx.moveTo(x + offset, y + cellHeight);
          ctx.lineTo(x + offset + cellHeight, y);
          ctx.stroke();
        }
        ctx.restore();
      }

      if (baseline || counterfactual || selected) {
        ctx.save();
        const pulseStrength = pulse?.keys.has(key) ? pulse.strength : 0;
        ctx.lineWidth = selected ? 3 + pulseStrength * 2 : 1.5;
        ctx.strokeStyle = selected
          ? groupA
            ? "#8ee6bd"
            : groupB
              ? "#ff8d6b"
              : "#ffe88c"
          : baseline
            ? "#b7d5ca"
            : "#ff8d6b";
        if (pulseStrength > 0) {
          ctx.shadowColor = ctx.strokeStyle;
          ctx.shadowBlur = 18 * pulseStrength;
        }
        ctx.stroke();
        ctx.restore();
      }

      if (groupA || groupB) {
        ctx.fillStyle = groupA ? "#8ee6bd" : "#ff8d6b";
        ctx.beginPath();
        ctx.arc(x + 10, y + 10, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#07130e";
        ctx.font = "800 8px ui-monospace, SFMono-Regular, Menlo, monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(groupA ? "A" : "B", x + 10, y + 10.5);
      }

      if (state.display.numbers && cellWidth >= 34 && cellHeight >= 26) {
        ctx.textAlign = "center";
        const normalized = normalizedScore(state, score);
        ctx.fillStyle =
          normalized === null
            ? "#60796e"
            : normalized > 0.55
              ? "#07130f"
              : "#e6f1ec";
        ctx.font = "650 10px ui-monospace, SFMono-Regular, Menlo, monospace";
        ctx.fillText(
          scoreLabel(score, state.metric.id),
          x + cellWidth / 2,
          centerY,
        );
      }

      if (alpha > 0.8 && observed) {
        hitTargets.push({
          type: "world",
          x,
          y,
          width: cellWidth,
          height: cellHeight,
          world: currentWorld,
          label: `${subsetDisplayLabel(state, train, "train")}, ${subsetDisplayLabel(state, evaluation, "eval")}`,
        });
      }
    });
  });

  ctx.restore();
  return rowCenters;
}

function graphPositions(subsets, objectCount, bounds) {
  const layers = new Map();
  subsets.forEach((subset, index) => {
    const layer = layers.get(subset.length) || [];
    layer.push({ subset, index });
    layers.set(subset.length, layer);
  });

  const positions = new Map();
  const left = 62;
  const right = Math.max(left + 120, bounds.width - 40);
  const top = 60;
  const bottom = Math.max(top + 120, bounds.height - 48);

  for (const [size, members] of layers) {
    const x =
      objectCount === 0
        ? (left + right) / 2
        : left + (size / objectCount) * (right - left);
    members.sort((a, b) =>
      subsetLabel(a.subset).localeCompare(subsetLabel(b.subset)),
    );
    members.forEach((member, memberIndex) => {
      const y =
        members.length === 1
          ? (top + bottom) / 2
          : top + (memberIndex / (members.length - 1)) * (bottom - top);
      positions.set(member.subset.join(","), { x, y, index: member.index });
    });
  }

  return positions;
}

function drawGraph(
  ctx,
  state,
  bounds,
  trainSubsets,
  alpha,
  hitTargets,
  pulse,
) {
  const positions = graphPositions(trainSubsets, state.objects.length, bounds);
  if (alpha <= 0.01) return positions;

  const evalWorld = state.counterfactual.eval;
  const edges = getGraphEdges(trainSubsets);
  const baselineKey = state.baseline.train.join(",");
  const counterfactualKey = state.counterfactual.train.join(",");
  const baselinePosition = positions.get(baselineKey);
  const counterfactualPosition = positions.get(counterfactualKey);

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = "#6f8e82";
  ctx.font = "700 9px ui-monospace, SFMono-Regular, Menlo, monospace";
  ctx.textAlign = "center";
  ctx.fillText(
    getEmpiricalStudy(state)
      ? "OBSERVED DATASTORE ACCESS STATES"
      : `SUBSET SIZE 0 → ${state.objects.length}`,
    bounds.width / 2,
    18,
  );

  ctx.strokeStyle = "rgba(139, 177, 161, 0.18)";
  ctx.lineWidth = 1;
  for (const [leftIndex, rightIndex] of edges) {
    const left = positions.get(trainSubsets[leftIndex].join(","));
    const right = positions.get(trainSubsets[rightIndex].join(","));
    if (!left || !right) continue;
    ctx.beginPath();
    ctx.moveTo(left.x, left.y);
    ctx.lineTo(right.x, right.y);
    ctx.stroke();
  }

  if (
    baselinePosition &&
    counterfactualPosition &&
    baselinePosition !== counterfactualPosition
  ) {
    ctx.strokeStyle =
      state.operation.kind === "corrupt" ? "#d68cff" : "#ff8d6b";
    ctx.lineWidth = 3;
    if (state.operation.kind === "unlearn-audit") ctx.setLineDash([8, 6]);
    ctx.beginPath();
    ctx.moveTo(baselinePosition.x, baselinePosition.y);
    ctx.lineTo(counterfactualPosition.x, counterfactualPosition.y);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  if (
    state.operation.kind === "corrupt" &&
    baselinePosition &&
    counterfactualPosition
  ) {
    ctx.strokeStyle = "#d68cff";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(baselinePosition.x + 24, baselinePosition.y - 18, 21, 0.4, 5.3);
    ctx.stroke();
  }

  trainSubsets.forEach((train) => {
    const position = positions.get(train.join(","));
    if (!position) return;
    const currentWorld = makeWorldForSubset(state, train, evalWorld);
    const key = worldKey(currentWorld);
    const score = evaluateMetric(state, currentWorld);
    const isBaselineTrain = setsEqual(train, state.baseline.train);
    const isCounterfactualTrain = setsEqual(train, state.counterfactual.train);
    const groupA = state.mode === "explore" && state.selection.worldA.includes(key);
    const groupB = state.mode === "explore" && state.selection.worldB.includes(key);
    const selected =
      state.mode === "explore"
        ? groupA || groupB
        : state.selection.evidence.includes(key) ||
          (isBaselineTrain &&
            state.selection.evidence.includes(worldKey(state.baseline))) ||
          (isCounterfactualTrain &&
            state.selection.evidence.includes(worldKey(state.counterfactual)));
    const radius = selected ? 12 : 9;

    ctx.fillStyle = colorForScore(state, score);
    ctx.beginPath();
    ctx.arc(position.x, position.y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.save();
    const pulseStrength = pulse?.keys.has(key) ? pulse.strength : 0;
    ctx.lineWidth = selected ? 3 + pulseStrength * 2 : 1.5;
    ctx.strokeStyle = selected
      ? groupA
        ? "#8ee6bd"
        : groupB
          ? "#ff8d6b"
          : "#ffe88c"
      : state.mode === "guided" && isCounterfactualTrain
        ? "#ff8d6b"
        : state.mode === "guided" && isBaselineTrain
          ? "#b7d5ca"
          : "rgba(214, 235, 226, 0.38)";
    if (pulseStrength > 0) {
      ctx.shadowColor = ctx.strokeStyle;
      ctx.shadowBlur = 18 * pulseStrength;
    }
    ctx.stroke();
    ctx.restore();

    if (groupA || groupB) {
      ctx.fillStyle = groupA ? "#8ee6bd" : "#ff8d6b";
      ctx.beginPath();
      ctx.arc(position.x - 11, position.y - 11, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#07130e";
      ctx.font = "800 8px ui-monospace, SFMono-Regular, Menlo, monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(groupA ? "A" : "B", position.x - 11, position.y - 10.5);
    }

    ctx.fillStyle = "#dcebe5";
    ctx.font = "600 10px ui-monospace, SFMono-Regular, Menlo, monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText(
      subsetDisplayLabel(state, train, "train"),
      position.x,
      position.y + radius + 5,
    );

    if (alpha > 0.8) {
      hitTargets.push({
        type: "world",
        x: position.x - 17,
        y: position.y - 17,
        width: 34,
        height: 34,
        world: currentWorld,
        label: `${subsetDisplayLabel(state, train, "train")}, ${subsetDisplayLabel(state, evalWorld, "eval")}`,
      });
    }
  });

  if (
    state.operation.kind === "reserve-eval" &&
    baselinePosition &&
    setsEqual(state.baseline.train, state.counterfactual.train)
  ) {
    const before = evaluateMetric(state, state.baseline);
    const after = evaluateMetric(state, state.counterfactual);
    const x = baselinePosition.x + 36;
    const y = baselinePosition.y - 44;
    ctx.fillStyle = "#0e2119";
    drawRoundedRect(ctx, x, y, 116, 42, 8);
    ctx.fill();
    ctx.strokeStyle = "rgba(194, 226, 212, 0.32)";
    ctx.stroke();
    ctx.fillStyle = "#cfe4db";
    ctx.font = "600 10px ui-monospace, SFMono-Regular, Menlo, monospace";
    ctx.textAlign = "left";
    ctx.fillText(
      `${subsetLabel(state.baseline.eval)}  ${scoreLabel(before, state.metric.id)}`,
      x + 10,
      y + 8,
    );
    ctx.fillStyle = "#ffb09a";
    ctx.fillText(
      `${subsetLabel(state.counterfactual.eval)}  ${scoreLabel(after, state.metric.id)}`,
      x + 10,
      y + 23,
    );
  }

  if (
    state.operation.kind === "unlearn-audit" &&
    Number.isFinite(state.advanced.candidateUnlearnedScore) &&
    counterfactualPosition
  ) {
    ctx.strokeStyle = "#d68cff";
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 5]);
    ctx.beginPath();
    ctx.arc(
      counterfactualPosition.x,
      counterfactualPosition.y,
      21,
      0,
      Math.PI * 2,
    );
    ctx.stroke();
    ctx.setLineDash([]);
  }

  ctx.restore();
  return positions;
}

function drawMorphMarkers(
  ctx,
  state,
  trainSubsets,
  rowCenters,
  graphNodes,
  graphProgress,
) {
  if (graphProgress <= 0.01 || graphProgress >= 0.99) return;

  ctx.save();
  ctx.globalAlpha = 0.8;
  trainSubsets.forEach((train) => {
    const key = train.join(",");
    const row = rowCenters.get(key);
    const node = graphNodes.get(key);
    if (!row || !node) return;
    const x = row.x + (node.x - row.x) * graphProgress;
    const y = row.y + (node.y - row.y) * graphProgress;
    const score = evaluateMetric(state, {
      train,
      eval: state.counterfactual.eval,
    });
    ctx.fillStyle = colorForScore(state, score);
    ctx.beginPath();
    ctx.arc(x, y, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#d7ebe2";
    ctx.stroke();
  });
  ctx.restore();
}

function LabCanvas({ state, reducedMotion, onSelectWorld, onRenderStats }) {
  const canvasRef = useRef(null);
  const shellRef = useRef(null);
  const hitTargetsRef = useRef([]);
  const previousViewRef = useRef(state.view);
  const transitionRef = useRef(null);
  const previousSelectionsRef = useRef([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const shell = shellRef.current;
    if (!canvas || !shell) return undefined;

    const context = canvas.getContext("2d");
    let frame = 0;
    let cancelled = false;
    let firstFrameAt = null;
    const previousView = previousViewRef.current;
    const currentSelections =
      state.mode === "explore"
        ? [...state.selection.worldA, ...state.selection.worldB]
        : state.selection.evidence;
    const addedSelections = currentSelections.filter(
      (key) => !previousSelectionsRef.current.includes(key),
    );
    previousSelectionsRef.current = currentSelections;
    const selectionPulse =
      addedSelections.length > 0 && !reducedMotion
        ? {
            keys: new Set(addedSelections),
            start: performance.now(),
            duration: 720,
          }
        : null;
    if (previousView !== state.view) {
      transitionRef.current = {
        from: previousView === "graph" ? 1 : 0,
        to: state.view === "graph" ? 1 : 0,
        start: performance.now(),
        duration: reducedMotion ? 0 : 560,
      };
      previousViewRef.current = state.view;
    }

    const trainLimit =
      state.objects.length <= 5 ? 40 : state.objects.length <= 8 ? 30 : 18;
    const evalLimit =
      state.objects.length <= 4 ? 18 : state.objects.length <= 8 ? 12 : 8;
    const trainSubsets = getDisplaySubsets(state, "train", trainLimit);
    const evalSubsets = getDisplaySubsets(state, "eval", evalLimit);

    const render = (timestamp) => {
      if (cancelled) return;
      const rect = shell.getBoundingClientRect();
      const width = Math.max(320, Math.round(rect.width));
      const height = Math.max(420, Math.round(rect.height));
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      if (
        canvas.width !== Math.round(width * dpr) ||
        canvas.height !== Math.round(height * dpr)
      ) {
        canvas.width = Math.round(width * dpr);
        canvas.height = Math.round(height * dpr);
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
      }
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      context.clearRect(0, 0, width, height);

      const transition = transitionRef.current;
      let graphProgress = state.view === "graph" ? 1 : 0;
      let stillAnimating = false;
      if (transition) {
        const elapsed = timestamp - transition.start;
        const progress =
          transition.duration === 0
            ? 1
            : Math.min(1, Math.max(0, elapsed / transition.duration));
        const eased = 1 - (1 - progress) ** 3;
        graphProgress =
          transition.from + (transition.to - transition.from) * eased;
        stillAnimating = progress < 1;
        if (!stillAnimating) transitionRef.current = null;
      }

      let pulse = null;
      if (selectionPulse) {
        const progress = Math.min(
          1,
          Math.max(0, (timestamp - selectionPulse.start) / selectionPulse.duration),
        );
        pulse = {
          keys: selectionPulse.keys,
          strength: Math.sin(progress * Math.PI),
        };
        stillAnimating = stillAnimating || progress < 1;
      }

      const hitTargets = [];
      const bounds = { width, height };
      const rowCenters = drawGrid(
        context,
        state,
        bounds,
        trainSubsets,
        evalSubsets,
        1 - graphProgress,
        hitTargets,
        pulse,
      );
      const graphNodes = drawGraph(
        context,
        state,
        bounds,
        trainSubsets,
        graphProgress,
        hitTargets,
        pulse,
      );
      drawMorphMarkers(
        context,
        state,
        trainSubsets,
        rowCenters,
        graphNodes,
        graphProgress,
      );
      hitTargetsRef.current = hitTargets;

      if (firstFrameAt === null) {
        firstFrameAt = timestamp;
        const marks =
          state.view === "grid"
            ? trainSubsets.length * evalSubsets.length
            : trainSubsets.length + getGraphEdges(trainSubsets).length;
        onRenderStats({
          marks,
          frameTime: Math.max(0, performance.now() - timestamp),
        });
      }

      if (stillAnimating) frame = requestAnimationFrame(render);
    };

    const requestRender = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(render);
    };
    const observer = new ResizeObserver(requestRender);
    observer.observe(shell);
    requestRender();

    return () => {
      cancelled = true;
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [state, reducedMotion, onRenderStats]);

  const handlePointer = (event) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const target = [...hitTargetsRef.current]
      .reverse()
      .find(
        (item) =>
          x >= item.x &&
          x <= item.x + item.width &&
          y >= item.y &&
          y <= item.y + item.height,
      );
    canvasRef.current.style.cursor = target ? "pointer" : "crosshair";
    canvasRef.current.title = target ? target.label : "";
    if (event.type === "click" && target) {
      onSelectWorld(worldKey(target.world));
    }
  };

  return (
    <div class="lab-canvas-shell" ref={shellRef}>
      <canvas
        ref={canvasRef}
        class="lab-canvas"
        role="img"
        aria-label={
          state.mode === "explore"
            ? "Counterfactual world field. Select worlds for the active World A or World B set. A keyboard cell picker is available beside the canvas."
            : state.view === "grid"
              ? "Counterfactual score grid. Use the comparison buttons beside the canvas for a keyboard-accessible equivalent."
              : "Counterfactual subset graph. Use the comparison buttons beside the canvas for a keyboard-accessible equivalent."
        }
        onPointerMove={handlePointer}
        onPointerLeave={() => {
          if (canvasRef.current) canvasRef.current.style.cursor = "crosshair";
        }}
        onClick={handlePointer}
      />
      <div class="canvas-corner-label" aria-hidden="true">
        {state.view === "grid" ? "matrix field" : "subset topology"}
      </div>
    </div>
  );
}

function ScenarioTray({ state, onSelect }) {
  return (
    <section class="scenario-tray" aria-labelledby="scenario-heading">
      <div class="scenario-tray-heading">
        <div>
          <p class="instrument-label">Scenario deck</p>
          <h2 id="scenario-heading">Choose a comparison</h2>
        </div>
        <span>{SCENARIOS.length} prepared scenes</span>
      </div>
      <div class="scenario-list" role="list">
        {SCENARIOS.map((scenario, index) => (
          <button
            type="button"
            class={`scenario-card ${state.scenario === scenario.id ? "is-active" : ""}`}
            onClick={() => onSelect(scenario.id)}
            aria-pressed={state.scenario === scenario.id}
          >
            <span class="scenario-index">{String(index + 1).padStart(2, "0")}</span>
            <span>
              <strong>{scenario.title}</strong>
              <small>{scenario.eyebrow}</small>
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}

function LabModeBar({ state, dispatch, onModeChange }) {
  const activeWorld = state.selection.activeWorld === "b" ? "b" : "a";
  return (
    <div class="lab-modebar">
      <div class="lab-modebar-brand">
        <span class="modebar-light" aria-hidden="true" />
        <span>Counterfactual Lab</span>
      </div>
      <div class="mode-switcher" aria-label="Lab mode">
        <button
          type="button"
          class={state.mode === "guided" ? "is-active" : ""}
          aria-pressed={state.mode === "guided"}
          onClick={() => onModeChange("guided")}
        >
          Guided
        </button>
        <button
          type="button"
          class={state.mode === "explore" ? "is-active" : ""}
          aria-pressed={state.mode === "explore"}
          onClick={() => onModeChange("explore")}
        >
          Explore
        </button>
      </div>
      {state.mode === "explore" ? (
        <div class="world-side-switcher" aria-label="Add selected cells to">
          <span>Add cells to</span>
          <button
            type="button"
            class={activeWorld === "a" ? "is-active world-a" : "world-a"}
            aria-pressed={activeWorld === "a"}
            onClick={() => dispatch({ type: "SET_ACTIVE_WORLD", world: "a" })}
          >
            World A
          </button>
          <button
            type="button"
            class={activeWorld === "b" ? "is-active world-b" : "world-b"}
            aria-pressed={activeWorld === "b"}
            onClick={() => dispatch({ type: "SET_ACTIVE_WORLD", world: "b" })}
          >
            World B
          </button>
        </div>
      ) : (
        <span class="modebar-hint">Choose a scene below to run its comparison.</span>
      )}
    </div>
  );
}

function MetricPanel({ state, dispatch }) {
  const metric =
    METRICS.find((item) => item.id === state.metric.id) || METRICS[0];
  const study = getEmpiricalStudy(state);
  const availableMetrics = study
    ? [metric]
    : METRICS.filter((item) => !item.empiricalOnly);
  return (
    <section class="instrument-panel">
      <div class="panel-heading">
        <p class="instrument-label">Score function</p>
        <span class="range-chip">{metric.range}</span>
      </div>
      <label class="field-label" for="metric-select">
        Metric
      </label>
      <select
        id="metric-select"
        value={state.metric.id}
        disabled={Boolean(study)}
        onChange={(event) =>
          dispatch({ type: "SET_METRIC", id: event.currentTarget.value })
        }
      >
        {availableMetrics.map((item) => (
          <option value={item.id}>{item.name}</option>
        ))}
      </select>
      <code class="formula">{metric.formula}</code>
    </section>
  );
}

function EmpiricalEvidence({ study }) {
  const rows = [...study.rows, study.aggregate];
  return (
    <section class="empirical-evidence" aria-labelledby="empirical-evidence-title">
      <div class="empirical-evidence-heading">
        <div>
          <p class="instrument-label">Published results</p>
          <h3 id="empirical-evidence-title">Seven held-out books</h3>
        </div>
        <span>{study.direction}</span>
      </div>
      <div class="empirical-table-wrap">
        <table>
          <thead>
            <tr>
              <th scope="col">Evaluation</th>
              <th scope="col">With related</th>
              <th scope="col">Removed</th>
              <th scope="col">Δ</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const delta = row.afterRemoval - row.withRelated;
              return (
                <tr class={row === study.aggregate ? "is-average" : ""}>
                  <th scope="row">{row.evaluation}</th>
                  <td>{row.withRelated.toFixed(1)}</td>
                  <td>{row.afterRemoval.toFixed(1)}</td>
                  <td>+{delta.toFixed(1)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p>{study.method}</p>
      <div class="empirical-source-links">
        <a href={study.source.url} target="_blank" rel="noreferrer">
          View {study.source.table} · {study.source.venue} ↗
        </a>
        <a href={study.source.codeUrl} target="_blank" rel="noreferrer">
          Source code ↗
        </a>
      </div>
    </section>
  );
}

function FreePlayDrawer({ state, dispatch }) {
  return (
    <details class="control-drawer">
      <summary>
        <span>
          <span class="instrument-label">Configuration</span>
          Explore controls
        </span>
        <span aria-hidden="true">＋</span>
      </summary>
      <div class="drawer-body">
        <div class="object-count-control">
          <div>
            <span class="field-label">Data objects</span>
            <strong>{state.objects.length}</strong>
          </div>
          <div class="stepper">
            <button
              type="button"
              onClick={() => dispatch({ type: "REMOVE_OBJECT" })}
              disabled={state.objects.length <= 1}
              aria-label="Remove the last data object"
            >
              −
            </button>
            <button
              type="button"
              onClick={() => dispatch({ type: "ADD_OBJECT" })}
              aria-label="Add a data object"
            >
              +
            </button>
          </div>
        </div>

        <div class="weights-editor">
          <span class="field-label">Object weights</span>
          <div class="weight-grid">
            {state.objects.map((item) => (
              <label>
                <span>{item.id}</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={item.weight}
                  onChange={(event) =>
                    dispatch({
                      type: "SET_OBJECT_WEIGHT",
                      id: item.id,
                      value: event.currentTarget.value,
                    })
                  }
                />
              </label>
            ))}
          </div>
        </div>

        <details class="advanced-controls">
          <summary>Advanced parameters</summary>
          <div class="advanced-grid">
            <label>
              <span>Poison penalty</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={state.advanced.poisonPenalty}
                onChange={(event) =>
                  dispatch({
                    type: "SET_ADVANCED",
                    field: "poisonPenalty",
                    value: event.currentTarget.value,
                  })
                }
              />
            </label>
            <label>
              <span>Budget k</span>
              <input
                type="number"
                min="0"
                step="1"
                value={state.advanced.budget ?? ""}
                onChange={(event) =>
                  dispatch({
                    type: "SET_ADVANCED",
                    field: "budget",
                    value: event.currentTarget.value,
                  })
                }
              />
            </label>
            <label>
              <span>Candidate unlearning score</span>
              <input
                type="number"
                step="0.01"
                value={state.advanced.candidateUnlearnedScore ?? ""}
                onChange={(event) =>
                  dispatch({
                    type: "SET_ADVANCED",
                    field: "candidateUnlearnedScore",
                    value: event.currentTarget.value,
                  })
                }
              />
            </label>
          </div>
        </details>
      </div>
    </details>
  );
}

function ResourceHud({ state, renderStats }) {
  const workload = deriveWorkload(
    state,
    renderStats.marks,
    renderStats.frameTime,
  );
  const modeLabel =
    workload.tier[0].toUpperCase() + workload.tier.slice(1);
  return (
    <details class="resource-hud">
      <summary>
        <span class={`status-light status-${workload.tier}`} />
        <span>
          <small>Render mode</small>
          <strong>{modeLabel}</strong>
        </span>
        <span class="hud-count">{formatCount(workload.worlds)} worlds</span>
      </summary>
      <dl>
        <div>
          <dt>Backend</dt>
          <dd>{workload.backend}</dd>
        </div>
        <div>
          <dt>Data objects</dt>
          <dd>{workload.objectCount}</dd>
        </div>
        <div>
          <dt>Possible train worlds</dt>
          <dd>{formatCount(workload.worlds)}</dd>
        </div>
        <div>
          <dt>Possible grid cells</dt>
          <dd>{formatCount(workload.cells)}</dd>
        </div>
        <div>
          <dt>Potential graph edges</dt>
          <dd>{formatCount(workload.edges)}</dd>
        </div>
        <div>
          <dt>Visible marks</dt>
          <dd>{workload.visibleMarks.toLocaleString()}</dd>
        </div>
        <div>
          <dt>Latest draw</dt>
          <dd>
            {workload.frameTime === null
              ? "Measuring"
              : `${workload.frameTime.toFixed(1)} ms`}
          </dd>
        </div>
        <div>
          <dt>Est. dense buffer</dt>
          <dd>{formatBytes(workload.estimatedBytes)}</dd>
        </div>
        <div>
          <dt>Tab memory</dt>
          <dd>Unavailable</dd>
        </div>
      </dl>
      <p>
        Counts and buffer size are estimates. Visible marks and draw time are
        measured here. Browsers do not expose reliable cross-browser GPU
        utilization.
      </p>
    </details>
  );
}

function GuidedProgress({ step }) {
  const steps = ["Question", "World A", "World B", "Compare"];
  return (
    <ol class="guided-progress" aria-label="Guided comparison construction">
      {steps.map((label, index) => (
        <li
          class={index < step ? "is-complete" : index === step ? "is-active" : ""}
          aria-current={index === step ? "step" : undefined}
        >
          <span>{index + 1}</span>
          {label}
        </li>
      ))}
    </ol>
  );
}

function conceptWorldList(values) {
  const visible = values.slice(0, 3).map((value) => worldLabel(value));
  const remainder = values.length - visible.length;
  return `${visible.join(", ")}${remainder > 0 ? ` +${remainder} more` : ""}`;
}

function ConceptProgress({ state, dispatch, analysis }) {
  const addMissing = (plan) => {
    dispatch({
      type: "ADD_EXPLORE_WORLDS",
      worldA: plan.missingA.map(worldKey),
      worldB: plan.missingB.map(worldKey),
      either: plan.missingEither.map(worldKey),
    });
  };

  return (
    <section class="concept-progress" aria-labelledby="concept-progress-title">
      <div class="concept-progress-heading">
        <div>
          <span class="field-label">Technical concept planner</span>
          <strong id="concept-progress-title">
            {analysis.readyCount} of {analysis.plans.length} ready
          </strong>
        </div>
        <progress
          max={analysis.plans.length}
          value={analysis.readyCount}
          aria-label={`${analysis.readyCount} of ${analysis.plans.length} technical concepts ready`}
        />
      </div>
      <p>
        Each row shows the closest valid instance and the evidence cells still
        needed to compute it.
      </p>
      <ol class="concept-plan-list">
        {analysis.plans.map((plan) => (
          <li class={`concept-plan is-${plan.status}`}>
            <details open={plan.status === "ready" || plan.progress > 0}>
              <summary>
                <span>
                  <strong>{plan.label}</strong>
                  <small>
                    {plan.status === "unavailable"
                      ? "Unavailable"
                      : plan.status === "ready"
                        ? `Ready${plan.readyInstances > 1 ? ` · ${plan.readyInstances} instances` : ""}`
                        : `${plan.matchedCount}/${plan.requiredCount} cells`}
                  </small>
                </span>
                {plan.status !== "unavailable" && (
                  <progress
                    max={plan.requiredCount}
                    value={plan.matchedCount}
                    aria-label={`${plan.label}: ${plan.matchedCount} of ${plan.requiredCount} required cells selected`}
                  />
                )}
              </summary>
              <div class="concept-plan-body">
                <p>{plan.description}</p>
                {plan.status === "unavailable" ? (
                  <p>{plan.unavailableReason}</p>
                ) : (
                  <>
                    <strong class="concept-instance">{plan.instance}</strong>
                    {(plan.roleA || plan.roleB) && (
                      <dl class="concept-roles">
                        {plan.roleA && (
                          <div><dt>World A</dt><dd>{plan.roleA}</dd></div>
                        )}
                        {plan.roleB && (
                          <div><dt>World B</dt><dd>{plan.roleB}</dd></div>
                        )}
                      </dl>
                    )}
                    {plan.status === "ready" ? (
                      <div class="concept-result">
                        <code>{plan.formula}</code>
                        <strong>{scoreLabel(plan.value, state.metric.id)}</strong>
                      </div>
                    ) : (
                      <div class="concept-needs">
                        {plan.missingA.length > 0 && (
                          <p>
                            <strong>Add to World A</strong>
                            {conceptWorldList(plan.missingA)}
                          </p>
                        )}
                        {plan.missingB.length > 0 && (
                          <p>
                            <strong>Add to World B</strong>
                            {conceptWorldList(plan.missingB)}
                          </p>
                        )}
                        {plan.missingEither.length > 0 && (
                          <p>
                            <strong>Add to either set</strong>
                            {conceptWorldList(plan.missingEither)}
                          </p>
                        )}
                        <button
                          type="button"
                          class="secondary-button"
                          onClick={() => addMissing(plan)}
                        >
                          Add {plan.missingCount} missing cell
                          {plan.missingCount === 1 ? "" : "s"}
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </details>
          </li>
        ))}
      </ol>
    </section>
  );
}

function ExploreInspector({ state, dispatch }) {
  const analysis = useMemo(() => deriveExploreComparisons(state, 8), [state]);
  const concepts = useMemo(() => deriveTechnicalConceptPlans(state), [state]);
  const activeWorld = state.selection.activeWorld === "b" ? "b" : "a";
  const trainSubsets = getDisplaySubsets(state, "train", 40);
  const evalSubsets = getDisplaySubsets(state, "eval", 18);
  const availableWorlds = useMemo(
    () =>
      trainSubsets.flatMap((train) =>
        evalSubsets.map((evaluation) =>
          makeWorldForSubset(state, train, evaluation),
        ),
      ),
    [state, trainSubsets, evalSubsets],
  );
  const availableKeys = availableWorlds.map((value) => worldKey(value));
  const [pickerKey, setPickerKey] = useState(availableKeys[0] || "");

  useEffect(() => {
    if (!availableKeys.includes(pickerKey)) {
      setPickerKey(availableKeys[0] || "");
    }
  }, [availableKeys, pickerKey]);

  const group = (name, keys) => (
    <section class={`explore-world-group world-${name.toLowerCase()}`}>
      <div>
        <span>World {name} set</span>
        <strong>{keys.length} cells</strong>
      </div>
      {keys.length ? (
        <div class="selected-worlds">
          {keys.map((key) => {
            const value = worldFromKey(key);
            return (
              <button
                type="button"
                onClick={() => {
                  dispatch({
                    type: "SET_ACTIVE_WORLD",
                    world: name.toLowerCase(),
                  });
                  dispatch({ type: "TOGGLE_EXPLORE_WORLD", key });
                }}
                aria-label={`Remove ${value ? worldLabel(value) : key} from World ${name}`}
              >
                {value ? worldLabel(value) : key} <span aria-hidden="true">×</span>
              </button>
            );
          })}
        </div>
      ) : (
        <p>No cells selected yet.</p>
      )}
    </section>
  );

  return (
    <aside class="comparison-inspector explore-inspector" aria-labelledby="explore-title">
      <div class="inspector-heading">
        <div>
          <p class="instrument-label">Open comparison</p>
          <h2 id="explore-title">Build two sets of worlds</h2>
        </div>
        {(state.selection.worldA.length > 0 || state.selection.worldB.length > 0) && (
          <button
            type="button"
            class="text-button"
            onClick={() => dispatch({ type: "CLEAR_EXPLORE_WORLDS" })}
          >
            Clear
          </button>
        )}
      </div>
      <p class="scenario-question">
        Add any grid cells to A and B. The lab compares every A × B pairing and
        identifies the counterfactual structures those selections support.
      </p>

      <div class="explore-world-groups">
        {group("A", state.selection.worldA)}
        {group("B", state.selection.worldB)}
      </div>

      <div class="keyboard-world-picker">
        <label class="field-label" for="world-cell-picker">
          Keyboard cell picker
        </label>
        <div>
          <select
            id="world-cell-picker"
            value={pickerKey}
            onChange={(event) => setPickerKey(event.currentTarget.value)}
          >
            {availableWorlds.map((value) => (
              <option value={worldKey(value)}>{worldLabel(value)}</option>
            ))}
          </select>
          <button
            type="button"
            class="secondary-button"
            disabled={!pickerKey}
            onClick={() =>
              dispatch({ type: "TOGGLE_EXPLORE_WORLD", key: pickerKey })
            }
          >
            Add to World {activeWorld.toUpperCase()}
          </button>
        </div>
      </div>

      <section class="counterfactual-results" aria-live="polite">
        <div class="counterfactual-results-heading">
          <span>Learnable comparisons</span>
          <strong>{analysis.counterfactualCount}</strong>
        </div>
        {analysis.totalPairings === 0 ? (
          <p>Select at least one cell for each world set.</p>
        ) : (
          <>
            <p>
              Computed all {analysis.totalPairings} A × B pairings
              {analysis.identicalCount
                ? `; ${analysis.identicalCount} identical pairing${analysis.identicalCount === 1 ? " is" : "s are"} not a counterfactual.`
                : "."}
            </p>
            <div class="counterfactual-categories">
              {analysis.categories.map((category) => (
                <span>
                  {category.label} <strong>{category.count}</strong>
                </span>
              ))}
            </div>
            <dl class="direction-summary">
              <div><dt>Higher</dt><dd>{analysis.direction.positive}</dd></div>
              <div><dt>Lower</dt><dd>{analysis.direction.negative}</dd></div>
              <div><dt>Unchanged</dt><dd>{analysis.direction.unchanged}</dd></div>
            </dl>
            {analysis.examples.length > 0 && (
              <details class="raw-comparisons">
                <summary>Show strongest pairings</summary>
                <ol class="comparison-results-list">
                  {analysis.examples.map((item) => (
                    <li>
                      <div>
                        <strong>{item.change}</strong>
                        <span>
                          {worldLabel(item.left)} → {worldLabel(item.right)}
                        </span>
                      </div>
                      <b>{deltaLabel(item.delta, state.metric.id)}</b>
                    </li>
                  ))}
                </ol>
              </details>
            )}
            {analysis.counterfactualCount > analysis.examples.length && (
              <p class="results-limit-note">
                Counts include every pairing; the {analysis.examples.length} largest
                score changes are listed.
              </p>
            )}
          </>
        )}
      </section>

      <ConceptProgress state={state} dispatch={dispatch} analysis={concepts} />

      <p class="explore-boundary">
        These are comparison structures under the visible toy score—not causal
        claims about a trained model or the outside world.
      </p>
    </aside>
  );
}

function ComparisonInspector({ state, dispatch, guidedStep }) {
  const comparison = deriveComparison(state);
  const matched = comparisonMatched(state);
  const notes = getScenarioNotes(state);
  const baselineKey = worldKey(state.baseline);
  const counterfactualKey = worldKey(state.counterfactual);
  const scenario =
    state.scenario === "custom" ? null : getScenario(state.scenario);
  const study = getEmpiricalStudy(state);
  const averages = state.operation.kind === "scale" ? layerAverages(state) : [];
  const budgetWinner =
    state.operation.kind === "select" ? bestBudgetWorld(state) : null;

  return (
    <aside class="comparison-inspector" aria-labelledby="inspector-title">
      <div class="inspector-heading">
        <div>
          <p class="instrument-label">Active comparison</p>
          <h2 id="inspector-title">
            {scenario?.title || "Custom counterfactual"}
          </h2>
        </div>
        <span class={`match-badge ${matched ? "is-matched" : ""}`}>
          {matched ? "Comparison matched" : "Select two worlds"}
        </span>
      </div>

      <p class="scenario-question">
        {scenario?.question ||
          "What changes between your baseline and configured counterfactual?"}
      </p>

      <GuidedProgress step={guidedStep} />

      <div
        class={`evidence-buttons ${study ? "is-empirical" : ""}`}
        aria-label="Comparison evidence"
      >
        <button
          type="button"
          class={state.selection.evidence.includes(baselineKey) ? "is-selected" : ""}
          aria-pressed={state.selection.evidence.includes(baselineKey)}
          onClick={() => dispatch({ type: "TOGGLE_EVIDENCE", key: baselineKey })}
        >
          <span>World A · Baseline</span>
          <strong>{evidenceWorldLabel(state, "baseline")}</strong>
          <small>
            {study?.metricShortLabel || "f"} ={" "}
            {scoreLabel(comparison.baselineScore, state.metric.id)}
          </small>
        </button>
        <span class="comparison-arrow" aria-hidden="true">
          →
        </span>
        <button
          type="button"
          class={
            state.selection.evidence.includes(counterfactualKey)
              ? "is-selected is-counterfactual"
              : "is-counterfactual"
          }
          aria-pressed={state.selection.evidence.includes(counterfactualKey)}
          onClick={() =>
            dispatch({ type: "TOGGLE_EVIDENCE", key: counterfactualKey })
          }
        >
          <span>World B · Changed world</span>
          <strong>{evidenceWorldLabel(state, "counterfactual")}</strong>
          <small>
            {study?.metricShortLabel || "f"} ={" "}
            {scoreLabel(comparison.counterfactualScore, state.metric.id)}
          </small>
        </button>
      </div>

      <div class="delta-readout">
        <span>
          {study
            ? `Observed ${study.metricLabel.toLowerCase()} change · ${study.direction}`
            : "Observed toy-score change"}
        </span>
        <strong>{deltaLabel(comparison.delta, state.metric.id)}</strong>
      </div>

      {study && <EmpiricalEvidence study={study} />}

      {averages.length > 0 && (
        <div class="layer-readout">
          <span class="field-label">Layer averages</span>
          <div>
            {averages.map((item) => (
              <span>
                k={item.size} <strong>{item.average.toFixed(2)}</strong>
              </span>
            ))}
          </div>
        </div>
      )}

      {budgetWinner && (
        <div class="winner-readout">
          <span>Best k={state.advanced.budget} world</span>
          <strong>{subsetLabel(budgetWinner.train)}</strong>
          <small>{budgetWinner.score.toFixed(2)} weighted coverage</small>
        </div>
      )}

      <dl class="interpretation-list">
        <div>
          <dt>Held fixed</dt>
          <dd>{notes.heldFixed}</dd>
        </div>
        <div>
          <dt>Changed</dt>
          <dd>{notes.changed}</dd>
        </div>
        <div>
          <dt>Interpretation boundary</dt>
          <dd>{notes.boundary}</dd>
        </div>
      </dl>

      <button
        type="button"
        class="text-button"
        onClick={() =>
          dispatch({
            type: "SELECT_SCENARIO",
            id:
              state.scenario === "custom"
                ? DEFAULT_SCENARIO_ID
                : state.scenario,
          })
        }
      >
        Reset this scene
      </button>
    </aside>
  );
}

function ConfigDialog({ state, dispatch, mode, onClose }) {
  const serialized = useMemo(() => serializeLabState(state), [state]);
  const [text, setText] = useState(mode === "export" ? serialized : "");
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState(false);

  const validate = () => {
    const next = parseLabState(text);
    setResult(next);
  };

  const applyImport = () => {
    if (!result?.ok) return;
    dispatch({ type: "IMPORT", state: result.value });
    onClose();
  };

  const copy = async () => {
    await navigator.clipboard.writeText(serialized);
    setCopied(true);
  };

  const download = () => {
    const blob = new Blob([serialized], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "data-counterfactual-lab-state.json";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div class="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        class="config-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="config-modal-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div class="modal-heading">
          <div>
            <p class="instrument-label">Portable state</p>
            <h2 id="config-modal-title">
              {mode === "export" ? "Export configuration" : "Import configuration"}
            </h2>
          </div>
          <button
            type="button"
            class="icon-button"
            aria-label="Close dialog"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        <p>
          {mode === "export"
            ? "Copy or download the complete versioned state. Nothing is uploaded."
            : "Paste a version 1 lab state. It is parsed as data and never executed."}
        </p>

        <textarea
          class="json-textarea"
          spellcheck="false"
          value={mode === "export" ? serialized : text}
          readOnly={mode === "export"}
          onInput={(event) => {
            setText(event.currentTarget.value);
            setResult(null);
          }}
          aria-label="Lab configuration JSON"
        />

        {result && !result.ok && (
          <div class="validation-errors" role="alert">
            <strong>Configuration not applied</strong>
            <ul>
              {result.errors.map((error) => (
                <li>{error}</li>
              ))}
            </ul>
          </div>
        )}

        {result?.ok && (
          <div class="validation-success">
            <strong>Valid version 1 state.</strong>
            <span>Confirm to replace the active lab configuration.</span>
          </div>
        )}

        <div class="modal-actions">
          {mode === "export" ? (
            <>
              <button type="button" class="secondary-button" onClick={download}>
                Download JSON
              </button>
              <button type="button" class="primary-button" onClick={copy}>
                {copied ? "Copied" : "Copy configuration"}
              </button>
            </>
          ) : (
            <>
              {!result?.ok && (
                <button type="button" class="primary-button" onClick={validate}>
                  Validate configuration
                </button>
              )}
              {result?.ok && (
                <button type="button" class="primary-button" onClick={applyImport}>
                  Confirm and replace state
                </button>
              )}
            </>
          )}
        </div>
      </section>
    </div>
  );
}

function Explainer({ onClose }) {
  return (
    <div class="modal-backdrop explainer-backdrop" role="presentation">
      <section
        class="explainer-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="explainer-title"
      >
        <p class="instrument-label">Instrument briefing</p>
        <h2 id="explainer-title">Two views of the same counterfactual space</h2>
        <div class="explainer-grid">
          <div>
            <span class="explainer-number">01</span>
            <h3>Grid</h3>
            <p>
              Each cell scores one training world against one evaluation world.
              Choose cells that isolate the change you care about.
            </p>
          </div>
          <div>
            <span class="explainer-number">02</span>
            <h3>Graph</h3>
            <p>
              The same training worlds become nodes. Edges expose additions,
              removals, coalitions, and special interventions.
            </p>
          </div>
          <div>
            <span class="explainer-number">03</span>
            <h3>Interpret</h3>
            <p>
              A score difference is only meaningful alongside what changed,
              what stayed fixed, and what this toy model cannot establish.
            </p>
          </div>
        </div>
        <button type="button" class="primary-button" onClick={onClose}>
          Enter the lab
        </button>
      </section>
    </div>
  );
}

export default function CounterfactualLab() {
  const [state, dispatch] = useReducer(
    labReducer,
    undefined,
    () => createInitialState(),
  );
  const [persistenceReady, setPersistenceReady] = useState(false);
  const [renderStats, setRenderStats] = useState({ marks: 0, frameTime: null });
  const [dialogMode, setDialogMode] = useState(null);
  const [showExplainer, setShowExplainer] = useState(false);
  const [guidedStep, setGuidedStep] = useState(1);
  const [walkthrough, setWalkthrough] = useState({ nonce: 0, active: false });
  const reducedMotion = useReducedMotion(state);
  const stableRenderStats = useMemo(
    () => (next) => setRenderStats(next),
    [],
  );

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = parseLabState(saved);
        if (parsed.ok) dispatch({ type: "IMPORT", state: parsed.value });
      }
      if (!localStorage.getItem(EXPLAINER_STORAGE_KEY)) {
        setShowExplainer(true);
      }
    } catch {
      // Local persistence is an enhancement; the lab remains usable without it.
    } finally {
      setPersistenceReady(true);
    }
  }, []);

  useEffect(() => {
    if (!persistenceReady) return;
    try {
      localStorage.setItem(STORAGE_KEY, serializeLabState(state));
    } catch {
      // Ignore unavailable or full storage.
    }
  }, [state, persistenceReady]);

  useEffect(() => {
    if (!walkthrough.active || state.mode !== "guided") return undefined;
    const baselineKey = worldKey(state.baseline);
    const counterfactualKey = worldKey(state.counterfactual);
    if (reducedMotion) {
      dispatch({
        type: "SET_EVIDENCE",
        evidence: [baselineKey, counterfactualKey],
      });
      setGuidedStep(3);
      setWalkthrough((value) => ({ ...value, active: false }));
      return undefined;
    }

    const timers = [
      window.setTimeout(() => {
        dispatch({ type: "SET_EVIDENCE", evidence: [baselineKey] });
        setGuidedStep(1);
      }, 260),
      window.setTimeout(() => {
        dispatch({
          type: "SET_EVIDENCE",
          evidence: [baselineKey, counterfactualKey],
        });
        setGuidedStep(2);
      }, 1120),
      window.setTimeout(() => {
        setGuidedStep(3);
        setWalkthrough((value) => ({ ...value, active: false }));
      }, 1900),
    ];
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [walkthrough.nonce, walkthrough.active, state.mode, state.scenario, reducedMotion]);

  useEffect(() => {
    if (state.mode !== "guided" || walkthrough.active) return;
    const baselineSelected = state.selection.evidence.includes(
      worldKey(state.baseline),
    );
    const counterfactualSelected = state.selection.evidence.includes(
      worldKey(state.counterfactual),
    );
    if (baselineSelected && counterfactualSelected) setGuidedStep(3);
    else if (counterfactualSelected) setGuidedStep(2);
    else if (baselineSelected) setGuidedStep(1);
    else setGuidedStep(0);
  }, [state.mode, state.selection.evidence, state.baseline, state.counterfactual, walkthrough.active]);

  const currentScenario =
    state.scenario === "custom" ? null : getScenario(state.scenario);

  const dismissExplainer = () => {
    setShowExplainer(false);
    try {
      localStorage.setItem(EXPLAINER_STORAGE_KEY, "true");
    } catch {
      // Ignore unavailable storage.
    }
  };

  const changeMode = (mode) => {
    if (mode === state.mode) return;
    dispatch({ type: "SET_MODE", mode });
    setGuidedStep(mode === "guided" ? 1 : 0);
    setWalkthrough((value) => ({ ...value, active: false }));
  };

  const selectScenario = (id) => {
    dispatch({ type: "SELECT_SCENARIO", id, animate: true });
    setGuidedStep(0);
    setWalkthrough((value) => ({
      nonce: value.nonce + 1,
      active: true,
    }));
  };

  return (
    <div class="lab-root" data-testid="counterfactual-lab">
      <header class="lab-heading">
        <div>
          <p class="instrument-label">Counterfactual instrument / v1</p>
          <h1>See what changes when data changes.</h1>
          <p>
            Compare a starting world with a changed data or access world. Then
            inspect the same idea as a score grid and a subset graph.
          </p>
        </div>
        <div class="lab-heading-actions">
          <button
            type="button"
            class="secondary-button"
            onClick={() => setShowExplainer(true)}
          >
            How it works
          </button>
          <button
            type="button"
            class="secondary-button"
            onClick={() => setDialogMode("import")}
          >
            Import
          </button>
          <button
            type="button"
            class="secondary-button"
            onClick={() => setDialogMode("export")}
          >
            Export
          </button>
        </div>
      </header>

      <section class="instrument-shell" aria-label="Counterfactual Lab">
        <LabModeBar
          state={state}
          dispatch={dispatch}
          onModeChange={changeMode}
        />
        <div class="instrument-toolbar">
          <div class="view-switcher" aria-label="Visualization view">
            <button
              type="button"
              class={state.view === "grid" ? "is-active" : ""}
              aria-pressed={state.view === "grid"}
              onClick={() => dispatch({ type: "SET_VIEW", view: "grid" })}
            >
              <span class="view-icon grid-icon" aria-hidden="true" />
              Grid
            </button>
            <button
              type="button"
              class={state.view === "graph" ? "is-active" : ""}
              aria-pressed={state.view === "graph"}
              onClick={() => dispatch({ type: "SET_VIEW", view: "graph" })}
            >
              <span class="view-icon graph-icon" aria-hidden="true" />
              Graph
            </button>
          </div>
          <div class="scene-status">
            <span class="instrument-label">
              {state.mode === "guided" ? "Scene" : "Open comparison"}
            </span>
            <strong>
              {state.mode === "guided"
                ? currentScenario?.title || "Custom configuration"
                : `${state.selection.worldA.length} A cells × ${state.selection.worldB.length} B cells`}
            </strong>
            <span>
              {state.mode === "guided"
                ? currentScenario?.summary || "Your edited comparison."
                : "Every selected A world is compared with every selected B world."}
            </span>
          </div>
          {state.display.resourceHud && (
            <ResourceHud state={state} renderStats={renderStats} />
          )}
        </div>

        <div class="instrument-grid">
          <div class="visual-column">
            <LabCanvas
              state={state}
              reducedMotion={reducedMotion}
              onSelectWorld={(key) =>
                dispatch({
                  type:
                    state.mode === "explore"
                      ? "TOGGLE_EXPLORE_WORLD"
                      : "TOGGLE_EVIDENCE",
                  key,
                })
              }
              onRenderStats={stableRenderStats}
            />
            <div class="visual-caption">
              <span>
                {state.mode === "guided"
                  ? "Click a cell or node to add it as evidence. The inspector buttons provide the same operation for keyboard and screen-reader users."
                  : `Click a cell or node to add it to World ${state.selection.activeWorld.toUpperCase()}. Use the top-bar toggle to change sides.`}
              </span>
              <label class="number-toggle">
                <input
                  type="checkbox"
                  checked={state.display.numbers}
                  onChange={(event) =>
                    dispatch({
                      type: "SET_DISPLAY",
                      field: "numbers",
                      value: event.currentTarget.checked,
                    })
                  }
                />
                Cell values
              </label>
            </div>
          </div>
          <div class="control-column">
            {state.mode === "guided" ? (
              <ComparisonInspector
                state={state}
                dispatch={dispatch}
                guidedStep={guidedStep}
              />
            ) : (
              <ExploreInspector state={state} dispatch={dispatch} />
            )}
            <MetricPanel state={state} dispatch={dispatch} />
            {state.mode === "explore" && (
              <FreePlayDrawer state={state} dispatch={dispatch} />
            )}
          </div>
        </div>
      </section>

      {state.mode === "guided" && (
        <ScenarioTray state={state} onSelect={selectScenario} />
      )}

      {dialogMode && (
        <ConfigDialog
          state={state}
          dispatch={dispatch}
          mode={dialogMode}
          onClose={() => setDialogMode(null)}
        />
      )}
      {showExplainer && <Explainer onClose={dismissExplainer} />}
    </div>
  );
}
