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

    expect(screen.getByRole("heading", { name: "AI plot starter" })).toBeInTheDocument();
    expect(screen.getByText("Musical theatre")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Brief"), {
      target: { value: "concert in a 48x28 club with moving lights" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Generate" }));

    expect(screen.getByText("Concert")).toBeInTheDocument();
    expect(screen.getByText("48 ft by 28 ft")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Apply starter" }));

    expect(onApplyStarter).toHaveBeenCalledTimes(1);
    expect(screen.getByText(/Applied \d+ fixtures on \d+ positions\./)).toBeInTheDocument();
  });

  it("copies the generated AI prompt", async () => {
    render(React.createElement(PlotStarterPanel, {
      doc: seedShow(),
      onApplyStarter: vi.fn(),
    }));

    fireEvent.click(screen.getByRole("button", { name: "Copy prompt" }));

    await waitFor(() => expect(navigator.clipboard.writeText).toHaveBeenCalledTimes(1));
    expect(navigator.clipboard.writeText.mock.calls[0][0]).toContain("Use this PlotForge starter context");
    expect(screen.getByText("Prompt copied.")).toBeInTheDocument();
  });
});
