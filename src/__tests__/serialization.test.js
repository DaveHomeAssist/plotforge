import { describe, expect, it } from "vitest";
import { deserialize, serialize } from "../serialization.js";
import { DOC_VERSION, newRevision, newShow, addRevision, updateProjectMetadata } from "../domain/show.js";
import { defaultDmxOutputSettings } from "../domain/dmxOutputPreferences.js";

describe("serialization", () => {
  it("roundtrips project metadata", () => {
    const doc = updateProjectMetadata(newShow({ name: "Save Test" }), {
      venueName: "North Hall",
      designer: "Sam LD",
      revision: "Tech",
    });

    const parsed = deserialize(serialize(doc));

    expect(parsed.version).toBe(DOC_VERSION);
    expect(parsed.metadata).toEqual(expect.objectContaining({
      venueName: "North Hall",
      designer: "Sam LD",
      revision: "Tech",
    }));
  });

  it("migrates older documents with default metadata", () => {
    const parsed = deserialize(JSON.stringify({
      version: 1,
      name: "Legacy Plot",
      positions: {},
      positionOrder: [],
      fixtures: {},
      fixtureOrder: [],
      venue: {},
    }));

    expect(parsed.version).toBe(DOC_VERSION);
    expect(parsed.metadata).toEqual(expect.objectContaining({
      drawingTitle: "Lighting Plot",
      venueName: "Studio A",
      revision: "Draft",
    }));
    expect(parsed.fixtureProfiles).toEqual({});
    expect(parsed.revisions).toEqual({});
    expect(parsed.revisionOrder).toEqual([]);
    expect(parsed.activeRevisionId).toBeNull();
  });

  it("migrates older documents with planned fixture status", () => {
    const parsed = deserialize(JSON.stringify({
      version: 3,
      name: "Legacy Status Plot",
      positions: {},
      positionOrder: [],
      fixtures: {
        fx_1: { id: "fx_1", profileId: "s4_26", positionId: "pos_1", xMm: 0 },
        fx_2: { id: "fx_2", profileId: "s4_26", positionId: "pos_1", xMm: 100, status: "patched" },
        fx_3: { id: "fx_3", profileId: "s4_26", positionId: "pos_1", xMm: 200, status: "bad" },
      },
      fixtureOrder: ["fx_1", "fx_2", "fx_3"],
      venue: {},
    }));

    expect(parsed.version).toBe(DOC_VERSION);
    expect(parsed.fixtures.fx_1.status).toBe("planned");
    expect(parsed.fixtures.fx_2.status).toBe("patched");
    expect(parsed.fixtures.fx_3.status).toBe("planned");
  });

  it("migrates older documents with layered fixture notes", () => {
    const parsed = deserialize(JSON.stringify({
      version: 4,
      name: "Legacy Notes Plot",
      positions: {},
      positionOrder: [],
      fixtures: {
        fx_1: { id: "fx_1", profileId: "s4_26", positionId: "pos_1", xMm: 0, note: "crew handoff" },
        fx_2: {
          id: "fx_2",
          profileId: "s4_26",
          positionId: "pos_1",
          xMm: 100,
          note: "legacy crew",
          notes: { color: "R02 warmer", gobo: "breakup", focus: "chair", crew: "keep top hat" },
        },
      },
      fixtureOrder: ["fx_1", "fx_2"],
      venue: {},
    }));

    expect(parsed.version).toBe(DOC_VERSION);
    expect(parsed.fixtures.fx_1.notes).toEqual({
      color: "",
      gobo: "",
      focus: "",
      crew: "crew handoff",
    });
    expect(parsed.fixtures.fx_1.note).toBe("crew handoff");
    expect(parsed.fixtures.fx_2.notes).toEqual({
      color: "R02 warmer",
      gobo: "breakup",
      focus: "chair",
      crew: "keep top hat",
    });
    expect(parsed.fixtures.fx_2.note).toBe("keep top hat");
  });

  it("migrates older documents with circuit and dimmer fields", () => {
    const parsed = deserialize(JSON.stringify({
      version: 5,
      name: "Legacy Circuit Plot",
      positions: {},
      positionOrder: [],
      fixtures: {
        fx_1: { id: "fx_1", profileId: "s4_26", positionId: "pos_1", xMm: 0 },
        fx_2: {
          id: "fx_2",
          profileId: "s4_26",
          positionId: "pos_1",
          xMm: 100,
          circuit: " A  12 ",
          dimmer: " Rack  1 ",
        },
      },
      fixtureOrder: ["fx_1", "fx_2"],
      venue: {},
    }));

    expect(parsed.version).toBe(DOC_VERSION);
    expect(parsed.fixtures.fx_1.circuit).toBe("");
    expect(parsed.fixtures.fx_1.dimmer).toBe("");
    expect(parsed.fixtures.fx_2.circuit).toBe("A 12");
    expect(parsed.fixtures.fx_2.dimmer).toBe("Rack 1");
  });

  it("migrates older documents with empty comment pin stores", () => {
    const parsed = deserialize(JSON.stringify({
      version: 6,
      name: "Legacy Comment Plot",
      positions: {},
      positionOrder: [],
      fixtures: {},
      fixtureOrder: [],
      venue: {},
    }));

    expect(parsed.version).toBe(DOC_VERSION);
    expect(parsed.commentPins).toEqual({});
    expect(parsed.commentPinOrder).toEqual([]);
  });

  it("migrates older documents with default OSC bridge settings", () => {
    const parsed = deserialize(JSON.stringify({
      version: 7,
      name: "Legacy OSC Plot",
      positions: {},
      positionOrder: [],
      fixtures: {},
      fixtureOrder: [],
      venue: {},
    }));

    expect(parsed.version).toBe(DOC_VERSION);
    expect(parsed.oscBridge).toEqual(expect.objectContaining({
      namespace: "/plotforge",
      relayUrl: "ws://127.0.0.1:8765",
      targetHost: "127.0.0.1",
      targetPort: 8000,
    }));
  });

  it("migrates older documents with default label settings", () => {
    const parsed = deserialize(JSON.stringify({
      version: 8,
      name: "Legacy Label Plot",
      positions: {},
      positionOrder: [],
      fixtures: {},
      fixtureOrder: [],
      venue: {},
      oscBridge: {},
    }));

    expect(parsed.version).toBe(DOC_VERSION);
    expect(parsed.labelSettings).toEqual(expect.objectContaining({
      fixtureUnitSize: 120,
      showFixtureUnit: true,
      showFixtureChannel: false,
      showPositionLabels: true,
    }));
  });

  it("migrates older documents with default DMX output preferences", () => {
    const parsed = deserialize(JSON.stringify({
      version: 8,
      name: "Legacy DMX Output Plot",
      positions: {},
      positionOrder: [],
      fixtures: {},
      fixtureOrder: [],
      venue: {},
      oscBridge: {},
    }));

    expect(parsed.version).toBe(DOC_VERSION);
    expect(parsed.dmxOutput).toEqual(defaultDmxOutputSettings());
  });

  it("normalizes DMX output preferences without persisting session state", () => {
    const parsed = deserialize(JSON.stringify({
      version: DOC_VERSION,
      name: "DMX Preferences",
      positions: {},
      positionOrder: [],
      fixtures: {},
      fixtureOrder: [],
      venue: {},
      dmxOutput: {
        version: 99,
        protocol: "sACN",
        targetMode: "multicast",
        relayUrl: " ws://127.0.0.1:8770 ",
        token: "do-not-save",
        armed: true,
        state: "sending",
        targetHost: "192.168.1.40",
        targetPort: "5568",
        maxFps: 999,
        blackoutOnDisconnect: false,
        blackoutBurst: 25,
        blackoutKeepAlive: true,
        currentValues: { intensity: 255 },
        universes: {
          "2": {
            net: 200,
            subNet: -5,
            universe: 9,
            targetHost: "192.168.1.41",
          },
        },
      },
    }));

    expect(parsed.dmxOutput).toEqual({
      version: 1,
      protocol: "sacn",
      targetMode: "multicast",
      relayUrl: "ws://127.0.0.1:8770",
      targetHost: "192.168.1.40",
      targetPort: 5568,
      maxFps: 44,
      blackoutOnDisconnect: false,
      blackoutBurst: 20,
      blackoutKeepAlive: true,
      universes: {
        "2": {
          net: 127,
          subNet: 0,
          universe: 9,
          targetHost: "192.168.1.41",
        },
      },
    });
    expect(parsed.dmxOutput.token).toBeUndefined();
    expect(parsed.dmxOutput.armed).toBeUndefined();
    expect(parsed.dmxOutput.currentValues).toBeUndefined();
  });

  it("strips DMX output tokens and arm state while serializing", () => {
    const doc = {
      ...newShow({ name: "Unsafe DMX Save" }),
      dmxOutput: {
        relayUrl: "ws://127.0.0.1:8766",
        token: "session-secret",
        armed: true,
        state: "armed",
        targetHost: "127.0.0.1",
        targetPort: 6454,
        universes: {
          "1": { net: 0, subNet: 1, universe: 2 },
        },
      },
    };

    const root = JSON.parse(serialize(doc));

    expect(root.dmxOutput).toEqual(expect.objectContaining({
      version: 1,
      relayUrl: "ws://127.0.0.1:8766",
      targetHost: "127.0.0.1",
      targetPort: 6454,
      universes: {
        "1": { net: 0, subNet: 1, universe: 2, targetHost: "" },
      },
    }));
    expect(root.dmxOutput.token).toBeUndefined();
    expect(root.dmxOutput.armed).toBeUndefined();
    expect(root.dmxOutput.state).toBeUndefined();
  });

  it("defaults sACN output preferences to the sACN UDP port", () => {
    const parsed = deserialize(JSON.stringify({
      version: DOC_VERSION,
      name: "sACN Defaults",
      positions: {},
      positionOrder: [],
      fixtures: {},
      fixtureOrder: [],
      venue: {},
      dmxOutput: {
        protocol: "sacn",
      },
    }));

    expect(parsed.dmxOutput.protocol).toBe("sacn");
    expect(parsed.dmxOutput.targetMode).toBe("unicast");
    expect(parsed.dmxOutput.targetPort).toBe(5568);
    expect(parsed.dmxOutput.universes["1"].universe).toBe(1);
  });

  it("preserves sACN universe route values above the Art-Net universe range", () => {
    const parsed = deserialize(JSON.stringify({
      version: DOC_VERSION,
      name: "sACN Route",
      positions: {},
      positionOrder: [],
      fixtures: {},
      fixtureOrder: [],
      venue: {},
      dmxOutput: {
        protocol: "sacn",
        universes: {
          "1": { universe: 4096 },
        },
      },
    }));

    expect(parsed.dmxOutput.protocol).toBe("sacn");
    expect(parsed.dmxOutput.universes["1"].universe).toBe(4096);
  });

  it("forces Art-Net output preferences to unicast target mode", () => {
    const parsed = deserialize(JSON.stringify({
      version: DOC_VERSION,
      name: "Art-Net Target Mode",
      positions: {},
      positionOrder: [],
      fixtures: {},
      fixtureOrder: [],
      venue: {},
      dmxOutput: {
        protocol: "artnet",
        targetMode: "multicast",
      },
    }));

    expect(parsed.dmxOutput.protocol).toBe("artnet");
    expect(parsed.dmxOutput.targetMode).toBe("unicast");
  });

  it("roundtrips named revisions", () => {
    const revision = newRevision({ name: "Rev A", note: "Focus notes", createdAt: 1 });
    const doc = addRevision(newShow({ name: "Revision Test" }), revision);

    const parsed = deserialize(serialize(doc));

    expect(parsed.activeRevisionId).toBe(revision.id);
    expect(parsed.revisionOrder).toEqual([revision.id]);
    expect(parsed.revisions[revision.id]).toEqual(expect.objectContaining({
      name: "Rev A",
      note: "Focus notes",
    }));
  });
});
