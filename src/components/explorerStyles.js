export const playSurfaceStyles = `
  .counterfactual-play {
    --play-bg: #edf1ee;
    --play-surface: rgba(250, 252, 248, 0.97);
    --play-surface-2: rgba(232, 241, 237, 0.92);
    --play-command: rgba(17, 28, 32, 0.96);
    --play-command-2: rgba(26, 42, 47, 0.94);
    --play-command-line: rgba(187, 207, 200, 0.22);
    --play-line: rgba(36, 63, 72, 0.16);
    --play-line-strong: rgba(36, 63, 72, 0.32);
    --play-ink: #14242d;
    --play-muted: #617077;
    --play-command-ink: #f5faf5;
    --play-command-muted: #aebdb6;
    --play-accent: #0d7772;
    --play-blue: #315d9b;
    --play-gold: #b9842e;
    --play-warn: #aa573f;
    width: min(100%, calc(100vw - 2.25rem));
    max-width: 1380px;
    margin: 0 auto;
    display: grid;
    gap: 0.8rem;
    color: var(--play-ink);
    font-family: var(--font-ui);
    position: relative;
    isolation: isolate;
  }

  .counterfactual-play[data-overlay-open="true"] {
    z-index: 1000;
  }

  .counterfactual-play :where(button, select, summary, a) {
    font: inherit;
  }

  .counterfactual-play :where(button, select) {
    min-height: 2rem;
    border: 1px solid var(--play-line);
    border-radius: 5px;
    background: #fbfcf8;
    color: var(--play-ink);
  }

  .counterfactual-play button {
    cursor: pointer;
    padding: 0.42rem 0.62rem;
    font-weight: 650;
  }

  .counterfactual-play button:hover,
  .counterfactual-play button:focus-visible,
  .counterfactual-play a:focus-visible,
  .counterfactual-play select:focus-visible,
  .counterfactual-play summary:focus-visible {
    outline: 2px solid rgba(13, 119, 114, 0.34);
    outline-offset: 2px;
  }

  .counterfactual-play button[aria-pressed="true"],
  .counterfactual-play .guide-grid button.active,
  .counterfactual-play .guide-list button.active {
    border-color: rgba(13, 119, 114, 0.54);
    background: rgba(13, 119, 114, 0.13);
    color: #124a47;
  }

  .counterfactual-play button:disabled {
    cursor: not-allowed;
    opacity: 0.48;
  }

  .board-card,
  .side-panel {
    border: 1px solid var(--play-line);
    border-radius: 8px;
    background: var(--play-surface);
    box-shadow: 0 16px 34px rgba(39, 54, 46, 0.08);
  }

  .play-hud {
    order: 2;
    position: sticky;
    bottom: 0.7rem;
    z-index: 20;
    display: grid;
    grid-template-columns: minmax(8.5rem, 11rem) minmax(0, 1fr) minmax(17rem, 23rem);
    gap: 0.52rem;
    align-items: stretch;
    padding: 0.68rem;
    border: 1px solid var(--play-command-line);
    border-radius: 8px;
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.08), transparent 34%),
      linear-gradient(90deg, rgba(13, 119, 114, 0.16), rgba(185, 132, 46, 0.12)),
      var(--play-command);
    color: var(--play-command-ink);
    box-shadow:
      0 20px 48px rgba(17, 28, 32, 0.28),
      inset 0 1px 0 rgba(255, 255, 255, 0.1);
  }

  .play-hud :where(button, select) {
    border-color: var(--play-command-line);
    background: rgba(248, 253, 248, 0.08);
    color: var(--play-command-ink);
  }

  .play-hud :where(button, select):hover {
    background: rgba(248, 253, 248, 0.13);
  }

  .play-hud button[aria-pressed="true"] {
    border-color: rgba(69, 195, 184, 0.58);
    background: rgba(29, 145, 137, 0.25);
    color: #f7fffb;
  }

  .play-hud .command-btn.link {
    color: var(--play-command-ink);
  }

  .play-hud .control-label,
  .play-hud .hud-kicker {
    color: #8bd6cd;
  }

  .graph-toolbar-sentinel {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
  }

  .hud-row,
  .panel-head,
  .board-toolbar {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 0.75rem;
  }

  .hud-row {
    grid-column: 1;
    grid-row: 1;
    min-width: 0;
    align-items: center;
    padding: 0.42rem 0;
    border-bottom: 0;
  }

  .hud-title-block,
  .panel-head > div,
  .board-toolbar > div:first-child {
    display: grid;
    gap: 0.12rem;
    min-width: 0;
  }

  .hud-kicker,
  .control-label {
    color: var(--play-accent);
    font-size: 0.72rem;
    font-weight: 750;
    letter-spacing: 0;
  }

  .hud-title-block h2,
  .board-toolbar h3,
  .side-panel h3 {
    margin: 0;
    font-size: 1rem;
    line-height: 1.2;
    letter-spacing: 0;
  }

  .play-hud .hud-title-block h2 {
    color: var(--play-command-ink);
    font-size: 0.98rem;
  }

  .hud-actions,
  .board-actions,
  .segmented,
  .token-row,
  .bucket-row,
  .preset-row,
  .quick-actions {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.35rem;
  }

  .play-hud .hud-actions {
    grid-column: 2 / -1;
    grid-row: 1;
    align-self: center;
  }

  .segmented button,
  .token-row button,
  .bucket-row button,
  .preset-row button,
  .quick-actions button,
  .board-actions button,
  .command-btn {
    min-height: 1.75rem;
    padding: 0.28rem 0.45rem;
    font-size: 0.78rem;
  }

  .command-btn.link {
    display: inline-flex;
    align-items: center;
    text-decoration: none;
  }

  .mode-command {
    max-width: 13rem;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .ci-toggle[aria-pressed="true"] {
    border-color: rgba(13, 119, 114, 0.55);
    background: rgba(13, 119, 114, 0.14);
  }

  .play-hud .ci-toggle[aria-pressed="true"] {
    border-color: rgba(185, 132, 46, 0.64);
    background: rgba(185, 132, 46, 0.2);
  }

  .tactical-actions {
    grid-column: 3;
    grid-row: 3;
    justify-content: flex-end;
    align-self: stretch;
    padding: 0.3rem;
    border: 1px solid rgba(187, 207, 200, 0.14);
    border-radius: 6px;
    background: rgba(7, 13, 16, 0.22);
  }

  .state-console {
    grid-column: 1 / -1;
    grid-row: 2;
    display: grid;
    grid-template-columns: repeat(7, minmax(0, 1fr));
    gap: 0.35rem;
  }

  .state-item {
    min-width: 0;
    display: grid;
    gap: 0.06rem;
    padding: 0.36rem 0.45rem;
    border: 1px solid rgba(187, 207, 200, 0.14);
    border-radius: 6px;
    background: rgba(7, 13, 16, 0.22);
  }

  .state-item span {
    color: var(--play-command-muted);
    font-size: 0.68rem;
  }

  .state-item strong {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 0.84rem;
    color: var(--play-command-ink);
  }

  .state-item strong[title] {
    white-space: normal;
    line-height: 1.12;
  }

  .guided-shell {
    grid-column: 1 / -1;
    grid-row: 3;
    display: grid;
    grid-template-columns: minmax(13rem, 0.9fr) minmax(18rem, 1.25fr) minmax(14rem, 1fr) auto;
    gap: 0.45rem;
    align-items: stretch;
    padding: 0.48rem;
    border: 1px solid rgba(139, 214, 205, 0.24);
    border-radius: 7px;
    background:
      linear-gradient(90deg, rgba(13, 119, 114, 0.18), transparent 42%),
      rgba(7, 13, 16, 0.24);
  }

  .guided-overview,
  .guided-step,
  .guided-result {
    min-width: 0;
    display: grid;
    gap: 0.16rem;
    align-content: start;
    padding: 0.42rem 0.5rem;
    border: 1px solid rgba(187, 207, 200, 0.13);
    border-radius: 6px;
    background: rgba(248, 253, 248, 0.07);
  }

  .guided-overview h3,
  .guided-step strong {
    margin: 0;
    color: var(--play-command-ink);
    font-size: 0.9rem;
    line-height: 1.18;
  }

  .guided-overview p,
  .guided-step p,
  .guided-step em,
  .guided-result strong {
    margin: 0;
    color: var(--play-command-muted);
    font-size: 0.78rem;
    line-height: 1.36;
    font-style: normal;
  }

  .guided-step > span,
  .guided-result span {
    color: #8bd6cd;
    font-size: 0.68rem;
    font-weight: 800;
  }

  .guided-result strong {
    color: #fff8df;
    font-weight: 690;
  }

  .guided-controls {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, auto));
    gap: 0.32rem;
    align-content: center;
  }

  .control-shelf {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(8.5rem, 1fr));
    gap: 0.45rem;
    align-items: end;
    max-height: clamp(12rem, 34vh, 24rem);
    overflow: auto;
  }

  .control-cell {
    display: grid;
    gap: 0.25rem;
    min-width: 0;
  }

  .query-control-group {
    display: contents;
  }

  .graph-lens-cell {
    grid-column: span 2;
  }

  .metric-buttons {
    grid-column: span 2;
  }

  .graph-jump-cell {
    grid-column: span 3;
  }

  .lens-tuning-cell {
    grid-column: span 2;
  }

  .control-cell select,
  .drawer-grid select {
    width: 100%;
    padding: 0.42rem 0.5rem;
  }

  .preset-row {
    flex-wrap: nowrap;
  }

  .preset-row select {
    flex: 1 1 7rem;
    min-width: 0;
    width: auto;
  }

  .stepper {
    display: grid;
    grid-template-columns: 2rem minmax(5.5rem, 1fr) 2rem;
    gap: 0.25rem;
    align-items: center;
  }

  .stepper span {
    display: inline-flex;
    justify-content: center;
    min-height: 2rem;
    align-items: center;
    border: 1px solid var(--play-line);
    border-radius: 5px;
    background: #fbfcf8;
    font-size: 0.78rem;
    font-weight: 700;
  }

  .play-hud .stepper span {
    border-color: var(--play-command-line);
    background: rgba(248, 253, 248, 0.08);
    color: var(--play-command-ink);
  }

  .counterfactual-play .controls-drawer,
  .counterfactual-play .options-drawer {
    padding: 0;
    border: 1px solid rgba(187, 207, 200, 0.14);
    border-radius: 6px;
    background: rgba(7, 13, 16, 0.22);
    min-width: 0;
  }

  .counterfactual-play .controls-drawer {
    grid-column: 1;
    grid-row: 3;
  }

  .counterfactual-play .json-drawer {
    grid-column: 2;
    grid-row: 3;
    align-self: stretch;
  }

  .counterfactual-play .intel-drawer {
    grid-column: 1 / -1;
    grid-row: 4;
  }

  .counterfactual-play .controls-drawer[open] {
    grid-column: 1 / -1;
    grid-row: 5;
  }

  .counterfactual-play[data-guided-mode="true"] .controls-drawer,
  .counterfactual-play[data-guided-mode="true"] .json-drawer,
  .counterfactual-play[data-guided-mode="true"] .tactical-actions {
    grid-row: 4;
  }

  .counterfactual-play[data-guided-mode="true"] .intel-drawer {
    grid-row: 5;
  }

  .counterfactual-play[data-guided-mode="true"] .controls-drawer[open] {
    grid-row: 6;
  }

  .counterfactual-play .controls-drawer summary,
  .counterfactual-play .options-drawer summary,
  .mini-drawer summary {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    cursor: pointer;
    min-height: 2.1rem;
    padding: 0.3rem 0.52rem;
    list-style: none;
    color: var(--play-command-ink);
  }

  .counterfactual-play .controls-drawer summary strong,
  .counterfactual-play .options-drawer summary strong {
    color: var(--play-command-muted);
    font-size: 0.78rem;
    font-weight: 650;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .counterfactual-play .controls-drawer:not([open]) summary strong {
    display: none;
  }

  .counterfactual-play .intel-drawer:not([open]) summary strong {
    display: inline;
  }

  .counterfactual-play .controls-drawer summary::-webkit-details-marker,
  .counterfactual-play .options-drawer summary::-webkit-details-marker,
  .mini-drawer summary::-webkit-details-marker {
    display: none;
  }

  .counterfactual-play .controls-drawer[open] summary,
  .counterfactual-play .options-drawer[open] summary {
    border-bottom: 1px solid rgba(187, 207, 200, 0.12);
  }

  .counterfactual-play .controls-drawer .control-shelf {
    padding: 0.58rem;
  }

  .drawer-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(11rem, 1fr));
    gap: 0.55rem;
    padding: 0.58rem;
    border-top: 1px solid rgba(187, 207, 200, 0.12);
  }

  .play-hud .drawer-grid,
  .play-hud .control-shelf {
    color: var(--play-command-ink);
  }

  .play-hud .drawer-note {
    color: var(--play-command-muted);
  }

  .drawer-grid label,
  .lens-inline-controls,
  .lens-inline-controls label,
  .range-stack,
  .range-stack label {
    display: grid;
    gap: 0.25rem;
  }

  .lens-inline-controls {
    grid-template-columns: repeat(auto-fit, minmax(8rem, 1fr));
    align-items: end;
    padding: 0.5rem;
    border: 1px solid rgba(38, 70, 83, 0.1);
    border-radius: 6px;
    background: rgba(239, 245, 241, 0.58);
  }

  .checkbox-line {
    display: flex !important;
    align-items: center;
    gap: 0.45rem;
  }

  .drawer-note,
  .panel-copy,
  .fact span,
  .plan-list span,
  .concept-map p,
  .graph-command-readout span {
    margin: 0;
    color: var(--play-muted);
    line-height: 1.45;
    font-size: 0.84rem;
  }

  .play-layout {
    order: 1;
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: 0;
    align-items: start;
  }

  .board-card {
    min-width: 0;
    display: grid;
    gap: 0.62rem;
    padding: 0.78rem;
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.72), rgba(255, 255, 255, 0.18)),
      var(--play-surface);
    box-shadow:
      0 18px 42px rgba(35, 51, 43, 0.1),
      inset 0 1px 0 rgba(255, 255, 255, 0.78);
  }

  .board-toolbar {
    align-items: center;
    padding: 0 0.1rem 0.5rem;
    border-bottom: 1px solid rgba(36, 63, 72, 0.1);
  }

  .counterfactual-play .grid-wrap {
    height: min(66vh, 720px);
    min-height: 430px;
    overflow: auto;
    position: relative;
    border-radius: 8px;
    border: 1px solid rgba(129, 41, 43, 0.2);
    background:
      linear-gradient(90deg, rgba(49, 72, 112, 0.06) 1px, transparent 1px),
      linear-gradient(180deg, rgba(129, 41, 43, 0.045) 1px, transparent 1px),
      radial-gradient(circle at 1.4rem 1.4rem, rgba(199, 156, 57, 0.2), transparent 1.5rem),
      linear-gradient(135deg, rgba(250, 247, 232, 0.96), rgba(230, 237, 226, 0.92));
    background-size: 30px 30px, 30px 30px, auto, auto;
    box-shadow:
      inset 0 0 0 2px rgba(199, 156, 57, 0.22),
      inset 0 0 0 7px rgba(255, 252, 240, 0.48),
      inset 0 22px 60px rgba(76, 94, 77, 0.12);
  }

  .counterfactual-play .grid-wrap::before {
    content: "";
    position: sticky;
    z-index: 4;
    top: 0.42rem;
    left: 0.42rem;
    display: block;
    width: calc(100% - 0.84rem);
    height: 0;
    border-top: 2px solid rgba(199, 156, 57, 0.5);
    box-shadow:
      0 calc(min(66vh, 720px) - 1rem) 0 rgba(199, 156, 57, 0.36),
      0 4px 0 rgba(129, 41, 43, 0.22);
    pointer-events: none;
  }

  .counterfactual-play .grid-matrix {
    display: inline-grid;
    gap: 3px;
    padding: 1rem;
    background:
      linear-gradient(90deg, rgba(199, 156, 57, 0.22), transparent 18%, transparent 82%, rgba(199, 156, 57, 0.22)),
      linear-gradient(180deg, rgba(255, 253, 244, 0.52), rgba(255, 253, 244, 0.18));
    border: 1px solid rgba(199, 156, 57, 0.22);
    border-radius: 8px;
    box-shadow: 0 18px 38px rgba(46, 55, 51, 0.1);
  }

  .counterfactual-play .grid-axis-row,
  .counterfactual-play .grid-matrix-row,
  .counterfactual-play .rr {
    display: flex;
    gap: 3px;
  }

  .counterfactual-play .grid-wrap .rl,
  .counterfactual-play .grid-wrap .cl,
  .counterfactual-play .grid-wrap .cell {
    flex: 0 0 auto;
    border-radius: 5px;
  }

  .counterfactual-play .grid-wrap .rl {
    width: 5.7rem;
    height: 2.62rem;
    display: grid;
    align-items: center;
    justify-items: center;
    border: 1px solid rgba(91, 49, 81, 0.2);
    background:
      linear-gradient(135deg, rgba(255, 253, 242, 0.96), rgba(230, 238, 229, 0.84)),
      #f7f1de;
    color: #1b2f40;
    box-shadow:
      inset 0 0 0 1px rgba(255, 255, 255, 0.68),
      0 1px 0 rgba(199, 156, 57, 0.22);
  }

  .counterfactual-play .grid-wrap .cl,
  .counterfactual-play .grid-wrap .cell {
    width: 3.38rem;
    height: 2.62rem;
  }

  .counterfactual-play .grid-wrap .cl {
    display: grid;
    align-items: center;
    justify-items: center;
    border: 1px solid rgba(91, 49, 81, 0.2);
    background:
      linear-gradient(135deg, rgba(255, 253, 242, 0.98), rgba(230, 238, 229, 0.86)),
      #f7f1de;
    color: #1b2f40;
    box-shadow:
      inset 0 0 0 1px rgba(255, 255, 255, 0.68),
      0 1px 0 rgba(199, 156, 57, 0.22);
  }

  .counterfactual-play .grid-wrap .axis-index {
    color: #8a2f34;
    font-size: 0.62rem;
    font-weight: 850;
    line-height: 1;
  }

  .counterfactual-play .grid-wrap .axis-set {
    color: #163653;
    font-size: 0.76rem;
    font-weight: 860;
    line-height: 1;
  }

  .counterfactual-play .grid-wrap .corner-label {
    color: #8a2f34;
    font-size: 0.68rem;
    font-weight: 820;
  }

  .counterfactual-play .grid-wrap .axis-active {
    border-color: rgba(199, 156, 57, 0.72);
    background:
      linear-gradient(135deg, rgba(255, 250, 225, 0.98), rgba(223, 237, 226, 0.9)),
      #f7f1de;
    box-shadow:
      inset 0 0 0 1px rgba(132, 48, 61, 0.32),
      inset 0 0 0 4px rgba(199, 156, 57, 0.18),
      0 0 0 2px rgba(199, 156, 57, 0.18);
  }

  .counterfactual-play .grid-wrap .axis-guide-target {
    border-color: rgba(139, 47, 52, 0.78);
    box-shadow:
      inset 0 0 0 1px rgba(255, 252, 235, 0.8),
      inset 0 0 0 4px rgba(199, 156, 57, 0.24),
      0 0 0 2px rgba(139, 47, 52, 0.2),
      0 0 18px rgba(199, 156, 57, 0.24);
  }

  .counterfactual-play .grid-wrap .cell {
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    padding: 0;
    border: 1px solid rgba(21, 42, 58, 0.18);
    background:
      linear-gradient(135deg, rgba(255, 255, 255, 0.26), transparent 42%),
      linear-gradient(315deg, rgba(15, 27, 35, 0.18), transparent 48%),
      var(--cell-color);
    box-shadow:
      inset 0 0 0 1px rgba(255, 252, 235, 0.22),
      inset 0 -8px 16px rgba(15, 27, 35, 0.12),
      0 1px 0 rgba(255, 253, 242, 0.44);
  }

  .counterfactual-play .grid-wrap .cell:hover,
  .counterfactual-play .grid-wrap .cell:focus-visible {
    transform: none;
    filter: saturate(1.08) brightness(1.04);
    box-shadow:
      inset 0 0 0 1px rgba(255, 252, 235, 0.28),
      inset 0 -8px 16px rgba(15, 27, 35, 0.12),
      0 0 0 2px rgba(199, 156, 57, 0.26);
  }

  .counterfactual-play .grid-wrap .cell-track {
    filter: brightness(1.06) saturate(1.14);
    box-shadow:
      inset 0 0 0 1px rgba(255, 252, 235, 0.32),
      inset 0 -8px 16px rgba(15, 27, 35, 0.1),
      0 0 0 1px rgba(199, 156, 57, 0.28);
  }

  .counterfactual-play .grid-matrix.is-guided.has-guide-target .cell:not(.cell-guide-target):not(.sel) {
    filter: saturate(0.72) brightness(0.95);
  }

  .counterfactual-play .grid-wrap .cell-guide-target {
    z-index: 2;
    outline: 2px solid rgba(139, 47, 52, 0.92);
    outline-offset: -3px;
    box-shadow:
      inset 0 0 0 1px rgba(255, 252, 235, 0.42),
      inset 0 -8px 16px rgba(15, 27, 35, 0.1),
      0 0 0 3px rgba(199, 156, 57, 0.34),
      0 0 22px rgba(139, 47, 52, 0.24);
  }

  .counterfactual-play .grid-wrap .cell::before,
  .counterfactual-play .grid-wrap .cell::after {
    content: "";
    position: absolute;
    inset: 0;
    pointer-events: none;
  }

  .counterfactual-play .grid-wrap .cell::before {
    z-index: 0;
    background:
      repeating-linear-gradient(45deg, rgba(255, 255, 255, 0.1) 0 1px, transparent 1px 6px),
      radial-gradient(circle at 28% 24%, rgba(255, 253, 232, 0.2), transparent 1.1rem);
    mix-blend-mode: screen;
    opacity: 0.65;
  }

  .counterfactual-play .grid-wrap .cell::after {
    inset: 5px;
    z-index: 0;
    border: 1px solid rgba(255, 250, 229, 0.3);
    border-radius: 3px;
    box-shadow: inset 0 0 0 1px rgba(15, 27, 35, 0.08);
    opacity: 0.9;
  }

  .counterfactual-play .grid-wrap .cell-ci {
    position: absolute;
    left: var(--ci-left);
    bottom: 4px;
    width: var(--ci-width);
    height: 3px;
    z-index: 1;
    border-radius: 999px;
    background: rgba(255, 250, 242, 0.86);
    box-shadow: 0 0 0 1px rgba(16, 39, 61, 0.24);
    pointer-events: none;
  }

  .counterfactual-play .grid-wrap .cell .num {
    position: relative;
    z-index: 2;
    font-size: 0.7rem;
    font-weight: 860;
    text-shadow:
      0 1px 0 rgba(255, 252, 235, 0.2),
      0 0 5px rgba(12, 25, 32, 0.18);
  }

  .counterfactual-play .grid-wrap .marker-ring {
    position: absolute;
    inset: 4px;
    z-index: 3;
    border-radius: 4px;
    border: 2px solid #163653;
    box-shadow:
      0 0 0 1px rgba(255, 250, 229, 0.7),
      inset 0 0 0 1px rgba(199, 156, 57, 0.35);
    pointer-events: none;
  }

  .counterfactual-play .grid-wrap .marker-ring.compare {
    border-color: #8a2f34;
  }

  .counterfactual-play .grid-wrap .marker-ring.plan {
    inset: 7px;
    border-color: #fff8df;
    box-shadow:
      0 0 0 2px rgba(22, 54, 83, 0.45),
      0 0 0 4px rgba(199, 156, 57, 0.28);
  }

  .counterfactual-play .grid-wrap .cell-plan {
    outline: 2px solid rgba(199, 156, 57, 0.82);
    outline-offset: -4px;
  }

  .counterfactual-play .grid-wrap .cell-step {
    outline-color: rgba(22, 54, 83, 0.92);
  }

  .graph-surface {
    display: grid;
    gap: 0.55rem;
  }

  .graph-command-readout {
    display: grid;
    gap: 0.1rem;
    padding: 0.55rem;
    border-radius: 6px;
    border: 1px solid rgba(36, 63, 72, 0.1);
    background: rgba(232, 241, 237, 0.72);
  }

  .graph-scroll {
    height: min(66vh, 720px);
    min-height: 430px;
    overflow: auto;
    border-radius: 7px;
    border: 1px solid rgba(36, 63, 72, 0.13);
    background:
      radial-gradient(circle at 50% 2rem, rgba(49, 93, 155, 0.08), transparent 17rem),
      linear-gradient(90deg, rgba(49, 93, 155, 0.045) 1px, transparent 1px),
      linear-gradient(180deg, rgba(13, 119, 114, 0.04) 1px, transparent 1px),
      #eaf1ee;
    background-size: auto, 32px 32px, 32px 32px, auto;
  }

  .graph-lattice {
    display: block;
    min-width: 100%;
    min-height: 100%;
  }

  .graph-edge line {
    stroke: rgba(38, 70, 83, 0.18);
    stroke-width: 2;
  }

  .graph-edge text {
    fill: var(--play-gold);
    font-size: 0.72rem;
    font-weight: 800;
  }

  .graph-edge.is-highlighted line {
    stroke: var(--play-gold);
    stroke-width: 4;
  }

  .graph-edge.is-square line {
    stroke: var(--play-accent);
  }

  .graph-edge.is-envelope line {
    stroke: #17323a;
    stroke-dasharray: 6 5;
  }

  .graph-node {
    cursor: pointer;
  }

  .graph-node-halo {
    fill: transparent;
    stroke: transparent;
  }

  .graph-node-plate {
    stroke: rgba(16, 39, 61, 0.18);
    stroke-width: 1;
  }

  .graph-node-frame {
    fill: transparent;
    stroke: rgba(255, 255, 255, 0.42);
  }

  .graph-node-ci-track {
    fill: rgba(16, 39, 61, 0.24);
  }

  .graph-node-ci {
    fill: #fffaf2;
    stroke: rgba(16, 39, 61, 0.34);
    stroke-width: 1;
  }

  .graph-node-ci-tick {
    fill: #fffaf2;
    stroke: rgba(16, 39, 61, 0.38);
    stroke-width: 1;
  }

  .graph-node text {
    fill: #10273d;
    font-size: 0.76rem;
    font-weight: 800;
    pointer-events: none;
  }

  .graph-lattice.is-dense .graph-node text {
    font-size: 0.68rem;
  }

  .graph-node.is-selected .graph-node-halo {
    fill: rgba(16, 39, 61, 0.08);
    stroke: #10273d;
    stroke-width: 2;
  }

  .graph-node.is-highlighted .graph-node-frame {
    stroke: #fffaf2;
    stroke-width: 2;
  }

  .graph-node.is-square .graph-node-halo {
    stroke: rgba(47, 111, 115, 0.85);
    stroke-width: 2;
  }

  .graph-node.is-envelope .graph-node-halo {
    fill: rgba(47, 111, 115, 0.1);
    stroke: rgba(23, 50, 58, 0.82);
    stroke-dasharray: 5 4;
    stroke-width: 2;
  }

  .graph-node.is-poisoned .graph-node-plate {
    stroke: #8b3d2e;
    stroke-width: 2;
  }

  .graph-node-eval {
    fill: #10273d;
  }

  .graph-node-poison circle {
    fill: #8b3d2e;
  }

  .graph-node-poison text {
    fill: #fffaf2;
    font-size: 0.58rem;
    font-weight: 900;
  }

  .intel-stack {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr));
    gap: 0.58rem;
    max-height: clamp(12rem, 34vh, 24rem);
    overflow: auto;
    padding: 0.58rem;
    border-top: 1px solid rgba(187, 207, 200, 0.12);
  }

  .side-panel {
    min-width: 0;
    padding: 0.72rem;
    display: grid;
    gap: 0.58rem;
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.7), rgba(255, 255, 255, 0.16)),
      rgba(249, 251, 247, 0.94);
  }

  .answer-pill {
    display: inline-flex;
    align-items: center;
    min-height: 1.9rem;
    padding: 0.25rem 0.48rem;
    border-radius: 5px;
    border: 1px solid rgba(180, 122, 50, 0.32);
    background: rgba(180, 122, 50, 0.12);
    color: #6f4b20;
    font-size: 0.76rem;
    font-weight: 750;
    white-space: nowrap;
  }

  .fact-list,
  .plan-list,
  .walkthrough-steps,
  .concept-map,
  .guide-grid {
    display: grid;
    gap: 0.45rem;
  }

  .fact,
  .plan-list button,
  .walkthrough-steps button,
  .concept-map div,
  .guide-grid button {
    display: grid;
    gap: 0.14rem;
    text-align: left;
    padding: 0.5rem;
    border-radius: 6px;
    border: 1px solid rgba(38, 70, 83, 0.12);
    background: rgba(255, 253, 248, 0.75);
  }

  .concept-map-panel .concept-map {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.35rem;
  }

  .concept-map-panel .concept-map div {
    padding: 0.42rem;
  }

  .concept-map-panel .concept-map span {
    color: var(--play-accent);
    font-size: 0.76rem;
    font-weight: 750;
  }

  .concept-map-panel .concept-map p {
    font-size: 0.76rem;
    line-height: 1.34;
  }

  .takeaway,
  .formula {
    padding: 0.55rem;
    border-radius: 6px;
    background: rgba(47, 111, 115, 0.1);
    color: #173f43;
    font-size: 0.86rem;
    line-height: 1.45;
  }

  .walkthrough-steps button {
    grid-template-columns: 1.35rem minmax(0, 1fr);
  }

  .walkthrough-steps button span {
    grid-row: span 2;
    width: 1.25rem;
    height: 1.25rem;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    background: rgba(47, 111, 115, 0.12);
  }

  .walkthrough-steps button em,
  .guide-grid button em {
    color: var(--play-muted);
    font-style: normal;
    font-size: 0.78rem;
    line-height: 1.35;
  }

  .mini-drawer {
    padding: 0;
  }

  .mini-drawer[open] summary {
    border-bottom: 1px solid rgba(38, 70, 83, 0.1);
  }

  .mini-drawer > :not(summary) {
    margin: 0.55rem;
  }

  .neighbor-columns {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.55rem;
  }

  .neighbor-columns ul {
    list-style: none;
    margin: 0.35rem 0 0;
    padding: 0;
    display: grid;
    gap: 0.3rem;
  }

  .neighbor-columns button {
    width: 100%;
    text-align: left;
  }

  .mini-drawer table {
    width: calc(100% - 1.1rem);
    border-collapse: collapse;
    font-size: 0.8rem;
  }

  .mini-drawer th,
  .mini-drawer td {
    padding: 0.35rem;
    border-bottom: 1px solid rgba(38, 70, 83, 0.1);
    text-align: left;
  }

  .json-drawer pre {
    margin: 0;
    padding: 0.75rem;
    max-height: 18rem;
    overflow: auto;
    border-top: 1px solid rgba(187, 207, 200, 0.12);
    color: var(--play-command-ink);
    font-size: 0.78rem;
  }

  .tutorial-modal {
    position: fixed;
    inset: 0;
    z-index: 2000;
    display: grid;
    place-items: center;
    padding: 1rem;
    background: rgba(16, 39, 61, 0.36);
  }

  .tutorial-card {
    width: min(56rem, 100%);
    max-height: min(42rem, calc(100vh - 2rem));
    display: grid;
    grid-template-rows: auto minmax(0, 1fr);
    gap: 0.75rem;
    padding: 0.9rem;
    border-radius: 8px;
    border: 1px solid rgba(38, 70, 83, 0.18);
    background: #fffdf8;
    box-shadow: 0 24px 70px rgba(17, 28, 32, 0.26);
  }

  .modal-body {
    min-height: 0;
    overflow: auto;
    display: grid;
    gap: 0.75rem;
    padding-right: 0.15rem;
  }

  .explain-panel,
  .mode-detail-panel,
  .guide-feature {
    min-width: 0;
    display: grid;
    gap: 0.55rem;
    padding: 0.72rem;
    border-radius: 7px;
    border: 1px solid rgba(38, 70, 83, 0.12);
    background: rgba(239, 245, 241, 0.72);
  }

  .explain-panel p,
  .mode-detail-panel p,
  .guide-feature p {
    margin: 0;
    color: var(--play-muted);
    font-size: 0.88rem;
    line-height: 1.45;
  }

  .starter-grid,
  .mode-choice-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 0.65rem;
  }

  .mode-choice-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .starter-grid button,
  .mode-choice-grid button {
    min-width: 0;
    display: grid;
    gap: 0.22rem;
    min-height: 8rem;
    padding: 0.7rem;
    text-align: left;
    align-content: start;
  }

  .starter-grid button span,
  .mode-choice-grid button span {
    color: var(--play-accent);
    font-size: 0.72rem;
    font-weight: 800;
    text-transform: uppercase;
  }

  .starter-grid button strong,
  .mode-choice-grid button strong {
    font-size: 1rem;
    line-height: 1.22;
  }

  .starter-grid button em,
  .mode-choice-grid button em {
    color: var(--play-muted);
    font-size: 0.82rem;
    font-style: normal;
    line-height: 1.38;
  }

  .modal-actions {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: 0.45rem;
  }

  .mode-query-list,
  .guide-list {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
  }

  .mode-query-list button {
    flex: 1 1 8.5rem;
    min-height: 1.9rem;
  }

  .guide-dialog-layout {
    grid-template-columns: minmax(0, 1.45fr) minmax(12rem, 0.75fr);
    align-items: start;
  }

  .guide-list {
    display: grid;
    align-content: start;
    max-height: 19rem;
    overflow: auto;
  }

  .guide-list button {
    display: grid;
    gap: 0.1rem;
    min-height: auto;
    padding: 0.55rem;
    text-align: left;
  }

  .guide-list span {
    color: var(--play-muted);
    font-size: 0.75rem;
  }

  .atlas-card {
    width: min(64rem, 100%);
  }

  .atlas-layout {
    display: grid;
    grid-template-columns: minmax(12rem, 15rem) minmax(0, 1fr);
    gap: 0.75rem;
    min-height: 0;
  }

  .atlas-nav {
    max-height: min(32rem, calc(100vh - 9rem));
    overflow: auto;
    display: grid;
    gap: 0.35rem;
    padding-right: 0.2rem;
  }

  .atlas-nav button {
    display: grid;
    gap: 0.08rem;
    min-height: auto;
    padding: 0.48rem;
    text-align: left;
  }

  .atlas-nav button[aria-pressed="true"] {
    border-color: rgba(47, 111, 115, 0.45);
    background: rgba(47, 111, 115, 0.12);
  }

  .atlas-nav span,
  .atlas-badges span {
    color: var(--play-accent);
    font-size: 0.68rem;
    font-weight: 800;
    text-transform: uppercase;
  }

  .atlas-nav strong {
    font-size: 0.84rem;
  }

  .atlas-detail {
    min-width: 0;
    max-height: min(32rem, calc(100vh - 9rem));
    overflow: auto;
    display: grid;
    align-content: start;
    gap: 0.65rem;
    padding: 0.75rem;
    border-radius: 6px;
    border: 1px solid rgba(38, 70, 83, 0.12);
    background: rgba(239, 245, 241, 0.58);
  }

  .atlas-badges {
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
  }

  .atlas-badges span {
    padding: 0.18rem 0.38rem;
    border-radius: 4px;
    background: rgba(47, 111, 115, 0.1);
  }

  .atlas-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.55rem;
  }

  .atlas-grid div {
    min-width: 0;
    padding: 0.55rem;
    border-radius: 6px;
    background: rgba(255, 253, 248, 0.76);
    border: 1px solid rgba(38, 70, 83, 0.1);
  }

  .atlas-grid p,
  .atlas-grid ul {
    margin: 0.28rem 0 0;
    color: var(--play-muted);
    font-size: 0.82rem;
    line-height: 1.38;
  }

  .atlas-grid ul {
    padding-left: 1rem;
  }

  .comparison-strip {
    display: grid;
    gap: 0.5rem;
  }

  .comparison-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
  }

  .comparison-head span {
    color: var(--play-muted);
    font-size: 0.76rem;
    font-weight: 750;
  }

  .comparison-grid {
    display: grid;
    gap: 0.5rem;
  }

  .comparison-tabs {
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
  }

  .comparison-tabs button {
    flex: 1 1 10rem;
    min-height: 1.85rem;
    padding: 0.28rem 0.42rem;
    font-size: 0.76rem;
    font-weight: 780;
  }

  .comparison-tabs button[aria-pressed="true"] {
    border-color: rgba(47, 111, 115, 0.45);
    background: rgba(47, 111, 115, 0.12);
  }

  .comparison-card {
    min-width: 0;
    display: grid;
    gap: 0.36rem;
    padding: 0.58rem;
    border-radius: 6px;
    border: 1px solid rgba(180, 122, 50, 0.22);
    background: rgba(255, 250, 242, 0.88);
  }

  .comparison-card[hidden] {
    display: none;
  }

  .comparison-title {
    display: grid;
    gap: 0.08rem;
  }

  .comparison-title span,
  .comparison-card small {
    color: var(--play-muted);
    font-size: 0.75rem;
    line-height: 1.3;
  }

  .comparison-card p {
    margin: 0;
    color: var(--play-ink);
    font-size: 0.8rem;
    line-height: 1.34;
  }

  .comparison-bridge {
    padding: 0.42rem;
    border-radius: 5px;
    background: rgba(47, 111, 115, 0.1);
    color: #173f43;
    font-size: 0.78rem;
    line-height: 1.34;
  }

  @media (max-width: 1100px) {
    .play-hud {
      grid-template-columns: minmax(8rem, 10rem) minmax(0, 1fr);
    }

    .play-hud .hud-actions {
      grid-column: 2;
      grid-row: 1;
    }

    .state-console {
      grid-column: 1 / -1;
      grid-row: 2;
      grid-template-columns: repeat(4, minmax(0, 1fr));
    }

    .guided-shell {
      grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    }

    .guided-result,
    .guided-controls {
      grid-column: span 1;
    }

    .counterfactual-play .controls-drawer {
      grid-column: 1;
      grid-row: 3;
    }

    .counterfactual-play .json-drawer {
      grid-column: 2;
      grid-row: 3;
    }

    .tactical-actions {
      grid-column: 1 / -1;
      grid-row: 4;
      justify-content: flex-start;
    }

    .counterfactual-play .intel-drawer {
      grid-column: 1 / -1;
      grid-row: 5;
    }

    .counterfactual-play .controls-drawer[open] {
      grid-row: 6;
    }

    .control-shelf {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }

    .graph-lens-cell,
    .metric-buttons,
    .graph-jump-cell,
    .lens-tuning-cell {
      grid-column: span 3;
    }

    .play-layout {
      grid-template-columns: 1fr;
    }
  }

  @media (max-width: 720px) {
    .counterfactual-play {
      width: min(100%, calc(100vw - 1rem));
    }

    .play-hud {
      bottom: 0.4rem;
      grid-template-columns: 1fr;
    }

    .play-hud .hud-actions,
    .state-console,
    .guided-shell,
    .counterfactual-play .controls-drawer,
    .counterfactual-play .json-drawer,
    .counterfactual-play .intel-drawer,
    .tactical-actions,
    .counterfactual-play .controls-drawer[open] {
      grid-column: 1;
      grid-row: auto;
    }

    .hud-row,
    .panel-head,
    .board-toolbar {
      display: grid;
    }

    .state-console,
    .control-shelf,
    .guided-shell {
      grid-template-columns: 1fr 1fr;
    }

    .guided-overview,
    .guided-step,
    .guided-result,
    .guided-controls {
      grid-column: 1 / -1;
    }

    .graph-lens-cell,
    .metric-buttons,
    .graph-jump-cell,
    .lens-tuning-cell,
    .token-control {
      grid-column: 1 / -1;
    }

    .grid-wrap,
    .graph-scroll {
      height: min(58vh, 560px);
      min-height: 320px;
    }

    .neighbor-columns {
      grid-template-columns: 1fr;
    }

    .concept-map-panel .concept-map {
      grid-template-columns: 1fr;
    }

    .starter-grid,
    .mode-choice-grid,
    .guide-dialog-layout,
    .atlas-layout,
    .atlas-grid {
      grid-template-columns: 1fr;
    }

    .atlas-nav {
      grid-template-columns: repeat(2, minmax(0, 1fr));
      max-height: 9.5rem;
      padding-right: 0;
    }

    .atlas-nav button {
      padding: 0.42rem;
    }

    .atlas-detail {
      padding: 0.65rem;
    }

    .comparison-grid {
      grid-template-columns: 1fr;
    }

    .comparison-tabs button {
      flex-basis: 8rem;
      font-size: 0.72rem;
      line-height: 1.2;
    }

    .cl,
    .cell {
      width: 2.8rem;
    }

    .rl {
      width: 4.8rem;
    }
  }
`;
