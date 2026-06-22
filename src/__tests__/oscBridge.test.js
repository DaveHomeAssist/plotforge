import { describe, expect, it } from "vitest";
import {
  addFixture,
  addPosition,
  newFixture,
  newPosition,
  newShow,
  updateFixture,
  updateOscBridge,
} from "../domain/show.js";
import {
  encodeOscMessage,
  normalizeOscBridgeSettings,
  oscBridgeManifest,
  oscBridgeManifestJson,
  oscBridgeRoutes,
} from "../domain/oscBridge.js";
import { feetToMm } from "../domain/units.js";

function seedOscDoc() {
  let doc = newShow({ name: "OSC Test" });
  const position = newPosition({ name: "FOH TRUSS", yMm: feetToMm(8), lengthMm: feetToMm(30) });
  doc = addPosition(doc, position);
  const fixture = newFixture({
    positionId: position.id,
    profileId: "spot_mh",
    xMm: feetToMm(4),
    channel: 201,
    dmx: { universe: 2, address: 1 },
    status: "patched",
  });
  doc = addFixture(doc, fixture);
  doc = updateFixture(doc, fixture.id, { focus: { xMm: feetToMm(1), yMm: feetToMm(-1) } });
  doc = updateOscBridge(doc, {
    namespace: "/Plot Forge/Main",
    relayUrl: "ws://127.0.0.1:9999",
    targetHost: "192.168.1.50",
    targetPort: "9000",
  });
  return { doc, fixtureId: fixture.id };
}

describe("OSC bridge", () => {
  it("normalizes bridge settings for saved show documents", () => {
    const settings = normalizeOscBridgeSettings({
      namespace: " plot forge / main ",
      targetPort: "70000",
      targetHost: " 10.0.0.2 ",
    });

    expect(settings.namespace).toBe("/plot_forge/main");
    expect(settings.targetHost).toBe("10.0.0.2");
    expect(settings.targetPort).toBe(8000);
  });

  it("builds fixture select, patch, status, and focus routes", () => {
    const { doc, fixtureId } = seedOscDoc();
    const routes = oscBridgeRoutes(doc);
    const selectedRoutes = routes.filter(route => route.fixtureId === fixtureId);

    expect(selectedRoutes.map(route => route.purpose)).toEqual(["select", "patch", "status", "focus"]);
    expect(selectedRoutes[0]).toEqual(expect.objectContaining({
      address: expect.stringMatching(/^\/plot_forge\/main\/fixture\/fx_/),
      channel: 201,
      targetHost: "192.168.1.50",
      targetPort: 9000,
    }));
    expect(selectedRoutes[0].args).toEqual([
      { type: "integer", value: 201 },
      { type: "string", value: "FOH TRUSS U1" },
    ]);
  });

  it("exports a manifest with relay and UDP target data", () => {
    const { doc } = seedOscDoc();
    const manifest = oscBridgeManifest(doc, { generatedAt: "2026-06-22T04:00:00.000Z" });

    expect(manifest.kind).toBe("plotforge-osc-bridge");
    expect(manifest.bridge.relayUrl).toBe("ws://127.0.0.1:9999");
    expect(manifest.transport.relayScript).toBe("npm run osc:relay");
    expect(manifest.transport.udpTarget).toEqual({ host: "192.168.1.50", port: 9000 });
    expect(manifest.routes).toHaveLength(4);
  });

  it("serializes the OSC bridge manifest with a stable marker", () => {
    const { doc } = seedOscDoc();
    const json = oscBridgeManifestJson(doc, { generatedAt: "2026-06-22T04:00:00.000Z" });

    expect(json).toContain("\"kind\": \"plotforge-osc-bridge\"");
    expect(json).toContain("\"relayScript\": \"npm run osc:relay\"");
    expect(json.endsWith("\n")).toBe(true);
  });

  it("encodes OSC messages as four byte aligned packets", () => {
    const packet = encodeOscMessage("/plotforge/test", [
      { type: "integer", value: 42 },
      { type: "string", value: "LX" },
      { type: "boolean", value: true },
    ]);
    const packetText = new TextDecoder().decode(packet);

    expect(packet.length % 4).toBe(0);
    expect(packetText).toContain("/plotforge/test");
    expect(packetText).toContain(",isT");
    expect(packet.at(-4)).toBe(76);
    expect(packet.at(-3)).toBe(88);
  });
});
