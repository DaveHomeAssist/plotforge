import { renumberPosition } from "./show.js";

const ALIGN_MODES = new Set(["left", "center", "right"]);

function selectedFixtures(doc, fixtureIds) {
  const seen = new Set();
  return fixtureIds
    .map(id => doc.fixtures[id])
    .filter(fixture => {
      if (!fixture || seen.has(fixture.id)) return false;
      seen.add(fixture.id);
      return true;
    });
}

function renumberAffectedPositions(doc, fixtures) {
  const positionIds = new Set(fixtures.map(fixture => fixture.positionId));
  let next = doc;
  positionIds.forEach(positionId => {
    next = renumberPosition(next, positionId);
  });
  return next;
}

function withFixtureXs(doc, fixtures, xByFixtureId) {
  const nextFixtures = { ...doc.fixtures };
  let changed = false;

  fixtures.forEach(fixture => {
    const nextX = xByFixtureId.get(fixture.id);
    if (nextX == null || nextX === fixture.xMm) return;
    nextFixtures[fixture.id] = { ...fixture, xMm: nextX };
    changed = true;
  });

  if (!changed) return doc;

  return renumberAffectedPositions({
    ...doc,
    updatedAt: Date.now(),
    fixtures: nextFixtures,
  }, fixtures);
}

export function selectionBounds(doc, fixtureIds) {
  const fixtures = selectedFixtures(doc, fixtureIds);
  if (!fixtures.length) return null;
  const xs = fixtures.map(fixture => fixture.xMm);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  return {
    count: fixtures.length,
    minX,
    maxX,
    centerX: Math.round((minX + maxX) / 2),
  };
}

export function alignFixtures(doc, fixtureIds, mode) {
  if (!ALIGN_MODES.has(mode)) return doc;
  const fixtures = selectedFixtures(doc, fixtureIds);
  if (fixtures.length < 2) return doc;
  const bounds = selectionBounds(doc, fixtures.map(fixture => fixture.id));
  if (!bounds) return doc;

  const targetX = mode === "left"
    ? bounds.minX
    : mode === "right"
      ? bounds.maxX
      : bounds.centerX;
  const xByFixtureId = new Map(fixtures.map(fixture => [fixture.id, targetX]));
  return withFixtureXs(doc, fixtures, xByFixtureId);
}

export function distributeFixtures(doc, fixtureIds) {
  const fixtures = selectedFixtures(doc, fixtureIds)
    .sort((a, b) => a.xMm - b.xMm || doc.fixtureOrder.indexOf(a.id) - doc.fixtureOrder.indexOf(b.id));
  if (fixtures.length < 3) return doc;

  const minX = fixtures[0].xMm;
  const maxX = fixtures[fixtures.length - 1].xMm;
  const step = (maxX - minX) / (fixtures.length - 1);
  const xByFixtureId = new Map(fixtures.map((fixture, index) => [fixture.id, Math.round(minX + step * index)]));
  return withFixtureXs(doc, fixtures, xByFixtureId);
}
