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
}) {
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
    </section>
  );
}
