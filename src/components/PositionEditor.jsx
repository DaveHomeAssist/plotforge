import { useId, useState } from "react";
import { fixturesOnPosition } from "../domain/show.js";
import { formatImperial, parseImperial } from "../domain/units.js";

const POSITION_KINDS = [
  ["pipe", "Pipe"],
  ["truss", "Truss"],
  ["foh", "FOH"],
  ["boom", "Boom"],
  ["cove", "Cove"],
];

function formatDraft(valueMm) {
  return valueMm == null ? "" : formatImperial(valueMm);
}

function DimensionInput({ label, valueMm, onCommit, allowEmpty = false, minMm = null }) {
  const id = useId();
  const [draft, setDraft] = useState(null);
  const value = draft ?? formatDraft(valueMm);

  const commit = () => {
    if (allowEmpty && value.trim() === "") {
      onCommit(null);
      setDraft(null);
      return;
    }

    const parsed = parseImperial(value);
    if (parsed == null || (minMm != null && parsed < minMm)) {
      setDraft(null);
      return;
    }

    onCommit(parsed);
    setDraft(null);
  };

  const restore = () => setDraft(null);

  return (
    <label htmlFor={id}>
      <span>{label}</span>
      <input
        id={id}
        type="text"
        value={value}
        onFocus={() => setDraft(formatDraft(valueMm))}
        onChange={event => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={event => {
          if (event.key === "Enter") event.currentTarget.blur();
          if (event.key === "Escape") restore();
        }}
      />
    </label>
  );
}

export default function PositionEditor({
  doc,
  selectedPositionId,
  onSelectPosition,
  onAddPosition,
  onVenueChange,
  onPositionChange,
  onDeletePosition,
}) {
  const selected = doc.positions[selectedPositionId] ?? null;
  const selectedFixtures = selected ? fixturesOnPosition(doc, selected.id) : [];

  return (
    <section className="position-editor">
      <header className="panel-header">
        <div>
          <span className="mono small">VENUE</span>
          <h3>{doc.name}</h3>
        </div>
      </header>

      <div className="panel-section field-grid">
        <DimensionInput
          label="Stage width"
          valueMm={doc.venue.stageWidthMm}
          minMm={1}
          onCommit={stageWidthMm => onVenueChange({ stageWidthMm })}
        />
        <DimensionInput
          label="Stage depth"
          valueMm={doc.venue.stageDepthMm}
          minMm={1}
          onCommit={stageDepthMm => onVenueChange({ stageDepthMm })}
        />
        <DimensionInput
          label="Prosc width"
          valueMm={doc.venue.proscWidthMm}
          minMm={1}
          onCommit={proscWidthMm => onVenueChange({ proscWidthMm })}
        />
      </div>

      <div className="panel-section">
        <div className="section-heading">
          <span className="mono small">POSITIONS</span>
          <button type="button" className="btn-compact" onClick={onAddPosition}>Add</button>
        </div>

        <div className="position-list" role="listbox" aria-label="Positions">
          {doc.positionOrder.map(positionId => {
            const position = doc.positions[positionId];
            const fixtureCount = fixturesOnPosition(doc, positionId).length;
            const active = positionId === selected?.id;
            return (
              <button
                key={positionId}
                type="button"
                className={`position-row ${active ? "position-row--active" : ""}`}
                onClick={() => onSelectPosition(positionId)}
                role="option"
                aria-selected={active}
              >
                <span>
                  <strong>{position.name}</strong>
                  <em>{POSITION_KINDS.find(([kind]) => kind === position.kind)?.[1] ?? position.kind}</em>
                </span>
                <span className="mono small">
                  {formatImperial(position.yMm)}
                  {" "}
                  {fixtureCount} fx
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {selected ? (
        <div className="panel-section selected-position">
          <div className="section-heading">
            <span className="mono small">EDIT POSITION</span>
            <span className="mono small muted">{selectedFixtures.length} fixtures</span>
          </div>

          <label>
            <span>Name</span>
            <input
              type="text"
              value={selected.name}
              onChange={event => onPositionChange(selected.id, { name: event.target.value })}
            />
          </label>

          <label>
            <span>Kind</span>
            <select
              value={selected.kind}
              onChange={event => onPositionChange(selected.id, { kind: event.target.value })}
            >
              {POSITION_KINDS.map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>

          <div className="field-grid">
            <DimensionInput
              label="Y from plaster"
              valueMm={selected.yMm}
              onCommit={yMm => onPositionChange(selected.id, { yMm })}
            />
            <DimensionInput
              label="Length"
              valueMm={selected.lengthMm}
              minMm={1}
              onCommit={lengthMm => onPositionChange(selected.id, { lengthMm })}
            />
            <DimensionInput
              label="Trim"
              valueMm={selected.trimMm}
              allowEmpty
              minMm={0}
              onCommit={trimMm => onPositionChange(selected.id, { trimMm })}
            />
          </div>

          <button
            className="btn-danger"
            type="button"
            onClick={() => onDeletePosition(selected.id)}
          >
            Delete position
          </button>
        </div>
      ) : (
        <p className="empty-note">Select a position line or add a new one.</p>
      )}
    </section>
  );
}
