import { useEffect, useMemo, useState } from "preact/hooks";
import {
  apiExplorerExamples,
  apiExplorerFieldGroups,
  runExplorerApiRequest,
} from "../lib/explorer-api.js";

const exampleEntries = [
  {
    id: "gridMatrix",
    label: "Grid matrix",
    description: "Matrix output with the poison/operator controls turned on.",
  },
  {
    id: "gridCell",
    label: "Grid cell",
    description: "One selected cell with the DP controls filled in.",
  },
  {
    id: "graphAnswer",
    label: "Graph answer",
    description: "The graph explorer's current headline answer for a strike path.",
  },
];

function prettyJson(value) {
  return JSON.stringify(value, null, 2);
}

function buildSummary(response) {
  if (!response) return [];

  if (response.response === "matrix") {
    return [
      { label: "Explorer", value: response.explorer },
      { label: "Shape", value: `${response.rowLabels.length} x ${response.columnLabels.length}` },
      { label: "Selection", value: `${response.selection.train} -> ${response.selection.eval}` },
      { label: "Headline", value: `${response.answer.label}: ${response.answer.value.toFixed(4)}` },
    ];
  }

  if (response.response === "cell") {
    return [
      { label: "Explorer", value: response.explorer },
      { label: "Train", value: response.selection.train },
      { label: "Eval", value: response.selection.eval },
      { label: "Value", value: response.value.toFixed(4) },
    ];
  }

  return [
    { label: "Explorer", value: response.explorer },
    { label: "Train", value: response.selection.train },
    { label: "Eval", value: response.selection.eval },
    { label: response.answer.label, value: response.answer.value.toFixed(4) },
  ];
}

function buildShareUrl(requestText) {
  if (typeof window === "undefined") return "";
  const url = new URL(window.location.href);
  url.searchParams.set("request", requestText);
  return url.toString();
}

export default function ApiExplorer() {
  const defaultRequestText = useMemo(() => prettyJson(apiExplorerExamples.gridMatrix), []);
  const [requestText, setRequestText] = useState(defaultRequestText);
  const [responseObject, setResponseObject] = useState(null);
  const [responseText, setResponseText] = useState("");
  const [errorText, setErrorText] = useState("");
  const [activeExampleId, setActiveExampleId] = useState("gridMatrix");
  const [copyState, setCopyState] = useState("");

  const summary = useMemo(() => buildSummary(responseObject), [responseObject]);

  const runRequest = (nextText = requestText, { updateUrl = true } = {}) => {
    try {
      const parsed = JSON.parse(nextText);
      const nextResponse = runExplorerApiRequest(parsed);
      setResponseObject(nextResponse);
      setResponseText(prettyJson(nextResponse));
      setErrorText("");
      if (updateUrl && typeof window !== "undefined") {
        const url = new URL(window.location.href);
        url.searchParams.set("request", nextText);
        window.history.replaceState({}, "", url);
      }
    } catch (error) {
      setResponseObject(null);
      setResponseText("");
      setErrorText(error instanceof Error ? error.message : "Unable to parse this request.");
    }
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const initialRequest = params.get("request") || defaultRequestText;
    setRequestText(initialRequest);
    runRequest(initialRequest, { updateUrl: false });
  }, [defaultRequestText]);

  const loadExample = (exampleId) => {
    const example = apiExplorerExamples[exampleId];
    if (!example) return;
    const nextText = prettyJson(example);
    setActiveExampleId(exampleId);
    setRequestText(nextText);
    runRequest(nextText);
  };

  const copyText = async (text, key) => {
    if (!navigator?.clipboard) return;
    await navigator.clipboard.writeText(text);
    setCopyState(key);
    window.setTimeout(() => setCopyState(""), 1200);
  };

  return (
    <div class="api-explorer" data-testid="api-explorer">
      <section class="api-hero-card">
        <div class="api-hero-copy">
          <span class="api-kicker">API explorer</span>
          <h2 class="api-title">Send the grid or graph state through one shared request body.</h2>
          <p class="api-copy">
            Paste JSON, run it in-browser, and inspect the normalized response. The request can stay flat or tuck the
            explorer controls under a nested <code>state</code> object.
          </p>
        </div>

        <div class="api-example-bank">
          {exampleEntries.map((entry) => (
            <button
              key={entry.id}
              class="api-chip"
              type="button"
              aria-pressed={activeExampleId === entry.id}
              data-testid={`api-example-${entry.id}`}
              onClick={() => loadExample(entry.id)}
              title={entry.description}
            >
              {entry.label}
            </button>
          ))}
        </div>

        <div class="api-summary-grid">
          {summary.map((item) => (
            <div class="api-summary-card" key={item.label}>
              <span class="api-summary-label">{item.label}</span>
              <span class="api-summary-value">{item.value}</span>
            </div>
          ))}
        </div>
      </section>

      <div class="api-main-grid">
        <section class="api-panel-card">
          <div class="api-panel-head">
            <div>
              <span class="api-panel-kicker">Request</span>
              <h3 class="api-panel-title">Request JSON</h3>
              <p class="api-panel-copy">
                Subset references accept labels like <code>ABC</code>, arrays like <code>["A","B","C"]</code>, or
                numeric subset indices.
              </p>
            </div>
            <div class="api-action-row">
              <button class="api-btn" type="button" data-testid="api-run" onClick={() => runRequest()}>
                Run request
              </button>
              <button
                class="api-btn secondary"
                type="button"
                onClick={() => {
                  setRequestText(defaultRequestText);
                  setActiveExampleId("gridMatrix");
                  runRequest(defaultRequestText);
                }}
              >
                Reset
              </button>
              <button
                class="api-btn secondary"
                type="button"
                onClick={() => copyText(buildShareUrl(requestText), "share")}
              >
                {copyState === "share" ? "Copied link" : "Copy link"}
              </button>
            </div>
          </div>

          <label class="api-editor-label">
            <span class="sr-only">API request JSON</span>
            <textarea
              class="api-editor"
              data-testid="api-request"
              spellCheck={false}
              value={requestText}
              onInput={(event) => setRequestText(event.currentTarget.value)}
              onKeyDown={(event) => {
                if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
                  event.preventDefault();
                  runRequest();
                }
              }}
            />
          </label>

          <div class="api-inline-note">
            Flat and nested forms both work. These requests are evaluated entirely client-side with the same toy math
            helpers the existing explorers use.
          </div>

          {errorText && (
            <div class="api-error" role="alert">
              {errorText}
            </div>
          )}
        </section>

        <aside class="api-side-rail">
          <section class="api-panel-card">
            <span class="api-panel-kicker">Supported keys</span>
            <h3 class="api-panel-title">What this request understands</h3>
            <div class="api-field-groups">
              {apiExplorerFieldGroups.map((group) => (
                <div class="api-field-group" key={group.title}>
                  <h4>{group.title}</h4>
                  <ul>
                    {group.fields.map((field) => (
                      <li key={field.name}>
                        <strong>{field.name}</strong>
                        <code>{field.type}</code>
                        <span>{field.description}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>

          <section class="api-panel-card">
            <span class="api-panel-kicker">Quick notes</span>
            <h3 class="api-panel-title">A couple of useful shortcuts</h3>
            <div class="api-notes">
              <p>
                Use <code>response: "matrix"</code> when you want the whole matrix and <code>"cell"</code> or{" "}
                <code>"answer"</code> when you only need the selected result.
              </p>
              <p>
                The grid explorer accepts the score rule <code>real</code>; the graph explorer keeps the smaller
                structural set of metrics from the current UI.
              </p>
              <p>
                In the grid explorer, <code>showSingletonEvalCols: true</code> filters the returned columns the same
                way the display toggle does on the page.
              </p>
            </div>
          </section>
        </aside>
      </div>

      <section class="api-panel-card api-response-card">
        <div class="api-panel-head">
          <div>
            <span class="api-panel-kicker">Response</span>
            <h3 class="api-panel-title">Normalized output</h3>
            <p class="api-panel-copy">
              The response echoes the resolved state, then returns either the matrix, the selected cell, or the current
              headline answer.
            </p>
          </div>
          <div class="api-action-row">
            <button
              class="api-btn secondary"
              type="button"
              disabled={!responseText}
              onClick={() => copyText(responseText, "response")}
            >
              {copyState === "response" ? "Copied JSON" : "Copy JSON"}
            </button>
          </div>
        </div>

        <pre class="api-response" data-testid="api-response">
          {responseText || "// Run a request to see the response here."}
        </pre>
      </section>
    </div>
  );
}
