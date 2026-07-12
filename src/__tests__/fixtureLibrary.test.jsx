import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import FixtureLibrary from "../components/FixtureLibrary.jsx";
import { seedShow } from "../PlotForge.jsx";
import { normalizeOpenFixtureLibraryProfile } from "../domain/profiles.js";

describe("FixtureLibrary", () => {
  it("searches expanded profiles and opens a detail page", () => {
    const doc = seedShow();
    const selectedPositionId = doc.positionOrder[0];
    const onAddFixture = vi.fn();

    render(React.createElement(FixtureLibrary, {
      doc,
      selectedPositionId,
      onAddFixture,
      onImportOpenFixtureLibraryProfile: vi.fn(),
    }));

    fireEvent.click(screen.getByRole("button", { name: "Legacy" }));
    fireEvent.change(screen.getByLabelText("Search"), { target: { value: "audience blinder" } });

    expect(screen.getByRole("heading", { name: "2 Lite Blinder" })).toBeInTheDocument();
    expect(screen.getByText("Audience blinder placeholder for concert and event plots.")).toBeInTheDocument();
    expect(screen.getAllByText("2 circuit").length).toBeGreaterThan(0);

    fireEvent.click(screen.getAllByRole("button", { name: "Add" })[0]);

    expect(onAddFixture).toHaveBeenCalledWith(selectedPositionId, "blinder_2lite");
  });

  it("shows output-ready, candidate, and paperwork-only profile states", () => {
    const doc = seedShow();
    doc.fixtureProfiles = {
      ofl_demo_tiny_wash: normalizeOpenFixtureLibraryProfile({
        manufacturer: "Demo",
        name: "Tiny Wash",
        categories: ["Color Changer"],
        modes: [{ name: "RGB Move", channels: ["Dimmer", "Red", "Green", "Blue", "Pan"] }],
      }, {
        manufacturerKey: "demo",
        fixtureKey: "tiny-wash",
        importedAt: 123,
      }),
    };

    render(React.createElement(FixtureLibrary, {
      doc,
      selectedPositionId: doc.positionOrder[0],
      onAddFixture: vi.fn(),
      onImportOpenFixtureLibraryProfile: vi.fn(),
    }));

    fireEvent.click(screen.getByRole("button", { name: "Legacy" }));
    fireEvent.change(screen.getByLabelText("Search"), { target: { value: "LED PAR" } });

    expect(screen.getAllByText("Output ready").length).toBeGreaterThan(0);
    expect(screen.getByLabelText("Output channel map")).toHaveTextContent("Dimmer");
    expect(screen.getByLabelText("Output channel map")).toHaveTextContent("Strobe");

    fireEvent.click(screen.getByRole("button", { name: "OFL" }));
    fireEvent.change(screen.getByLabelText("Search"), { target: { value: "Tiny Wash" } });

    expect(screen.getAllByText("Candidate map").length).toBeGreaterThan(0);
    expect(screen.getByLabelText("Output channel map")).toHaveTextContent("Pan");
    expect(screen.getByLabelText("Output channel map")).toHaveTextContent("panCoarse locked");

    fireEvent.click(screen.getByRole("button", { name: "GDTF" }));
    fireEvent.change(screen.getByLabelText("Search"), { target: { value: "Robe" } });

    expect(screen.getAllByText("Paperwork only").length).toBeGreaterThan(0);
    expect(screen.getByText(/No approved output map/)).toBeInTheDocument();
  });
});
