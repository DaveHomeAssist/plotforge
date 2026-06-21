import { describe, expect, it } from "vitest";
import { addFixture, addPosition, newFixture, newPosition, newShow } from "../domain/show.js";
import { circuitDisplay, circuitSummary, normalizeCircuitPatch } from "../domain/circuiting.js";
import { feetToMm } from "../domain/units.js";

function seedCircuitDoc() {
  let doc = newShow({ name: "Circuit Test" });
  const position = newPosition({ name: "1ST ELEC", yMm: feetToMm(-8), lengthMm: feetToMm(30) });
  doc = addPosition(doc, position);
  doc = addFixture(doc, newFixture({
    positionId: position.id,
    profileId: "s4_26",
    xMm: feetToMm(-4),
    channel: 11,
    circuit: " A1 ",
    dimmer: " Rack 1 ",
  }));
  doc = addFixture(doc, newFixture({
    positionId: position.id,
    profileId: "s4_26",
    xMm: feetToMm(4),
    channel: 12,
    circuit: "A1",
    dimmer: "Rack 1",
  }));
  doc = addFixture(doc, newFixture({
    positionId: position.id,
    profileId: "s4_26",
    xMm: feetToMm(8),
    channel: 13,
    dimmer: "Rack 2",
  }));
  doc = addFixture(doc, newFixture({
    positionId: position.id,
    profileId: "s4_26",
    xMm: feetToMm(12),
    channel: 14,
  }));
  return doc;
}

describe("circuiting", () => {
  it("normalizes patch values", () => {
    expect(normalizeCircuitPatch({ circuit: " A  12 ", dimmer: null })).toEqual({
      circuit: "A 12",
      dimmer: "",
    });
  });

  it("formats readable circuit labels", () => {
    expect(circuitDisplay({ circuit: "A1", dimmer: "Rack 1" })).toBe("Circuit A1 / Dimmer Rack 1");
    expect(circuitDisplay({ circuit: "A1" })).toBe("Circuit A1");
    expect(circuitDisplay({})).toBe("Unassigned");
  });

  it("summarizes assigned, partial, missing, and shared circuit rows", () => {
    const summary = circuitSummary(seedCircuitDoc());

    expect(summary.assignedCount).toBe(3);
    expect(summary.missingCount).toBe(1);
    expect(summary.partialCount).toBe(1);
    expect(summary.sharedCount).toBe(1);
    expect(summary.rows.find(row => row.circuit === "A1")).toEqual(expect.objectContaining({
      dimmer: "Rack 1",
      isShared: true,
      fixtureIds: expect.arrayContaining([expect.any(String)]),
    }));
    expect(summary.partialFixtureLabels[0]).toContain("ch 13");
    expect(summary.missingFixtureLabels[0]).toContain("ch 14");
  });
});
