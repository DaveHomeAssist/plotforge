// Rig-check walk: the morning channel check as a guided sequence.
// Pure helpers only — the panel owns transport (OSC send) and UI state.

import { FIXTURE_STATUS_OPTIONS, DEFAULT_FIXTURE_STATUS } from "./fixtureStatus.js";

/**
 * Walk order for a channel check: positions in document order, units
 * stage-right to stage-left within each (matches unit numbering).
 */
export function rigCheckOrder(doc) {
  return doc.positionOrder.flatMap(positionId =>
    doc.fixtureOrder
      .map(id => doc.fixtures[id])
      .filter(fx => fx && fx.positionId === positionId)
      .sort((a, b) => a.xMm - b.xMm || doc.fixtureOrder.indexOf(a.id) - doc.fixtureOrder.indexOf(b.id))
      .map(fx => fx.id));
}

/** A fixture counts as checked once its status has left "planned". */
export function isChecked(fixture) {
  return Boolean(fixture) && fixture.status !== DEFAULT_FIXTURE_STATUS;
}

export function rigCheckSummary(doc) {
  const order = rigCheckOrder(doc);
  const counts = Object.fromEntries(FIXTURE_STATUS_OPTIONS.map(status => [status.id, 0]));
  let checked = 0;
  for (const id of order) {
    const fixture = doc.fixtures[id];
    if (!fixture) continue;
    counts[fixture.status] = (counts[fixture.status] || 0) + 1;
    if (isChecked(fixture)) checked += 1;
  }
  return { total: order.length, checked, counts };
}

/**
 * Next fixture to visit after `fromId` (wraps around). Prefers the next
 * unchecked unit; falls back to simple next-in-order when all are checked.
 */
export function nextRigCheckFixture(doc, fromId = null) {
  const order = rigCheckOrder(doc);
  if (order.length === 0) return null;
  const start = fromId ? order.indexOf(fromId) : -1;

  for (let step = 1; step <= order.length; step += 1) {
    const id = order[(start + step + order.length) % order.length];
    if (!isChecked(doc.fixtures[id])) return id;
  }
  return order[(start + 1 + order.length) % order.length];
}

export function previousRigCheckFixture(doc, fromId = null) {
  const order = rigCheckOrder(doc);
  if (order.length === 0) return null;
  const start = fromId ? order.indexOf(fromId) : 0;
  return order[(start - 1 + order.length) % order.length];
}
