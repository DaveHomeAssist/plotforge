// PlotForge document model.
//
// Coordinate system:
//   - All distances in millimeters (integer).
//   - Origin (0, 0) is at center-line / plaster-line.
//   - +x is stage-right (audience-left).  +y is upstage.
//   - Position lines are horizontal (constant y).  Fixtures slide along x.
//
// The document is a plain JSON tree. Every mutation produces a new tree.

import { uid } from "./ids.js";
import { normalizeCircuitPatch, normalizeFixtureCircuit } from "./circuiting.js";
import { normalizeFixtureNotes } from "./fixtureNotes.js";
import { DEFAULT_FIXTURE_STATUS, normalizeFixtureStatus } from "./fixtureStatus.js";
import { defaultOscBridgeSettings, normalizeOscBridgeSettings } from "./oscBridge.js";
import { feetToMm } from "./units.js";

export const DOC_VERSION = 10;

const LABEL_SIZE_LIMITS = {
  fixtureUnitSize: [70, 220],
  fixtureChannelSize: [60, 180],
  positionLabelSize: [70, 220],
  commentLabelSize: [70, 220],
  focusLabelSize: [70, 220],
};

const LABEL_VISIBILITY_KEYS = new Set([
  "showFixtureUnit",
  "showFixtureChannel",
  "showPositionLabels",
  "showCommentText",
  "showFocusLabels",
]);

function clampNumber(value, fallback, min, max) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, Math.round(parsed)));
}

export function defaultLabelSettings() {
  return {
    fixtureUnitSize: 120,
    fixtureChannelSize: 88,
    positionLabelSize: 120,
    commentLabelSize: 105,
    focusLabelSize: 110,
    showFixtureUnit: true,
    showFixtureChannel: false,
    showPositionLabels: true,
    showCommentText: true,
    showFocusLabels: true,
  };
}

export function normalizeLabelSettings(settings = {}) {
  const defaults = defaultLabelSettings();
  const normalized = { ...defaults };

  for (const [key, [min, max]] of Object.entries(LABEL_SIZE_LIMITS)) {
    normalized[key] = clampNumber(settings[key], defaults[key], min, max);
  }

  for (const key of LABEL_VISIBILITY_KEYS) {
    if (Object.hasOwn(settings, key)) normalized[key] = Boolean(settings[key]);
  }

  return normalized;
}

export function defaultProjectMetadata() {
  return {
    drawingTitle: "Lighting Plot",
    venueName: "Studio A",
    company: "",
    designer: "",
    draftsperson: "",
    showDate: "",
    revision: "Draft",
    scaleLabel: "1/4\" = 1'-0\"",
  };
}

export function newShow({ name = "Untitled Show" } = {}) {
  return {
    version: DOC_VERSION,
    id: uid("show"),
    name,
    metadata: defaultProjectMetadata(),
    createdAt: Date.now(),
    updatedAt: Date.now(),
    venue: {
      // 36' wide x 22' deep stage.
      stageWidthMm: feetToMm(36),
      stageDepthMm: feetToMm(22),
      proscWidthMm: feetToMm(30),
      // Plaster line is at y = 0 by convention.
    },
    positions: {},      // id -> Position
    positionOrder: [],  // render/numbering order
    fixtures: {},       // id -> Fixture
    fixtureOrder: [],
    fixtureProfiles: {}, // imported fixture profiles keyed by profile id
    revisions: {},
    revisionOrder: [],
    activeRevisionId: null,
    commentPins: {},
    commentPinOrder: [],
    systems: {},            // id -> System (named selection set)
    systemOrder: [],
    revisionSnapshots: {},  // revisionId -> compact rig snapshot for diffing
    oscBridge: defaultOscBridgeSettings(),
    labelSettings: defaultLabelSettings(),
  };
}

/** System: a named selection set — how designers think ("Front Wash R02"). */
export function newSystem({ name, fixtureIds = [] }) {
  return {
    id: uid("sys"),
    name: String(name ?? "").trim() || "System",
    fixtureIds: [...new Set(fixtureIds)],
    createdAt: Date.now(),
  };
}

/** Position: a horizontal line at constant y; fixtures live on it. */
export function newPosition({ name, kind = "pipe", yMm, lengthMm, trimMm = null }) {
  return {
    id: uid("pos"),
    name,
    kind,                 // pipe | truss | foh | boom | cove
    yMm,
    lengthMm,             // total length, centered on x = 0
    trimMm,               // optional trim height (informational)
  };
}

/** Fixture: snaps to a position; xMm is along the line, yMm derives from position. */
export function newFixture({
  positionId,
  profileId,
  xMm,
  channel = null,
  dmx = null,
  color = "",
  gobo = "",
  note = "",
  notes = null,
  status = DEFAULT_FIXTURE_STATUS,
  circuit = "",
  dimmer = "",
}) {
  const layeredNotes = normalizeFixtureNotes(notes, note);
  const circuiting = normalizeFixtureCircuit({ circuit, dimmer });
  return {
    id: uid("fx"),
    positionId,
    profileId,
    xMm,
    rotation: 0,                    // degrees, 0 = pointing downstage
    focus: null,                    // { xMm, yMm } — optional focus point
    unitNumber: null,               // assigned by renumberPosition
    channel,                        // integer
    dmx,                            // { universe: int, address: int }
    color,                          // gel string, e.g. "R02"
    gobo,
    note: layeredNotes.crew,
    notes: layeredNotes,
    status: normalizeFixtureStatus(status),
    circuit: circuiting.circuit,
    dimmer: circuiting.dimmer,
  };
}

export function newRevision({ name, note = "", createdAt = Date.now() }) {
  return {
    id: uid("rev"),
    name,
    note,
    createdAt,
  };
}

export function newCommentPin({ xMm, yMm, text = "New note" }) {
  return {
    id: uid("pin"),
    xMm,
    yMm,
    text: String(text ?? "").trim() || "New note",
    createdAt: Date.now(),
  };
}

// ---------- pure mutation helpers ----------

export function addPosition(doc, position) {
  return {
    ...doc,
    updatedAt: Date.now(),
    positions: { ...doc.positions, [position.id]: position },
    positionOrder: [...doc.positionOrder, position.id],
  };
}

export function addFixture(doc, fixture) {
  const next = {
    ...doc,
    updatedAt: Date.now(),
    fixtures: { ...doc.fixtures, [fixture.id]: fixture },
    fixtureOrder: [...doc.fixtureOrder, fixture.id],
  };
  return renumberPosition(next, fixture.positionId);
}

export function addFixtureProfile(doc, profile) {
  return {
    ...doc,
    updatedAt: Date.now(),
    fixtureProfiles: { ...(doc.fixtureProfiles || {}), [profile.id]: profile },
  };
}

/**
 * Clamp an along-position coordinate to the position's physical extent.
 * Positions are centered on x = 0, so a fixture may sit anywhere in
 * [-lengthMm / 2, +lengthMm / 2]. A unit outside that range is not hung on
 * anything, so drags and typed positions are both held to the pipe.
 */
export function clampFixtureX(position, xMm) {
  if (xMm == null || !Number.isFinite(xMm)) return xMm;
  const length = Number(position?.lengthMm);
  if (!Number.isFinite(length) || length <= 0) return xMm;
  const half = length / 2;
  return Math.max(-half, Math.min(half, xMm));
}

export function updateFixture(doc, fixtureId, patch) {
  const fx = doc.fixtures[fixtureId];
  if (!fx) return doc;
  const cleanPatch = normalizeCircuitPatch(patch);
  if (Object.hasOwn(cleanPatch, "xMm")) {
    const position = doc.positions[cleanPatch.positionId ?? fx.positionId];
    cleanPatch.xMm = clampFixtureX(position, cleanPatch.xMm);
  }
  let nextFixture = { ...fx, ...cleanPatch };
  if (Object.hasOwn(cleanPatch, "note") || Object.hasOwn(cleanPatch, "notes")) {
    const notes = normalizeFixtureNotes(cleanPatch.notes ?? fx.notes, cleanPatch.note ?? fx.note);
    nextFixture = { ...nextFixture, note: notes.crew, notes };
  }
  return {
    ...doc,
    updatedAt: Date.now(),
    fixtures: { ...doc.fixtures, [fixtureId]: nextFixture },
  };
}

export function updateVenue(doc, patch) {
  return {
    ...doc,
    updatedAt: Date.now(),
    venue: { ...doc.venue, ...patch },
  };
}

export function updateShowName(doc, name) {
  return {
    ...doc,
    name,
    updatedAt: Date.now(),
  };
}

export function updateProjectMetadata(doc, patch) {
  return {
    ...doc,
    updatedAt: Date.now(),
    metadata: { ...defaultProjectMetadata(), ...(doc.metadata || {}), ...patch },
  };
}

export function updateOscBridge(doc, patch) {
  return {
    ...doc,
    updatedAt: Date.now(),
    oscBridge: normalizeOscBridgeSettings({ ...(doc.oscBridge || {}), ...patch }),
  };
}

export function updateLabelSettings(doc, patch) {
  return {
    ...doc,
    updatedAt: Date.now(),
    labelSettings: normalizeLabelSettings({ ...(doc.labelSettings || {}), ...patch }),
  };
}

export function addRevision(doc, revision) {
  return {
    ...doc,
    updatedAt: Date.now(),
    activeRevisionId: revision.id,
    revisions: { ...(doc.revisions || {}), [revision.id]: revision },
    revisionOrder: [...(doc.revisionOrder || []), revision.id],
    metadata: { ...defaultProjectMetadata(), ...(doc.metadata || {}), revision: revision.name },
  };
}

export function addCommentPin(doc, commentPin) {
  return {
    ...doc,
    updatedAt: Date.now(),
    commentPins: { ...(doc.commentPins || {}), [commentPin.id]: commentPin },
    commentPinOrder: [...(doc.commentPinOrder || []), commentPin.id],
  };
}

export function updateCommentPin(doc, commentPinId, patch) {
  const commentPin = doc.commentPins?.[commentPinId];
  if (!commentPin) return doc;
  return {
    ...doc,
    updatedAt: Date.now(),
    commentPins: {
      ...(doc.commentPins || {}),
      [commentPinId]: {
        ...commentPin,
        ...patch,
        text: Object.hasOwn(patch, "text") ? String(patch.text ?? "") : commentPin.text,
      },
    },
  };
}

export function removeCommentPin(doc, commentPinId) {
  if (!doc.commentPins?.[commentPinId]) return doc;
  const commentPins = { ...(doc.commentPins || {}) };
  delete commentPins[commentPinId];
  return {
    ...doc,
    updatedAt: Date.now(),
    commentPins,
    commentPinOrder: (doc.commentPinOrder || []).filter(id => id !== commentPinId),
  };
}

export function activateRevision(doc, revisionId) {
  const revision = doc.revisions?.[revisionId];
  if (!revision) return doc;
  return {
    ...doc,
    updatedAt: Date.now(),
    activeRevisionId: revision.id,
    metadata: { ...defaultProjectMetadata(), ...(doc.metadata || {}), revision: revision.name },
  };
}

export function updatePosition(doc, positionId, patch) {
  const position = doc.positions[positionId];
  if (!position) return doc;
  return {
    ...doc,
    updatedAt: Date.now(),
    positions: { ...doc.positions, [positionId]: { ...position, ...patch } },
  };
}

export function removePosition(doc, positionId) {
  if (!doc.positions[positionId]) return doc;

  const positions = { ...doc.positions };
  delete positions[positionId];

  const fixtures = { ...doc.fixtures };
  const fixtureOrder = [];
  doc.fixtureOrder.forEach(id => {
    if (fixtures[id]?.positionId === positionId) {
      delete fixtures[id];
      return;
    }
    fixtureOrder.push(id);
  });

  return {
    ...doc,
    updatedAt: Date.now(),
    positions,
    positionOrder: doc.positionOrder.filter(id => id !== positionId),
    fixtures,
    fixtureOrder,
  };
}

export function removeFixture(doc, fixtureId) {
  const fx = doc.fixtures[fixtureId];
  if (!fx) return doc;
  const rest = { ...doc.fixtures };
  delete rest[fixtureId];
  const next = {
    ...doc,
    updatedAt: Date.now(),
    fixtures: rest,
    fixtureOrder: doc.fixtureOrder.filter(id => id !== fixtureId),
    systems: stripFixtureFromSystems(doc.systems, fixtureId),
  };
  return renumberPosition(next, fx.positionId);
}

function stripFixtureFromSystems(systems, fixtureId) {
  if (!systems) return systems;
  let changed = false;
  const next = {};
  for (const [id, system] of Object.entries(systems)) {
    if (system.fixtureIds?.includes(fixtureId)) {
      changed = true;
      next[id] = { ...system, fixtureIds: system.fixtureIds.filter(fid => fid !== fixtureId) };
    } else {
      next[id] = system;
    }
  }
  return changed ? next : systems;
}

// ---------- systems (named selection sets) ----------

export function addSystem(doc, system) {
  return {
    ...doc,
    updatedAt: Date.now(),
    systems: { ...(doc.systems || {}), [system.id]: system },
    systemOrder: [...(doc.systemOrder || []), system.id],
  };
}

export function removeSystem(doc, systemId) {
  if (!doc.systems?.[systemId]) return doc;
  const systems = { ...(doc.systems || {}) };
  delete systems[systemId];
  return {
    ...doc,
    updatedAt: Date.now(),
    systems,
    systemOrder: (doc.systemOrder || []).filter(id => id !== systemId),
  };
}

/** Live fixture ids for a system — silently drops fixtures deleted since save. */
export function systemFixtureIds(doc, systemId) {
  const system = doc.systems?.[systemId];
  if (!system) return [];
  return (system.fixtureIds || []).filter(id => doc.fixtures[id]);
}

// ---------- revision snapshots ----------

const REVISION_SNAPSHOT_CAP = 8;

export function attachRevisionSnapshot(doc, revisionId, snapshot) {
  const snapshots = { ...(doc.revisionSnapshots || {}), [revisionId]: snapshot };
  // Cap storage: keep snapshots for the newest revisions only.
  const keep = new Set((doc.revisionOrder || []).slice(-REVISION_SNAPSHOT_CAP));
  keep.add(revisionId);
  for (const id of Object.keys(snapshots)) {
    if (!keep.has(id)) delete snapshots[id];
  }
  return { ...doc, revisionSnapshots: snapshots };
}

/**
 * Re-number fixtures on a position from stage-right to stage-left,
 * starting at 1. Stable: ties break by existing order.
 */
export function renumberPosition(doc, positionId) {
  const onPos = doc.fixtureOrder
    .map(id => doc.fixtures[id])
    .filter(fx => fx.positionId === positionId)
    .sort((a, b) => a.xMm - b.xMm || doc.fixtureOrder.indexOf(a.id) - doc.fixtureOrder.indexOf(b.id));

  if (onPos.length === 0) return doc;

  const fixtures = { ...doc.fixtures };
  onPos.forEach((fx, i) => {
    const n = i + 1;
    if (fx.unitNumber !== n) fixtures[fx.id] = { ...fx, unitNumber: n };
  });
  return { ...doc, fixtures };
}

// ---------- queries ----------

export function fixturesOnPosition(doc, positionId) {
  return doc.fixtureOrder
    .map(id => doc.fixtures[id])
    .filter(fx => fx.positionId === positionId);
}

export function commentPinRows(doc) {
  return (doc.commentPinOrder || [])
    .map(id => doc.commentPins?.[id])
    .filter(Boolean);
}
