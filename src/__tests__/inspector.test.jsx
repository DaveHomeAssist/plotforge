import React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Inspector, { buildPendingPatch, draftFromFixture } from "../components/Inspector.jsx";
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
    circuit: "A1",
    dimmer: "D11",
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

  it("commits valid sibling fields while another field is invalid", () => {
    const { doc, fixtureId } = seedInspectorDoc();
    const onChange = vi.fn();
    render(React.createElement(Inspector, { doc, fixtureId, onChange, onDelete: vi.fn() }));

    fireEvent.change(screen.getByLabelText("Position"), { target: { value: "downstage a bit" } });
    fireEvent.change(screen.getByLabelText("Channel"), { target: { value: "22" } });
    act(() => vi.advanceTimersByTime(450));

    expect(screen.getByText("Use feet and inches, like 2'-6\".")).toBeInTheDocument();
    expect(onChange).toHaveBeenCalledWith(fixtureId, { channel: 22 });
  });

  it("reverts an invalid field on blur", () => {
    const { doc, fixtureId } = seedInspectorDoc();
    const onChange = vi.fn();
    render(React.createElement(Inspector, { doc, fixtureId, onChange, onDelete: vi.fn() }));
    const position = screen.getByLabelText("Position");

    fireEvent.change(position, { target: { value: "downstage a bit" } });
    fireEvent.blur(position);

    expect(position).toHaveValue("0\"");
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

  it("debounces fixture status changes", () => {
    const { doc, fixtureId } = seedInspectorDoc();
    const onChange = vi.fn();
    render(React.createElement(Inspector, { doc, fixtureId, onChange, onDelete: vi.fn() }));

    fireEvent.change(screen.getByLabelText("Status"), { target: { value: "focused" } });
    act(() => vi.advanceTimersByTime(450));

    expect(onChange).toHaveBeenCalledWith(fixtureId, { status: "focused" });
  });

  it("clears DMX when universe is cleared", () => {
    const { doc, fixtureId } = seedInspectorDoc();
    const onChange = vi.fn();
    render(React.createElement(Inspector, { doc, fixtureId, onChange, onDelete: vi.fn() }));

    fireEvent.change(screen.getByLabelText("Universe"), { target: { value: "" } });
    fireEvent.blur(screen.getByLabelText("Universe"));

    expect(screen.queryByText("Set universe before address.")).not.toBeInTheDocument();
    expect(onChange).toHaveBeenCalledWith(fixtureId, { dmx: null });
  });

  it("blocks address commits when no universe exists", () => {
    const { doc, fixtureId } = seedInspectorDoc();
    const fixture = doc.fixtures[fixtureId];
    const docWithoutDmx = {
      ...doc,
      fixtures: {
        ...doc.fixtures,
        [fixtureId]: { ...fixture, dmx: null },
      },
    };
    const onChange = vi.fn();
    render(React.createElement(Inspector, { doc: docWithoutDmx, fixtureId, onChange, onDelete: vi.fn() }));

    fireEvent.change(screen.getByLabelText("Address"), { target: { value: "101" } });
    act(() => vi.advanceTimersByTime(450));

    expect(screen.getByText("Set universe before address.")).toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
  });

  it("validates DMX address against fixture footprint", () => {
    const fixture = newFixture({
      positionId: "pos_1",
      profileId: "spot_mh",
      xMm: 0,
      dmx: { universe: 1, address: 1 },
    });
    const draft = {
      ...draftFromFixture(fixture),
      address: "512",
    };

    const pending = buildPendingPatch(fixture, draft, { dmxFootprint: 24 });

    expect(pending.errors.address).toBe("Address must be 1 to 489.");
    expect(pending.patch).toBeNull();
  });

  it("increments numeric fields with arrow keys", () => {
    const { doc, fixtureId } = seedInspectorDoc();
    const onChange = vi.fn();
    render(React.createElement(Inspector, { doc, fixtureId, onChange, onDelete: vi.fn() }));
    const channel = screen.getByLabelText("Channel");

    fireEvent.keyDown(channel, { key: "ArrowUp" });
    expect(channel).toHaveValue("12");
    act(() => vi.advanceTimersByTime(450));

    expect(onChange).toHaveBeenCalledWith(fixtureId, { channel: 12 });
  });

  it("shows the multi selection state while editing the primary fixture", () => {
    const { doc, fixtureId } = seedInspectorDoc();
    render(React.createElement(Inspector, {
      doc,
      fixtureId,
      selectedFixtureIds: [fixtureId, "fx_a", "fx_b"],
      onChange: vi.fn(),
      onDelete: vi.fn(),
    }));

    expect(screen.getByText("3 FIXTURES SELECTED")).toBeInTheDocument();
  });

  it("flushes a valid draft on unmount", () => {
    const { doc, fixtureId } = seedInspectorDoc();
    const onChange = vi.fn();
    const { unmount } = render(React.createElement(Inspector, { doc, fixtureId, onChange, onDelete: vi.fn() }));

    fireEvent.change(screen.getByLabelText("Color"), { target: { value: "R26" } });
    unmount();

    expect(onChange).toHaveBeenCalledWith(fixtureId, { color: "R26" });
  });

  it("debounces layered note changes", () => {
    const { doc, fixtureId } = seedInspectorDoc();
    const onChange = vi.fn();
    render(React.createElement(Inspector, { doc, fixtureId, onChange, onDelete: vi.fn() }));

    fireEvent.change(screen.getByLabelText("Focus note"), { target: { value: "Chair special" } });
    act(() => vi.advanceTimersByTime(450));

    expect(onChange).toHaveBeenCalledWith(fixtureId, {
      notes: {
        color: "",
        gobo: "",
        focus: "Chair special",
        crew: "Warm front",
      },
      note: "Warm front",
    });
  });

  it("debounces circuit and dimmer changes", () => {
    const { doc, fixtureId } = seedInspectorDoc();
    const onChange = vi.fn();
    render(React.createElement(Inspector, { doc, fixtureId, onChange, onDelete: vi.fn() }));

    fireEvent.change(screen.getByLabelText("Circuit"), { target: { value: " A7 " } });
    fireEvent.change(screen.getByLabelText("Dimmer"), { target: { value: " D17 " } });
    act(() => vi.advanceTimersByTime(450));

    expect(onChange).toHaveBeenCalledWith(fixtureId, { circuit: "A7", dimmer: "D17" });
  });
});
