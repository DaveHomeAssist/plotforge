import { useCallback, useState } from "react";
import useHistory from "./useHistory.js";
import useAutosaveRecovery from "./useAutosaveRecovery.js";
import {
  newFixture,
  newPosition,
  newRevision,
  addPosition,
  addFixture,
  addFixtureProfile,
  addRevision,
  activateRevision,
  updateShowName,
  updateProjectMetadata,
  updateFixture,
  removeFixture,
  renumberPosition,
  updateVenue,
  updatePosition,
  removePosition,
  fixturesOnPosition
} from "../domain/show.js";
import { feetToMm } from "../domain/units.js";
import { getProfile, normalizeOpenFixtureLibraryProfile } from "../domain/profiles.js";
import { saveProjectFile, openProjectFile } from "../serialization.js";
import { patchConflicts } from "../domain/patch.js";

function clamp(value, min, max) {
  return Math.max(min, Math.min(value, max));
}

function nextFixtureX(doc, positionId) {
  const position = doc.positions[positionId];
  if (!position) return 0;
  const marginMm = feetToMm(2);
  const spacingMm = feetToMm(3);
  const minX = -position.lengthMm / 2 + marginMm;
  const maxX = position.lengthMm / 2 - marginMm;
  const nextX = minX + fixturesOnPosition(doc, positionId).length * spacingMm;
  return Math.round(clamp(nextX, minX, maxX));
}

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

  const onAddFixture = useCallback((positionId, profileId) => {
    const position = doc.positions[positionId];
    const profile = getProfile(profileId, doc.fixtureProfiles);
    if (!position || !profile) return null;

    const fixture = newFixture({
      positionId,
      profileId,
      xMm: nextFixtureX(doc, positionId),
    });

    commit(addFixture(doc, fixture));
    setSelectedPositionId(positionId);
    setSelectedFixtureId(fixture.id);
    return fixture.id;
  }, [doc, commit]);

  const onImportOpenFixtureLibraryProfile = useCallback((oflFixture, options = {}) => {
    try {
      const profile = normalizeOpenFixtureLibraryProfile(oflFixture, options);
      commit(addFixtureProfile(doc, profile));
      return { ok: true, profile };
    } catch (error) {
      return { ok: false, error };
    }
  }, [doc, commit]);

  const onVenueChange = useCallback((patch) => {
    commit(updateVenue(doc, patch));
  }, [doc, commit]);

  const onShowNameChange = useCallback((name) => {
    commit(updateShowName(doc, name));
  }, [doc, commit]);

  const onProjectMetadataChange = useCallback((patch) => {
    commit(updateProjectMetadata(doc, patch));
  }, [doc, commit]);

  const onAddRevision = useCallback(({ name, note }) => {
    const revision = newRevision({ name, note });
    commit(addRevision(doc, revision));
    return revision.id;
  }, [doc, commit]);

  const onActivateRevision = useCallback((revisionId) => {
    commit(activateRevision(doc, revisionId));
  }, [doc, commit]);

  const onPositionChange = useCallback((id, patch) => {
    commit(updatePosition(doc, id, patch));
  }, [doc, commit]);

  const onFixtureChange = useCallback((id, patch) => {
    const current = doc.fixtures[id];
    const next = updateFixture(doc, id, patch);
    const positionId = patch.positionId ?? current?.positionId;
    commit(patch.xMm == null || positionId == null ? next : renumberPosition(next, positionId));
  }, [doc, commit]);

  const onSetFixtureFocus = useCallback((id, focus) => {
    commit(updateFixture(doc, id, { focus }));
  }, [doc, commit]);

  const onClearFixtureFocus = useCallback((id) => {
    commit(updateFixture(doc, id, { focus: null }));
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
    onAddFixture,
    onImportOpenFixtureLibraryProfile,
    onVenueChange,
    onShowNameChange,
    onProjectMetadataChange,
    onAddRevision,
    onActivateRevision,
    onPositionChange,
    onFixtureChange,
    onSetFixtureFocus,
    onClearFixtureFocus,
    onFixtureDelete,
    onPositionDelete,
    onSave,
    onOpen,
    onRestoreDraft,
    conflicts: patchConflicts(doc),
    totalFixtures: doc.fixtureOrder.length
  };
}
