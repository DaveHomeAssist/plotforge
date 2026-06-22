import React from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import OscBridgePanel from "../components/OscBridgePanel.jsx";
import { seedShow } from "../PlotForge.jsx";

describe("OscBridgePanel", () => {
  it("renders route counts and bridge settings", () => {
    render(React.createElement(OscBridgePanel, {
      doc: seedShow(),
      selectedFixtureId: null,
      onBridgeChange: vi.fn(),
    }));

    expect(screen.getByRole("heading", { name: "OSC bridge" })).toBeInTheDocument();
    expect(screen.getByText("10 fixtures")).toBeInTheDocument();
    expect(screen.getByText("30 routes")).toBeInTheDocument();
    expect(screen.getByLabelText("OSC routes")).toBeInTheDocument();
    expect(screen.getByDisplayValue("/plotforge")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Send selected" })).toBeDisabled();
  });

  it("emits bridge setting changes", () => {
    const onBridgeChange = vi.fn();
    render(React.createElement(OscBridgePanel, {
      doc: seedShow(),
      selectedFixtureId: null,
      onBridgeChange,
    }));

    const relayInput = screen.getByDisplayValue("ws://127.0.0.1:8765");
    fireEvent.change(relayInput, { target: { value: "ws://127.0.0.1:9999" } });

    expect(onBridgeChange).toHaveBeenCalledWith({ relayUrl: "ws://127.0.0.1:9999" });
  });

  it("enables selected fixture send when a route exists", () => {
    const doc = seedShow();
    const selectedFixtureId = doc.fixtureOrder[0];
    render(React.createElement(OscBridgePanel, {
      doc,
      selectedFixtureId,
      onBridgeChange: vi.fn(),
    }));

    const routes = screen.getByLabelText("OSC routes");
    expect(within(routes).getAllByText("select")[0]).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Send selected" })).toBeEnabled();
  });
});
