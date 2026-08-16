import { useState } from "react";
import { systemFixtureIds } from "../domain/show.js";

function fixtureLabel(fixture, position) {
  const unit = fixture.unitNumber == null ? "No unit" : `Unit ${fixture.unitNumber}`;
  return `${unit} | ${position?.name ?? "No position"}`;
}

export default function SelectionTools({
  doc,
  selectedFixtureId,
  selectedFixtureIds = [],
  onAlignSelectedFixtures,
  onDistributeSelectedFixtures,
  onClearSelection,
  onSaveSystem,
  onSelectSystem,
  onDeleteSystem,
}) {
  const [systemName, setSystemName] = useState("");
  const systems = (doc.systemOrder || [])
    .map(id => doc.systems?.[id])
    .filter(Boolean);

  function saveSystem() {
    const name = systemName.trim();
    if (!name) return;
    onSaveSystem(name);
    setSystemName("");
  }
  const selectedFixtures = selectedFixtureIds
    .map(id => doc.fixtures[id])
    .filter(Boolean);
  const selectedCount = selectedFixtures.length;
  const primaryFixture = selectedFixtureId ? doc.fixtures[selectedFixtureId] : null;
  const primaryPosition = primaryFixture ? doc.positions[primaryFixture.positionId] : null;

  return (
    <section className="selection-panel">
      <header className="panel-header">
        <div>
          <span className="mono small">SELECTION</span>
          <h3>{selectedCount} fixture{selectedCount === 1 ? "" : "s"} selected</h3>
        </div>
        <button
          type="button"
          className="btn-compact"
          onClick={onClearSelection}
          disabled={!selectedCount}
        >
          Clear
        </button>
      </header>

      {primaryFixture ? (
        <p className="selection-panel__primary">
          <span className="mono small muted">Primary</span>
          <strong>{fixtureLabel(primaryFixture, primaryPosition)}</strong>
        </p>
      ) : (
        <p className="empty-note">No fixture selected.</p>
      )}

      <div className="selection-actions" aria-label="Fixture alignment controls">
        <button
          type="button"
          className="btn-compact"
          onClick={() => onAlignSelectedFixtures("left")}
          disabled={selectedCount < 2}
          aria-label="Align selected fixtures left"
        >
          Left
        </button>
        <button
          type="button"
          className="btn-compact"
          onClick={() => onAlignSelectedFixtures("center")}
          disabled={selectedCount < 2}
          aria-label="Align selected fixtures center"
        >
          Center
        </button>
        <button
          type="button"
          className="btn-compact"
          onClick={() => onAlignSelectedFixtures("right")}
          disabled={selectedCount < 2}
          aria-label="Align selected fixtures right"
        >
          Right
        </button>
        <button
          type="button"
          className="btn-compact selection-actions__wide"
          onClick={onDistributeSelectedFixtures}
          disabled={selectedCount < 3}
        >
          Distribute
        </button>
      </div>

      <div className="systems-block">
        <span className="mono small muted">SYSTEMS</span>
        <div className="systems-save">
          <input
            value={systemName}
            placeholder={selectedCount ? `Name this selection (${selectedCount})` : "Select fixtures first"}
            onChange={event => setSystemName(event.target.value)}
            onKeyDown={event => { if (event.key === "Enter") saveSystem(); }}
            disabled={!selectedCount}
            aria-label="System name"
          />
          <button
            type="button"
            className="btn-compact"
            onClick={saveSystem}
            disabled={!selectedCount || !systemName.trim()}
          >
            Save
          </button>
        </div>
        {systems.length > 0 && (
          <ul className="systems-list" aria-label="Saved systems">
            {systems.map(system => (
              <li key={system.id} className="systems-chip">
                <button
                  type="button"
                  className="systems-chip__select"
                  onClick={() => onSelectSystem(system.id)}
                  title={`Select ${system.name}`}
                >
                  {system.name}
                  <span className="mono small"> {systemFixtureIds(doc, system.id).length}</span>
                </button>
                <button
                  type="button"
                  className="systems-chip__delete"
                  onClick={() => onDeleteSystem(system.id)}
                  aria-label={`Delete system ${system.name}`}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
        <p className="muted small systems-hint">Shift+drag on the plot for marquee select.</p>
      </div>
    </section>
  );
}
