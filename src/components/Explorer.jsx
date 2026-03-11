import { h } from "preact";
import { useState, useMemo, useEffect, useRef } from "preact/hooks";
import htm from "htm";
import {
  alphabet,
  applyGridEdits,
  buildSubsetGrid,
  computeLooDelta,
  computeScalingStats,
  computeShapleyStats,
  createTutorialPresets,
  findSubsetIndex,
  labelSubset as label,
  matrixRange,
  normalizeValue,
  selectAnalysisMatrix,
} from "../lib/counterfactual-math.js";
const html = htm.bind(h);
      const InfoTip = (text)=> html`<span class="info-tip" title=${text}>ⓘ</span>`;

      const palettes = {
        "Blue→Yellow": (t)=> `hsl(${210-150*t} 90% ${48+14*(t-0.5)}%)`,
        "Viridis-ish": (t)=> { const h= 260 - 160*t; const s= 65 + 25*t; const l= 30 + 35*t; return `hsl(${h} ${s}% ${l}%)`; },
        "Greys": (t)=> { const l= 18 + 64*t; return `hsl(220 10% ${l}%)`; },
      };

      function useGrid(items, metric){
        return useMemo(()=> {
          const grid = buildSubsetGrid(items, metric);
          return { m: grid.matrix, min: grid.min, max: grid.max, subs: grid.subsets };
        }, [items, metric]);
      }

      function sparkPath(vals, width=260, height=50, pad=4){
        const n=vals.length || 1;
        const min=Math.min(...vals), max=Math.max(...vals);
        const sx=(i)=> pad + (i*(width-2*pad)/Math.max(1,n-1));
        const sy=(v)=> {
          if(max===min) return height/2;
          const t=(v-min)/(max-min);
          return pad + (1-t)*(height-2*pad);
        };
        let d="";
        vals.forEach((v,i)=>{
          const x=sx(i), y=sy(v);
          d += (i===0? `M${x},${y}` : ` L${x},${y}`);
        });
        return { d, min, max };
      }
      function App(){
        const [count,setCount]=useState(4);
        const base=useMemo(()=>alphabet.slice(0,count),[count]);

        const items=base;

        const [metric,setMetric]=useState("jaccard");
        const [paletteName,setPaletteName]=useState("Blue→Yellow");
        const palette = palettes[paletteName];

        const [gridView,setGridView] = useState("operator");
        const [focusSet,setFocusSet]=useState(["A"]);
        const [k,setK]=useState(2);
        const [showNums,setShowNums]=useState(false);
        const [tutorialKind,setTutorialKind] = useState(null);
        const [tutorialInfo,setTutorialInfo] = useState(null);
        const [pendingSelection,setPendingSelection] = useState(null);
        const [poisonActive,setPoisonActive] = useState(false);
        const [noiseLevel,setNoiseLevel] = useState(0);
        const [editorMode,setEditorMode] = useState("poison");
        const resetEdits = ()=>{ setPoisonActive(false); setNoiseLevel(0); };
        const [presetFlash,setPresetFlash] = useState(false);
        const presetFlashRef = useRef(null);

        const {m: baseMatrix, subs} = useGrid(items, metric);
        const [rowIdx,setRowIdx]=useState(1), [colIdx,setColIdx]=useState(1);
        useEffect(()=>{ setRowIdx(1); setColIdx(1); }, [items.length]);

        useEffect(()=>{
          setFocusSet(prev=>{
            const filtered = prev.filter(ch=> base.includes(ch));
            if(filtered.length) return filtered;
            return base.length? [base[0]] : [];
          });
        }, [base]);

        const [computed,setComputed]=useState("shapley");
        const focusPrimary = (focusSet.find(ch=> base.includes(ch)) || base[0] || "A");
        const groupSet = computed==="group" ? focusSet.filter(ch=> base.includes(ch)) : [];
        const [computedFlash,setComputedFlash] = useState(false);
        const [switchPulse,setSwitchPulse] = useState(false);
        const [controlsOpen,setControlsOpen] = useState(true);
        const [computedOpen,setComputedOpen] = useState(true);
        const [guidesOpen,setGuidesOpen] = useState(false);

        useEffect(()=>{
          if(computed!=="group" && focusSet.length>1){
            setFocusSet(prev=> prev.length? [prev[0]] : base.length? [base[0]] : []);
          }
        }, [computed, focusSet.length, base]);

        const toggleFocus = (ch)=> setFocusSet(prev=> prev.includes(ch) ? prev.filter(x=>x!==ch) : [...prev, ch].sort());

        const clampIndex = (idx, total)=> {
          if(!total) return 0;
          if(idx < 0) return 0;
          if(idx >= total) return total-1;
          return idx;
        };
        const safeRowIdx = clampIndex(rowIdx, subs.length);
        const safeColIdx = clampIndex(colIdx, subs.length);

        useEffect(()=>{
          if(rowIdx!==safeRowIdx) setRowIdx(safeRowIdx);
        }, [rowIdx, safeRowIdx]);
        useEffect(()=>{
          if(colIdx!==safeColIdx) setColIdx(safeColIdx);
        }, [colIdx, safeColIdx]);

        const tutorialPresets = useMemo(()=> createTutorialPresets({
          setCount,
          setMetric,
          setFocusSet,
          setK,
          setShowNums,
          setComputed,
          setPendingSelection,
          setPoisonActive,
          setNoiseLevel,
        }), []);
        const runTutorial = (id)=>{
          const preset = tutorialPresets.find(p=>p.id===id);
          if(!preset) return;
          setPlaying(false);
          resetEdits();
          preset.setup();
          setTutorialKind(id);
          setTutorialInfo({ goal: preset.goal, how: preset.how, concept: preset.concept });
          if(presetFlashRef.current) clearTimeout(presetFlashRef.current);
          setPresetFlash(true);
          presetFlashRef.current = setTimeout(()=>setPresetFlash(false), 900);
        };

        const findIdx = (S)=> findSubsetIndex(subs, S);
        const matrix = useMemo(()=> applyGridEdits(baseMatrix, subs, {
          focusSet,
          poisonActive,
          noiseLevel,
        }), [baseMatrix, subs, focusSet, poisonActive, noiseLevel]);
        const operatorRange = useMemo(()=> matrixRange(matrix), [matrix]);
        const baseRange = useMemo(()=> matrixRange(baseMatrix), [baseMatrix]);
        const analysisMatrix = selectAnalysisMatrix({ baseMatrix, editedMatrix: matrix, gridView });
        const displayMatrix = analysisMatrix;
        const {min:dispMin,max:dispMax} = gridView==="real"? baseRange : operatorRange;
        const Srow = subs[safeRowIdx] || [];
        const hasGroup = computed==="group" && groupSet.length>0;
        const strikeMinus = hasGroup? Srow.filter(x=> !groupSet.includes(x)) : [];
        const strikeMinusIdx = hasGroup? findIdx(strikeMinus) : -1;
        const looMinus = hasGroup ? strikeMinus : Srow.filter(x=> x!==focusPrimary);
        const looMinusIdx = findIdx(looMinus);

        useEffect(()=>{
          setRowIdx(prev=>{
            if(!subs.length) return 0;
            if(prev<0) return 0;
            if(prev>=subs.length) return subs.length-1;
            return prev;
          });
          setColIdx(prev=>{
            if(!subs.length) return 0;
            if(prev<0) return 0;
            if(prev>=subs.length) return subs.length-1;
            return prev;
          });
        }, [subs.length]);

        useEffect(()=>{
          if(!pendingSelection) return;
          const {row, col} = pendingSelection;
          if(row){
            const idx = findIdx(row);
            if(idx>=0) setRowIdx(idx);
          }
          if(col){
            const idx = findIdx(col);
            if(idx>=0) setColIdx(idx);
          }
          setPendingSelection(null);
        }, [pendingSelection, subs]);

        useEffect(()=>{
          setComputedFlash(true);
          setSwitchPulse(true);
          const t1 = setTimeout(()=>setComputedFlash(false), 850);
          const t2 = setTimeout(()=>setSwitchPulse(false), 650);
          return ()=>{ clearTimeout(t1); clearTimeout(t2); };
        }, [computed, safeColIdx, safeRowIdx]);

        useEffect(()=>{
          return ()=>{ if(presetFlashRef.current) clearTimeout(presetFlashRef.current); };
        }, []);

        const shapleyStats = useMemo(()=> computeShapleyStats({
          matrix: analysisMatrix,
          subsets: subs,
          focusItem: focusPrimary,
          evalColumnIndex: safeColIdx,
          playerCount: items.length,
        }), [analysisMatrix, focusPrimary, items.length, safeColIdx, subs]);
        const shapleyPairs = shapleyStats.pairs;

        const looDelta = useMemo(()=> computeLooDelta({
          matrix: analysisMatrix,
          rowIndex: safeRowIdx,
          colIndex: safeColIdx,
          compareRowIndex: looMinusIdx,
        }), [analysisMatrix, safeRowIdx, safeColIdx, looMinusIdx]);

        const scalingAll = useMemo(()=> computeScalingStats({
          matrix: analysisMatrix,
          subsets: subs,
          maxSize: items.length,
          evalColumnIndex: safeColIdx,
        }), [analysisMatrix, items.length, safeColIdx, subs]);
        const spark = useMemo(()=>{
          const vals = scalingAll.map(x=> x.avg);
          return sparkPath(vals, 260, 50, 4);
        }, [scalingAll]);

        const settingsView = useMemo(()=>{
          return {
            tutorial: tutorialKind,
            universe: base,
            metric,
            palette: paletteName,
            focus: focusPrimary,
            focusSet,
            baselineTrain: { index: safeRowIdx, set: Srow },
            evalColumn: { index: safeColIdx, set: subs[safeColIdx] || [] },
            computed,
            edits: {
              mode: editorMode,
              poison: poisonActive,
              noiseLevel,
            },
            scalingK: k,
            showNumbers: showNums,
            gridView,
            rows: subs.map(s=> label(s)),
          };
        }, [tutorialKind, base, metric, paletteName, focusPrimary, focusSet, safeRowIdx, Srow, safeColIdx, subs, computed, editorMode, poisonActive, noiseLevel, k, showNums, gridView]);
        const settingsJson = useMemo(()=> JSON.stringify(settingsView, null, 2), [settingsView]);
        const layoutColumns = `${controlsOpen? "320px" : "32px"} minmax(420px,1fr) ${computedOpen? "320px" : "32px"}`;

        const animRef = useRef(null);
        const [playing,setPlaying] = useState(false);
        useEffect(()=>{
          if(!playing) return;
          let dir=1;
          function tick(){
            setK(prev=>{
              let next = prev + dir;
              if(next>=items.length || next<=0) dir*=-1;
              return Math.max(0, Math.min(items.length, next));
            });
            animRef.current = setTimeout(tick, 600);
          }
          tick();
          return ()=>{ if(animRef.current) clearTimeout(animRef.current); };
        }, [playing, items.length]);

        return html`
          <div class="wrap" style={{paddingTop:12}}>
            <div class="layout-shell" style=${{"--layout-cols": layoutColumns}}>
              <div class=${"side-panel "+(controlsOpen?"":"closed")}>
                <div class=${"card "+(presetFlash?"preset-flash":"")} style="padding:10px 12px">
                  <details class="guide-details" open=${guidesOpen} onToggle=${e=>setGuidesOpen(e.target.open)}>
                    <summary>Guided examples</summary>
                    <p class="lede" style="margin:6px 0">Click a preset and watch the controls snap into place.</p>
                    <div class="tutorials" style="gap:6px">
                      ${tutorialPresets.map(t=> html`
                        <button key=${t.id} class=${"tutorial-btn "+(tutorialKind===t.id?"active":"")} onClick=${()=>runTutorial(t.id)}>
                          <span class="tutorial-title">${t.title}</span>
                          <span class="tutorial-desc">${t.summary}</span>
                        </button>
                      `)}
                    </div>
                    <div class="tutorial-note" style="margin-top:8px">
                      ${tutorialInfo ? html`
                        <div>
                          <div><b>Goal</b>: ${tutorialInfo.goal}</div>
                          <div><b>What we do</b>: ${tutorialInfo.how}</div>
                          <div><b>Concept</b>: ${tutorialInfo.concept}</div>
                        </div>
                      ` : "Pick one of the examples above to auto-configure the grid and walk through the narration."}
                    </div>
                  </details>
                </div>

                <div class="card">
                  <h2>Controls</h2>
                  <div class="controls-grid">
                    <div class="ctrl-block">
                      <div class="ctrl-title">Universe size ${InfoTip("How many base points exist (A, B, C…). Rows/columns grow combinatorially with this number.")}</div>
                      <div class="ctrl-content">
                        <input type="range" min="2" max="8" value=${count} onInput=${e=>setCount(+e.target.value)} />
                        <span class="pill">${count}</span>
                      </div>
                    </div>

                    <div class="ctrl-block">
                      <div class="ctrl-title">Cell metric ${InfoTip("Jaccard = overlap ÷ union. |Intersection| = raw count; Entropy = binary entropy of the overlap.")}</div>
                      <div class="ctrl-content">
                        <button class="btn" aria-pressed=${metric==="jaccard"} onClick=${()=>setMetric("jaccard")}>Jaccard</button>
                        <button class="btn" aria-pressed=${metric==="inter"} onClick=${()=>setMetric("inter")}>|Intersection|</button>
                        <button class="btn" aria-pressed=${metric==="entropy"} onClick=${()=>setMetric("entropy")}>Entropy</button>
                      </div>
                    </div>

                    <div class="ctrl-block">
                      <div class="ctrl-title">Palette ${InfoTip("Change the color ramp used to render cell values.")}</div>
                      <div class="ctrl-content">
                        <select value=${paletteName} onChange=${e=>setPaletteName(e.target.value)}>
                          ${Object.keys(palettes).map(n=> html`<option value=${n}>${n}</option>`)}
                        </select>
                      </div>
                    </div>

                    <div class="ctrl-block">
                      <div class="ctrl-title">Baseline train row ${InfoTip("Pick the training subset that acts as the baseline row for comparisons.")}</div>
                      <div class="ctrl-content">
                        <select value=${rowIdx} onChange=${e=>setRowIdx(+e.target.value)}>
                          ${subs.map((s,idx)=> html`<option value=${idx} key=${"r-"+idx}>${idx}. ${label(s)}</option>`)}
                        </select>
                      </div>
                    </div>

                    <div class="ctrl-block">
                      <div class="ctrl-title">Eval column ${InfoTip("Choose which evaluation subset provides the column of interest for summaries.")}</div>
                      <div class="ctrl-content">
                        <select value=${colIdx} onChange=${e=>setColIdx(+e.target.value)}>
                          ${subs.map((s,idx)=> html`<option value=${idx} key=${"c-"+idx}>${idx}. ${label(s)}</option>`)}
                        </select>
                      </div>
                    </div>

                    <div class="ctrl-block">
                      <div class="ctrl-title">Show numbers ${InfoTip("Overlay the numeric value inside each cell (can get busy on large grids).")}</div>
                      <div class="ctrl-content">
                        <label style="display:flex;align-items:center;gap:6px">
                          <input type="checkbox" checked=${showNums} onChange=${e=>setShowNums(e.target.checked)} />
                          Show cell value
                        </label>
                      </div>
                    </div>

                    <div class="ctrl-block">
                      <div class="ctrl-title">Edit data / world ${InfoTip("Apply operator edits before rendering the grid; operator view shows the effect, real view ignores edits.")}</div>
                      <div class="ctrl-content" style="gap:6px">
                        <button class="btn" aria-pressed=${editorMode==="poison"} onClick=${()=>setEditorMode("poison")}>Poison</button>
                        <button class="btn" aria-pressed=${editorMode==="noise"} onClick=${()=>setEditorMode("noise")}>Add noise</button>
                      </div>
                      ${editorMode==="poison" && html`
                        <div style="font-size:12px;color:var(--muted);display:flex;flex-direction:column;gap:6px;margin-top:4px">
                          <label style="display:flex;align-items:center;gap:6px">
                            <input type="checkbox" checked=${poisonActive} onChange=${e=>setPoisonActive(e.target.checked)} />
                            Rows containing any focus point are corrupted (−0.15 to their cells) to mimic strikes/poisoning.
                          </label>
                          <div class="ctrl-note">Interpretation: imagine a data strike or targeted poisoning—every training subset that includes a focus point is uniformly degraded.</div>
                        </div>
                      `}
                      ${editorMode==="noise" && html`
                        <div style="font-size:12px;color:var(--muted);display:flex;align-items:center;gap:8px;margin-top:4px">
                          <label>Noise level</label>
                          <input type="range" min="0" max="2" value=${noiseLevel} onInput=${e=>setNoiseLevel(+e.target.value)} />
                          <span>${["Off","DP-ish","Heavy"][noiseLevel]}</span>
                        </div>
                        <div class="ctrl-note">Interpretation: adds Laplace-like noise (±0.05 or ±0.12) per cell, approximating ε-DP releases of grid values (smaller noise ≈ higher ε).</div>
                      `}
                      <div class="ctrl" style="margin-top:6px">
                        <button class="btn ghost" onClick=${resetEdits}>Reset edits</button>
                      </div>
                    </div>
                  </div>
                </div>

                <div class="card">
                  <details open>
                    <summary style="cursor:pointer;font-weight:600">Full settings snapshot</summary>
                    <div class="ctrl-note" style="margin:6px 0">Live JSON reflecting universe, rows, evals, and edit toggles.</div>
                    <pre class="json-block">${settingsJson}</pre>
                  </details>
                </div>
              </div>

              <div class="grid-center">
                <div class="panel-toggles">
                  <button class="edge-toggle" onClick=${()=>setControlsOpen(o=>!o)}>${controlsOpen?"Hide controls":"Show controls"}</button>
                  <button class="edge-toggle" onClick=${()=>setComputedOpen(o=>!o)}>${computedOpen?"Hide computed":"Show computed"}</button>
                </div>
                <div class="card" style="padding:10px 12px">
                  <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;flex-wrap:wrap">
                    <div>
                      <div style="font-weight:600">Focus point(s)</div>
                      <div style="color:var(--muted);font-size:12px;max-width:46ch">This is the point (or group) we assess value for; amber/cyan rings compare cells with and without these members.</div>
                      <div style="color:var(--muted);font-size:11px;margin-top:2px">${computed==="group"?"Group mode: pick multiple." : "Single mode: pick one."}</div>
                    </div>
                    <div class="ctrl" style="margin:0;flex-wrap:wrap">
                      ${base.map(ch=>{
                        const active = focusSet.includes(ch);
                        const handler = ()=> computed==="group"? toggleFocus(ch) : setFocusSet([ch]);
                        return html`<button key=${"f-"+ch} class="btn" aria-pressed=${active} onClick=${handler}>${ch}</button>`;
                      })}
                    </div>
                  </div>
                </div>
                <div class="card" style="padding:12px">
                  <div style="display:flex;justify-content:space-between;align-items:center;gap:10px">
                    <h2 style="margin:0">Counterfactual Grid</h2>
                    <div class="ctrl" style="margin:0">
                      <button class="btn mini" aria-pressed=${gridView==="operator"} onClick=${()=>setGridView("operator")}>Operator view</button>
                      <button class="btn mini" aria-pressed=${gridView==="real"} onClick=${()=>setGridView("real")}>Real world</button>
                    </div>
                  </div>
                  <div style="font-size:10px;color:var(--muted);margin-top:4px">Axis headers glow for the active train row and eval column. Switching computed views pulses the contributing cells.</div>
                  <div class="grid-wrap">
                    <div style="display:flex">
                      <div class="rl" style="width:58px"></div>
                      ${subs.map((colSet,colJ)=>{
                        const active = colJ===safeColIdx;
                        return html`<div key=${"c-"+colJ} class=${"cl "+(active?"axis-active":"")} onClick=${()=>setColIdx(colJ)}>${label(colSet)}</div>`;
                      })}
                    </div>

                    ${subs.map((rowSet,rowI)=>{
                      const sizeK = rowSet.length===k;
                      const selected = rowI===safeRowIdx;
                      return html`<div key=${"r-"+rowI} style="display:flex">
                        <div class=${"rl "+(selected?"axis-active":"")} onClick=${()=>setRowIdx(rowI)}>${label(rowSet)}</div>
                        ${subs.map((evSet,colJ)=>{
                      const val = displayMatrix[rowI][colJ]; const t = normalizeValue(val,dispMin,dispMax,0.5);
                          const isSel = (rowI===safeRowIdx && colJ===safeColIdx);

                          let thin=false, thick=false;
                          if(computed==="shapley" && colJ===safeColIdx){
                            const pairThin = !!shapleyPairs.find(p=> p.subsetIndex===rowI);
                            const pairThick = !!shapleyPairs.find(p=> p.withFocusIndex===rowI);
                            thin = thin || pairThin; thick = thick || pairThick;
                          }
                          if(computed==="loo" && colJ===safeColIdx){ if(rowI===safeRowIdx) thick=true; if(findIdx(Srow.filter(x=>x!==focusPrimary))===rowI) thin=true; }
                          if(computed==="group" && colJ===safeColIdx){ if(rowI===safeRowIdx) thick=true; if(strikeMinusIdx>=0 && rowI===strikeMinusIdx) thin=true; }
                          if(computed==="scaling" && colJ===safeColIdx){ if(sizeK) thin=true; }
                      if(poisonActive && colJ===safeColIdx && focusSet.some(ch=> rowSet.includes(ch))){ thick=true; }

                          const highlight = thin || thick || isSel;
                          const classes = ["cell"]; if(isSel) classes.push("sel"); if(highlight) classes.push("cell-emph"); if(switchPulse && highlight) classes.push("cell-pulse");

                          return html`<div key=${"cell-"+rowI+"-"+colJ}
                            class=${classes.join(" ")}
                            title=${`Train ${label(rowSet)} | Eval ${label(evSet)} | value ${val.toFixed(3)}`}
                            onClick=${()=>{ setRowIdx(rowI); setColIdx(colJ); }}
                            style=${{background: palette(t)}}>
                            ${thin && html`<div class="ring ring-thin"></div>`}
                            ${thick && html`<div class="ring ring-thick"></div>`}
                            ${showNums && html`<div class="num">${val.toFixed(2)}</div>`}
                          </div>`;
                        })}
                      </div>`;
                    })}
                  </div>
                  <div style="font-size:12px; color:var(--muted); margin-top:8px; line-height:1.5">
                    <div><b>What you’re seeing:</b> each cell = Train subset and an Eval subset. Click a row label to choose the train slice, a column label for the eval slice, or click a cell to choose both at once.</div>
                    <div><b>How to read the highlights:</b> <span style="color:var(--ring-thin)">Amber rings</span> mark the cells we <i>pull</i> values from (e.g., baseline rows or subsets without our data point we want to value). <span style="color:var(--ring-thick)">Cyan rings</span> mark the cells we <i>compare against</i> (e.g., rows with the data point of interest). White outline = your currently selected cell.</div>
                    <div><b>Why it matters:</b> the amber→cyan pairs are exactly the train/eval combinations the statistic is contrasting—these are the places to inspect to understand LOO, Group LOO, Shapley, or Scaling. Watch the rings pulse when you change computed modes to see which cells are being compared.</div>
                    <div>Operator view reflects edits (poison / noise); Real world shows the untouched matrix.</div>
                  </div>
                </div>
              </div>

              <div class=${"side-panel "+(computedOpen?"":"closed")}>
                <div class=${"card computed-card "+(computedFlash?"computed-flash":"")} style="padding:12px">
                  <h2>Computed values</h2>
                  <p class="lede" style="margin-top:0">Swap modes to see which cells drive the statistic; active cells flash in the grid.</p>
                  <div class="ctrl" style="flex-wrap:wrap">
                    <span class="pill" style="border-style:dashed">Basic</span>
                    <button class="btn" aria-pressed=${computed==="loo"} onClick=${()=>setComputed("loo")}>Leave-one-out</button>
                    <button class="btn" aria-pressed=${computed==="group"} onClick=${()=>setComputed("group")}>Group LOO</button>
                    <button class="btn" aria-pressed=${computed==="shapley"} onClick=${()=>setComputed("shapley")}>Shapley</button>
                    <button class="btn" aria-pressed=${computed==="scaling"} onClick=${()=>setComputed("scaling")}>Scaling</button>
                  </div>

                  ${computed==="shapley" && html`
                    <div style="font-size:13px;color:var(--muted)">
                      <div><b>Shapley value</b> asks: “on average, how much does the focus point change the score when added to a partial training set?”</div>
                      <div style="margin-top:4px"><b>phi</b> ≈ <b>${shapleyStats.phi.toFixed(4)}</b> from <b>${shapleyStats.cnt}</b> pairs at eval <b>${label(subs[safeColIdx]||[])}</b>.</div>
                      ${shapleyStats.rows.length>0 && html`
                        <table class="small" style="margin-top:6px">
                          <thead><tr><th>|S|</th><th>Avg marginal Δ</th><th>#pairs</th></tr></thead>
                          <tbody>
                            ${shapleyStats.rows.map(r=> html`<tr><td>${r.size}</td><td>${r.avg.toFixed(4)}</td><td>${r.n}</td></tr>`)}
                          </tbody>
                        </table>
                      `}
                    </div>
                  `}

                  ${computed==="loo" && html`
                    <div style="font-size:13px;color:var(--muted)">
                      <div><b>Leave-one-out</b> measures the change if we remove the focus point from the baseline row.</div>
                      <div>S = <b>${label(Srow)}</b>; S\\{${focusPrimary}} = <b>${label(Srow.filter(x=>x!==focusPrimary))}</b>; E = <b>${label(subs[safeColIdx]||[])}</b></div>
                      <div style="margin-top:4px">Δ = <b>${looDelta.toFixed(4)}</b></div>
                    </div>
                  `}

                  ${computed==="group" && html`
                    <div style="font-size:13px;color:var(--muted)">
                      <div><b>Group LOO / Data strike</b>: remove a set G from the baseline row and see the difference.</div>
                      <div class="ctrl-note" style="margin-top:4px">Pick group members in the “Focus point(s)” chips above the grid.</div>
                      <div>S = <b>${label(Srow)}</b>; G = <b>${groupSet.join("")||"∅"}</b>; S\\G = <b>${label(strikeMinus)}</b>; E = <b>${label(subs[safeColIdx]||[])}</b></div>
                      <div style="margin-top:4px">Δ = <b>${looDelta.toFixed(4)}</b></div>
                    </div>
                  `}

                  ${computed==="scaling" && html`
                    <div style="font-size:13px;color:var(--muted)">
                      <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
                        <span style="font-size:12px"><b>k (row size)</b></span>
                        <input type="range" min="0" max=${items.length} value=${k} onInput=${e=>setK(+e.target.value)} />
                        <span class="pill">k = ${k}</span>
                        <button class="btn ghost" onClick=${()=>setPlaying(p=>!p)}>${playing? "⏸ Stop" : "▶︎ Animate k"}</button>
                      </div>
                      <div class="ctrl-note" style="margin-top:2px">Scaling averages the eval score over all rows with this size; animating k shows the law as you sweep dataset sizes.</div>
                      <div style="margin:6px 0">
                        <svg class="spark" viewBox="0 0 260 50">
                          <path d=${spark.d} fill="none" stroke="#FFD166" stroke-width="2" />
                          ${scalingAll.map((r,idx)=>{
                            const n=scalingAll.length||1;
                            const minV=Math.min(...scalingAll.map(x=>x.avg));
                            const maxV=Math.max(...scalingAll.map(x=>x.avg));
                            const w=260, h=50, pad=4;
                            const x= pad + (idx*(w-2*pad)/Math.max(1,n-1));
                            const t = maxV===minV? 0.5 : (r.avg-minV)/(maxV-minV);
                            const y= pad + (1-t)*(h-2*pad);
                            return html`<circle cx=${x} cy=${y} r="2.5" fill="#00E5FF" />`;
                          })}
                        </svg>
                        <table class="small" style="margin-top:6px">
                          <thead><tr><th>k</th><th>Avg f(S,E)</th><th>#rows</th></tr></thead>
                          <tbody>
                            ${scalingAll.map(r=> html`<tr><td>${r.k}</td><td>${r.avg.toFixed(4)}</td><td>${r.n}</td></tr>`)}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  `}
                </div>
              </div>
            </div>

          </div>
      `;
      }

      export default App;
