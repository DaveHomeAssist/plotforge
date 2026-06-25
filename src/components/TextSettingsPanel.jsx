import { normalizeLabelSettings } from "../domain/show.js";

const SIZE_FIELDS = [
  ["fixtureUnitSize", "Unit size", 70, 220],
  ["fixtureChannelSize", "Channel size", 60, 180],
  ["positionLabelSize", "Position size", 70, 220],
  ["commentLabelSize", "Comment size", 70, 220],
  ["focusLabelSize", "Focus size", 70, 220],
];

const VISIBILITY_FIELDS = [
  ["showFixtureUnit", "Unit labels"],
  ["showFixtureChannel", "Channel labels"],
  ["showPositionLabels", "Position labels"],
  ["showCommentText", "Comment text"],
  ["showFocusLabels", "Focus labels"],
];

function TextSizeControl({ settingKey, label, min, max, value, onChange }) {
  const id = `text-setting-${settingKey}`;
  const commit = nextValue => onChange({ [settingKey]: Number(nextValue) });

  return (
    <div className="text-size-control">
      <label htmlFor={id}>
        <span>{label}</span>
        <input
          id={id}
          type="range"
          min={min}
          max={max}
          step="5"
          value={value}
          onChange={event => commit(event.target.value)}
        />
      </label>
      <input
        type="number"
        min={min}
        max={max}
        step="5"
        value={value}
        aria-label={`${label} value`}
        onChange={event => commit(event.target.value)}
      />
    </div>
  );
}

export default function TextSettingsPanel({ doc, onChange }) {
  const settings = normalizeLabelSettings(doc.labelSettings || {});

  return (
    <section className="text-settings-panel" aria-labelledby="text-settings-title">
      <div className="panel-header">
        <div>
          <span className="mono small">TEXT</span>
          <h3 id="text-settings-title">Label controls</h3>
        </div>
        <span className="mono small">{settings.fixtureUnitSize}px unit</span>
      </div>

      <div className="text-toggle-grid" aria-label="Visible labels">
        {VISIBILITY_FIELDS.map(([key, label]) => (
          <label key={key} className="toggle-row">
            <input
              type="checkbox"
              checked={settings[key]}
              onChange={event => onChange({ [key]: event.target.checked })}
            />
            <span>{label}</span>
          </label>
        ))}
      </div>

      <div className="text-size-grid">
        {SIZE_FIELDS.map(([key, label, min, max]) => (
          <TextSizeControl
            key={key}
            settingKey={key}
            label={label}
            min={min}
            max={max}
            value={settings[key]}
            onChange={onChange}
          />
        ))}
      </div>
    </section>
  );
}
