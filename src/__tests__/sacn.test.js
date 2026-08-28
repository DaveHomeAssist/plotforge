import { describe, expect, it } from "vitest";
import goldenDoc from "./fixtures/dmx-output/golden-doc.json";
import selectedLedVector from "./fixtures/dmx-output/selected-led-buffer.json";
import { compileDmxOutput } from "../domain/dmxOutput.js";
import {
  SACN_DMX_HEADER_LENGTH,
  SACN_PORT,
  encodeSacnDmx,
  sacnMulticastAddress,
  sacnPacketSummary,
} from "../domain/sacn.js";

const TEST_CID = "12345678-1234-5678-9abc-def012345678";

describe("sACN encoder", () => {
  it("encodes an E1.31 data packet with source CID priority sequence and universe", () => {
    const packet = encodeSacnDmx({
      cid: TEST_CID,
      sourceName: "PlotForge Test",
      universe: 1,
      data: Uint8Array.from([1, 2, 3, 4]),
      priority: 120,
      sequence: 7,
      preview: true,
    });
    const summary = sacnPacketSummary(packet);

    expect(SACN_PORT).toBe(5568);
    expect(packet).toHaveLength(SACN_DMX_HEADER_LENGTH + 4);
    expect(summary).toEqual(expect.objectContaining({
      preambleSize: 0x0010,
      postambleSize: 0,
      acnPacketIdentifier: "ASC-E1.17\0\0\0",
      rootFlagsLength: 0x7000 | (packet.length - 16),
      rootVector: 0x00000004,
      framingFlagsLength: 0x7000 | (packet.length - 38),
      framingVector: 0x00000002,
      sourceName: "PlotForge Test",
      priority: 120,
      sequence: 7,
      options: 0x80,
      universe: 1,
      dmpFlagsLength: 0x7000 | (packet.length - 115),
      dmpVector: 0x02,
      addressTypeDataType: 0xa1,
      firstPropertyAddress: 0,
      addressIncrement: 1,
      propertyValueCount: 5,
      startCode: 0,
    }));
    expect(summary.cid).toEqual([
      0x12, 0x34, 0x56, 0x78, 0x12, 0x34, 0x56, 0x78,
      0x9a, 0xbc, 0xde, 0xf0, 0x12, 0x34, 0x56, 0x78,
    ]);
    expect(Array.from(summary.payload)).toEqual([1, 2, 3, 4]);
  });

  it("builds sACN packets from the same compiled DMX universe buffers as Art-Net", () => {
    const compiled = compileDmxOutput(goldenDoc, {
      intent: selectedLedVector.intent.type,
      selectedFixtureId: selectedLedVector.intent.selectedFixtureId,
      values: selectedLedVector.intent.values,
    });
    const universe = compiled.universes[0];
    const packet = encodeSacnDmx({
      cid: TEST_CID,
      sourceName: "PlotForge Compiler",
      universe: universe.universe,
      data: Uint8Array.from(universe.slots),
      priority: 100,
      sequence: 1,
    });
    const summary = sacnPacketSummary(packet);

    expect(packet).toHaveLength(638);
    expect(summary.universe).toBe(1);
    expect(summary.propertyValueCount).toBe(513);
    expect(summary.payload).toHaveLength(512);
    expect(summary.payload[9]).toBe(200);
    expect(summary.payload[10]).toBe(255);
    expect(summary.payload[11]).toBe(128);
    expect(summary.payload[12]).toBe(64);
    expect(summary.payload[13]).toBe(32);
  });

  it("validates packet fields and exposes multicast addressing for later hardware tests", () => {
    expect(sacnMulticastAddress(1)).toBe("239.255.0.1");
    expect(sacnMulticastAddress(63999)).toBe("239.255.249.255");
    expect(() => sacnMulticastAddress(0)).toThrow(/universe/i);
    expect(() => encodeSacnDmx({
      cid: TEST_CID,
      universe: 64000,
      data: Uint8Array.from([1]),
    })).toThrow(/universe/i);
    expect(() => encodeSacnDmx({
      cid: "not-a-cid",
      universe: 1,
      data: Uint8Array.from([1]),
    })).toThrow(/CID/i);
    expect(() => encodeSacnDmx({
      cid: TEST_CID,
      universe: 1,
      priority: 201,
      data: Uint8Array.from([1]),
    })).toThrow(/priority/i);
  });
});
