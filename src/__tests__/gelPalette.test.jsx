import React from "react";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import GelPalette from "../components/GelPalette.jsx";
import { seedShow } from "../PlotForge.jsx";

describe("GelPalette", () => {
  it("renders gel counts from fixture colors", () => {
    render(React.createElement(GelPalette, { doc: seedShow() }));

    expect(screen.getByRole("heading", { name: "Gel palette" })).toBeInTheDocument();
    expect(screen.getByText("2 gels")).toBeInTheDocument();
    expect(screen.getByText("8 pulls")).toBeInTheDocument();

    const rows = screen.getAllByRole("row");
    const r02Row = rows.find(row => within(row).queryByText("R02"));
    const r119Row = rows.find(row => within(row).queryByText("R119"));

    expect(within(r02Row).getByText("5")).toBeInTheDocument();
    expect(within(r119Row).getByText("3")).toBeInTheDocument();
  });
});
