import { useMemo, useState } from "react";
import {
  normalizeOscBridgeSettings,
  oscBridgeManifestJson,
  oscBridgeRoutes,
} from "../domain/oscBridge.js";

function safeFileName(value) {
  const base = String(value || "plotforge")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${base || "plotforge"}-osc-bridge.json`;
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

function sendOscRoute({ relayUrl, route }) {
  return new Promise((resolve, reject) => {
    if (!route) {
      reject(new Error("Select a fixture before sending OSC."));
      return;
    }
    if (!window.WebSocket) {
      reject(new Error("WebSocket is not available in this browser."));
      return;
    }

    const socket = new WebSocket(relayUrl);
    const timer = window.setTimeout(() => {
      socket.close();
      reject(new Error("OSC relay timed out."));
    }, 2500);

    socket.addEventListener("open", () => {
      socket.send(JSON.stringify({
        address: route.address,
        args: route.args,
        targetHost: route.targetHost,
        targetPort: route.targetPort,
      }));
    }, { once: true });

    socket.addEventListener("message", (event) => {
      window.clearTimeout(timer);
      socket.close();
      resolve(event.data);
    }, { once: true });

    socket.addEventListener("error", () => {
      window.clearTimeout(timer);
      reject(new Error("OSC relay connection failed."));
    }, { once: true });
  });
}

export default function OscBridgePanel({ doc, selectedFixtureId, onBridgeChange }) {
  const bridge = useMemo(() => normalizeOscBridgeSettings(doc.oscBridge), [doc.oscBridge]);
  const routes = useMemo(() => oscBridgeRoutes(doc, { bridge }), [doc, bridge]);
  const selectedRoute = routes.find(route => route.fixtureId === selectedFixtureId && route.purpose === "select");
  const fixtureCount = new Set(routes.map(route => route.fixtureId)).size;
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  function onExportManifest() {
    setStatus("");
    setError("");
    try {
      downloadJson(safeFileName(doc.name), oscBridgeManifestJson(doc, { bridge }));
      setStatus("Export ready.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "OSC export failed.");
    }
  }

  async function onSendSelected() {
    setStatus("Sending selected fixture.");
    setError("");
    try {
      await sendOscRoute({ relayUrl: bridge.relayUrl, route: selectedRoute });
      setStatus("OSC sent.");
    } catch (err) {
      setStatus("");
      setError(err instanceof Error ? err.message : "OSC send failed.");
    }
  }

  return (
    <section className="osc-bridge-panel" aria-labelledby="osc-bridge-title">
      <div className="panel-header">
        <div>
          <span className="mono small">P3 2</span>
          <h3 id="osc-bridge-title">OSC bridge</h3>
        </div>
        <button type="button" className="btn-compact" onClick={onExportManifest} disabled={routes.length === 0}>
          Export JSON
        </button>
      </div>

      <div className="osc-bridge-panel__summary mono small">
        <span>{fixtureCount} fixtures</span>
        <span>{routes.length} routes</span>
      </div>

      <div className="osc-bridge-fields">
        <label>
          <span>Namespace</span>
          <input
            value={bridge.namespace}
            onChange={event => onBridgeChange({ namespace: event.target.value })}
          />
        </label>
        <label>
          <span>Relay URL</span>
          <input
            value={bridge.relayUrl}
            onChange={event => onBridgeChange({ relayUrl: event.target.value })}
          />
        </label>
        <label>
          <span>Target host</span>
          <input
            value={bridge.targetHost}
            onChange={event => onBridgeChange({ targetHost: event.target.value })}
          />
        </label>
        <label>
          <span>Target port</span>
          <input
            inputMode="numeric"
            value={bridge.targetPort}
            onChange={event => onBridgeChange({ targetPort: event.target.value })}
          />
        </label>
      </div>

      <button type="button" className="btn-compact" onClick={onSendSelected} disabled={!selectedRoute}>
        Send selected
      </button>

      <div className="osc-route-list mono small" aria-label="OSC routes">
        {routes.slice(0, 5).map(route => (
          <div key={`${route.address}-${route.purpose}`} className="osc-route-row">
            <span>{route.purpose}</span>
            <code>{route.address}</code>
          </div>
        ))}
      </div>

      {status && <p className="library-status library-status--ok">{status}</p>}
      {error && <p className="library-status library-status--error">{error}</p>}
    </section>
  );
}
