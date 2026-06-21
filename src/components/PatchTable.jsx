import { useMemo, useState } from "react";
import { patchTableCsv, patchTableRows } from "../domain/patchTable.js";

function safeFileName(value) {
  const base = String(value || "plotforge")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${base || "plotforge"}-patch.csv`;
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

export default function PatchTable({ doc }) {
  const rows = useMemo(() => patchTableRows(doc), [doc]);
  const [exportError, setExportError] = useState("");
  const flaggedRows = rows.filter(row => row.hasDmxConflict || row.hasChannelConflict).length;

  function onExportCsv() {
    setExportError("");
    try {
      downloadCsv(safeFileName(doc.name), patchTableCsv(doc));
    } catch (error) {
      setExportError(error instanceof Error ? error.message : "CSV export failed");
    }
  }

  return (
    <section className="patch-panel" aria-labelledby="patch-table-title">
      <div className="panel-header">
        <div>
          <span className="mono small">P0 3</span>
          <h3 id="patch-table-title">Patch table</h3>
        </div>
        <button type="button" className="btn-compact" onClick={onExportCsv} disabled={rows.length === 0}>
          Export CSV
        </button>
      </div>

      <div className="patch-panel__summary mono small">
        <span>{rows.length} fixtures</span>
        <span className={flaggedRows ? "status-bad" : "status-ok"}>
          {flaggedRows ? `${flaggedRows} flagged` : "clear"}
        </span>
      </div>
      {exportError && <p className="library-status library-status--error">{exportError}</p>}

      <div className="patch-table-wrap">
        <table className="patch-table">
          <thead>
            <tr>
              <th scope="col">Unit</th>
              <th scope="col">Pos</th>
              <th scope="col">Type</th>
              <th scope="col">Ch</th>
              <th scope="col">DMX</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="patch-table__empty">No fixtures patched.</td>
              </tr>
            ) : rows.map(row => (
              <tr
                key={row.id}
                className={row.hasDmxConflict || row.hasChannelConflict ? "patch-table__row--flagged" : ""}
              >
                <td className="mono">{row.unitNumber ?? ""}</td>
                <td>{row.positionName}</td>
                <td>
                  <strong>{row.profileName}</strong>
                  <span>{row.mode} · {row.footprint}ch</span>
                </td>
                <td className={row.hasChannelConflict ? "status-bad mono" : "mono"}>{row.channel ?? ""}</td>
                <td>
                  <span className={row.hasDmxConflict ? "status-bad mono" : "mono"}>{row.dmxRangeLabel}</span>
                  {row.conflictLabel && <em>{row.conflictLabel}</em>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
