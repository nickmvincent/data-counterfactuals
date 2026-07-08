export const postTrainingExplorerStyles = `
  .post-training-explorer {
    --pt-border: rgba(92, 72, 52, 0.16);
    --pt-fg: #201a16;
    --pt-muted: #655a4f;
    --pt-accent: #2f6f73;
    --pt-warm: #b14f1f;
    display: grid;
    gap: 1.3rem;
    max-width: 76rem;
    color: var(--pt-fg);
  }

  .post-training-explorer * {
    box-sizing: border-box;
  }

  .pt-intro {
    max-width: var(--measure);
    display: grid;
    gap: 0.55rem;
  }

  .pt-intro h2,
  .pt-selected-signal h3,
  .pt-pipeline h3,
  .pt-readout h3 {
    margin: 0;
    font-family: var(--font-display);
    line-height: 1.12;
    letter-spacing: 0;
  }

  .pt-intro h2 {
    font-size: clamp(1.55rem, 2.3vw, 2.1rem);
  }

  .pt-intro p,
  .pt-selected-signal p,
  .pt-readout p,
  .pt-metric p,
  table small {
    margin: 0;
    color: var(--pt-muted);
    font-family: var(--font-ui);
    font-size: 0.92rem;
    line-height: 1.65;
  }

  .pt-controls {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 1rem 1.25rem;
    padding-top: 1rem;
    border-top: 1px solid var(--pt-border);
  }

  .pt-controls fieldset {
    min-width: 0;
    margin: 0;
    padding: 0;
    border: 0;
    display: grid;
    gap: 0.45rem;
  }

  .pt-controls legend {
    padding: 0;
    color: var(--pt-muted);
    font-family: var(--font-ui);
    font-size: 0.86rem;
    font-weight: 650;
  }

  .pt-token-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
  }

  .pt-token,
  .pt-controls select {
    min-height: 2.2rem;
    border: 1px solid var(--pt-border);
    border-radius: 0;
    background: transparent;
    color: var(--pt-fg);
    font-family: var(--font-ui);
    font-size: 0.86rem;
    font-weight: 600;
  }

  .pt-token {
    padding: 0.42rem 0.58rem;
    cursor: pointer;
  }

  .pt-token.active,
  .pt-token:hover,
  .pt-token:focus-visible {
    border-color: rgba(177, 79, 31, 0.46);
    color: var(--ring-thick);
    background: rgba(177, 79, 31, 0.06);
  }

  .pt-token:focus-visible,
  .pt-controls select:focus-visible,
  .pt-controls input:focus-visible {
    outline: var(--focus-outline);
    outline-offset: 3px;
  }

  .pt-controls select {
    width: 100%;
    padding: 0.38rem 0.48rem;
  }

  .pt-controls input[type="range"] {
    width: 100%;
    accent-color: var(--pt-accent);
  }

  .pt-selected-signal {
    max-width: var(--measure);
    display: grid;
    gap: 0.5rem;
    padding-top: 1rem;
    border-top: 1px solid var(--pt-border);
  }

  .pt-selected-signal h3,
  .pt-pipeline h3,
  .pt-readout h3 {
    font-size: 1.25rem;
  }

  .pt-selected-signal code {
    width: fit-content;
    max-width: 100%;
    overflow-x: auto;
    padding: 0.25rem 0.35rem;
    border: 1px solid var(--pt-border);
    color: var(--pt-fg);
    font-size: 0.84rem;
  }

  .pt-main {
    display: grid;
    grid-template-columns: minmax(0, 1.35fr) minmax(280px, 0.65fr);
    gap: 1.4rem;
    align-items: start;
  }

  .pt-pipeline,
  .pt-readout {
    display: grid;
    gap: 0.75rem;
    min-width: 0;
  }

  .pt-table-wrap {
    overflow-x: auto;
  }

  .pt-pipeline table {
    width: 100%;
    min-width: 42rem;
    border-collapse: collapse;
    font-family: var(--font-ui);
    font-size: 0.9rem;
  }

  .pt-pipeline th,
  .pt-pipeline td {
    padding: 0.72rem 0.55rem;
    border-top: 1px solid var(--pt-border);
    vertical-align: top;
    text-align: left;
  }

  .pt-pipeline thead th {
    color: var(--pt-muted);
    font-size: 0.78rem;
    font-weight: 700;
  }

  .pt-pipeline tbody th {
    width: 42%;
    font-weight: 650;
  }

  .pt-pipeline th span,
  .pt-pipeline th small {
    display: block;
  }

  .pt-pipeline th small {
    margin-top: 0.2rem;
    font-weight: 400;
  }

  .pt-value-text {
    display: block;
    margin-bottom: 0.28rem;
    font-weight: 700;
  }

  .pt-bar {
    display: block;
    height: 0.42rem;
    border: 1px solid rgba(92, 72, 52, 0.14);
    background: rgba(255, 250, 243, 0.7);
    overflow: hidden;
  }

  .pt-bar span {
    display: block;
    height: 100%;
    background: var(--pt-accent);
  }

  .pt-metric-list {
    margin: 0;
    display: grid;
    gap: 0;
    border-top: 1px solid var(--pt-border);
  }

  .pt-metric {
    padding: 0.75rem 0;
    border-bottom: 1px solid var(--pt-border);
  }

  .pt-metric dt {
    display: flex;
    justify-content: space-between;
    gap: 0.75rem;
    color: var(--pt-fg);
    font-family: var(--font-ui);
    font-size: 0.9rem;
    font-weight: 700;
  }

  .pt-metric dd {
    margin: 0.42rem 0 0;
    display: grid;
    gap: 0.35rem;
  }

  .pt-bar-metric span {
    background: var(--pt-warm);
  }

  .pt-takeaway {
    padding-top: 0.85rem;
    border-top: 1px solid var(--pt-border);
    color: var(--pt-fg) !important;
    font-weight: 650;
  }

  @media (max-width: 900px) {
    .pt-controls,
    .pt-main {
      grid-template-columns: 1fr;
    }
  }
`;
