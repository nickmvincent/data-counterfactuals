import { h } from "preact";
import { useState, useMemo, useEffect, useRef } from "preact/hooks";
import htm from "htm";
const html = htm.bind(h);
      const InfoTip = (text)=> html`<span class="info-tip" title=${text}>ⓘ</span>`;
      const clamp01 = (v)=> Math.min(1, Math.max(0, v));
      const binaryEntropy = (p)=>{
        if(p<=0 || p>=1) return 0;
        const log2 = Math.log2 ? Math.log2 : (x)=> Math.log(x)/Math.log(2);
        return -(p*log2(p) + (1-p)*log2(1-p));
      };
      const pseudoRand = (i,j)=>{
        const seed = Math.sin((i+1)*12.9898 + (j+1)*78.233) * 43758.5453;
        return seed - Math.floor(seed);
      };

      const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

      const palettes = {
        "Blue→Yellow": (t)=> `hsl(${210-150*t} 90% ${48+14*(t-0.5)}%)`,
        "Viridis-ish": (t)=> { const h= 260 - 160*t; const s= 65 + 25*t; const l= 30 + 35*t; return `hsl(${h} ${s}% ${l}%)`; },
        "Greys": (t)=> { const l= 18 + 64*t; return `hsl(220 10% ${l}%)`; },
      };

      const combos = (arr,k)=>{
        const res=[]; const n=arr.length;
        function rec(start,c){ if(c.length===k){res.push(c.slice());return;}
          for(let idx=start; idx<n; idx++){ c.push(arr[idx]); rec(idx+1,c); c.pop(); }
        } rec(0,[]);
        return res;
      };
      const allSubs = (items)=>{
        const out=[[]];
        for(let r=1;r<=items.length;r++) out.push(...combos(items,r));
        return out.sort((a,b)=>(a.length-b.length)||a.join("").localeCompare(b.join("")));
      };
      const label = (s)=> s.length ? s.join("") : "∅";
      const jacc = (a,b)=>{
        const A=new Set(a), B=new Set(b);
        if(!A.size && !B.size) return 1;
        let inter=0; for(const x of A) if(B.has(x)) inter++;
        const u=new Set([...a,...b]).size;
        return u? inter/u : 0;
      };
      const inter=(a,b)=>{ const A=new Set(a); let v=0; for(const x of b) if(A.has(x)) v++; return v; };
      const norm=(v,min,max)=>max===min?0:(v-min)/(max-min);
      const eq=(a,b)=> a.length===b.length && a.every((x,i)=>x===b[i]);

      function useGrid(items, metric){
        const subs = useMemo(()=> allSubs(items), [items]);
        const grid = useMemo(()=>{
          const m=[], vals=[];
          for(const tr of subs){ const row=[]; for(const ev of subs){
            let val;
            if(metric==="jaccard") val = jacc(tr,ev);
            else if(metric==="inter") val = inter(tr,ev);
            else val = binaryEntropy(jacc(tr,ev));
            row.push(val); vals.push(val);
          } m.push(row); }
          return { m, min: Math.min(...vals), max: Math.max(...vals), subs };
        }, [subs, metric]);
        return grid;
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

        const tutorialPresets = [
          {
            id: "omitB",
            title: "Compare ABC vs AC",
            summary: "Simple leave-one-out comparison.",
            goal: "We want an estimate of how much point B matters.",
            how: "We train on ABC, then omit B so we can compare the ABC vs AC cells directly.",
            concept: "Leave-one-out influence",
            setup: ()=>{
              setCount(3);
              setMetric("jaccard");
              setFocusSet(["B"]);
              setK(3);
              setShowNums(true);
              setComputed("loo");
              setPendingSelection({ row:["A","B","C"], col:["A","B","C"] });
            }
          },
          {
            id: "powerset",
            title: "ABCD & the powerset",
            summary: "Show the whole powerset via scaling.",
            goal: "We want to see how performance scales with dataset size.",
            how: "We train on ABCD, then look across the entire powerset via the scaling summary.",
            concept: "Scaling laws",
            setup: ()=>{
              setCount(4);
              setMetric("jaccard");
              setFocusSet(["A"]);
              setK(2);
              setShowNums(false);
              setComputed("scaling");
              setPendingSelection({ row:["A","B","C","D"], col:["A","B","C","D"] });
            }
          },
          {
            id: "strikeCD",
            title: "Strike with C and D",
            summary: "Data strike after full training.",
            goal: "We want to see what happens if C and D stop contributing.",
            how: "We train on ABCD, then have C and D walk out together to watch the data strike drop performance.",
            concept: "Group leave-one-out / data strike",
            setup: ()=>{
              setCount(4);
              setMetric("jaccard");
              setFocusSet(["C","D"].sort());
              setK(4);
              setShowNums(true);
              setComputed("group");
              setPendingSelection({ row:["A","B","C","D"], col:["A","B","C","D"] });
            }
          },
          {
            id: "shapleyB",
            title: "Shapley around B",
            summary: "Average contribution of point B.",
            goal: "We want the Shapley-style value for point B.",
            how: "We let the Shapley view sweep all subsets at eval ABC and focus on B’s average marginal gain.",
            concept: "Shapley value",
            setup: ()=>{
              setCount(3);
              setMetric("jaccard");
              setFocusSet(["B"]);
              setK(2);
              setShowNums(false);
              setComputed("shapley");
              setPendingSelection({ row:["A","B"], col:["A","B","C"] });
            }
          },
         {
            id: "poisonA",
            title: "Poison with A′",
            summary: "Edit data via corruption.",
            goal: "We want to see how corrupting A affects evals.",
            how: "We turn on the poison edit (rows containing A drop) rather than expanding the universe.",
            concept: "Data poisoning / leverage",
            setup: ()=>{
              setPoisonActive(true);
              setNoiseLevel(0);
              setWorldShift(0);
              setCount(3);
              setMetric("jaccard");
              setFocusSet(["A"]);
              setK(3);
              setShowNums(true);
              setComputed("group");
              setPendingSelection({ row:["A","B","C"], col:["A","B","C"] });
            }
          }
        ];
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

        const findIdx = (S)=> subs.findIndex(t=> eq(t,S));
        const matrix = useMemo(()=>{
          return baseMatrix.map((row,rowIdx)=>{
            const rowSet = subs[rowIdx] || [];
            return row.map((val,colIdx)=>{
              let next = val;
              if(poisonActive && focusSet.some(ch=> rowSet.includes(ch))) next -= 0.15;
              if(noiseLevel>0){
                const scale = noiseLevel===1?0.05:0.12;
                const rand = pseudoRand(rowIdx,colIdx);
                next += (rand*2-1)*scale;
              }
              return clamp01(next);
            });
          });
        }, [baseMatrix, subs, focusPrimary, focusSet, poisonActive, noiseLevel]);
        const operatorRange = useMemo(()=>{
          let minVal=Infinity, maxVal=-Infinity;
          for(const row of matrix){
            for(const val of row){
              if(val<minVal) minVal=val;
              if(val>maxVal) maxVal=val;
            }
          }
          if(!isFinite(minVal)) minVal=0;
          if(!isFinite(maxVal)) maxVal=1;
          return { min: minVal, max: maxVal };
        }, [matrix]);
        const baseRange = useMemo(()=>{
          let minVal=Infinity, maxVal=-Infinity;
          for(const row of baseMatrix){
            for(const val of row){
              if(val<minVal) minVal=val;
              if(val>maxVal) maxVal=val;
            }
          }
          if(!isFinite(minVal)) minVal=0;
          if(!isFinite(maxVal)) maxVal=1;
          return { min: minVal, max: maxVal };
        }, [baseMatrix]);
        const displayMatrix = gridView==="real"? baseMatrix : matrix;
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

        const shapleyPairs = useMemo(()=>{
          const pairs=[];
          for(const S of subs){
            if(S.includes(focusPrimary)) continue;
            const withI = [...S, focusPrimary].sort();
            const sIdx = findIdx(S);
            const wIdx = findIdx(withI);
            if(sIdx>=0 && wIdx>=0) pairs.push({sIdx, wIdx});
          }
          return pairs;
        }, [subs, focusPrimary]);

        const betaWeight = (subsetSize,total,alpha=0.5,beta=0.5)=>{
          if(total<=1) return 1;
          const x = subsetSize/Math.max(1,total-1);
          return Math.pow(Math.max(x,1e-4), alpha-1)*Math.pow(Math.max(1-x,1e-4), beta-1);
        };
        const shapleyStats = useMemo(()=>{
          const bySize = new Map(); let sum=0, cnt=0;
          for(const {sIdx, wIdx} of shapleyPairs){
            const d = matrix[wIdx][safeColIdx] - matrix[sIdx][safeColIdx];
            const sLen = subs[sIdx].length;
            const slot = bySize.get(sLen) || {sum:0, n:0}; slot.sum += d; slot.n += 1; bySize.set(sLen, slot);
            sum += d; cnt += 1;
          }
          const phi = cnt? sum/cnt : 0;
          const rows = [...bySize.entries()].sort((a,b)=>a[0]-b[0]).map(([s, o])=> ({ size:s, avg: o.sum/o.n, n:o.n }));
          return { phi, cnt, rows };
        }, [matrix, safeColIdx, shapleyPairs, subs]);

        const looDelta = useMemo(()=>{
          const baseVal = matrix[safeRowIdx][safeColIdx];
          const other = looMinusIdx>=0 ? matrix[looMinusIdx][safeColIdx] : baseVal;
          return baseVal - other;
        }, [matrix, safeRowIdx, safeColIdx, looMinusIdx]);
        const influenceFD = looDelta;

        const betaShapley = useMemo(()=>{
          let totalWeight=0, weightedSum=0;
          const rows = [];
          for(const {sIdx,wIdx} of shapleyPairs){
            const size = subs[sIdx].length;
            const weight = betaWeight(size, subs.length);
            const delta = matrix[wIdx][safeColIdx] - matrix[sIdx][safeColIdx];
            rows.push({ size, delta, weight });
            weightedSum += delta*weight;
            totalWeight += weight;
          }
          return {
            phi: totalWeight? weightedSum/totalWeight : 0,
            rows
          };
        }, [shapleyPairs, subs, matrix, safeColIdx]);

        const leastCore = useMemo(()=>{
          let worstGap=-Infinity;
          for(let rowI=0; rowI<matrix.length; rowI++){
            for(let colJ=0; colJ<matrix[rowI].length; colJ++){
              const gap = matrix[rowI][colJ] - matrix[safeRowIdx][safeColIdx];
              if(gap>worstGap) worstGap=gap;
            }
          }
          return worstGap;
        }, [matrix, safeRowIdx, safeColIdx]);

        const scalingAll = useMemo(()=>{
          const res=[];
          for(let kk=0; kk<=items.length; kk++){
            let sum=0, n=0;
            for(let r=0;r<subs.length;r++){
              if(subs[r].length!==kk) continue;
              sum += matrix[r][safeColIdx]; n++;
            }
            res.push({k: kk, avg: n? sum/n : 0, n});
          }
          return res;
        }, [items.length, subs, matrix, safeColIdx]);
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
        const appendixItems = [
          {
            id: "influence",
            title: "Influence functions",
            links: ["https://arxiv.org/abs/1703.04730"],
            body: html`<p><b>Influence</b> asks: "if I nudge the weight of this one point, how does the score change?" On this grid we approximate that by the leave‑one‑out difference at the baseline row, so the ∆ value doubles as the finite‑difference influence estimate. See <a href="https://arxiv.org/abs/1703.04730" target="_blank">Koh & Liang (2017)</a> for the foundational paper.</p>`
          },
          {
            id: "meta",
            title: "Meta-gradient / acquisition",
            links: ["https://arxiv.org/abs/2101.09933"],
            body: html`<p><b>Meta-gradient</b> reasoning looks at how the score changes as you grow the training set, hinting at "what should we add next?" It's the intuition behind the Scaling view above—fit a slope on k to decide where diminishing returns set in. See <a href="https://arxiv.org/abs/2101.09933" target="_blank">Active Deep Learning survey</a> for more.</p>`
          },
          {
            id: "poison",
            title: "Poison / leverage",
            links: ["https://arxiv.org/abs/2503.22759"],
            body: html`<p><b>Poison</b> captures data corruption or strikes. In the Explorer we model it by degrading rows that contain the focus point, mirroring leverage actions without exploding the grid. See <a href="https://arxiv.org/abs/2503.22759" target="_blank">Data Poisoning in Deep Learning survey</a>.</p>`
          },
          {
            id: "tracin",
            title: "TracIn / influence curves",
            links: ["https://arxiv.org/abs/2002.08484"],
            body: html`<p><b>TracIn</b> scores examples via gradient inner products along the training trajectory. The grid could approximate it by storing synthetic gradients per row/column and summing their directional dot products, highlighting which cells push an eval column up or down. See <a href="https://arxiv.org/abs/2002.08484" target="_blank">Pruthi et al. (2020)</a>.</p>`
          },
          {
            id: "selection",
            title: "Selection / acquisition planning",
            links: ["https://arxiv.org/abs/1811.03402"],
            body: html`<p>The planned selection view will scan all rows of size <code>k</code> and report the best subset for a chosen evaluation column—exactly the data-curation question ("which partial dataset should we ship?"). Until that lands, use the Scaling view plus the raw grid to reason about those <code>k</code>-slices. See <a href="https://arxiv.org/abs/1811.03402" target="_blank">Data Collection for Machine Learning survey</a>.</p>`
          }
        ];

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
                      const val = displayMatrix[rowI][colJ]; const t = norm(val,dispMin,dispMax);
                          const isSel = (rowI===safeRowIdx && colJ===safeColIdx);

                          let thin=false, thick=false;
                          if(computed==="shapley" && colJ===safeColIdx){
                            const pairThin = !!shapleyPairs.find(p=> p.sIdx===rowI);
                            const pairThick = !!shapleyPairs.find(p=> p.wIdx===rowI);
                            thin = thin || pairThin; thick = thick || pairThick;
                          }
                          if((computed==="loo" || computed==="influence") && colJ===safeColIdx){ if(rowI===safeRowIdx) thick=true; if(findIdx(Srow.filter(x=>x!==focusPrimary))===rowI) thin=true; }
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
                    <div>Operator view reflects edits (poison / noise / world shift); Real world shows the untouched matrix.</div>
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
                  <div class="ctrl" style="flex-wrap:wrap; margin-top:8px">
                    <span class="pill" style="border-style:dashed">Advanced (coming soon)</span>
                    <button class="btn" aria-pressed=${computed==="influence"} disabled>Influence (FD)</button>
                    <button class="btn" aria-pressed=${computed==="beta"} disabled>Beta Shapley</button>
                    <button class="btn" aria-pressed=${computed==="leastcore"} disabled>Least core</button>
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
                  ${computed==="beta" && html`
                    <div style="font-size:13px;color:var(--muted)">
                      <div><b>Beta Shapley</b> reweights each marginal by a Beta(1/2,1/2) prior on coalition size, emphasizing smaller/larger subsets.</div>
                      <div style="margin-top:4px"><b>beta-phi</b> ≈ <b>${betaShapley.phi.toFixed(4)}</b></div>
                    </div>
                  `}

                  ${computed==="loo" && html`
                    <div style="font-size:13px;color:var(--muted)">
                      <div><b>Leave-one-out</b> measures the change if we remove the focus point from the baseline row.</div>
                      <div>S = <b>${label(Srow)}</b>; S\\{${focusPrimary}} = <b>${label(Srow.filter(x=>x!==focusPrimary))}</b>; E = <b>${label(subs[safeColIdx]||[])}</b></div>
                      <div style="margin-top:4px">Δ = <b>${looDelta.toFixed(4)}</b></div>
                    </div>
                  `}
                  ${computed==="influence" && html`
                    <div style="font-size:13px;color:var(--muted)">
                      <div><b>Influence (finite diff)</b> reuses the leave-one-out drop as a simple influence score for the focus point.</div>
                      <div>S = <b>${label(Srow)}</b>; S\\{${focusPrimary}} = <b>${label(Srow.filter(x=>x!==focusPrimary))}</b>; E = <b>${label(subs[safeColIdx]||[])}</b></div>
                      <div style="margin-top:4px">Influence ≈ <b>${influenceFD.toFixed(4)}</b></div>
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

                  ${computed==="leastcore" && html`
                    <div style="font-size:13px;color:var(--muted);margin-top:8px">
                      <div><b>Least core</b>: worst-case deviation any row/column can induce relative to the baseline cell.</div>
                      <div style="margin-top:4px">Maximum gap ≈ <b>${leastCore.toFixed(4)}</b></div>
                    </div>
                  `}
                </div>
              </div>
            </div>

          </div>
      `;
      }

      export default App;
