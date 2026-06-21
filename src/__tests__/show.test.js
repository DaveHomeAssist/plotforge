import { describe, it, expect } from "vitest";
import {
  newShow, newPosition, newFixture,
  addPosition, addFixture, updateFixture, removeFixture, renumberPosition,
  newRevision, addRevision, activateRevision,
  updateVenue, updatePosition, removePosition, fixturesOnPosition,
} from "../domain/show.js";
import { feetToMm } from "../domain/units.js";
import { serialize, deserialize } from "../serialization.js";
import { patchConflicts, channelConflicts } from "../domain/patch.js";

function seed() {
  let doc = newShow({ name: "Test" });
  const pos = newPosition({ name: "1ST ELEC", yMm: feetToMm(-8), lengthMm: feetToMm(28) });
  doc = addPosition(doc, pos);
  return { doc, posId: pos.id };
}

describe("show domain", () => {
  it("addFixture renumbers stage-right to stage-left", () => {
    let { doc, posId } = seed();
    doc = addFixture(doc, newFixture({ positionId: posId, profileId: "s4_26", xMm: feetToMm(0) }));
    doc = addFixture(doc, newFixture({ positionId: posId, profileId: "s4_26", xMm: feetToMm(-12) }));
    doc = addFixture(doc, newFixture({ positionId: posId, profileId: "s4_26", xMm: feetToMm(12) }));
    const onPos = fixturesOnPosition(doc, posId).sort((a, b) => a.xMm - b.xMm);
    expect(onPos.map(f => f.unitNumber)).toEqual([1, 2, 3]);
  });

  it("creates fixtures with planned status by default", () => {
    const { posId } = seed();
    const fixture = newFixture({ positionId: posId, profileId: "s4_26", xMm: 0 });

    expect(fixture.status).toBe("planned");
  });

  it("updateFixture xMm renumbers when called with renumberPosition", () => {
    let { doc, posId } = seed();
    doc = addFixture(doc, newFixture({ positionId: posId, profileId: "s4_26", xMm: feetToMm(-6) }));
    doc = addFixture(doc, newFixture({ positionId: posId, profileId: "s4_26", xMm: feetToMm(6) }));
    const [left, right] = fixturesOnPosition(doc, posId);
    expect(left.unitNumber).toBe(1);
    // Move left fixture past the right one.
    doc = renumberPosition(updateFixture(doc, left.id, { xMm: feetToMm(12) }), posId);
    const after = fixturesOnPosition(doc, posId);
    expect(after.find(f => f.id === left.id).unitNumber).toBe(2);
    expect(after.find(f => f.id === right.id).unitNumber).toBe(1);
  });

  it("removeFixture renumbers the rest", () => {
    let { doc, posId } = seed();
    const ids = [-12, -6, 0, 6, 12].map(ft => {
      const fx = newFixture({ positionId: posId, profileId: "s4_26", xMm: feetToMm(ft) });
      doc = addFixture(doc, fx);
      return fx.id;
    });
    doc = removeFixture(doc, ids[2]);
    const nums = fixturesOnPosition(doc, posId).map(f => f.unitNumber).sort();
    expect(nums).toEqual([1, 2, 3, 4]);
  });

  it("updateVenue patches stage dimensions", () => {
    const { doc } = seed();
    const next = updateVenue(doc, { stageWidthMm: feetToMm(40) });
    expect(next.venue.stageWidthMm).toBe(feetToMm(40));
    expect(next.venue.stageDepthMm).toBe(doc.venue.stageDepthMm);
  });

  it("updatePosition patches editable position fields", () => {
    let { doc, posId } = seed();
    doc = updatePosition(doc, posId, { name: "BOX BOOM SL", yMm: feetToMm(4) });
    expect(doc.positions[posId].name).toBe("BOX BOOM SL");
    expect(doc.positions[posId].yMm).toBe(feetToMm(4));
  });

  it("removePosition removes the position and attached fixtures", () => {
    let { doc, posId } = seed();
    const keep = newPosition({ name: "FOH", yMm: feetToMm(8), lengthMm: feetToMm(20) });
    doc = addPosition(doc, keep);
    const doomedFx = newFixture({ positionId: posId, profileId: "s4_26", xMm: feetToMm(0) });
    const keptFx = newFixture({ positionId: keep.id, profileId: "s4_26", xMm: feetToMm(0) });
    doc = addFixture(doc, doomedFx);
    doc = addFixture(doc, keptFx);

    doc = removePosition(doc, posId);

    expect(doc.positions[posId]).toBeUndefined();
    expect(doc.fixtures[doomedFx.id]).toBeUndefined();
    expect(doc.fixtures[keptFx.id]).toEqual(expect.objectContaining({ positionId: keep.id }));
    expect(doc.positionOrder).toEqual([keep.id]);
    expect(doc.fixtureOrder).toEqual([keptFx.id]);
  });

  it("adds and activates named revisions", () => {
    let { doc } = seed();
    const draft = newRevision({ name: "Rev A", note: "Issued for focus", createdAt: 1 });
    const tech = newRevision({ name: "Tech", note: "Updated FOH", createdAt: 2 });

    doc = addRevision(doc, draft);
    doc = addRevision(doc, tech);

    expect(doc.revisionOrder).toEqual([draft.id, tech.id]);
    expect(doc.activeRevisionId).toBe(tech.id);
    expect(doc.metadata.revision).toBe("Tech");

    doc = activateRevision(doc, draft.id);

    expect(doc.activeRevisionId).toBe(draft.id);
    expect(doc.metadata.revision).toBe("Rev A");
  });

  it("serialize → deserialize roundtrip preserves the doc", () => {
    let { doc, posId } = seed();
    doc = addFixture(doc, newFixture({
      positionId: posId, profileId: "fresnel", xMm: feetToMm(0),
      channel: 7, dmx: { universe: 1, address: 41 }, color: "R02",
    }));
    const text = serialize(doc);
    const back = deserialize(text);
    expect(back).toEqual(doc);
  });
});

describe("patch", () => {
  it("flags overlapping DMX ranges on the same universe", () => {
    let { doc, posId } = seed();
    doc = addFixture(doc, newFixture({
      positionId: posId, profileId: "spot_mh", xMm: 0,
      dmx: { universe: 1, address: 1 },     // occupies 1..24
    }));
    doc = addFixture(doc, newFixture({
      positionId: posId, profileId: "s4_26", xMm: feetToMm(2),
      dmx: { universe: 1, address: 20 },    // occupies 20..20 — overlaps
    }));
    const conflicts = patchConflicts(doc);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].universe).toBe(1);
  });

  it("does not flag ranges on different universes", () => {
    let { doc, posId } = seed();
    doc = addFixture(doc, newFixture({ positionId: posId, profileId: "s4_26", xMm: 0, dmx: { universe: 1, address: 1 } }));
    doc = addFixture(doc, newFixture({ positionId: posId, profileId: "s4_26", xMm: feetToMm(2), dmx: { universe: 2, address: 1 } }));
    expect(patchConflicts(doc)).toHaveLength(0);
  });

  it("flags duplicate channels", () => {
    let { doc, posId } = seed();
    doc = addFixture(doc, newFixture({ positionId: posId, profileId: "s4_26", xMm: 0, channel: 11 }));
    doc = addFixture(doc, newFixture({ positionId: posId, profileId: "s4_26", xMm: feetToMm(2), channel: 11 }));
    expect(channelConflicts(doc)).toHaveLength(1);
  });
});
