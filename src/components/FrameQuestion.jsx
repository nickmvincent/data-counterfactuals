import { useEffect, useMemo, useState } from "preact/hooks";
import {
  interventionOptions,
  outcomeGuidance,
  outcomeOptions,
  resolveSources,
  roleGuidance,
  roleOptions,
  unitOptions,
} from "../lib/research-content.js";
import { buildFrameQuestion, getRoleCompatibilityNote } from "../lib/frame-question.js";

function ChoiceGroup({ legend, name, options, value, onChange }) {
  return (
    <fieldset class="frame-group">
      <legend>{legend}</legend>
      <div class="frame-choices">
        {options.map((option) => (
          <label class={`frame-choice ${value === option.id ? "is-selected" : ""}`}>
            <input
              type="radio"
              name={name}
              value={option.id}
              checked={value === option.id}
              onChange={() => onChange(option.id)}
            />
            <span class="frame-choice-label">{option.label}</span>
            {option.short && <span class="frame-choice-note">{option.short}</span>}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export default function FrameQuestion() {
  const [role, setRole] = useState("training");
  const [unit, setUnit] = useState("source");
  const [intervention, setIntervention] = useState("remove");
  const [outcome, setOutcome] = useState("performance");
  const [copyLabel, setCopyLabel] = useState("Copy brief");
  const [ready, setReady] = useState(false);

  useEffect(() => setReady(true), []);

  const result = useMemo(() => {
    const roleOption = roleOptions.find((option) => option.id === role);
    const unitOption = unitOptions.find((option) => option.id === unit);
    const interventionOption = interventionOptions.find((option) => option.id === intervention);
    const outcomeOption = outcomeOptions.find((option) => option.id === outcome);
    const guidance = roleGuidance[role];

    const prompt = buildFrameQuestion({
      interventionId: interventionOption.id,
      unitLabel: unitOption.label,
      outcomeLabel: outcomeOption.label,
      roleLabel: roleOption.label,
    });

    return {
      ...prompt,
      ...guidance,
      outcomeNote: outcomeGuidance[outcome],
      compatibilityNote: getRoleCompatibilityNote(role, intervention),
      sources: resolveSources(guidance.sourceIds),
    };
  }, [role, unit, intervention, outcome]);

  async function copyBrief() {
    const text = [
      `# ${result.title}`,
      "",
      `Question: ${result.question}`,
      `Comparison: ${result.comparison}`,
      `Notation: ${result.notation}`,
      `Methods to consider: ${result.methods.join("; ")}.`,
      `Outcome note: ${result.outcomeNote}`,
      `Caveat: ${result.caveat}`,
      "Sources:",
      ...result.sources.map((source) => `- ${source.short}: ${source.href}`),
    ].join("\n");

    try {
      await navigator.clipboard.writeText(text);
      setCopyLabel("Copied");
      window.setTimeout(() => setCopyLabel("Copy brief"), 1800);
    } catch {
      setCopyLabel("Copy unavailable");
    }
  }

  return (
    <div class="frame-tool" data-ready={ready ? "true" : "false"}>
      <form class="frame-form" onSubmit={(event) => event.preventDefault()}>
        <ChoiceGroup legend="1. What changes?" name="role" options={roleOptions} value={role} onChange={setRole} />

        <div class="frame-select-grid">
          <label class="frame-select">
            <span>2. What is the unit?</span>
            <select value={unit} onChange={(event) => setUnit(event.currentTarget.value)}>
              {unitOptions.map((option) => <option value={option.id}>{option.label}</option>)}
            </select>
          </label>

          <label class="frame-select">
            <span>3. What happens to it?</span>
            <select value={intervention} onChange={(event) => setIntervention(event.currentTarget.value)}>
              {interventionOptions.map((option) => <option value={option.id}>{option.label}</option>)}
            </select>
          </label>

          <label class="frame-select">
            <span>4. What outcome matters?</span>
            <select value={outcome} onChange={(event) => setOutcome(event.currentTarget.value)}>
              {outcomeOptions.map((option) => <option value={option.id}>{option.label}</option>)}
            </select>
          </label>
        </div>

        {result.compatibilityNote && (
          <p class="frame-compatibility" role="status">{result.compatibilityNote}</p>
        )}
      </form>

      <section class="frame-result" aria-live="polite" aria-labelledby="frame-result-title">
        <p class="frame-result-kicker">Working study brief</p>
        <h2 id="frame-result-title">{result.title}</h2>
        <p class="frame-question">{result.question}</p>

        <dl class="frame-result-list">
          <div>
            <dt>Comparison</dt>
            <dd>{result.comparison}</dd>
          </div>
          <div>
            <dt>Compact notation</dt>
            <dd><code>{result.notation}</code></dd>
          </div>
          <div>
            <dt>Methods to consider</dt>
            <dd>{result.methods.join("; ")}.</dd>
          </div>
          <div>
            <dt>Outcome-specific check</dt>
            <dd>{result.outcomeNote}</dd>
          </div>
          <div>
            <dt>Do not overclaim</dt>
            <dd>{result.caveat}</dd>
          </div>
        </dl>

        <div class="frame-sources">
          <span>Starting sources</span>
          <ul>
            {result.sources.map((source) => (
              <li><a href={source.href} target="_blank" rel="noreferrer noopener" title={source.title}>{source.short}</a></li>
            ))}
          </ul>
        </div>

        <div class="frame-actions">
          <button type="button" class="btn" onClick={copyBrief}>{copyLabel}</button>
          <a class="btn ghost" href={result.explorerHref}>Open the matching view</a>
          <a class="frame-method-link" href="/methods">Compare method families</a>
        </div>
      </section>

      <style>{`
        .frame-tool { display:grid; grid-template-columns:minmax(0, .92fr) minmax(20rem, 1.08fr); gap:clamp(1.2rem, 4vw, 3.4rem); align-items:start; }
        .frame-form { display:grid; gap:1.5rem; }
        .frame-group { margin:0; padding:0; border:0; }
        .frame-group legend, .frame-select > span { display:block; margin:0 0 .7rem; color:var(--fg); font-family:var(--font-ui); font-size:.86rem; font-weight:700; }
        .frame-choices { display:grid; grid-template-columns:repeat(2, minmax(0,1fr)); gap:.65rem; }
        .frame-choice { position:relative; display:grid; gap:.2rem; min-height:5.3rem; padding:.9rem; border:1px solid var(--border); border-radius:var(--radius-md); background:rgba(255,250,243,.5); cursor:pointer; transition:border-color 160ms ease, background 160ms ease; }
        .frame-choice:hover { border-color:var(--border-strong); }
        .frame-choice.is-selected { border-color:rgba(47,107,111,.52); background:rgba(47,107,111,.08); }
        .frame-choice input { position:absolute; opacity:0; pointer-events:none; }
        .frame-choice:has(input:focus-visible) { outline:var(--focus-outline); outline-offset:3px; }
        .frame-choice-label { color:var(--fg); font-family:var(--font-display); font-size:1.05rem; font-weight:700; line-height:1.2; }
        .frame-choice-note { color:var(--muted); font-family:var(--font-ui); font-size:.78rem; line-height:1.45; }
        .frame-select-grid { display:grid; gap:1rem; }
        .frame-select select { width:100%; min-height:3rem; padding:.72rem .8rem; border:1px solid var(--border-strong); border-radius:var(--radius-md); background:var(--surface-strong); color:var(--fg); font:600 .92rem/1.3 var(--font-ui); }
        .frame-select select:focus-visible { outline:var(--focus-outline); outline-offset:3px; }
        .frame-compatibility { margin:0; padding:.8rem .9rem; border-left:3px solid rgba(177,79,31,.38); background:rgba(177,79,31,.06); color:var(--muted); font:500 .84rem/1.55 var(--font-ui); }
        .frame-result { position:sticky; top:6.3rem; display:grid; gap:1rem; padding:clamp(1.1rem,2.3vw,1.7rem); border:1px solid rgba(47,107,111,.24); border-top:4px solid var(--ring-thin); border-radius:var(--radius-lg); background:rgba(255,250,243,.86); }
        .frame-result-kicker { margin:0; color:var(--ring-thin); font:700 .78rem/1.3 var(--font-ui); text-transform:uppercase; letter-spacing:.06em; }
        .frame-result h2 { margin:0; font-family:var(--font-display); font-size:clamp(1.65rem,2.5vw,2.25rem); line-height:1.06; }
        .frame-question { margin:0; color:var(--fg); font-size:1.08rem; line-height:1.72; }
        .frame-result-list { display:grid; margin:0; border-top:1px solid var(--border); }
        .frame-result-list > div { display:grid; grid-template-columns:9rem minmax(0,1fr); gap:1rem; padding:.8rem 0; border-bottom:1px solid var(--border); }
        .frame-result-list dt { color:var(--muted); font:700 .78rem/1.5 var(--font-ui); }
        .frame-result-list dd { margin:0; color:var(--muted); line-height:1.6; }
        .frame-result-list code { color:var(--fg); white-space:normal; }
        .frame-sources { display:grid; gap:.4rem; color:var(--muted); font:600 .8rem/1.5 var(--font-ui); }
        .frame-sources ul { display:flex; flex-wrap:wrap; gap:.35rem .8rem; margin:0; padding:0; list-style:none; }
        .frame-sources a { color:var(--fg); }
        .frame-actions { display:flex; flex-wrap:wrap; gap:.7rem; align-items:center; }
        .frame-actions button { cursor:pointer; }
        .frame-method-link { color:var(--muted); font:600 .84rem/1.4 var(--font-ui); }
        @media (max-width:900px) { .frame-tool { grid-template-columns:1fr; } .frame-result { position:static; } }
        @media (max-width:560px) { .frame-choices { grid-template-columns:1fr; } .frame-choice { min-height:0; } .frame-result-list > div { grid-template-columns:1fr; gap:.25rem; } }
      `}</style>
    </div>
  );
}
