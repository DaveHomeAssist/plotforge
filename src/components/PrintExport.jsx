import { useMemo, useState } from "react";
import { getPrintPaper, PRINT_PAPER_ORDER, PRINT_PAPERS, printSheetHtml } from "../domain/printSheet.js";
import { focusChartHtml } from "../domain/focusChart.js";

function openHtmlDocument(html) {
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const opened = window.open(url, "_blank");
  if (!opened) {
    URL.revokeObjectURL(url);
    throw new Error("Print window was blocked");
  }
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}

export default function PrintExport({ doc }) {
  const [paperId, setPaperId] = useState("ansi_d");
  const [exportError, setExportError] = useState("");
  const paper = useMemo(() => getPrintPaper(paperId), [paperId]);

  function onPrint() {
    setExportError("");
    try {
      openHtmlDocument(printSheetHtml(doc, { paperId }));
    } catch (error) {
      setExportError(error instanceof Error ? error.message : "Print export failed");
    }
  }

  function onFocusCharts() {
    setExportError("");
    try {
      openHtmlDocument(focusChartHtml(doc));
    } catch (error) {
      setExportError(error instanceof Error ? error.message : "Focus chart export failed");
    }
  }

  return (
    <section className="print-export-panel" aria-labelledby="print-export-title">
      <div className="panel-header">
        <div>
          <span className="mono small">P0 4</span>
          <h3 id="print-export-title">Print export</h3>
        </div>
        <div className="print-export-actions">
          <button type="button" className="btn-compact" onClick={onPrint}>Print PDF</button>
          <button type="button" className="btn-compact" onClick={onFocusCharts}>Focus charts</button>
        </div>
      </div>

      <label>
        <span>Paper</span>
        <select value={paperId} onChange={event => setPaperId(event.target.value)}>
          {PRINT_PAPER_ORDER.map(id => (
            <option key={id} value={id}>{PRINT_PAPERS[id].label}</option>
          ))}
        </select>
      </label>

      <div className="print-export-panel__summary mono small">
        <span>{paper.widthIn} x {paper.heightIn} in</span>
        <span>{doc.fixtureOrder.length} fixtures</span>
      </div>
      {exportError && <p className="library-status library-status--error">{exportError}</p>}
    </section>
  );
}
