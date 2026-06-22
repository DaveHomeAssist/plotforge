import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import ShowRegistryPanel from "../components/ShowRegistryPanel.jsx";
import { seedShow } from "../PlotForge.jsx";

function deleteRegistryDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.deleteDatabase("PlotForgeRegistry");
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
    req.onblocked = () => resolve();
  });
}

describe("ShowRegistryPanel", () => {
  beforeEach(async () => {
    await deleteRegistryDB();
  });

  it("saves and loads a show from the registry", async () => {
    const onLoadShow = vi.fn();
    render(React.createElement(ShowRegistryPanel, { doc: seedShow(), onLoadShow }));

    expect(await screen.findByText("No saved shows.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByText("Studio A · Spike")).toBeInTheDocument();
    expect(screen.getAllByText(/10 fixtures/).length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole("button", { name: "Load" }));
    await waitFor(() => expect(onLoadShow).toHaveBeenCalledTimes(1));
    expect(onLoadShow.mock.calls[0][0].name).toBe("Studio A · Spike");
  });
});
