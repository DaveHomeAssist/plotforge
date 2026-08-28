import { describe, expect, it } from "vitest";
import goldenDoc from "./fixtures/dmx-output/golden-doc.json";
import blackoutVector from "./fixtures/dmx-output/blackout-buffer.json";
import selectedLedVector from "./fixtures/dmx-output/selected-led-buffer.json";
import {
  compileDmxOutput,
  DMX_OUTPUT_INTENTS,
  DMX_SLOT_COUNT,
  summarizeDmxOutput,
} from "../domain/dmxOutput.js";

function expandSparseSlots(expected) {
  const slots = Array(expected.slotCount).fill(0);
  for (const item of expected.nonZeroSlots) {
    slots[item.address - 1] = item.value;
  }
  return slots;
}

function compileSelectedLed(doc = goldenDoc) {
  return compileDmxOutput(doc, {
    intent: selectedLedVector.intent.type,
    selectedFixtureId: selectedLedVector.intent.selectedFixtureId,
    values: selectedLedVector.intent.values,
  });
}

describe("DMX output compiler", () => {
  it("compiles a selected fixture test into a deterministic 512 slot buffer", () => {
    const result = compileSelectedLed();
    const repeat = compileSelectedLed();
    const universe = result.universes.find(item => item.universe === selectedLedVector.expected.universe);

    expect(result.blocked).toBe(false);
    expect(universe.slots).toHaveLength(DMX_SLOT_COUNT);
    expect(universe.slots).toEqual(expandSparseSlots(selectedLedVector.expected));
    expect(repeat.universes[0].slots).toEqual(universe.slots);
    expect(universe.nonZeroSlots.map(({ address, value, type }) => ({ address, value, type })))
      .toEqual(selectedLedVector.expected.nonZeroSlots);
    for (const address of selectedLedVector.expected.zeroAddresses) {
      expect(universe.slots[address - 1]).toBe(0);
    }
  });

  it("compiles blackout as all zero for every active universe", () => {
    const result = compileDmxOutput(goldenDoc, { intent: blackoutVector.intent.type });

    expect(result.blocked).toBe(false);
    expect(result.universes).toHaveLength(1);
    expect(result.universes[0].slots).toHaveLength(blackoutVector.expected.slotCount);
    expect(result.universes[0].slots.every(value => value === 0)).toBe(true);
    expect(result.universes[0].nonZeroSlots).toEqual(blackoutVector.expected.nonZeroSlots);
  });

  it("blocks output when a DMX range is invalid", () => {
    const doc = structuredClone(goldenDoc);
    doc.fixtures.fx_mover_one.dmx.address = 500;
    const result = compileSelectedLed(doc);

    expect(result.blocked).toBe(true);
    expect(result.errors).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "invalid-range", fixtureId: "fx_mover_one" }),
    ]));
    expect(result.universes[0].slots.every(value => value === 0)).toBe(true);
  });

  it("blocks output when fixture ranges overlap", () => {
    const doc = structuredClone(goldenDoc);
    doc.fixtures.fx_s4_one.dmx.address = 12;
    const result = compileSelectedLed(doc);

    expect(result.blocked).toBe(true);
    expect(result.errors).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "overlap", fixtureIds: ["fx_led_one", "fx_s4_one"] }),
    ]));
    expect(result.universes[0].slots.every(value => value === 0)).toBe(true);
  });

  it("warns for unknown personalities and emits no mapped values for them", () => {
    const doc = structuredClone(goldenDoc);
    doc.fixtures.fx_mover_one.profileId = "unknown_spot_profile";
    const result = compileDmxOutput(doc, {
      intent: DMX_OUTPUT_INTENTS.selectedFixtureTest,
      selectedFixtureId: "fx_mover_one",
      values: { intensity: 255 },
    });

    expect(result.blocked).toBe(false);
    expect(result.warnings).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "unmapped-personality", fixtureId: "fx_mover_one" }),
    ]));
    expect(result.universes[0].slots.every(value => value === 0)).toBe(true);
  });

  it("maps simple moving-light intensity while keeping unsafe channels at zero", () => {
    const result = compileDmxOutput(goldenDoc, {
      intent: DMX_OUTPUT_INTENTS.selectedFixtureTest,
      selectedFixtureId: "fx_mover_one",
      values: {
        intensity: 255,
        panCoarse: 255,
        panFine: 255,
        tiltCoarse: 255,
        tiltFine: 255,
        reset: 255,
      },
    });
    const universe = result.universes[0];

    expect(result.blocked).toBe(false);
    expect(result.warnings).toEqual([]);
    expect(universe.slots[39]).toBe(255);
    for (const address of [41, 42, 43, 44, 45, 46, 47, 48, 49]) {
      expect(universe.slots[address - 1]).toBe(0);
    }
    expect(universe.nonZeroSlots).toEqual([
      expect.objectContaining({
        address: 40,
        type: "intensity",
        explanation: "Generic simple moving spot 24ch slot 1 writes intensity (Dimmer)",
      }),
    ]);
  });

  it("returns a universe inspector report with fixture ranges and summary counts", () => {
    const result = compileSelectedLed();
    const summary = summarizeDmxOutput(result);
    const universe = result.universes[0];

    expect(summary).toEqual({
      blocked: false,
      universeCount: 1,
      patchedFixtureCount: 3,
      errorCount: 0,
      warningCount: 0,
      nonZeroSlotCount: 5,
    });
    expect(universe.usedRanges.map(range => ({
      fixtureId: range.fixtureId,
      startAddress: range.startAddress,
      endAddress: range.endAddress,
      outputStatus: range.outputStatus,
    }))).toEqual([
      { fixtureId: "fx_s4_one", startAddress: 1, endAddress: 1, outputStatus: "ready" },
      { fixtureId: "fx_led_one", startAddress: 10, endAddress: 17, outputStatus: "selected" },
      { fixtureId: "fx_mover_one", startAddress: 40, endAddress: 63, outputStatus: "ready" },
    ]);
  });
});
