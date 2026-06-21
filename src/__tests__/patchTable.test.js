import { describe, expect, it } from "vitest";
import { newShow, newPosition, newFixture, addPosition, addFixture } from "../domain/show.js";
import { patchTableCsv, patchTableRows } from "../domain/patchTable.js";
import { feetToMm } from "../domain/units.js";

function seedPatchShow() {
  let doc = newShow({ name: "Patch Test" });
  const elec = newPosition({ name: "1ST ELEC", yMm: feetToMm(-8), lengthMm: feetToMm(28) });
  const foh = newPosition({ name: "FOH", yMm: feetToMm(8), lengthMm: feetToMm(20) });
  doc = addPosition(doc, elec);
  doc = addPosition(doc, foh);
  return { doc, elec, foh };
}

describe("patch table", () => {
  it("builds rows in position and unit order with profile metadata", () => {
    let { doc, elec, foh } = seedPatchShow();
    doc = addFixture(doc, newFixture({
      positionId: foh.id,
      profileId: "spot_mh",
      xMm: 0,
      channel: 101,
      dmx: { universe: 2, address: 1 },
    }));
    doc = addFixture(doc, newFixture({
      positionId: elec.id,
      profileId: "s4_26",
      xMm: feetToMm(-4),
      channel: 11,
      dmx: { universe: 1, address: 41 },
      color: "R02",
      note: "warm front",
      notes: { color: "Add R119 backup", gobo: "", focus: "DSC special", crew: "warm front" },
      status: "hung",
    }));

    const rows = patchTableRows(doc);

    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual(expect.objectContaining({
      positionName: "1ST ELEC",
      profileName: "ETC Source Four 26°",
      mode: "Default",
      channel: 11,
      dmxRangeLabel: "U1 41-41",
      footprint: 1,
      color: "R02",
      note: "warm front",
      notesLabel: "Color: Add R119 backup | Focus: DSC special | Crew: warm front",
      status: "hung",
      statusLabel: "Hung",
    }));
    expect(rows[1]).toEqual(expect.objectContaining({
      positionName: "FOH",
      profileName: "Generic Moving Spot",
      dmxRangeLabel: "U2 1-24",
      footprint: 24,
      statusLabel: "Planned",
    }));
  });

  it("marks channel and DMX conflicts on affected fixture rows", () => {
    let { doc, elec } = seedPatchShow();
    doc = addFixture(doc, newFixture({
      positionId: elec.id,
      profileId: "spot_mh",
      xMm: feetToMm(-4),
      channel: 22,
      dmx: { universe: 1, address: 1 },
    }));
    doc = addFixture(doc, newFixture({
      positionId: elec.id,
      profileId: "s4_26",
      xMm: feetToMm(4),
      channel: 22,
      dmx: { universe: 1, address: 20 },
    }));

    const rows = patchTableRows(doc);

    expect(rows.every(row => row.hasChannelConflict)).toBe(true);
    expect(rows.every(row => row.hasDmxConflict)).toBe(true);
    expect(rows.map(row => row.conflictLabel)).toEqual(["DMX U1; channel 22", "DMX U1; channel 22"]);
  });

  it("exports the same patch rows as escaped CSV", () => {
    let { doc, elec } = seedPatchShow();
    doc = addFixture(doc, newFixture({
      positionId: elec.id,
      profileId: "s4_26",
      xMm: 0,
      channel: 7,
      dmx: { universe: 1, address: 80 },
      color: "R02",
      note: "warm, high side",
      notes: { color: "warm", gobo: "breakup", focus: "lectern", crew: "high side" },
      status: "patched",
    }));

    expect(patchTableCsv(doc)).toContain("Unit,Position,Profile,Mode,Status,Channel,Universe,Address,End Address,Footprint,Color,Gobo,Color Note,Gobo Note,Focus Note,Crew Note,Conflicts\n");
    expect(patchTableCsv(doc)).toContain("1,1ST ELEC,ETC Source Four 26°,Default,Patched,7,1,80,80,1,R02,,warm,breakup,lectern,high side,\n");
  });
});
