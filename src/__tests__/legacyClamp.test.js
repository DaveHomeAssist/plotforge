/**
 * R2 — documents the silent-relocation path opened by clampFixtureX.
 * A legacy .plot may hold a fixture outside its position extent (e.g. the
 * position was shortened after the unit was hung). The clamp added for
 * PF-UX-002 moves such a unit on the first edit that touches xMm, with no
 * warning. These tests pin that behaviour so it is a known, tested contract
 * rather than a surprise.
 */
import { describe, expect, it } from "vitest";
import {
  newShow, newPosition, newFixture, addPosition, addFixture,
  updateFixture, clampFixtureX,
} from "../domain/show.js";
import { feetToMm } from "../domain/units.js";

function legacyDocWithOffPipeFixture() {
  let doc = newShow({ name: "Legacy" });
  const pipe = newPosition({ name: "1ST ELEC", kind: "pipe", yMm: feetToMm(-8), lengthMm: feetToMm(28), trimMm: feetToMm(22) });
  doc = addPosition(doc, pipe);
  doc = addFixture(doc, newFixture({ positionId: pipe.id, profileId: "s4_26", xMm: 0, channel: 1 }));
  const fixtureId = doc.fixtureOrder[0];
  // Simulate a legacy document: unit sits 20ft out on a 28ft (±14ft) pipe.
  doc = { ...doc, fixtures: { ...doc.fixtures, [fixtureId]: { ...doc.fixtures[fixtureId], xMm: feetToMm(20) } } };
  return { doc, fixtureId, pipeId: pipe.id };
}

describe("legacy off-pipe fixtures", () => {
  it("loading alone does not move the fixture", () => {
    const { doc, fixtureId } = legacyDocWithOffPipeFixture();
    expect(doc.fixtures[fixtureId].xMm).toBe(feetToMm(20));
  });

  it("an edit that does not touch xMm leaves the off-pipe position intact", () => {
    const { doc, fixtureId } = legacyDocWithOffPipeFixture();
    const next = updateFixture(doc, fixtureId, { channel: 7 });
    expect(next.fixtures[fixtureId].xMm).toBe(feetToMm(20));
    expect(next.fixtures[fixtureId].channel).toBe(7);
  });

  it("an edit that touches xMm silently clamps it to the pipe end", () => {
    const { doc, fixtureId } = legacyDocWithOffPipeFixture();
    const next = updateFixture(doc, fixtureId, { xMm: feetToMm(19) });
    // Documented consequence: the unit lands at the pipe end, not at 19ft.
    expect(next.fixtures[fixtureId].xMm).toBe(feetToMm(28) / 2);
  });

  it("exposes a helper callers can use to detect off-pipe units before editing", () => {
    const { doc, fixtureId, pipeId } = legacyDocWithOffPipeFixture();
    const fx = doc.fixtures[fixtureId];
    const position = doc.positions[pipeId];
    const clamped = clampFixtureX(position, fx.xMm);
    expect(clamped).not.toBe(fx.xMm);          // detectable without mutating
    expect(clamped).toBe(feetToMm(28) / 2);
  });
});
