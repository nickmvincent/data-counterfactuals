import { useEffect, useMemo, useState } from "preact/hooks";
import { postTrainingExplorerStyles } from "./postTrainingExplorerStyles.js";
import {
  buildPostTrainingModel,
  findPostTrainingOption,
  formatPostTrainingPercent,
  governanceOptions,
  interventionOptions,
  signalOptions,
} from "../lib/post-training-model.js";

function PostTrainingExplorer() {
  const [hydrated, setHydrated] = useState(false);
  const [signalId, setSignalId] = useState("preferences");
  const [interventionId, setInterventionId] = useState("include");
  const [governanceId, setGovernanceId] = useState("licensed");
  const [participation, setParticipation] = useState(85);

  useEffect(() => {
    setHydrated(true);
  }, []);

  const signal = findPostTrainingOption(signalOptions, signalId);
  const intervention = findPostTrainingOption(interventionOptions, interventionId);
  const governance = findPostTrainingOption(governanceOptions, governanceId);

  const model = useMemo(
    () => buildPostTrainingModel({ signal, intervention, governance, participation }),
    [signal, intervention, governance, participation],
  );

  return (
    <section
      class="post-training-explorer"
      data-testid="post-training-explorer"
      data-ready={hydrated ? "true" : "false"}
      aria-label="Post-training human data value explorer"
    >
      <style>{postTrainingExplorerStyles}</style>

      <header class="pt-intro">
        <h2>Mock worked example: one possible future explorer.</h2>
        <p>
          These numbers are invented. The point is to show the categories a calibrated tool might
          eventually expose, not to estimate the value of any real dataset or feedback source, and
          not to imply that these stages already share an exchangeable value scale.
        </p>
      </header>

      <form class="pt-controls" aria-label="Post-training counterfactual controls">
        <fieldset>
          <legend>Signal</legend>
          <div class="pt-token-grid">
            {signalOptions.map((option) => (
              <button
                type="button"
                class={`pt-token ${option.id === signalId ? "active" : ""}`}
                aria-pressed={option.id === signalId}
                onClick={() => setSignalId(option.id)}
              >
                <span>{option.short}</span>
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend>Intervention</legend>
          <div class="pt-token-grid">
            {interventionOptions.map((option) => (
              <button
                type="button"
                class={`pt-token ${option.id === interventionId ? "active" : ""}`}
                aria-pressed={option.id === interventionId}
                onClick={() => setInterventionId(option.id)}
              >
                <span>{option.label}</span>
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend>Governance state</legend>
          <select value={governanceId} onInput={(event) => setGovernanceId(event.currentTarget.value)}>
            {governanceOptions.map((option) => (
              <option value={option.id}>{option.label}</option>
            ))}
          </select>
        </fieldset>

        <fieldset>
          <legend>Participation weight: {participation}%</legend>
          <input
            type="range"
            min="20"
            max="140"
            step="5"
            value={participation}
            onInput={(event) => setParticipation(Number(event.currentTarget.value))}
          />
        </fieldset>
      </form>

      <section class="pt-selected-signal" aria-label="Selected signal">
        <h3>{signal.label}</h3>
        <p>{signal.description}</p>
        <code>{signal.formula}</code>
      </section>

      <section class="pt-main" aria-label="Post-training readout">
        <div class="pt-pipeline">
          <h3>Pipeline</h3>
          <div class="pt-table-wrap">
            <table>
              <thead>
                <tr>
                  <th scope="col">Stage</th>
                  <th scope="col">Role</th>
                  <th scope="col">Toy score</th>
                </tr>
              </thead>
              <tbody>
                {model.stageScores.map((stage) => (
                  <tr>
                    <th scope="row">
                      <span>{stage.label}</span>
                      <small>{stage.description}</small>
                    </th>
                    <td>{stage.verb}</td>
                    <td>
                      <span class="pt-value-text">{formatPostTrainingPercent(stage.score)}</span>
                      <span class="pt-bar" aria-hidden="true">
                        <span style={`width: ${formatPostTrainingPercent(stage.score)}`}></span>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <aside class="pt-readout" aria-label="Post-training value readout">
          <h3>{intervention.label}: {signal.short}</h3>
          <p>{intervention.description}</p>
          <p>{governance.note}</p>

          <dl class="pt-metric-list">
            {model.metrics.map((metric) => (
              <div class="pt-metric">
                <dt>
                  <span>{metric.label}</span>
                  <strong>{formatPostTrainingPercent(metric.value)}</strong>
                </dt>
                <dd>
                  <span class="pt-bar pt-bar-metric" aria-hidden="true">
                    <span style={`width: ${formatPostTrainingPercent(metric.value)}`}></span>
                  </span>
                  <p>{metric.body}</p>
                </dd>
              </div>
            ))}
          </dl>

          <p class="pt-takeaway">{model.summary}</p>
        </aside>
      </section>
    </section>
  );
}

export default PostTrainingExplorer;
