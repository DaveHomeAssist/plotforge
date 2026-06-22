import { useMemo, useState } from "react";
import { buildPlotStarterPlan, plotStarterPrompt } from "../domain/plotStarter.js";

const DEFAULT_BRIEF = "Small musical in a 36x22 proscenium theatre. Warm front wash, clean specials, saturated backlight for dance breaks.";

async function copyText(text) {
  if (!navigator.clipboard?.writeText) {
    throw new Error("Clipboard is not available.");
  }
  await navigator.clipboard.writeText(text);
}

export default function PlotStarterPanel({ doc, onApplyStarter }) {
  const [brief, setBrief] = useState(DEFAULT_BRIEF);
  const [activeBrief, setActiveBrief] = useState(DEFAULT_BRIEF);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const plan = useMemo(() => buildPlotStarterPlan(doc, activeBrief), [doc, activeBrief]);
  const fixtureCount = plan.fixtureGroups.reduce((sum, group) => sum + group.count, 0);

  function onGenerate() {
    setStatus("");
    setError("");
    setActiveBrief(brief);
  }

  function onApply() {
    setStatus("");
    setError("");
    try {
      const result = onApplyStarter(plan);
      setStatus(`Applied ${result.addedFixtureIds.length} fixtures on ${result.addedPositionIds.length} positions.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Starter apply failed.");
    }
  }

  async function onCopyPrompt() {
    setStatus("");
    setError("");
    try {
      await copyText(plotStarterPrompt(doc, plan));
      setStatus("Prompt copied.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Prompt copy failed.");
    }
  }

  return (
    <section className="plot-starter-panel" aria-labelledby="plot-starter-title">
      <div className="panel-header">
        <div>
          <span className="mono small">P3 4</span>
          <h3 id="plot-starter-title">AI plot starter</h3>
        </div>
        <button type="button" className="btn-compact" onClick={onCopyPrompt}>
          Copy prompt
        </button>
      </div>

      <label className="plot-starter-brief">
        <span>Brief</span>
        <textarea
          value={brief}
          rows={4}
          onChange={event => setBrief(event.target.value)}
        />
      </label>

      <div className="registry-actions">
        <button type="button" className="btn-compact" onClick={onGenerate}>Generate</button>
        <button type="button" className="btn-compact" onClick={onApply}>Apply starter</button>
      </div>

      <div className="plot-starter-panel__summary mono small">
        <span>{plan.productionLabel}</span>
        <span>{plan.stage.widthFt} ft by {plan.stage.depthFt} ft</span>
        <span>{fixtureCount} fixtures</span>
      </div>

      <div className="plot-starter-list">
        {plan.fixtureGroups.map(group => (
          <div className="plot-starter-row" key={`${group.positionKey}-${group.role}`}>
            <div>
              <strong>{group.role}</strong>
              <span>{group.count} x {group.profileId} · {group.color || "open color"}</span>
            </div>
            <span className="mono small">CH {group.channelStart}</span>
          </div>
        ))}
      </div>

      <p className="patch-table__empty">{plan.notes[1]}</p>
      {status && <p className="library-status">{status}</p>}
      {error && <p className="library-status library-status--error">{error}</p>}
    </section>
  );
}
