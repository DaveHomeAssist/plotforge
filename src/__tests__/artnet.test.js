import { describe, expect, it } from "vitest";
import {
  ARTNET_DMX_HEADER_LENGTH,
  ARTNET_PROTOCOL_VERSION,
  artDmxPacketSummary,
  encodeArtDmx,
  encodePortAddress,
} from "../domain/artnet.js";

describe("Art-Net encoder", () => {
  it("encodes ArtDmx packet bytes with explicit net sub-net universe fields", () => {
    const packet = encodeArtDmx({
      portAddress: { net: 2, subNet: 3, universe: 4 },
      data: Uint8Array.from([1, 2, 3, 4]),
      sequence: 5,
      physical: 6,
    });
    const summary = artDmxPacketSummary(packet);

    expect(Array.from(packet.slice(0, 8))).toEqual([65, 114, 116, 45, 78, 101, 116, 0]);
    expect(summary).toEqual(expect.objectContaining({
      id: "Art-Net\0",
      opcode: 0x5000,
      protocolVersion: ARTNET_PROTOCOL_VERSION,
      sequence: 5,
      physical: 6,
      subUni: 0x34,
      net: 2,
      length: 4,
    }));
    expect(Array.from(summary.payload)).toEqual([1, 2, 3, 4]);
    expect(packet).toHaveLength(ARTNET_DMX_HEADER_LENGTH + 4);
  });

  it("pads odd direct encoder payloads to an even ArtDmx length", () => {
    const packet = encodeArtDmx({
      portAddress: { net: 0, subNet: 0, universe: 1 },
      data: Uint8Array.from([10, 20, 30]),
    });
    const summary = artDmxPacketSummary(packet);

    expect(summary.length).toBe(4);
    expect(Array.from(summary.payload)).toEqual([10, 20, 30, 0]);
  });

  it("rejects out-of-range Art-Net port-address fields", () => {
    expect(() => encodePortAddress({ net: 128, subNet: 0, universe: 0 })).toThrow(/net/i);
    expect(() => encodePortAddress({ net: 0, subNet: 16, universe: 0 })).toThrow(/sub-net/i);
    expect(() => encodePortAddress({ net: 0, subNet: 0, universe: 16 })).toThrow(/universe/i);
  });
});
