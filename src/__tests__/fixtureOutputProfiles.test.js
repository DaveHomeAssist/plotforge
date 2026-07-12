import { describe, expect, it } from "vitest";
import {
  DEFAULT_DMX_TEST_VALUES,
  FIXTURE_OUTPUT_SCHEMA_VERSION,
  getFixtureOutputCandidate,
  getFixtureOutputProfile,
  inferOutputProfileFromOpenFixtureLibrary,
  outputProfileStatus,
} from "../domain/fixtureOutputProfiles.js";

describe("fixture output profiles", () => {
  it("maps generic dimmers, RGBW fixtures, and simple moving spots", () => {
    const dimmer = getFixtureOutputProfile("s4_26");
    const led = getFixtureOutputProfile("led_par_rgbw");
    const mover = getFixtureOutputProfile("spot_mh");

    expect(dimmer).toEqual(expect.objectContaining({
      schemaVersion: FIXTURE_OUTPUT_SCHEMA_VERSION,
      label: "Generic 1ch dimmer",
      footprint: 1,
    }));
    expect(dimmer.channels).toEqual([
      expect.objectContaining({ slot: 1, type: "intensity", unsafe: false }),
    ]);
    expect(led.channels.map(channel => [channel.slot, channel.type, channel.unsafe])).toEqual([
      [1, "intensity", false],
      [2, "red", false],
      [3, "green", false],
      [4, "blue", false],
      [5, "white", false],
      [6, "strobe", true],
      [7, "raw", true],
      [8, "raw", true],
    ]);
    expect(mover.channels).toEqual(expect.arrayContaining([
      expect.objectContaining({ slot: 1, type: "intensity", unsafe: false }),
      expect.objectContaining({ slot: 2, type: "panCoarse", unsafe: true, safeMax: 0 }),
      expect.objectContaining({ slot: 10, type: "reset", unsafe: true, safeMax: 0 }),
    ]));
  });

  it("keeps the default test values limited to safe channel types", () => {
    expect(DEFAULT_DMX_TEST_VALUES).toEqual({
      intensity: 255,
      red: 255,
      green: 255,
      blue: 255,
      white: 0,
      amber: 0,
      uv: 0,
    });
  });

  it("infers unapproved OFL candidate maps from channel names", () => {
    const candidate = inferOutputProfileFromOpenFixtureLibrary({
      manufacturer: "Demo",
      name: "Tiny Wash",
      modes: [{
        name: "RGBA Move",
        channels: ["Dimmer", "Red", "Green", "Blue", "Pan", "Reset"],
      }],
    }, {
      profileId: "ofl_demo_tiny_wash",
      manufacturerKey: "demo",
      fixtureKey: "tiny-wash",
    });

    expect(candidate).toEqual(expect.objectContaining({
      id: "ofl_demo_tiny_wash-candidate-output-map",
      profileIds: ["ofl_demo_tiny_wash"],
      footprint: 6,
      source: expect.objectContaining({
        type: "open-fixture-library-candidate",
        approved: false,
      }),
    }));
    expect(candidate.channels).toEqual(expect.arrayContaining([
      expect.objectContaining({ slot: 1, type: "intensity", unsafe: false }),
      expect.objectContaining({ slot: 2, type: "red", unsafe: false }),
      expect.objectContaining({ slot: 5, type: "panCoarse", unsafe: true, safeMax: 0 }),
      expect.objectContaining({ slot: 6, type: "reset", unsafe: true, safeMax: 0 }),
    ]));
  });

  it("treats unapproved custom maps as candidates until explicitly approved", () => {
    const outputMap = inferOutputProfileFromOpenFixtureLibrary({
      manufacturer: "Demo",
      name: "Tiny Wash",
      modes: [{ name: "RGB", channels: ["Red", "Green", "Blue"] }],
    }, { profileId: "ofl_demo_tiny_wash" });
    const customProfiles = {
      ofl_demo_tiny_wash: { outputMap },
    };

    expect(outputProfileStatus("ofl_demo_tiny_wash", customProfiles).status).toBe("candidate");
    expect(getFixtureOutputCandidate("ofl_demo_tiny_wash", customProfiles)).toEqual(expect.objectContaining({
      label: expect.stringContaining("Tiny Wash"),
    }));
    expect(getFixtureOutputProfile("ofl_demo_tiny_wash", customProfiles)).toBeNull();

    customProfiles.ofl_demo_tiny_wash.outputMap = {
      ...outputMap,
      source: { ...outputMap.source, approved: true },
    };

    expect(outputProfileStatus("ofl_demo_tiny_wash", customProfiles).status).toBe("output-ready");
    expect(getFixtureOutputProfile("ofl_demo_tiny_wash", customProfiles)).toEqual(expect.objectContaining({
      profileIds: ["ofl_demo_tiny_wash"],
    }));
  });
});
