import { useMemo, useState } from "react";
import { changeListText } from "../domain/revisionDiff.js";

/**
 * "What changed since Rev B" — pick any revision with a snapshot, see the
 * change counts and list, toggle ghost markers on the plot, copy the crew
 * change list. Snapshots are captured automatically when a revision is added.
 */
export default function RevisionDiffPanel({ doc, diff, diffRevisionId, onPickRevision, showGhosts, onToggleGhosts }) {
  const [copied, setCopied] = useState("");
  const candidates = useMemo(
    () => (doc.revisionOrder || [])
      .filter(id => doc.revisionSnapshots?.[id])
      .map(id => doc.revisions[id])
      .filter(Boolean)
      .reverse(),
    [doc.revisionOrder, doc.revisionSnapshots, doc.revisions],
  );

  const revision = diffRevisionId ? doc.revisions?.[diffRevisionId] : null;

  async function copyList() {
    setCopied("");
    const snapshot = doc.revisionSnapshots?.[diffRevisionId];
    if (!snapshot) return;
    try {
      await navigator.clipboard.writeText(changeListText(doc, snapshot, revision?.name ?? "revision"));
      setCopied("Change list copied.");
    } catch {
      setCopied("Copy failed — clipboard unavailable.");
    }
  }

  const label = (fixtureId) => {
    const fx = doc.fixtures[fixtureId];
    if (!fx) return fixtureId;
    const pos = doc.positions[fx.positionId];
    return `${pos?.name ?? "?"} U${fx.unitNumber ?? "?"}`;
  };

  return (
    <section className="revdiff-panel" aria-labelledby="revdiff-title">
      <div className="panel-header">
        <div>
          <span className="mono small">SINCE REVISION</span>
          <h3 id="revdiff-title">Rig changes</h3>
        </div>
        <label className="revdiff-ghost-toggle mono small">
          <input type="checkbox" checked={showGhosts} onChange={event => onToggleGhosts(event.target.checked)} disabled={!diff} />
          Ghosts on plot
        </label>
      </div>

      {candidates.length === 0 ? (
        <p className="empty-note">Add a revision in Setup — every new revision snapshots the rig for diffing.</p>
      ) : (
        <>
          <select
            className="revdiff-select"
            value={diffRevisionId ?? ""}
            onChange={event => onPickRevision(event.target.value || null)}
            aria-label="Compare against revision"
          >
            <option value="">Compare against…</option>
            {candidates.map(rev => (
              <option key={rev.id} value={rev.id}>{rev.name}</option>
            ))}
          </select>

          {diff && (
            <>
              <div className="revdiff-counts mono small">
                <span>+{diff.summary.added} added</span>
                <span>−{diff.summary.removed} removed</span>
                <span>→{diff.summary.moved} moved</span>
                <span>~{diff.summary.repatched} repatch</span>
                <span>~{diff.summary.regelled} gel</span>
              </div>
              {diff.summary.total === 0 ? (
                <p className="empty-note">No rig changes since {revision?.name}.</p>
              ) : (
                <ul className="revdiff-list">
                  {diff.added.map(entry => <li key={`a${entry.fixtureId}`}><b className="revdiff-add">+</b> {label(entry.fixtureId)}</li>)}
                  {diff.removed.map(entry => <li key={`r${entry.fixtureId}`}><b className="revdiff-del">−</b> {entry.positionName} U{entry.unitNumber ?? "?"}</li>)}
                  {diff.moved.map(entry => <li key={`m${entry.fixtureId}`}><b className="revdiff-mov">→</b> {label(entry.fixtureId)} {entry.positionChanged ? "moved position" : `${entry.deltaMm} mm`}</li>)}
                  {diff.repatched.map(entry => <li key={`p${entry.fixtureId}`}><b className="revdiff-mov">~</b> {label(entry.fixtureId)} ch {entry.from.channel ?? "—"}→{entry.to.channel ?? "—"}</li>)}
                  {diff.regelled.map(entry => <li key={`g${entry.fixtureId}`}><b className="revdiff-mov">~</b> {label(entry.fixtureId)} {entry.from || "open"}→{entry.to || "open"}</li>)}
                </ul>
              )}
              <button type="button" className="btn-compact" onClick={copyList} disabled={diff.summary.total === 0}>
                Copy change list
              </button>
              {copied && <p className="library-status">{copied}</p>}
            </>
          )}
        </>
      )}
    </section>
  );
}
