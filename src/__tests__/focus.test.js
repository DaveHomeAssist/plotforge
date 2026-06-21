import { describe, expect, it } from "vitest";
import { newShow, newPosition, newFixture, addPosition, addFixture, updateFixture } from "../domain/show.js";
import { focusBeamRows, snapFocusPoint } from "../domain/focus.js";
import { feetToMm } from "../domain/units.js";

function seedFocusShow() {
  let doc = newShow({ name: "Focus Test" });
  const position = newPosition({ name: "1ST ELEC", yMm: feetToMm(-8), lengthMm: feetToMm(28) });
  doc = addPosition(doc, position);
  const fixture = newFixture({ positionId: position.id, profileId: "s4_26", xMm: feetToMm(-4) });
  doc = addFixture(doc, fixture);
  return { doc, fixtureId: fixture.id, position };
}

describe("focus beams", () => {
  it("snaps focus points to the fixture grid", () => {
    expect(snapFocusPoint({ xMm: 52, yMm: -52 })).toEqual({ xMm: 50.8, yMm: -50.8 });
  });

  it("returns beam rows for fixtures with focus points", () => {
    let { doc, fixtureId, position } = seedFocusShow();
    doc = updateFixture(doc, fixtureId, { focus: { xMm: feetToMm(2), yMm: feetToMm(-3) } });

    expect(focusBeamRows(doc)).toEqual([
      expect.objectContaining({
        fixtureId,
        fromX: feetToMm(-4),
        fromY: position.yMm,
        toX: feetToMm(2),
        toY: feetToMm(-3),
      }),
    ]);
  });
});
