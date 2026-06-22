import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import InteropPanel from "../components/InteropPanel.jsx";
import { seedShow } from "../PlotForge.jsx";

describe("InteropPanel", () => {
  it("renders interop counts and parked MVR state", () => {
    render(React.createElement(InteropPanel, { doc: seedShow() }));

    expect(screen.getByRole("heading", { name: "Interop manifest" })).toBeInTheDocument();
    expect(screen.getByText("10 fixtures")).toBeInTheDocument();
    expect(screen.getByText("0 GDTF refs")).toBeInTheDocument();
    expect(screen.getByText("MVR import parser parked on sample files.")).toBeInTheDocument();
  });
});
