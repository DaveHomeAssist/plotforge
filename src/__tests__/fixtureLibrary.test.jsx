import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import FixtureLibrary from "../components/FixtureLibrary.jsx";
import { seedShow } from "../PlotForge.jsx";

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
});
