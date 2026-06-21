import { useCallback, useState } from "react";
import useHistory from "./useHistory.js";
import useAutosaveRecovery from "./useAutosaveRecovery.js";
import {
  newFixture,
  newPosition,
  newRevision,
  newCommentPin,
  addPosition,
  addFixture,
  addFixtureProfile,
  addRevision,
  addCommentPin,
  activateRevision,
  updateShowName,
  updateProjectMetadata,
  updateFixture,
  updateCommentPin,
  removeFixture,
  removeCommentPin,
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
import { alignFixtures, distributeFixtures } from "../domain/fixtureLayout.js";

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
  const [selectedFixtureIds, setSelectedFixtureIds] = useState([]);
  const [selectedPositionId, setSelectedPositionId] = useState(null);
  const [selectedCommentPinId, setSelectedCommentPinId] = useState(null);

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

  const onClearFixtureSelection = useCallback(() => {
    setSelectedFixtureId(null);
    setSelectedFixtureIds([]);
  }, []);

  const onSelectFixture = useCallback((id, options = {}) => {
    const fixture = doc.fixtures[id];
    if (!fixture) return;
    setSelectedCommentPinId(null);

    if (!options.additive) {
      setSelectedFixtureId(id);
      setSelectedFixtureIds([id]);
      setSelectedPositionId(fixture.positionId);
      return;
    }

    setSelectedFixtureIds(current => {
      const exists = current.includes(id);
      const next = exists ? current.filter(fixtureId => fixtureId !== id) : [...current, id];
      const nextPrimaryId = exists
        ? selectedFixtureId === id ? next[0] ?? null : selectedFixtureId
        : id;
      setSelectedFixtureId(nextPrimaryId);
      setSelectedPositionId(nextPrimaryId ? doc.fixtures[nextPrimaryId]?.positionId ?? null : null);
      return next;
    });
  }, [doc.fixtures, selectedFixtureId]);

  const onSelectPosition = useCallback((id) => {
    setSelectedPositionId(id);
    setSelectedCommentPinId(null);
    onClearFixtureSelection();
  }, [onClearFixtureSelection]);

  const onSelectCommentPin = useCallback((id) => {
    if (!doc.commentPins?.[id]) return;
    setSelectedCommentPinId(id);
    setSelectedPositionId(null);
    onClearFixtureSelection();
  }, [doc.commentPins, onClearFixtureSelection]);

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
    setSelectedCommentPinId(null);
    onClearFixtureSelection();
  }, [doc, commit, onClearFixtureSelection]);

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
    setSelectedFixtureIds([fixture.id]);
    setSelectedCommentPinId(null);
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

  const onAddCommentPin = useCallback((point) => {
    const commentPin = newCommentPin(point);
    commit(addCommentPin(doc, commentPin));
    setSelectedCommentPinId(commentPin.id);
    setSelectedPositionId(null);
    onClearFixtureSelection();
    return commentPin.id;
  }, [doc, commit, onClearFixtureSelection]);

  const onCommentPinChange = useCallback((id, patch) => {
    commit(updateCommentPin(doc, id, patch));
  }, [doc, commit]);

  const onCommentPinDelete = useCallback((id) => {
    commit(removeCommentPin(doc, id));
    setSelectedCommentPinId(current => current === id ? null : current);
  }, [doc, commit]);

  const onSetFixtureFocus = useCallback((id, focus) => {
    commit(updateFixture(doc, id, { focus }));
  }, [doc, commit]);

  const onClearFixtureFocus = useCallback((id) => {
    commit(updateFixture(doc, id, { focus: null }));
  }, [doc, commit]);

  const onAlignSelectedFixtures = useCallback((mode) => {
    const next = alignFixtures(doc, selectedFixtureIds, mode);
    if (next !== doc) commit(next);
  }, [doc, commit, selectedFixtureIds]);

  const onDistributeSelectedFixtures = useCallback(() => {
    const next = distributeFixtures(doc, selectedFixtureIds);
    if (next !== doc) commit(next);
  }, [doc, commit, selectedFixtureIds]);

  const onFixtureDelete = useCallback((id) => {
    commit(removeFixture(doc, id));
    const nextSelectedIds = selectedFixtureIds.filter(fixtureId => fixtureId !== id && doc.fixtures[fixtureId]);
    const nextPrimaryId = selectedFixtureId === id ? nextSelectedIds[0] ?? null : selectedFixtureId;
    setSelectedFixtureIds(nextSelectedIds);
    setSelectedFixtureId(nextPrimaryId);
    setSelectedPositionId(nextPrimaryId ? doc.fixtures[nextPrimaryId]?.positionId ?? null : null);
  }, [doc, commit, selectedFixtureId, selectedFixtureIds]);

  const onPositionDelete = useCallback((id) => {
    const fixtureCount = fixturesOnPosition(doc, id).length;
    if (fixtureCount > 0 && !window.confirm(`Delete this position and ${fixtureCount} fixtures?`)) return;
    commit(removePosition(doc, id));
    const nextSelectedIds = selectedFixtureIds.filter(fixtureId => doc.fixtures[fixtureId]?.positionId !== id);
    const nextPrimaryId = doc.fixtures[selectedFixtureId]?.positionId === id
      ? nextSelectedIds[0] ?? null
      : selectedFixtureId;
    setSelectedFixtureIds(nextSelectedIds);
    setSelectedFixtureId(nextPrimaryId);
    setSelectedPositionId(nextPrimaryId ? doc.fixtures[nextPrimaryId]?.positionId ?? null : null);
  }, [doc, commit, selectedFixtureId, selectedFixtureIds]);

  const onSave = useCallback(async () => {
    const r = await saveProjectFile(doc, `${doc.name.replace(/\s+/g, "_")}.plot`);
    if (!r.ok && !r.aborted) alert("Save failed.");
  }, [doc]);

  const onOpen = useCallback(async () => {
    try {
      const r = await openProjectFile();
      if (r.ok) { commit(r.doc); setSelectedPositionId(null); setSelectedCommentPinId(null); onClearFixtureSelection(); }
    } catch (e) {
      alert("Could not read that file: " + (e?.message || e));
    }
  }, [commit, onClearFixtureSelection]);

  const onRestoreDraft = useCallback(() => {
    const d = recovery.restoreDraft();
    if (d) { commit(d); setSelectedPositionId(null); setSelectedCommentPinId(null); onClearFixtureSelection(); }
  }, [recovery, commit, onClearFixtureSelection]);

  return {
    doc,
    selectedFixtureId,
    selectedFixtureIds,
    selectedPositionId,
    selectedCommentPinId,
    history,
    recovery,
    onMoveFixture,
    onSelectFixture,
    onSelectPosition,
    onSelectCommentPin,
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
    onAddCommentPin,
    onCommentPinChange,
    onCommentPinDelete,
    onSetFixtureFocus,
    onClearFixtureFocus,
    onAlignSelectedFixtures,
    onDistributeSelectedFixtures,
    onClearFixtureSelection,
    onFixtureDelete,
    onPositionDelete,
    onSave,
    onOpen,
    onRestoreDraft,
    conflicts: patchConflicts(doc),
    totalFixtures: doc.fixtureOrder.length
  };
}
