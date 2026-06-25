import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import PlotForge from "../PlotForge.jsx";

describe("PlotForge tools", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("migrates the old AI tool state to Wizard", () => {
    localStorage.setItem("plotforge-active-tool", "ai");

    render(React.createElement(PlotForge));
    fireEvent.click(screen.getByRole("button", { name: /Open editor/i }));

    expect(screen.getByRole("tab", { name: /Wizard/ })).toHaveAttribute("aria-selected", "true");
    expect(screen.queryByRole("tab", { name: /AI/ })).not.toBeInTheDocument();
  });
});
