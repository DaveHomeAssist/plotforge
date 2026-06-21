import { describe, expect, it } from "vitest";
import { addFixture, addPosition, newFixture, newPosition, newShow } from "../domain/show.js";
import { alignFixtures, distributeFixtures, selectionBounds } from "../domain/fixtureLayout.js";
import { feetToMm } from "../domain/units.js";

function seedLayoutDoc() {
  let doc = newShow({ name: "Layout Test" });
  const position = newPosition({ name: "1ST ELEC", yMm: feetToMm(-8), lengthMm: feetToMm(30) });
  doc = addPosition(doc, position);
  const left = newFixture({ positionId: position.id, profileId: "s4_26", xMm: feetToMm(-6) });
  const center = newFixture({ positionId: position.id, profileId: "s4_26", xMm: feetToMm(-1) });
  const right = newFixture({ positionId: position.id, profileId: "s4_26", xMm: feetToMm(6) });
  doc = addFixture(doc, left);
  doc = addFixture(doc, center);
  doc = addFixture(doc, right);
  return { doc, left, center, right };
}

describe("fixture layout", () => {
  it("computes selected fixture bounds", () => {
    const { doc, left, right } = seedLayoutDoc();

    expect(selectionBounds(doc, [left.id, right.id])).toEqual({
      count: 2,
      minX: feetToMm(-6),
      maxX: feetToMm(6),
      centerX: 0,
    });
  });

  it("aligns selected fixtures to the requested edge or center", () => {
    const { doc, left, center, right } = seedLayoutDoc();

    const alignedLeft = alignFixtures(doc, [left.id, center.id, right.id], "left");
    expect(alignedLeft.fixtures[left.id].xMm).toBe(feetToMm(-6));
    expect(alignedLeft.fixtures[center.id].xMm).toBe(feetToMm(-6));
    expect(alignedLeft.fixtures[right.id].xMm).toBe(feetToMm(-6));

    const alignedCenter = alignFixtures(doc, [left.id, right.id], "center");
    expect(alignedCenter.fixtures[left.id].xMm).toBe(0);
    expect(alignedCenter.fixtures[right.id].xMm).toBe(0);
  });

  it("distributes selected fixtures evenly between their outer fixtures", () => {
    const { doc, left, center, right } = seedLayoutDoc();

    const distributed = distributeFixtures(doc, [right.id, left.id, center.id]);

    expect(distributed.fixtures[left.id].xMm).toBe(feetToMm(-6));
    expect(distributed.fixtures[center.id].xMm).toBe(0);
    expect(distributed.fixtures[right.id].xMm).toBe(feetToMm(6));
    expect(distributed.fixtures[left.id].unitNumber).toBe(1);
    expect(distributed.fixtures[center.id].unitNumber).toBe(2);
    expect(distributed.fixtures[right.id].unitNumber).toBe(3);
  });

  it("leaves the document unchanged when too few fixtures are selected", () => {
    const { doc, left, center } = seedLayoutDoc();

    expect(alignFixtures(doc, [left.id], "right")).toBe(doc);
    expect(distributeFixtures(doc, [left.id, center.id])).toBe(doc);
  });
});
