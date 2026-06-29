import { useCallback, useEffect, useState } from "react";
import { serialize } from "../serialization.js";
import {
  deleteRegistryShow,
  listRegistryShows,
  readRegistryShow,
  registryFileName,
  saveRegistryShow,
} from "../showRegistry.js";

function downloadPlot(filename, text) {
  const blob = new Blob([text], { type: "application/x-plotforge+json" });
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

async function sharePlot(doc) {
  const filename = registryFileName(doc);
  const text = serialize(doc);
  const file = typeof File === "function"
    ? new File([text], filename, { type: "application/x-plotforge+json" })
    : null;
  if (file && navigator.canShare?.({ files: [file] }) && navigator.share) {
    await navigator.share({ title: doc.name || "PlotForge show", files: [file] });
    return "Shared.";
  }
  downloadPlot(filename, text);
  return "Downloaded.";
}

function formatSavedAt(value) {
  if (!value) return "Not saved";
  return new Date(value).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function ShowRegistryPanel({ doc, onLoadShow }) {
  const [shows, setShows] = useState([]);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    setShows(await listRegistryShows());
  }, []);

  useEffect(() => {
    refresh().catch(err => setError(err instanceof Error ? err.message : "Registry load failed."));
  }, [refresh]);

  async function onSaveShow() {
    setStatus("");
    setError("");
    try {
      const record = await saveRegistryShow(doc);
      await refresh();
      setStatus(`Saved ${record.name}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registry save failed.");
    }
  }

  async function onLoadRegistryShow(id) {
    setStatus("");
    setError("");
    try {
      const record = await readRegistryShow(id);
      if (!record) throw new Error("Registry show not found.");
      onLoadShow(record.doc);
      setStatus(`Loaded ${record.name}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registry load failed.");
    }
  }

  async function onDeleteRegistryShow(id) {
    setStatus("");
    setError("");
    try {
      await deleteRegistryShow(id);
      await refresh();
      setStatus("Deleted.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registry delete failed.");
    }
  }

  async function onShareShow() {
    setStatus("");
    setError("");
    try {
      setStatus(await sharePlot(doc));
    } catch (err) {
      if (err?.name === "AbortError") return;
      setError(err instanceof Error ? err.message : "Share failed.");
    }
  }

  return (
    <section className="show-registry-panel" aria-labelledby="show-registry-title">
      <div className="panel-header">
        <div>
          <span className="mono small">P3 3</span>
          <h3 id="show-registry-title">Show registry</h3>
        </div>
        <div className="registry-actions">
          <button type="button" className="btn-compact" onClick={onSaveShow}>Save</button>
          <button type="button" className="btn-compact" onClick={onShareShow}>Share</button>
        </div>
      </div>

      <div className="show-registry-panel__summary mono small">
        <span>{shows.length} saved</span>
        <span>{doc.fixtureOrder.length} fixtures</span>
      </div>

      <div className="registry-list">
        {shows.length === 0 ? (
          <p className="patch-table__empty">No saved shows.</p>
        ) : shows.map(show => (
          <div className="registry-row" key={show.id}>
            <div>
              <strong>{show.name}</strong>
              <span>{show.fixtureCount} fixtures · {show.positionCount} positions · {formatSavedAt(show.savedAt)}</span>
            </div>
            <div className="registry-row__actions">
              <button type="button" className="btn-compact" onClick={() => onLoadRegistryShow(show.id)}>Load</button>
              <button type="button" className="btn-compact" onClick={() => onDeleteRegistryShow(show.id)}>Delete</button>
            </div>
          </div>
        ))}
      </div>

      {status && <p className="library-status">{status}</p>}
      {error && <p className="library-status library-status--error">{error}</p>}
    </section>
  );
}
