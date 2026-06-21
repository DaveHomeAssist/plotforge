import { useMemo } from "react";
import { conflictPanelRows } from "../domain/conflictPanel.js";

export default function ConflictPanel({ doc, onRevealFixture }) {
  const rows = useMemo(() => conflictPanelRows(doc), [doc]);

  return (
    <section className="conflict-panel" aria-labelledby="conflict-panel-title">
      <div className="panel-header">
        <div>
          <span className="mono small">P1 3</span>
          <h3 id="conflict-panel-title">Conflict panel</h3>
        </div>
        <span className={rows.length ? "status-bad mono small" : "status-ok mono small"}>
          {rows.length ? `${rows.length} open` : "clear"}
        </span>
      </div>

      {rows.length ? (
        <div className="conflict-list">
          {rows.map(row => (
            <article key={row.id} className="conflict-row">
              <div className="conflict-row__head">
                <span className="mono small">{row.kind}</span>
                <strong>{row.title}</strong>
              </div>
              <p>{row.detail}</p>
              <ul>
                {row.fixtureLabels.map((label, index) => (
                  <li key={`${row.id}-${index}`}>{label}</li>
                ))}
              </ul>
              <button type="button" className="btn-compact" onClick={() => onRevealFixture(row.fixtureIds[0])}>
                Reveal
              </button>
            </article>
          ))}
        </div>
      ) : (
        <p className="empty-note">No channel or DMX conflicts.</p>
      )}
    </section>
  );
}
