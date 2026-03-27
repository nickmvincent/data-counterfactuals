import { h } from "preact";
import { useCallback, useEffect, useMemo, useRef, useState } from "preact/hooks";
import htm from "htm";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import {
  buildDecisionBoundary,
  buildModelRun,
  defaultTaglines,
  explanationSets,
  metricMatrixFor,
  predictProbability,
  scenarioConfigs,
  subsetDefs,
} from "../lib/advanced-simulator-core.js";

const html = htm.bind(h);

const valueColor = (value) => {
  const t = Math.max(0, Math.min(1, value || 0));
  const color = new THREE.Color();
  color.setHSL(0.55 - (0.5 * t), 0.65 + (0.2 * t), 0.32 + (0.25 * t));
  return color;
};

const ACCENT_WARM = "#ffd166";
const COLOR_CLASS0 = "#5dd4ff";
const COLOR_CLASS1 = "#ff6b6b";

function makeLabelSprite(text, color = "#f5fbff") {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "rgba(5,9,16,0)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = color;
  ctx.font = "48px 'Inter', 'Segoe UI', sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, canvas.width / 2, canvas.height / 2);
  const texture = new THREE.CanvasTexture(canvas);
  texture.anisotropy = 4;
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
  const sprite = new THREE.Sprite(material);
  const scale = 0.01;
  sprite.scale.set(canvas.width * scale, canvas.height * scale, 1);
  sprite.userData.isLabel = true;
  return sprite;
}

const BarGrid = ({
  matrix,
  rows = [],
  cols = [],
  selectedRow,
  selectedCol,
  onSelect,
  mode = "real",
  revealedRows = [],
  canRevealRow,
  onRevealRow,
}) => {
  const mountRef = useRef(null);
  const stateRef = useRef(null);
  const interactionsRef = useRef({ onSelect, mode, revealedRows, canRevealRow, onRevealRow });

  useEffect(() => {
    interactionsRef.current = { onSelect, mode, revealedRows, canRevealRow, onRevealRow };
  }, [onSelect, mode, revealedRows, canRevealRow, onRevealRow]);

  useEffect(() => {
    if (!mountRef.current) return undefined;
    const width = mountRef.current.clientWidth || 600;
    const height = Math.max(420, mountRef.current.clientHeight || 480);
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050910);
    const camera = new THREE.PerspectiveCamera(48, width / height, 0.1, 100);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio || 1);
    renderer.setSize(width, height);
    mountRef.current.appendChild(renderer.domElement);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.maxPolarAngle = Math.PI / 2.05;
    controls.minDistance = 4;
    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    const dir = new THREE.DirectionalLight(0xffffff, 0.8);
    dir.position.set(6, 9, 4);
    scene.add(ambient);
    scene.add(dir);
    const gridHelper = new THREE.GridHelper(14, 14, 0x1d2b45, 0x10172b);
    scene.add(gridHelper);
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();

    const animate = () => {
      if (!stateRef.current) return;
      controls.update();
      renderer.render(scene, camera);
      stateRef.current.frame = requestAnimationFrame(animate);
    };

    const handleResize = () => {
      if (!mountRef.current) return;
      const nextWidth = mountRef.current.clientWidth || width;
      const nextHeight = Math.max(380, mountRef.current.clientHeight || height);
      renderer.setSize(nextWidth, nextHeight);
      camera.aspect = nextWidth / nextHeight;
      camera.updateProjectionMatrix();
    };

    window.addEventListener("resize", handleResize);

    const handlePointer = (event) => {
      if (event.target !== renderer.domElement || !stateRef.current) return;
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = (((event.clientX - rect.left) / rect.width) * 2) - 1;
      pointer.y = -((((event.clientY - rect.top) / rect.height) * 2) - 1);
      raycaster.setFromCamera(pointer, camera);
      const group = stateRef.current.group;
      if (!group) return;
      const barGroup = group.children[0];
      if (!barGroup) return;
      const intersects = raycaster.intersectObjects(barGroup.children, false);
      if (!intersects.length) return;

      const { rowIdx, colIdx } = intersects[0].object.userData || {};
      const current = interactionsRef.current;
      if (typeof rowIdx !== "number" || typeof colIdx !== "number") return;

      if (current.mode === "operator" && !(current.revealedRows || []).includes(rowIdx)) {
        if (current.canRevealRow?.(rowIdx)) current.onRevealRow?.(rowIdx);
        return;
      }

      current.onSelect?.(rowIdx, colIdx);
    };

    renderer.domElement.addEventListener("pointerdown", handlePointer);

    stateRef.current = {
      scene,
      camera,
      renderer,
      controls,
      raycaster,
      pointer,
      group: null,
    };
    animate();

    return () => {
      const ref = stateRef.current;
      if (ref?.frame) cancelAnimationFrame(ref.frame);
      window.removeEventListener("resize", handleResize);
      renderer.domElement.removeEventListener("pointerdown", handlePointer);
      renderer.dispose();
      controls.dispose();
      scene.clear();
      stateRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!stateRef.current) return;
    const { scene, group } = stateRef.current;
    if (group) {
      scene.remove(group);
      group.traverse((obj) => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          if (obj.material.map) obj.material.map.dispose();
          obj.material.dispose();
        }
      });
    }

    const rowCount = matrix.length;
    const colCount = matrix[0]?.length || 0;
    const tile = 0.9;
    const gap = 0.28;
    const newGroup = new THREE.Group();
    const isOperator = mode === "operator";

    for (let rowIndex = 0; rowIndex < rowCount; rowIndex += 1) {
      for (let colIndex = 0; colIndex < colCount; colIndex += 1) {
        const value = matrix[rowIndex][colIndex];
        const revealed = !isOperator || revealedRows.includes(rowIndex);
        const affordable = isOperator && !revealed && canRevealRow?.(rowIndex);
        const height = revealed ? 0.12 + ((value || 0) * 1.4) : (affordable ? 0.12 : 0.06);
        const geometry = new THREE.BoxGeometry(tile, height, tile);
        let color = valueColor(value);
        if (isOperator && !revealed) {
          color = new THREE.Color(affordable ? ACCENT_WARM : "#242b3f");
        }

        const material = new THREE.MeshStandardMaterial({
          color,
          emissive: 0x050910,
          roughness: 0.4,
          metalness: 0.1,
        });

        if (rowIndex === selectedRow && colIndex === selectedCol && (!isOperator || revealed)) {
          material.emissive = new THREE.Color(0x00e5ff);
          material.emissiveIntensity = 0.6;
        }

        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(
          (colIndex - ((colCount - 1) / 2)) * (tile + gap),
          height / 2,
          (rowIndex - ((rowCount - 1) / 2)) * (tile + gap),
        );
        mesh.userData = { rowIdx: rowIndex, colIdx: colIndex };
        newGroup.add(mesh);
      }
    }

    const labelsGroup = new THREE.Group();
    const xMin = -(((colCount - 1) / 2) * (tile + gap));
    const zMax = (((rowCount - 1) / 2) * (tile + gap));

    rows.forEach((row, rowIndex) => {
      const sprite = makeLabelSprite(row?.label || row?.id || `Row ${rowIndex + 1}`);
      sprite.position.set(xMin - (tile + 0.8), 0.1, (rowIndex - ((rowCount - 1) / 2)) * (tile + gap));
      labelsGroup.add(sprite);
    });

    cols.forEach((col, colIndex) => {
      const sprite = makeLabelSprite(col?.label || col?.id || `Col ${colIndex + 1}`);
      sprite.position.set((colIndex - ((colCount - 1) / 2)) * (tile + gap), 0.1, zMax + (tile + 0.9));
      labelsGroup.add(sprite);
    });

    const container = new THREE.Group();
    container.add(newGroup);
    container.add(labelsGroup);
    scene.add(container);
    stateRef.current.group = container;
    const span = Math.max(rowCount, colCount);
    const distance = 4 + (span * 0.55);
    stateRef.current.camera.position.set(distance, distance * 0.7, distance);
    stateRef.current.controls.target.set(0, 0, 0);
  }, [matrix, selectedRow, selectedCol, mode, revealedRows, rows, cols, canRevealRow]);

  return html`<div class="scene-shell" ref=${mountRef}></div>`;
};

const ScatterPlot = ({ title, data, decisionBoundary = null }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const width = canvas.clientWidth || canvas.width;
    const height = canvas.clientHeight || canvas.height;
    canvas.width = width;
    canvas.height = height;
    ctx.clearRect(0, 0, width, height);

    if (!data?.length) {
      ctx.fillStyle = "#fff";
      ctx.fillText("No data", (width / 2) - 20, height / 2);
      return;
    }

    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    for (const point of data) {
      if (point.x < minX) minX = point.x;
      if (point.x > maxX) maxX = point.x;
      if (point.y < minY) minY = point.y;
      if (point.y > maxY) maxY = point.y;
    }

    const pad = 24;
    const sx = (x) => pad + (((x - minX) / Math.max(1e-6, maxX - minX)) * (width - (2 * pad)));
    const sy = (y) => height - pad - (((y - minY) / Math.max(1e-6, maxY - minY)) * (height - (2 * pad)));

    ctx.strokeStyle = "#18223b";
    ctx.lineWidth = 1;
    ctx.strokeRect(pad - 6, pad - 6, width - (2 * (pad - 6)), height - (2 * (pad - 6)));

    if (decisionBoundary) {
      const { bias, xCoeff, yCoeff } = decisionBoundary;
      ctx.strokeStyle = "rgba(255,255,255,0.8)";
      ctx.setLineDash([6, 4]);
      ctx.lineWidth = 2;
      ctx.beginPath();
      if (Math.abs(yCoeff) > 1e-4) {
        const y1 = -(bias + (xCoeff * minX)) / yCoeff;
        const y2 = -(bias + (xCoeff * maxX)) / yCoeff;
        ctx.moveTo(sx(minX), sy(y1));
        ctx.lineTo(sx(maxX), sy(y2));
      } else if (Math.abs(xCoeff) > 1e-4) {
        const xCut = -(bias) / xCoeff;
        ctx.moveTo(sx(xCut), sy(minY));
        ctx.lineTo(sx(xCut), sy(maxY));
      }
      ctx.stroke();
      ctx.setLineDash([]);
    }

    for (const point of data) {
      ctx.fillStyle = point.label ? COLOR_CLASS1 : COLOR_CLASS0;
      ctx.beginPath();
      ctx.arc(sx(point.x), sy(point.y), 5, 0, Math.PI * 2);
      ctx.fill();
      if (point.pred !== undefined && point.pred !== point.label) {
        ctx.strokeStyle = ACCENT_WARM;
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }
  }, [data, decisionBoundary]);

  return html`
    <div class="scatter-card">
      <div class="scatter-title">${title}</div>
      <canvas ref=${canvasRef} width="360" height="300"></canvas>
    </div>
  `;
};

function formatPct(value) {
  return `${(value * 100).toFixed(1)}%`;
}

const puzzleMarkdown = `
## Drift Hunter
metric: recall
row: AB
col: beta
budget: 48
revealed: A,B
text: Sensor drift threatens precision; find a robust coalition and keep recall above 0.8 without overspending.

## Adversarial Sweep
metric: precision
row: AC
col: delta
budget: 55
revealed: C
text: The adversarial eval flips labels; hunt for a training mix that keeps false positives low.

## Eval Whisperer
metric: accuracy
row: ABCD
col: gamma
budget: 60
revealed: A,B,C
text: You inherit a big roster; spend remaining budget to uncover hidden combos that hit 90%+ accuracy on Eval gamma.
`;

function parsePuzzles(markdown) {
  return markdown
    .split(/^##\s+/m)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((section) => {
      const lines = section.split("\n").map((line) => line.trim()).filter(Boolean);
      const title = lines.shift();
      const data = {
        title,
        text: "",
        metric: null,
        row: null,
        col: null,
        budget: null,
        revealed: [],
      };
      const extraText = [];

      for (const line of lines) {
        const match = line.match(/^([a-zA-Z]+):\s*(.+)$/);
        if (match) {
          const key = match[1].toLowerCase();
          const value = match[2].trim();
          if (key === "metric") data.metric = value.toLowerCase();
          else if (key === "row") data.row = value.replace(/\s+/g, "");
          else if (key === "col") data.col = value.toLowerCase();
          else if (key === "budget") data.budget = Number.parseFloat(value);
          else if (key === "revealed") data.revealed = value.split(/[,\s]+/).filter(Boolean);
          else if (key === "text") extraText.push(value);
        } else {
          extraText.push(line);
        }
      }

      data.text = extraText.join(" ");
      return data;
    });
}

const puzzles = parsePuzzles(puzzleMarkdown);

export default function AdvancedViewer() {
  const BASE_BUDGET = 60;
  const [metric, setMetric] = useState("accuracy");
  const [rowIdx, setRowIdx] = useState(0);
  const [colIdx, setColIdx] = useState(0);
  const [revealedRows, setRevealedRows] = useState([]);
  const [budget, setBudget] = useState(BASE_BUDGET);
  const [topUp, setTopUp] = useState(20);
  const [modelSeed, setModelSeed] = useState(0);
  const [toyExplanation, setToyExplanation] = useState("default");
  const activeExplanation = explanationSets.find((entry) => entry.id === toyExplanation) || explanationSets[0];
  const taglines = activeExplanation.taglines;

  const subsetList = useMemo(() => subsetDefs.map((definition) => ({
    ...definition,
    blurb: definition.groups
      .map((id) => taglines[id] || defaultTaglines[id] || "")
      .filter(Boolean)
      .join(" / "),
  })), [taglines]);

  const modelRun = useMemo(() => buildModelRun(modelSeed), [modelSeed]);
  const { resultMatrix, trainDataCache, scenarioDataMap } = modelRun;
  const [operatorLog, setOperatorLog] = useState([`Operator budget initialized at ${BASE_BUDGET} credits.`]);
  const REVEAL_COST = 8;
  const appendOperatorLog = useCallback((message) => setOperatorLog((prev) => [message, ...prev].slice(0, 6)), []);
  const handleSelect = useCallback((row, col) => {
    setRowIdx(row);
    setColIdx(col);
  }, []);
  const canRevealRow = useCallback(
    (index) => budget >= REVEAL_COST && !revealedRows.includes(index),
    [budget, revealedRows],
  );

  const revealedRef = useRef(revealedRows);
  useEffect(() => {
    revealedRef.current = revealedRows;
  }, [revealedRows]);

  const handleRevealRow = useCallback((index) => {
    setBudget((prevBudget) => {
      if (prevBudget < REVEAL_COST) return prevBudget;
      if (revealedRef.current.includes(index)) return prevBudget;
      setRevealedRows((prev) => [...prev, index].sort((left, right) => left - right));
      appendOperatorLog(`Valued roster ${subsetList[index].label} (-${REVEAL_COST})`);
      return prevBudget - REVEAL_COST;
    });
  }, [appendOperatorLog, subsetList]);

  const resetOperator = useCallback(() => {
    setBudget(BASE_BUDGET);
    setRevealedRows([]);
    appendOperatorLog("Operator board reset to initial state.");
  }, [appendOperatorLog]);

  const rerollData = () => {
    const nextSeed = Math.floor(Math.random() * 1_000_000);
    setModelSeed(nextSeed);
    setBudget(BASE_BUDGET);
    setRevealedRows([]);
    setOperatorLog([`Rerolled training data with seed ${nextSeed} (budget reset to ${BASE_BUDGET}).`]);
  };

  const addBudget = () => {
    const amount = Math.max(0, Math.round(+topUp || 0));
    if (!amount) return;
    setBudget((current) => current + amount);
    appendOperatorLog(`Added ${amount} credits to operator budget.`);
  };

  const [puzzleId, setPuzzleId] = useState(puzzles[0]?.title || "");
  const activePuzzle = useMemo(() => puzzles.find((puzzle) => puzzle.title === puzzleId), [puzzleId]);

  const applyPuzzle = () => {
    if (!activePuzzle) return;
    if (activePuzzle.metric) setMetric(activePuzzle.metric);
    const rowMatch = subsetList.findIndex((row) => row.id.toLowerCase() === (activePuzzle.row || "").toLowerCase());
    if (rowMatch >= 0) setRowIdx(rowMatch);
    const colMatch = scenarioConfigs.findIndex(
      (cfg) => cfg.id.toLowerCase() === (activePuzzle.col || "").toLowerCase(),
    );
    if (colMatch >= 0) setColIdx(colMatch);
    const nextBudget = Number.isFinite(activePuzzle.budget)
      ? Math.max(0, Math.round(activePuzzle.budget))
      : BASE_BUDGET;
    setBudget(nextBudget);
    const revealedIdxs = (activePuzzle.revealed || [])
      .map((code) => subsetList.findIndex((row) => row.id.toLowerCase() === code.toLowerCase()))
      .filter((index) => index >= 0);
    setRevealedRows(revealedIdxs);
    setOperatorLog((prev) => [
      `Loaded puzzle "${activePuzzle.title}" (budget ${nextBudget}, ${revealedIdxs.length} revealed).`,
      ...prev,
    ].slice(0, 6));
  };

  const metricMatrix = useMemo(() => metricMatrixFor(resultMatrix, metric), [metric, resultMatrix]);
  const selectedRow = subsetList[rowIdx];
  const selectedScenario = scenarioConfigs[colIdx];
  const selectedCell = resultMatrix[rowIdx][colIdx];
  const selectedModel = selectedCell.model;
  const metricValue = selectedCell?.stats?.[metric] ?? 0;
  const trainData = useMemo(
    () => trainDataCache.get(selectedRow.id) || [],
    [rowIdx, trainDataCache, selectedRow.id],
  );
  const evalPoints = useMemo(() => {
    const evalData = scenarioDataMap.get(selectedScenario.id) || [];
    return evalData.map((point) => {
      const probability = predictProbability(selectedModel, point);
      const pred = probability >= 0.5 ? 1 : 0;
      return { ...point, pred, prob: probability };
    });
  }, [scenarioDataMap, selectedModel, selectedScenario.id]);
  const decisionBoundary = useMemo(() => buildDecisionBoundary(selectedModel), [selectedModel]);

  return html`
    <div class="wrap">
      <header>
        <div>
          <h1>Live Counterfactual Board</h1>
          <p class="lede">Advanced prototype: every tile now runs a regularized logistic-regression classifier on standardized synthetic data. Pick a training roster (rows) against evaluation worlds (columns), then inspect the actual scatter plots, confusion matrix, and a 3D accuracy board powered by Three.js.</p>
        </div>
        <div style="display:flex;flex-direction:column;gap:8px;align-items:flex-end">
          <div class="pill">${subsetList.length} train combos x ${scenarioConfigs.length} eval worlds</div>
          <div class="pill">Data seed: <strong>${modelSeed}</strong></div>
        </div>
      </header>

      <div class="layout">
        <div>
          <div class="card">
            <h2>Board setup</h2>
            <p>Swap the toy explanations for A/B/C/D, regenerate synthetic data, and remind yourself how the 3D bars are scaled.</p>
            <div class="ctrl-row">
              <select style="flex:1;padding:8px;border-radius:10px;background:#0b1225;color:var(--fg);border:1px solid #14203a" value=${toyExplanation} onChange=${(event) => setToyExplanation(event.target.value)}>
                ${explanationSets.map((set) => html`<option value=${set.id}>${set.label}</option>`)}
              </select>
              <button class="btn" onClick=${rerollData}>Re-roll training data</button>
            </div>
            <div class="ctrl-row">
              <button class="btn ghost" onClick=${resetOperator}>Reset operator state</button>
            </div>
            <p class="log">Bar height = 0.12 + (metric value x 1.4). Operator view hides unrevealed rows at height 0.06; affordable but unrevealed rows sit at 0.12 and glow amber. Revealed tiles match the real grid.</p>
          </div>

          <div class="card">
            <h2>Metric focus</h2>
            <p>Switch the board to emphasize different classifier stats. Selection also updates the glowing tile.</p>
            <div class="ctrl-row">
              ${["accuracy", "precision", "recall", "f1"].map((name) => html`
                <button class="btn" aria-pressed=${metric === name} onClick=${() => setMetric(name)}>${name}</button>
              `)}
            </div>
            <p class="log" style="margin-top:10px">Selected tile reports <strong>${formatPct(metricValue)}</strong> ${metric}.</p>
          </div>

          <div class="card">
            <h2>Selection</h2>
            <label style="display:block;font-size:12px;color:var(--muted);margin-bottom:4px">Training roster</label>
            <select style="width:100%;padding:8px;border-radius:10px;background:#0b1225;color:var(--fg);border:1px solid #14203a" value=${rowIdx} onChange=${(event) => setRowIdx(+event.target.value)}>
              ${subsetList.map((row, index) => html`<option value=${index}>${index + 1}. ${row.label}</option>`)}
            </select>
            <label style="display:block;font-size:12px;color:var(--muted);margin:12px 0 4px">Evaluation world</label>
            <select style="width:100%;padding:8px;border-radius:10px;background:#0b1225;color:var(--fg);border:1px solid #14203a" value=${colIdx} onChange=${(event) => setColIdx(+event.target.value)}>
              ${scenarioConfigs.map((cfg, index) => html`<option value=${index}>${cfg.label} - ${cfg.description}</option>`)}
            </select>
          </div>

          <div class="card">
            <h2>Scenario puzzles</h2>
            <p>These presets live in a tiny markdown manifest. Loading one sets the metric, focus tile, budget, and which rows are already revealed.</p>
            <div class="ctrl-row">
              <select style="flex:1;padding:8px;border-radius:10px;background:#0b1225;color:var(--fg);border:1px solid #14203a" value=${puzzleId} onChange=${(event) => setPuzzleId(event.target.value)}>
                ${puzzles.map((puzzle) => html`<option value=${puzzle.title}>${puzzle.title}</option>`)}
              </select>
              <button class="btn" onClick=${applyPuzzle}>Load puzzle</button>
            </div>
            ${activePuzzle && html`
              <p class="log"><strong>Focus</strong>: metric ${activePuzzle.metric || "accuracy"}, row ${activePuzzle.row || "?"}, column ${activePuzzle.col || "?"}. Budget = ${activePuzzle.budget || "default"}; pre-revealed: ${(activePuzzle.revealed || []).join(", ") || "none"}.</p>
              <p class="log">${activePuzzle.text}</p>
            `}
          </div>

          <div class="card">
            <h2>Classifier stats</h2>
            <p><strong>${selectedRow.label}</strong> vs <strong>${selectedScenario.label}</strong></p>
            <div class="metrics-grid">
              ${["accuracy", "precision", "recall", "f1"].map((key) => html`
                <div class="metric-pill">
                  <span>${key}</span>
                  <strong>${formatPct(selectedCell.stats[key])}</strong>
                </div>
              `)}
            </div>
            <div class="metrics-grid" style="margin-top:8px">
              <div class="metric-pill">
                <span>train loss</span>
                <strong>${selectedModel.loss.toFixed(4)}</strong>
              </div>
              <div class="metric-pill">
                <span>iterations</span>
                <strong>${selectedModel.iterations}</strong>
              </div>
              <div class="metric-pill">
                <span>converged</span>
                <strong>${selectedModel.converged ? "yes" : "no"}</strong>
              </div>
              <div class="metric-pill">
                <span>L2 reg</span>
                <strong>${selectedModel.regularization.toFixed(3)}</strong>
              </div>
            </div>
            <table class="confusion">
              <thead>
                <tr><th></th><th>Pred 0</th><th>Pred 1</th></tr>
              </thead>
              <tbody>
                <tr><th>True 0</th><td>${selectedCell.stats.counts.tn}</td><td>${selectedCell.stats.counts.fp}</td></tr>
                <tr><th>True 1</th><td>${selectedCell.stats.counts.fn}</td><td>${selectedCell.stats.counts.tp}</td></tr>
              </tbody>
            </table>
            <p class="log">Weights ~ [${selectedCell.weights.map((weight) => weight.toFixed(2)).join(", ")}], standardized on the training roster. ${trainData.length} training pts / ${evalPoints.length} eval pts.</p>
          </div>

          <div class="card">
            <h2>Data views</h2>
            <p><strong>${selectedRow.label}</strong> training clouds</p>
            <${ScatterPlot} title="Training distribution" data=${trainData} />
            <p style="margin-top:12px"><strong>${selectedScenario.label}</strong> evaluation scatter</p>
            <${ScatterPlot} title="Eval scatter & decision boundary" data=${evalPoints} decisionBoundary=${decisionBoundary} />
            <div class="legend">
              <span><i style="background:${COLOR_CLASS0}"></i>Class 0</span>
              <span><i style="background:${COLOR_CLASS1}"></i>Class 1</span>
              <span><i style="background:${ACCENT_WARM}"></i>Misclassified outline</span>
            </div>
          </div>
        </div>

        <div>
          <div class="board-grid">
            <div class="card">
              <h2>Real world grid</h2>
              <p>True classifier stats across every training coalition (rows) and eval world (columns). Click any cube to focus the detailed stats + scatterplots.</p>
              <${BarGrid}
                matrix=${metricMatrix}
                rows=${subsetList}
                cols=${scenarioConfigs}
                selectedRow=${rowIdx}
                selectedCol=${colIdx}
                onSelect=${handleSelect}
                mode="real"
              />
              <p class="board-note">Axis labels render directly in scene; taller cyan highlights = the currently inspected tile.</p>
            </div>
            <div class="card">
              <h2>Operator knowledge</h2>
              <p>Operators only know the rows they've audited. Amber cubes show affordable reveals (${REVEAL_COST} credits each); click or use the buttons below.</p>
              <${BarGrid}
                matrix=${metricMatrix}
                rows=${subsetList}
                cols=${scenarioConfigs}
                selectedRow=${rowIdx}
                selectedCol=${colIdx}
                onSelect=${handleSelect}
                mode="operator"
                revealedRows=${revealedRows}
                canRevealRow=${canRevealRow}
                onRevealRow=${handleRevealRow}
              />
              <p class="board-note">${revealedRows.length}/${subsetList.length} rosters known / Budget ${budget} credits. Hidden rows stay at height 0.06; affordable rows rise to 0.12 until you reveal them.</p>
            </div>
          </div>
          <div class="card">
            <h2>Operator actions</h2>
            <p>Spend credits to value additional rosters and sync the operator board with reality. Costs mirror the simple mini-game: reveal = ${REVEAL_COST}.</p>
            <div class="pill">Budget: <strong style="font-size:15px">${budget}</strong> credits</div>
            <div class="ctrl-row" style="margin-top:8px;align-items:center">
              <label style="font-size:12px;color:var(--muted)">Add starting budget</label>
              <input type="number" min="0" step="1" value=${topUp} onInput=${(event) => setTopUp(event.target.value)} style="width:90px;padding:6px;border-radius:10px;background:#0b1225;color:var(--fg);border:1px solid #14203a" />
              <button class="btn" onClick=${addBudget}>Add credits</button>
            </div>
            <div class="row-badges">
              ${subsetList.map((row, index) => {
                const revealed = revealedRows.includes(index);
                const affordable = canRevealRow(index);
                return html`
                  <div class=${`row-badge ${revealed ? "revealed" : ""}`}>
                    <header>
                      <strong>${row.label}</strong>
                      ${revealed
                        ? html`<span style="color:#5dd4ff;font-size:11px">Known</span>`
                        : html`<span style="color:${affordable ? ACCENT_WARM : "#5a637c"};font-size:11px">${affordable ? "Hidden" : "Need credits"}</span>`}
                    </header>
                    ${row.blurb && html`<span style="font-size:11px;color:var(--muted)">${row.blurb}</span>`}
                    ${revealed
                      ? html`<span style="font-size:11px;color:var(--muted)">Accuracy now visible across worlds.</span>`
                      : html`<button class="btn" disabled=${!affordable} onClick=${() => handleRevealRow(index)}>Reveal (-${REVEAL_COST})</button>`}
                  </div>
                `;
              })}
            </div>
            <div class="ctrl-row" style="margin-top:12px">
              <button class="btn ghost" onClick=${resetOperator}>Reset operator state</button>
            </div>
            <div class="operator-log">
              <strong>Event log</strong>
              <ul style="margin:6px 0 0 16px;padding:0">
                ${operatorLog.map((entry, index) => html`<li key=${`oplog-${index}`}>${entry}</li>`)}
              </ul>
            </div>
          </div>
          <div class="card">
            <h2>World briefings</h2>
            ${scenarioConfigs.map((cfg) => html`
              <p><strong>${cfg.label}</strong>: ${cfg.description}</p>
            `)}
          </div>
        </div>
      </div>
    </div>
  `;
}
