import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import SplashScreen from "../components/SplashScreen.jsx";
import { seedShow } from "../PlotForge.jsx";

function renderSplash(props = {}) {
  const defaults = {
    doc: seedShow(),
    theme: "dark",
    onToggleTheme: vi.fn(),
    onStart: vi.fn(),
    onOpen: vi.fn(() => Promise.resolve({ ok: false, aborted: true })),
    onLoadShow: vi.fn(),
    onImportDoc: vi.fn(),
  };
  const merged = { ...defaults, ...props };
  render(React.createElement(SplashScreen, merged));
  return merged;
}

describe("SplashScreen", () => {
  it("opens the current document in the editor", () => {
    const props = renderSplash();

    fireEvent.click(screen.getByRole("button", { name: /Open editor/i }));

    expect(props.onStart).toHaveBeenCalled();
  });

  it("toggles the app theme from the launch surface", () => {
    const props = renderSplash();

    fireEvent.click(screen.getByRole("button", { name: "Dark" }));

    expect(props.onToggleTheme).toHaveBeenCalled();
  });
});
