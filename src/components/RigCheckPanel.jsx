import { useMemo, useState } from "react";
import { rigCheckOrder, rigCheckSummary, nextRigCheckFixture, previousRigCheckFixture } from "../domain/rigCheck.js";
import { FIXTURE_STATUS_OPTIONS } from "../domain/fixtureStatus.js";
import { normalizeOscBridgeSettings, oscBridgeRoutes } from "../domain/oscBridge.js";
import { sendOscRoute } from "../oscSend.js";

/**
 * Rig Check: the morning channel check as a guided walk. Each step selects the
 * unit on the plot and (when the relay is up) fires its OSC select route at
 * the console; one tap records the status, which lands on the plot, patch
 * table, and CSV. Works fully offline — OSC failures never block the walk.
 */
export default function RigCheckPanel({ doc, selectedFixtureId, onRevealFixture, onFixtureChange }) {
  const [active, setActive] = useState(false);
  const [oscStatus, setOscStatus] = useState("");
  const bridge = useMemo(() => normalizeOscBridgeSettings(doc.oscBridge), [doc.oscBridge]);
  const routes = useMemo(() => oscBridgeRoutes(doc, { bridge }), [doc, bridge]);
  const summary = useMemo(() => rigCheckSummary(doc), [doc]);
  const order = useMemo(() => rigCheckOrder(doc), [doc]);

  const currentId = selectedFixtureId && order.includes(selectedFixtureId) ? selectedFixtureId : null;
  const current = currentId ? doc.fixtures[currentId] : null;
  const currentPosition = current ? doc.positions[current.positionId] : null;

  async function visit(fixtureId) {
    if (!fixtureId) return;
    onRevealFixture(fixtureId);
    const route = routes.find(r => r.fixtureId === fixtureId && r.purpose === "select");
    if (!route) return;
    try {
      await sendOscRoute({ relayUrl: bridge.relayUrl, route, timeoutMs: 1200 });
      setOscStatus("console linked");
    } catch {
      setOscStatus("offline — statuses still recorded");
    }
  }

  function start() {
    setActive(true);
    setOscStatus("");
    visit(currentId ?? nextRigCheckFixture(doc, null));
  }

  function markAndAdvance(statusId) {
    if (!currentId) return;
    onFixtureChange(currentId, { status: statusId });
    // Advance against the doc as it will be after the status lands.
    const nextDoc = {
      ...doc,
      fixtures: { ...doc.fixtures, [currentId]: { ...doc.fixtures[currentId], status: statusId } },
    };
    visit(nextRigCheckFixture(nextDoc, currentId));
  }

  const pct = summary.total ? Math.round((summary.checked / summary.total) * 100) : 0;

  return (
    <section className="rigcheck-panel" aria-labelledby="rigcheck-title">
      <div className="panel-header">
        <div>
          <span className="mono small">CHANNEL CHECK</span>
          <h3 id="rigcheck-title">Rig check</h3>
        </div>
        {active ? (
          <button type="button" className="btn-compact" onClick={() => setActive(false)}>Stop</button>
        ) : (
          <button type="button" className="btn-compact" onClick={start} disabled={!summary.total}>Start</button>
        )}
      </div>

      <div className="rigcheck-progress" role="progressbar" aria-valuenow={summary.checked} aria-valuemin={0} aria-valuemax={summary.total} aria-label="Rig check progress">
        <span className="rigcheck-progress__fill" style={{ width: `${pct}%` }} />
      </div>
      <p className="rigcheck-progress__text mono small">
        {summary.checked}/{summary.total} checked{oscStatus ? ` · ${oscStatus}` : ""}
      </p>

      {active && (
        <>
          <div className="rigcheck-current">
            {current ? (
              <>
                <strong>{currentPosition?.name ?? "?"} · U{current.unitNumber ?? "?"}</strong>
                <span className="mono small">{current.channel != null ? `ch ${current.channel}` : "unpatched"}{current.dmx ? ` · ${current.dmx.universe}/${current.dmx.address}` : ""}</span>
              </>
            ) : (
              <span className="mono small">Pick a unit or press Next.</span>
            )}
          </div>

          <div className="rigcheck-status-row" aria-label="Mark fixture status">
            {FIXTURE_STATUS_OPTIONS.filter(status => status.id !== "planned").map(status => (
              <button
                key={status.id}
                type="button"
                className="btn-compact"
                disabled={!currentId}
                onClick={() => markAndAdvance(status.id)}
              >
                {status.label}
              </button>
            ))}
          </div>

          <div className="rigcheck-nav" aria-label="Walk controls">
            <button type="button" className="btn-compact" onClick={() => visit(previousRigCheckFixture(doc, currentId))}>← Prev</button>
            <button type="button" className="btn-compact" onClick={() => visit(nextRigCheckFixture(doc, currentId))}>Next →</button>
            <button type="button" className="btn-compact" disabled={!currentId} onClick={() => visit(currentId)}>Resend OSC</button>
          </div>
        </>
      )}
    </section>
  );
}
