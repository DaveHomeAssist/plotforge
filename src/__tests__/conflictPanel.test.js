import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { newShow, newPosition, newFixture, addPosition, addFixture } from "../domain/show.js";
import { conflictPanelRows } from "../domain/conflictPanel.js";
import { feetToMm } from "../domain/units.js";
import ConflictPanel from "../components/ConflictPanel.jsx";

function seedConflictShow() {
  let doc = newShow({ name: "Conflict Test" });
  const elec = newPosition({ name: "1ST ELEC", yMm: feetToMm(-8), lengthMm: feetToMm(28) });
  doc = addPosition(doc, elec);
  return { doc, elec };
}

describe("conflict panel", () => {
  it("lists DMX and channel conflicts with reveal fixture ids", () => {
    let { doc, elec } = seedConflictShow();
    doc = addFixture(doc, newFixture({
      positionId: elec.id,
      profileId: "spot_mh",
      xMm: feetToMm(-4),
      channel: 22,
      dmx: { universe: 1, address: 1 },
    }));
    doc = addFixture(doc, newFixture({
      positionId: elec.id,
      profileId: "s4_26",
      xMm: feetToMm(4),
      channel: 22,
      dmx: { universe: 1, address: 20 },
    }));

    const rows = conflictPanelRows(doc);

    expect(rows).toHaveLength(2);
    expect(rows.map(row => row.kind).sort()).toEqual(["channel", "dmx"]);
    expect(rows.every(row => row.fixtureIds.length === 2)).toBe(true);
    expect(rows.flatMap(row => row.fixtureLabels).every(label => label.includes("1ST ELEC"))).toBe(true);
  });

  it("returns an empty list when the patch is clear", () => {
    const { doc } = seedConflictShow();

    expect(conflictPanelRows(doc)).toEqual([]);
  });

  it("reveals the first fixture in a conflict row", () => {
    let { doc, elec } = seedConflictShow();
    doc = addFixture(doc, newFixture({
      positionId: elec.id,
      profileId: "spot_mh",
      xMm: feetToMm(-4),
      channel: 22,
      dmx: { universe: 1, address: 1 },
    }));
    doc = addFixture(doc, newFixture({
      positionId: elec.id,
      profileId: "s4_26",
      xMm: feetToMm(4),
      channel: 22,
      dmx: { universe: 1, address: 20 },
    }));
    const [firstRow] = conflictPanelRows(doc);
    const onRevealFixture = vi.fn();

    render(React.createElement(ConflictPanel, { doc, onRevealFixture }));
    fireEvent.click(screen.getAllByRole("button", { name: "Reveal" })[0]);

    expect(onRevealFixture).toHaveBeenCalledWith(firstRow.fixtureIds[0]);
  });
});
