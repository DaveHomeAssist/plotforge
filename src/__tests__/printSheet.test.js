import { describe, expect, it } from "vitest";
import { newShow, newPosition, newFixture, addPosition, addFixture, updateProjectMetadata } from "../domain/show.js";
import { feetToMm } from "../domain/units.js";
import { printLegendRows, printPatchStatus, printSheetHtml, printWorldBounds } from "../domain/printSheet.js";

function seedPrintShow(name = "Print Test") {
  let doc = newShow({ name });
  const elec = newPosition({ name: "1ST ELEC", yMm: feetToMm(-8), lengthMm: feetToMm(28) });
  doc = addPosition(doc, elec);
  doc = addFixture(doc, newFixture({
    positionId: elec.id,
    profileId: "s4_26",
    xMm: 0,
    channel: 11,
    dmx: { universe: 1, address: 41 },
    color: "R02",
  }));
  return { doc, elec };
}

describe("print sheet", () => {
  it("builds a printable ANSI D sheet with title block, scale, SVG, and legend", () => {
    let { doc } = seedPrintShow("Preview & Plot");
    doc = updateProjectMetadata(doc, {
      drawingTitle: "Deck plot",
      venueName: "Mainstage",
      designer: "Dana LX",
      revision: "Rev B",
      showDate: "2026-07-04",
    });

    const html = printSheetHtml(doc, { paperId: "ansi_d", now: new Date("2026-06-21T05:00:00Z") });

    expect(html).toContain("@page { size: 34in 22in; margin: 0.35in; }");
    expect(html).toContain("Preview &amp; Plot");
    expect(html).toContain("Deck plot");
    expect(html).toContain("Mainstage");
    expect(html).toContain("Dana LX");
    expect(html).toContain("Rev B");
    expect(html).toContain("role=\"img\"");
    expect(html).toContain("10 ft");
    expect(html).toContain("Fixture legend");
    expect(html).toContain("ETC Source Four 26°");
    expect(html).toContain("Patch clear");
  });

  it("computes bounds that include the venue and position margin", () => {
    const { doc } = seedPrintShow();

    const bounds = printWorldBounds(doc);

    expect(bounds.width).toBeGreaterThan(doc.venue.stageWidthMm);
    expect(bounds.height).toBeGreaterThan(doc.venue.stageDepthMm);
  });

  it("summarizes duplicate channel and DMX conflicts", () => {
    let { doc, elec } = seedPrintShow();
    doc = addFixture(doc, newFixture({
      positionId: elec.id,
      profileId: "spot_mh",
      xMm: feetToMm(4),
      channel: 11,
      dmx: { universe: 1, address: 40 },
    }));

    expect(printPatchStatus(doc)).toBe("1 DMX conflict, 1 channel conflict");
  });

  it("builds fixture legend rows in profile order", () => {
    const { doc } = seedPrintShow();

    expect(printLegendRows(doc)).toEqual([
      expect.objectContaining({ count: 1, profile: expect.objectContaining({ model: "Source Four 26°" }) }),
    ]);
  });
});
