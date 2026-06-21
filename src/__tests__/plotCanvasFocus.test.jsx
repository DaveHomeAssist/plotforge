import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import PlotCanvas from "../components/PlotCanvas.jsx";
import { newShow, newPosition, newFixture, addPosition, addFixture, updateFixture } from "../domain/show.js";
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
    selectedPositionId: null,
    onSelectFixture: vi.fn(),
    onSelectPosition: vi.fn(),
    onMoveFixture: vi.fn(),
    onSetFixtureFocus: vi.fn(),
    onClearFixtureFocus: vi.fn(),
    ...props,
  }));
  const svg = rendered.container.querySelector("svg");
  svg.getBoundingClientRect = () => ({ left: 0, top: 0, width: 800, height: 600 });
  return { ...rendered, svg };
}

describe("PlotCanvas focus tool", () => {
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
});
