import { describe, expect, it } from "vitest";
import {
  addCommentPin,
  addFixture,
  addPosition,
  newCommentPin,
  newFixture,
  newPosition,
  newShow,
  updateFixture,
} from "../domain/show.js";
import {
  interopFixtureRows,
  interopManifest,
  interopManifestJson,
  MVR_CORPUS_BLOCKER,
} from "../domain/interopManifest.js";
import { feetToMm } from "../domain/units.js";

function seedInteropDoc() {
  let doc = newShow({ name: "Interop Test" });
  const position = newPosition({ name: "1ST ELEC", yMm: feetToMm(-8), lengthMm: feetToMm(28) });
  doc = addPosition(doc, position);
  const fixture = newFixture({
    positionId: position.id,
    profileId: "robe_megapointe",
    xMm: feetToMm(3),
    channel: 42,
    dmx: { universe: 2, address: 101 },
    color: "R02",
    circuit: "A1",
    dimmer: "D12",
    status: "focused",
  });
  doc = addFixture(doc, fixture);
  doc = updateFixture(doc, fixture.id, { focus: { xMm: feetToMm(6), yMm: feetToMm(-2) } });
  doc = addCommentPin(doc, newCommentPin({ xMm: feetToMm(1), yMm: feetToMm(-1), text: "Sightline" }));
  return { doc, fixtureId: fixture.id };
}

describe("interop manifest", () => {
  it("exports fixture paperwork and GDTF provenance", () => {
    const { doc, fixtureId } = seedInteropDoc();
    const [row] = interopFixtureRows(doc);

    expect(row).toEqual(expect.objectContaining({
      id: fixtureId,
      mvrName: "1ST ELEC U1",
      profileName: "Robe Lighting Robin MegaPointe",
      mode: "Mode 1 - Standard 16 - bit",
      dmxFootprint: 39,
      channel: 42,
      dmx: { universe: 2, address: 101 },
      color: "R02",
      circuit: "A1",
      dimmer: "D12",
      status: "focused",
      focus: expect.objectContaining({ xMm: feetToMm(6), yMm: feetToMm(-2) }),
    }));
    expect(row.gdtf).toEqual(expect.objectContaining({
      type: "gdtf-share",
      fixtureId: 661,
      revisionId: 138392,
      gdtfVersion: "1.2",
    }));
  });

  it("marks MVR import parser as parked on the sample corpus", () => {
    const { doc } = seedInteropDoc();
    const manifest = interopManifest(doc, { generatedAt: "2026-06-21T08:00:00.000Z" });

    expect(manifest).toEqual(expect.objectContaining({
      schemaVersion: 1,
      kind: "plotforge-interop-manifest",
      generatedAt: "2026-06-21T08:00:00.000Z",
      mvr: {
        importParser: "parked",
        blocker: MVR_CORPUS_BLOCKER,
      },
    }));
    expect(manifest.fixtures).toHaveLength(1);
    expect(manifest.commentPins[0].text).toBe("Sightline");
  });

  it("serializes manifest JSON with a stable schema marker", () => {
    const { doc } = seedInteropDoc();
    const json = interopManifestJson(doc, { generatedAt: "2026-06-21T08:00:00.000Z" });

    expect(json).toContain("\"kind\": \"plotforge-interop-manifest\"");
    expect(json).toContain("\"importParser\": \"parked\"");
    expect(json.endsWith("\n")).toBe(true);
  });
});
