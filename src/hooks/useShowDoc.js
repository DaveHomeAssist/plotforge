import { useCallback, useState } from "react";
import useHistory from "./useHistory.js";
import useAutosaveRecovery from "./useAutosaveRecovery.js";
import {
  newPosition,
  addPosition,
  updateFixture,
  removeFixture,
  renumberPosition,
  updateVenue,
  updatePosition,
  removePosition,
  fixturesOnPosition
} from "../domain/show.js";
import { feetToMm } from "../domain/units.js";
import { saveProjectFile, openProjectFile } from "../serialization.js";
import { patchConflicts } from "../domain/patch.js";

export default function useShowDoc(seedShow) {
  const [doc, setDoc] = useState(seedShow);
  const [selectedFixtureId, setSelectedFixtureId] = useState(null);
  const [selectedPositionId, setSelectedPositionId] = useState(null);

  const history = useHistory(setDoc);
  const recovery = useAutosaveRecovery(doc);

  const commit = useCallback((next) => {
    history.push(doc, next);
    setDoc(next);
  }, [doc, history]);

  const onMoveFixture = useCallback((fixtureId, positionId, xMm) => {
    // Drag ticks bypass history so fixture movement stays responsive.
    setDoc(prev => renumberPosition(updateFixture(prev, fixtureId, { xMm }), positionId));
  }, []);

  const onSelectFixture = useCallback((id) => {
    setSelectedFixtureId(id);
    setSelectedPositionId(doc.fixtures[id]?.positionId ?? null);
  }, [doc.fixtures]);

  const onSelectPosition = useCallback((id) => {
    setSelectedPositionId(id);
    setSelectedFixtureId(null);
  }, []);

  const onAddPosition = useCallback(() => {
    const n = doc.positionOrder.length + 1;
    const position = newPosition({
      name: `POSITION ${n}`,
      kind: "pipe",
      yMm: feetToMm(-6 - doc.positionOrder.length * 3),
      lengthMm: Math.max(feetToMm(8), doc.venue.stageWidthMm - feetToMm(8)),
      trimMm: feetToMm(22)
    });
    commit(addPosition(doc, position));
    setSelectedPositionId(position.id);
    setSelectedFixtureId(null);
  }, [doc, commit]);

  const onVenueChange = useCallback((patch) => {
    commit(updateVenue(doc, patch));
  }, [doc, commit]);

  const onPositionChange = useCallback((id, patch) => {
    commit(updatePosition(doc, id, patch));
  }, [doc, commit]);

  const onFixtureChange = useCallback((id, patch) => {
    commit(updateFixture(doc, id, patch));
  }, [doc, commit]);

  const onFixtureDelete = useCallback((id) => {
    commit(removeFixture(doc, id));
    setSelectedFixtureId(null);
  }, [doc, commit]);

  const onPositionDelete = useCallback((id) => {
    const fixtureCount = fixturesOnPosition(doc, id).length;
    if (fixtureCount > 0 && !window.confirm(`Delete this position and ${fixtureCount} fixtures?`)) return;
    commit(removePosition(doc, id));
    setSelectedPositionId(null);
    setSelectedFixtureId(prev => (doc.fixtures[prev]?.positionId === id ? null : prev));
  }, [doc, commit]);

  const onSave = useCallback(async () => {
    const r = await saveProjectFile(doc, `${doc.name.replace(/\s+/g, "_")}.plot`);
    if (!r.ok && !r.aborted) alert("Save failed.");
  }, [doc]);

  const onOpen = useCallback(async () => {
    try {
      const r = await openProjectFile();
      if (r.ok) { commit(r.doc); setSelectedFixtureId(null); }
    } catch (e) {
      alert("Could not read that file: " + (e?.message || e));
    }
  }, [commit]);

  const onRestoreDraft = useCallback(() => {
    const d = recovery.restoreDraft();
    if (d) { commit(d); setSelectedFixtureId(null); }
  }, [recovery, commit]);

  return {
    doc,
    selectedFixtureId,
    selectedPositionId,
    history,
    recovery,
    onMoveFixture,
    onSelectFixture,
    onSelectPosition,
    onAddPosition,
    onVenueChange,
    onPositionChange,
    onFixtureChange,
    onFixtureDelete,
    onPositionDelete,
    onSave,
    onOpen,
    onRestoreDraft,
    conflicts: patchConflicts(doc),
    totalFixtures: doc.fixtureOrder.length
  };
}
