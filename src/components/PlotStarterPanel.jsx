import { useMemo, useState } from "react";
import { buildPlotStarterPlan, plotStarterPrompt } from "../domain/plotStarter.js";

const DEFAULT_BRIEF = "Small musical in a 36x22 proscenium theatre. Warm front wash, clean specials, saturated backlight for dance breaks.";

const SHOW_TYPES = [
  ["musical", "Musical"],
  ["concert", "Concert"],
  ["dance", "Dance"],
  ["corporate", "Corporate"],
  ["comedy", "Comedy"],
];

const STAGE_TYPES = [
  ["proscenium", "Proscenium"],
  ["black box", "Black box"],
  ["thrust", "Thrust"],
  ["arena", "Arena"],
];

const PACKAGE_SIZES = [
  ["lean", "Lean"],
  ["standard", "Standard"],
  ["expanded", "Expanded"],
];

const INTENTS = [
  ["warm", "Warm wash and specials"],
  ["saturated", "Saturated backlight"],
  ["camera", "Camera safe front light"],
  ["concert", "High energy movement"],
];

const INTENT_BRIEFS = {
  warm: "Warm front wash, clean specials, and soft color separation.",
  saturated: "Saturated backlight, side color, and strong dance texture.",
  camera: "Flat camera safe front light, clean podium specials, and controlled backlight.",
  concert: "Bold backlight, moving texture, and a tight center vocal special.",
};

const PACKAGE_MULTIPLIER = {
  lean: 0.72,
  standard: 1,
  expanded: 1.28,
};

function wizardBrief(config) {
  const showType = SHOW_TYPES.find(([value]) => value === config.showType)?.[1] || "Musical";
  const packageLabel = PACKAGE_SIZES.find(([value]) => value === config.packageSize)?.[1] || "Standard";
  const intent = INTENT_BRIEFS[config.intent] || INTENT_BRIEFS.warm;
  return `${packageLabel} ${showType.toLowerCase()} in a ${config.widthFt}x${config.depthFt} ${config.stageType} stage. ${intent}`;
}

function scaleCount(count, packageSize, role) {
  const multiplier = PACKAGE_MULTIPLIER[packageSize] || 1;
  const min = role === "Specials" ? 1 : 2;
  const scaled = Math.max(min, Math.round(count * multiplier));
  if (role === "Specials") return scaled;
  return scaled % 2 === 0 ? scaled : scaled + 1;
}

function applyPackageSize(plan, packageSize) {
  if (packageSize === "standard") return plan;
  let nextChannel = plan.fixtureGroups[0]?.channelStart || 301;
  const fixtureGroups = plan.fixtureGroups.map(group => {
    const count = scaleCount(group.count, packageSize, group.role);
    const nextGroup = {
      ...group,
      count,
      channelStart: nextChannel,
    };
    nextChannel += count;
    return nextGroup;
  });
  return {
    ...plan,
    fixtureGroups,
    notes: [
      ...plan.notes,
      `Package size: ${PACKAGE_SIZES.find(([value]) => value === packageSize)?.[1] || "Standard"}.`,
    ],
  };
}

async function copyText(text) {
  if (!navigator.clipboard?.writeText) {
    throw new Error("Clipboard is not available.");
  }
  await navigator.clipboard.writeText(text);
}

export default function PlotStarterPanel({ doc, onApplyStarter }) {
  const [wizard, setWizard] = useState({
    showType: "musical",
    stageType: "proscenium",
    widthFt: 36,
    depthFt: 22,
    packageSize: "standard",
    intent: "warm",
  });
  const [brief, setBrief] = useState(DEFAULT_BRIEF);
  const [activeBrief, setActiveBrief] = useState(DEFAULT_BRIEF);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const plan = useMemo(() => applyPackageSize(
    buildPlotStarterPlan(doc, activeBrief),
    wizard.packageSize,
  ), [doc, activeBrief, wizard.packageSize]);
  const fixtureCount = plan.fixtureGroups.reduce((sum, group) => sum + group.count, 0);

  function updateWizard(patch) {
    const next = { ...wizard, ...patch };
    setWizard(next);
    setBrief(wizardBrief(next));
  }

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
          <span className="mono small">WIZARD</span>
          <h3 id="plot-starter-title">Plot Wizard</h3>
        </div>
        <button type="button" className="btn-compact" onClick={onCopyPrompt}>
          Copy prompt
        </button>
      </div>

      <div className="wizard-grid">
        <label>
          <span>Show type</span>
          <select value={wizard.showType} onChange={event => updateWizard({ showType: event.target.value })}>
            {SHOW_TYPES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <label>
          <span>Stage</span>
          <select value={wizard.stageType} onChange={event => updateWizard({ stageType: event.target.value })}>
            {STAGE_TYPES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <label>
          <span>Width ft</span>
          <input
            type="number"
            min="12"
            max="120"
            value={wizard.widthFt}
            onChange={event => updateWizard({ widthFt: event.target.value })}
          />
        </label>
        <label>
          <span>Depth ft</span>
          <input
            type="number"
            min="8"
            max="90"
            value={wizard.depthFt}
            onChange={event => updateWizard({ depthFt: event.target.value })}
          />
        </label>
        <label>
          <span>Package</span>
          <select value={wizard.packageSize} onChange={event => updateWizard({ packageSize: event.target.value })}>
            {PACKAGE_SIZES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <label>
          <span>Intent</span>
          <select value={wizard.intent} onChange={event => updateWizard({ intent: event.target.value })}>
            {INTENTS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
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
        <button type="button" className="btn-compact" onClick={onGenerate}>Preview plan</button>
        <button type="button" className="btn-compact" onClick={onApply}>Apply plot</button>
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
