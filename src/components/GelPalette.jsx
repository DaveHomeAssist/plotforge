import { useMemo, useState } from "react";
import { gelRollupCsv, gelRollupRows } from "../domain/gelRollup.js";

function safeFileName(value) {
  const base = String(value || "plotforge")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${base || "plotforge"}-gel-order.csv`;
}

function downloadCsv(filename, csv) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  try {
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
  } finally {
    URL.revokeObjectURL(url);
  }
}

export default function GelPalette({ doc }) {
  const rows = useMemo(() => gelRollupRows(doc), [doc]);
  const [exportError, setExportError] = useState("");
  const totalPulls = rows.reduce((sum, row) => sum + row.count, 0);

  function onExportCsv() {
    setExportError("");
    try {
      downloadCsv(safeFileName(doc.name), gelRollupCsv(doc));
    } catch (error) {
      setExportError(error instanceof Error ? error.message : "CSV export failed");
    }
  }

  return (
    <section className="gel-panel" aria-labelledby="gel-palette-title">
      <div className="panel-header">
        <div>
          <span className="mono small">P2 4</span>
          <h3 id="gel-palette-title">Gel palette</h3>
        </div>
        <button type="button" className="btn-compact" onClick={onExportCsv} disabled={rows.length === 0}>
          Export CSV
        </button>
      </div>

      <div className="gel-panel__summary mono small">
        <span>{rows.length} gel{rows.length === 1 ? "" : "s"}</span>
        <span>{totalPulls} pull{totalPulls === 1 ? "" : "s"}</span>
      </div>
      {exportError && <p className="library-status library-status--error">{exportError}</p>}

      <div className="patch-table-wrap">
        <table className="patch-table gel-table">
          <thead>
            <tr>
              <th scope="col">Gel</th>
              <th scope="col">Qty</th>
              <th scope="col">Fixtures</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={3} className="patch-table__empty">No gels assigned.</td>
              </tr>
            ) : rows.map(row => (
              <tr key={row.code}>
                <td className="mono">
                  <span className="gel-code">{row.code}</span>
                </td>
                <td className="mono">{row.count}</td>
                <td>
                  <strong>{row.fixtureLabels.join(", ")}</strong>
                  <span>{row.positionNames.join(", ")}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
