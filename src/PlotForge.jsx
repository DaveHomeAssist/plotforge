import PlotCanvas from "./components/PlotCanvas.jsx";
import Inspector from "./components/Inspector.jsx";
import PositionEditor from "./components/PositionEditor.jsx";
import DraftRecoveryBanner from "./components/DraftRecoveryBanner.jsx";
import useShowDoc from "./hooks/useShowDoc.js";
import { newShow, newPosition, newFixture, addPosition, addFixture } from "./domain/show.js";
import { feetToMm } from "./domain/units.js";
import "./PlotForge.css";

export function seedShow() {
  let doc = newShow({ name: "Studio A · Spike" });
  const [elec1, elec2, foh] = [
    newPosition({ name: "1ST ELEC", kind: "pipe", yMm: feetToMm(-8), lengthMm: feetToMm(28), trimMm: feetToMm(22) }),
    newPosition({ name: "2ND ELEC", kind: "pipe", yMm: feetToMm(-14), lengthMm: feetToMm(28), trimMm: feetToMm(22) }),
    newPosition({ name: "FOH TRUSS", kind: "truss", yMm: feetToMm(8), lengthMm: feetToMm(30), trimMm: feetToMm(28) })
  ];
  [elec1, elec2, foh].forEach(position => { doc = addPosition(doc, position); });
  [-12, -6, 0, 6, 12].forEach((feet, i) => {
    doc = addFixture(doc, newFixture({ positionId: elec1.id, profileId: "s4_26", xMm: feetToMm(feet), channel: 11 + i, dmx: { universe: 1, address: 41 + i * 4 }, color: "R02" }));
  });
  [-9, 0, 9].forEach((feet, i) => {
    doc = addFixture(doc, newFixture({ positionId: elec2.id, profileId: "fresnel", xMm: feetToMm(feet), channel: 31 + i, dmx: { universe: 1, address: 121 + i * 4 }, color: "R119" }));
  });
  [-10, 10].forEach((feet, i) => {
    doc = addFixture(doc, newFixture({ positionId: foh.id, profileId: "spot_mh", xMm: feetToMm(feet), channel: 201 + i, dmx: { universe: 2, address: 1 + i * 24 } }));
  });
  return doc;
}

export default function PlotForge() {
  const show = useShowDoc(seedShow);

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <strong>PlotForge</strong>
          <span className="mono small">spike · v0.1</span>
        </div>
        <nav className="topbar-actions">
          <button type="button" onClick={() => show.history.undo()} disabled={!show.history.undoN}>Undo</button>
          <button type="button" onClick={() => show.history.redo()} disabled={!show.history.redoN}>Redo</button>
          <span className="sep" />
          <button type="button" onClick={show.onOpen}>Open…</button>
          <button type="button" onClick={show.onSave} className="btn-primary">Save .plot</button>
        </nav>
      </header>

      {show.recovery.draft && (
        <DraftRecoveryBanner onRestore={show.onRestoreDraft} onDismiss={show.recovery.dismissDraft} />
      )}

      <main className="workbench">
        <PlotCanvas
          doc={show.doc}
          selectedFixtureId={show.selectedFixtureId}
          selectedPositionId={show.selectedPositionId}
          onSelectFixture={show.onSelectFixture}
          onSelectPosition={show.onSelectPosition}
          onMoveFixture={show.onMoveFixture}
        />
        <aside className="sidepanel">
          <PositionEditor
            doc={show.doc}
            selectedPositionId={show.selectedPositionId}
            onSelectPosition={show.onSelectPosition}
            onAddPosition={show.onAddPosition}
            onVenueChange={show.onVenueChange}
            onPositionChange={show.onPositionChange}
            onDeletePosition={show.onPositionDelete}
          />
          <Inspector
            doc={show.doc}
            fixtureId={show.selectedFixtureId}
            onChange={show.onFixtureChange}
            onDelete={show.onFixtureDelete}
          />
        </aside>
      </main>

      <footer className="statusbar">
        <span>{show.totalFixtures} fixtures</span>
        <span className="sep" />
        <span>{show.doc.positionOrder.length} positions</span>
        <span className="sep" />
        <span className={show.conflicts.length ? "status-bad" : "status-ok"}>
          {show.conflicts.length ? `${show.conflicts.length} DMX conflict${show.conflicts.length > 1 ? "s" : ""}` : "DMX OK"}
        </span>
        <span className="sep" />
        <span className="muted small">drag fixtures along their pipe · scroll to zoom · drag empty area to pan</span>
      </footer>
    </div>
  );
}
