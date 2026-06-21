import React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Inspector from "../components/Inspector.jsx";
import { newShow, newPosition, newFixture, addPosition, addFixture } from "../domain/show.js";
import { feetToMm } from "../domain/units.js";

function seedInspectorDoc() {
  let doc = newShow({ name: "Inspector Test" });
  const position = newPosition({ name: "1ST ELEC", yMm: feetToMm(-8), lengthMm: feetToMm(28) });
  doc = addPosition(doc, position);
  doc = addFixture(doc, newFixture({
    positionId: position.id,
    profileId: "s4_26",
    xMm: 0,
    channel: 11,
    dmx: { universe: 1, address: 41 },
    color: "R02",
    note: "Warm front",
  }));
  return { doc, fixtureId: doc.fixtureOrder[0] };
}

describe("Inspector", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it("debounces fixture edits before committing", () => {
    const { doc, fixtureId } = seedInspectorDoc();
    const onChange = vi.fn();
    render(React.createElement(Inspector, { doc, fixtureId, onChange, onDelete: vi.fn() }));

    fireEvent.change(screen.getByLabelText("Channel"), { target: { value: "22" } });

    expect(onChange).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(449));
    expect(onChange).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1));

    expect(onChange).toHaveBeenCalledWith(fixtureId, { channel: 22 });
  });

  it("parses fixture position as imperial text", () => {
    const { doc, fixtureId } = seedInspectorDoc();
    const onChange = vi.fn();
    render(React.createElement(Inspector, { doc, fixtureId, onChange, onDelete: vi.fn() }));

    fireEvent.change(screen.getByLabelText("Position"), { target: { value: "3 ft 6 in" } });
    act(() => vi.advanceTimersByTime(450));

    expect(onChange).toHaveBeenCalledWith(fixtureId, { xMm: Math.round(3 * 304.8 + 6 * 25.4) });
  });

  it("shows invalid position input without committing", () => {
    const { doc, fixtureId } = seedInspectorDoc();
    const onChange = vi.fn();
    render(React.createElement(Inspector, { doc, fixtureId, onChange, onDelete: vi.fn() }));

    fireEvent.change(screen.getByLabelText("Position"), { target: { value: "downstage a bit" } });
    act(() => vi.advanceTimersByTime(450));

    expect(screen.getByText("Use feet and inches, like 2'-6\".")).toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
  });

  it("flushes a valid edit on blur", () => {
    const { doc, fixtureId } = seedInspectorDoc();
    const onChange = vi.fn();
    render(React.createElement(Inspector, { doc, fixtureId, onChange, onDelete: vi.fn() }));
    const color = screen.getByLabelText("Color");

    fireEvent.change(color, { target: { value: "R26" } });
    fireEvent.blur(color);

    expect(onChange).toHaveBeenCalledWith(fixtureId, { color: "R26" });
  });
});
