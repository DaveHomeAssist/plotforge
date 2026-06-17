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
import { feetToMm } from "./units.js";

export const DOC_VERSION = 1;

export function newShow({ name = "Untitled Show" } = {}) {
  return {
    version: DOC_VERSION,
    id: uid("show"),
    name,
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
export function newFixture({ positionId, profileId, xMm, channel = null, dmx = null, color = "", note = "" }) {
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
    gobo: "",
    note,
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

export function updateFixture(doc, fixtureId, patch) {
  const fx = doc.fixtures[fixtureId];
  if (!fx) return doc;
  return {
    ...doc,
    updatedAt: Date.now(),
    fixtures: { ...doc.fixtures, [fixtureId]: { ...fx, ...patch } },
  };
}

export function updateVenue(doc, patch) {
  return {
    ...doc,
    updatedAt: Date.now(),
    venue: { ...doc.venue, ...patch },
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
  };
  return renumberPosition(next, fx.positionId);
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
