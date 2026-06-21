import { describe, expect, it } from "vitest";
import { addFixture, addPosition, newFixture, newPosition, newShow } from "../domain/show.js";
import { gelRollupCsv, gelRollupRows, parseGelCodes } from "../domain/gelRollup.js";
import { feetToMm } from "../domain/units.js";

function seedGelDoc() {
  let doc = newShow({ name: "Gel Test" });
  const position = newPosition({ name: "1ST ELEC", yMm: feetToMm(-8), lengthMm: feetToMm(30) });
  doc = addPosition(doc, position);
  doc = addFixture(doc, newFixture({
    positionId: position.id,
    profileId: "s4_26",
    xMm: feetToMm(-4),
    channel: 11,
    color: "R02 / L201",
  }));
  doc = addFixture(doc, newFixture({
    positionId: position.id,
    profileId: "s4_26",
    xMm: feetToMm(4),
    channel: 12,
    color: "Rosco 02 and R119",
  }));
  doc = addFixture(doc, newFixture({
    positionId: position.id,
    profileId: "s4_26",
    xMm: feetToMm(8),
    channel: 13,
    color: "open",
  }));
  return doc;
}

describe("gel rollup", () => {
  it("parses and normalizes common gel code strings", () => {
    expect(parseGelCodes("R02/R119")).toEqual(["R02", "R119"]);
    expect(parseGelCodes("Lee 201 + Rosco 02")).toEqual(["L201", "R02"]);
    expect(parseGelCodes("R02 R119")).toEqual(["R02", "R119"]);
    expect(parseGelCodes("open")).toEqual([]);
  });

  it("rolls up fixture gels into order rows", () => {
    const rows = gelRollupRows(seedGelDoc());

    expect(rows.map(row => [row.code, row.count])).toEqual([
      ["L201", 1],
      ["R02", 2],
      ["R119", 1],
    ]);
    expect(rows.find(row => row.code === "R02").fixtureLabels).toEqual([
      "U1 1ST ELEC ch 11",
      "U2 1ST ELEC ch 12",
    ]);
  });

  it("exports the gel order as CSV", () => {
    const csv = gelRollupCsv(seedGelDoc());

    expect(csv.split("\n")[0]).toBe("Gel,Count,Fixtures,Positions,Profiles");
    expect(csv).toContain("R02,2");
    expect(csv).toContain("U1 1ST ELEC ch 11; U2 1ST ELEC ch 12");
  });
});
