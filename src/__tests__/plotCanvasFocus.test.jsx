import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import PlotCanvas from "../components/PlotCanvas.jsx";
import { newShow, newPosition, newFixture, addPosition, addFixture, updateFixture, newCommentPin, addCommentPin } from "../domain/show.js";
import { feetToMm } from "../domain/units.js";

function seedCanvasDoc({ withFocus = false } = {}) {
  let doc = newShow({ name: "Canvas Test" });
  const position = newPosition({ name: "1ST ELEC", yMm: feetToMm(-8), lengthMm: feetToMm(28) });
  doc = addPosition(doc, position);
  const fixture = newFixture({ positionId: position.id, profileId: "s4_26", xMm: 0 });
  doc = addFixture(doc, fixture);
  if (withFocus) {
    doc = updateFixture(doc, fixture.id, { focus: { xMm: feetToMm(2), yMm: feetToMm(-2) } });
  }
  return { doc, fixtureId: fixture.id };
}

function renderCanvas(doc, fixtureId, props = {}) {
  const rendered = render(React.createElement(PlotCanvas, {
    doc,
    selectedFixtureId: fixtureId,
    selectedFixtureIds: fixtureId ? [fixtureId] : [],
    selectedPositionId: null,
    selectedCommentPinId: null,
    onSelectFixture: vi.fn(),
    onSelectPosition: vi.fn(),
    onSelectCommentPin: vi.fn(),
    onMoveFixture: vi.fn(),
    onSetFixtureFocus: vi.fn(),
    onClearFixtureFocus: vi.fn(),
    onAddCommentPin: vi.fn(),
    ...props,
  }));
  const svg = rendered.container.querySelector("svg");
  svg.getBoundingClientRect = () => ({ left: 0, top: 0, width: 800, height: 600 });
  return { ...rendered, svg };
}

describe("PlotCanvas focus tool", () => {
  it("renders fixture status markers on the plot", () => {
    let { doc, fixtureId } = seedCanvasDoc();
    doc = updateFixture(doc, fixtureId, { status: "needs_work" });
    const { container } = renderCanvas(doc, fixtureId);
    const marker = container.querySelector(".fixture-status-marker");

    expect(marker).not.toBeNull();
    expect(marker.getAttribute("fill")).toBe("#ff6b6b");
  });

  it("renders every selected fixture with selected styling", () => {
    let { doc, fixtureId } = seedCanvasDoc();
    const positionId = doc.fixtures[fixtureId].positionId;
    const secondFixture = newFixture({ positionId, profileId: "s4_26", xMm: feetToMm(4) });
    doc = addFixture(doc, secondFixture);
    const { container } = renderCanvas(doc, fixtureId, {
      selectedFixtureIds: [fixtureId, secondFixture.id],
    });

    expect(container.querySelectorAll(".fx--selected")).toHaveLength(2);
  });

  it("uses additive selection for modifier clicks", () => {
    const { doc, fixtureId } = seedCanvasDoc();
    const onSelectFixture = vi.fn();
    const onMoveFixture = vi.fn();
    const { container } = renderCanvas(doc, null, {
      onSelectFixture,
      onMoveFixture,
      selectedFixtureIds: [],
    });
    const fixtureNode = container.querySelector(".fx");

    fireEvent.pointerDown(fixtureNode, { button: 0, clientX: 400, clientY: 300, pointerId: 1, shiftKey: true });

    expect(onSelectFixture).toHaveBeenCalledWith(fixtureId, { additive: true });
    expect(onMoveFixture).not.toHaveBeenCalled();
  });

  it("sets selected fixture focus by clicking the plot in focus mode", () => {
    const { doc, fixtureId } = seedCanvasDoc();
    const onSetFixtureFocus = vi.fn();
    const { svg } = renderCanvas(doc, fixtureId, { onSetFixtureFocus });

    fireEvent.click(screen.getByRole("button", { name: "Focus" }));
    fireEvent.pointerDown(svg, { button: 0, clientX: 400, clientY: 300, pointerId: 1 });

    expect(onSetFixtureFocus).toHaveBeenCalledWith(fixtureId, expect.objectContaining({
      xMm: expect.any(Number),
      yMm: expect.any(Number),
    }));
  });

  it("renders existing focus beams and clears selected focus", () => {
    const { doc, fixtureId } = seedCanvasDoc({ withFocus: true });
    const onClearFixtureFocus = vi.fn();
    const { container } = renderCanvas(doc, fixtureId, { onClearFixtureFocus });

    expect(container.querySelector(".focus-beam")).not.toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Clear focus" }));

    expect(onClearFixtureFocus).toHaveBeenCalledWith(fixtureId);
  });

  it("adds a comment pin by clicking the plot in comment mode", () => {
    const { doc, fixtureId } = seedCanvasDoc();
    const onAddCommentPin = vi.fn();
    const { svg } = renderCanvas(doc, fixtureId, { onAddCommentPin });

    fireEvent.click(screen.getByRole("button", { name: "Comment" }));
    fireEvent.pointerDown(svg, { button: 0, clientX: 400, clientY: 300, pointerId: 1 });

    expect(onAddCommentPin).toHaveBeenCalledWith(expect.objectContaining({
      xMm: expect.any(Number),
      yMm: expect.any(Number),
    }));
  });

  it("renders and selects comment pins", () => {
    let { doc, fixtureId } = seedCanvasDoc();
    const pin = newCommentPin({ xMm: feetToMm(2), yMm: feetToMm(-3), text: "Sightline check" });
    doc = addCommentPin(doc, pin);
    const onSelectCommentPin = vi.fn();
    const { container } = renderCanvas(doc, fixtureId, {
      selectedCommentPinId: pin.id,
      onSelectCommentPin,
    });
    const pinNode = container.querySelector(".comment-pin");

    expect(pinNode.classList.contains("comment-pin--selected")).toBe(true);
    fireEvent.pointerDown(pinNode, { button: 0, pointerId: 1 });

    expect(onSelectCommentPin).toHaveBeenCalledWith(pin.id);
  });
});
