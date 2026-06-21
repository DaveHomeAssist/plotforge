import { useMemo } from "react";
import { circuitSummary, circuitDisplay } from "../domain/circuiting.js";

export default function CircuitPanel({ doc }) {
  const summary = useMemo(() => circuitSummary(doc), [doc]);
  const issueCount = summary.missingCount + summary.partialCount + summary.sharedCount;

  return (
    <section className="circuit-panel" aria-labelledby="circuit-panel-title">
      <div className="panel-header">
        <div>
          <span className="mono small">P2 5</span>
          <h3 id="circuit-panel-title">Circuit check</h3>
        </div>
      </div>

      <div className="circuit-panel__summary mono small">
        <span>{summary.assignedCount}/{summary.totalFixtures} assigned</span>
        <span className={issueCount ? "status-bad" : "status-ok"}>
          {issueCount ? `${issueCount} check${issueCount === 1 ? "" : "s"}` : "clear"}
        </span>
      </div>

      <div className="circuit-panel__issues small">
        <span>{summary.missingCount} unassigned</span>
        <span>{summary.partialCount} partial</span>
        <span>{summary.sharedCount} shared</span>
      </div>

      <div className="patch-table-wrap">
        <table className="patch-table circuit-table">
          <thead>
            <tr>
              <th scope="col">Circuit</th>
              <th scope="col">Dimmer</th>
              <th scope="col">Fixtures</th>
            </tr>
          </thead>
          <tbody>
            {summary.rows.length === 0 ? (
              <tr>
                <td colSpan={3} className="patch-table__empty">No circuit or dimmer assignments.</td>
              </tr>
            ) : summary.rows.map(row => (
              <tr key={row.key} className={row.isPartial || row.isShared ? "patch-table__row--flagged" : ""}>
                <td className="mono">{row.circuit || ""}</td>
                <td className="mono">{row.dimmer || ""}</td>
                <td>
                  <strong>{circuitDisplay(row)}</strong>
                  <span>{row.fixtureLabels.join(", ")}</span>
                  {row.isShared && <em>Shared by {row.fixtureIds.length} fixtures</em>}
                  {row.isPartial && <em>Missing {row.circuit ? "dimmer" : "circuit"}</em>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
