import { useMemo, useState } from "react";
import { interopManifestJson, interopFixtureRows } from "../domain/interopManifest.js";

function safeFileName(value) {
  const base = String(value || "plotforge")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${base || "plotforge"}-interop-manifest.json`;
}

function downloadJson(filename, json) {
  const blob = new Blob([json], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  try {
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
  } finally {
    URL.revokeObjectURL(url);
  }
}

export default function InteropPanel({ doc }) {
  const rows = useMemo(() => interopFixtureRows(doc), [doc]);
  const [exportError, setExportError] = useState("");
  const gdtfRows = rows.filter(row => row.gdtf.type === "gdtf-share").length;

  function onExportManifest() {
    setExportError("");
    try {
      downloadJson(safeFileName(doc.name), interopManifestJson(doc));
    } catch (error) {
      setExportError(error instanceof Error ? error.message : "Interop export failed");
    }
  }

  return (
    <section className="interop-panel" aria-labelledby="interop-panel-title">
      <div className="panel-header">
        <div>
          <span className="mono small">P3 1</span>
          <h3 id="interop-panel-title">Interop manifest</h3>
        </div>
        <button type="button" className="btn-compact" onClick={onExportManifest} disabled={rows.length === 0}>
          Export JSON
        </button>
      </div>

      <div className="interop-panel__summary mono small">
        <span>{rows.length} fixtures</span>
        <span>{gdtfRows} GDTF refs</span>
      </div>
      <p className="library-status library-status--warn">MVR import parser parked on sample files.</p>
      {exportError && <p className="library-status library-status--error">{exportError}</p>}
    </section>
  );
}
