import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import PlotStarterPanel from "../components/PlotStarterPanel.jsx";
import { seedShow } from "../PlotForge.jsx";

describe("PlotStarterPanel", () => {
  beforeEach(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: vi.fn().mockResolvedValue() },
    });
  });

  it("generates and applies a starter plan", () => {
    const onApplyStarter = vi.fn(plan => ({
      addedFixtureIds: plan.fixtureGroups.flatMap(group => Array.from({ length: group.count }, (_, index) => `${group.role}-${index}`)),
      addedPositionIds: plan.positions.map(position => position.key),
    }));

    render(React.createElement(PlotStarterPanel, {
      doc: seedShow(),
      onApplyStarter,
    }));

    expect(screen.getByRole("heading", { name: "Plot Wizard" })).toBeInTheDocument();
    expect(screen.getByText("Musical theatre")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Show type"), { target: { value: "concert" } });
    fireEvent.change(screen.getByLabelText("Width ft"), { target: { value: "48" } });
    fireEvent.change(screen.getByLabelText("Depth ft"), { target: { value: "28" } });
    fireEvent.change(screen.getByLabelText("Package"), { target: { value: "expanded" } });
    fireEvent.click(screen.getByRole("button", { name: "Preview plan" }));

    expect(screen.getAllByText("Concert").length).toBeGreaterThan(0);
    expect(screen.getByText("48 ft by 28 ft")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Apply plot" }));

    expect(onApplyStarter).toHaveBeenCalledTimes(1);
    expect(screen.getByText(/Applied \d+ fixtures on \d+ positions\./)).toBeInTheDocument();
  });

  it("copies the generated wizard prompt", async () => {
    render(React.createElement(PlotStarterPanel, {
      doc: seedShow(),
      onApplyStarter: vi.fn(),
    }));

    fireEvent.click(screen.getByRole("button", { name: "Copy prompt" }));

    await waitFor(() => expect(navigator.clipboard.writeText).toHaveBeenCalledTimes(1));
    expect(navigator.clipboard.writeText.mock.calls[0][0]).toContain("Use this PlotForge wizard context");
    expect(screen.getByText("Prompt copied.")).toBeInTheDocument();
  });
});
