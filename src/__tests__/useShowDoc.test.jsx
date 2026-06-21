import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import useShowDoc from "../hooks/useShowDoc.js";
import { seedShow } from "../PlotForge.jsx";
import { feetToMm } from "../domain/units.js";
import { saveProjectFile } from "../serialization.js";

vi.mock("../autosave.js", () => ({
  readAutosave: vi.fn(() => Promise.resolve(null)),
  writeAutosave: vi.fn(() => Promise.resolve()),
  deleteAutosave: vi.fn(() => Promise.resolve())
}));

vi.mock("../serialization.js", () => ({
  saveProjectFile: vi.fn(() => Promise.resolve({ ok: true, mode: "mock" })),
  openProjectFile: vi.fn(() => Promise.resolve({ ok: false, aborted: true }))
}));

describe("useShowDoc", () => {
  beforeEach(() => {
    saveProjectFile.mockResolvedValue({ ok: true, mode: "mock" });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("seedShow produces 3 positions and 10 fixtures", () => {
    const doc = seedShow();

    expect(doc.positionOrder).toHaveLength(3);
    expect(doc.fixtureOrder).toHaveLength(10);
  });

  it("onAddPosition adds a fourth position", () => {
    const { result } = renderHook(() => useShowDoc(seedShow));

    act(() => {
      result.current.onAddPosition();
    });

    expect(result.current.doc.positionOrder).toHaveLength(4);
  });

  it("onAddFixture adds a curated profile to the selected position", () => {
    const { result } = renderHook(() => useShowDoc(seedShow));
    const positionId = result.current.doc.positionOrder[0];
    let fixtureId = null;

    act(() => {
      fixtureId = result.current.onAddFixture(positionId, "robe_megapointe");
    });

    expect(fixtureId).toEqual(expect.stringMatching(/^fx_/));
    expect(result.current.doc.fixtureOrder).toHaveLength(11);
    expect(result.current.selectedFixtureId).toBe(fixtureId);
    expect(result.current.selectedPositionId).toBe(positionId);
    expect(result.current.doc.fixtures[fixtureId]).toEqual(expect.objectContaining({
      positionId,
      profileId: "robe_megapointe",
    }));
  });

  it("imports an Open Fixture Library profile into the document", () => {
    const { result } = renderHook(() => useShowDoc(seedShow));

    act(() => {
      result.current.onImportOpenFixtureLibraryProfile({
        name: "Tiny Wash",
        categories: ["Color Changer"],
        modes: [{ name: "RGBW", channels: ["red", "green", "blue", "white"] }],
      }, {
        manufacturerKey: "demo-maker",
        fixtureKey: "tiny-wash",
        importedAt: 123,
      });
    });

    expect(result.current.doc.fixtureProfiles.ofl_demo_maker_tiny_wash).toEqual(expect.objectContaining({
      manufacturer: "demo-maker",
      model: "Tiny Wash",
      dmxFootprint: 4,
      libraryTier: "ofl-import",
    }));
  });

  it("adds and activates named revisions", () => {
    const { result } = renderHook(() => useShowDoc(seedShow));
    let firstRevisionId = null;

    act(() => {
      firstRevisionId = result.current.onAddRevision({ name: "Rev A", note: "Issued for focus" });
    });
    act(() => {
      result.current.onAddRevision({ name: "Tech", note: "Updated patch" });
    });
    act(() => {
      result.current.onActivateRevision(firstRevisionId);
    });

    expect(result.current.doc.revisionOrder).toHaveLength(2);
    expect(result.current.doc.activeRevisionId).toBe(firstRevisionId);
    expect(result.current.doc.metadata.revision).toBe("Rev A");
  });

  it("onPositionChange updates the selected position name", () => {
    const { result } = renderHook(() => useShowDoc(seedShow));
    const positionId = result.current.doc.positionOrder[0];

    act(() => {
      result.current.onPositionChange(positionId, { name: "BALC PIPE" });
    });

    expect(result.current.doc.positions[positionId].name).toBe("BALC PIPE");
  });

  it("onPositionDelete removes a position and its attached fixtures", () => {
    const { result } = renderHook(() => useShowDoc(seedShow));
    const positionId = result.current.doc.positionOrder[0];
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);

    act(() => {
      result.current.onPositionDelete(positionId);
    });

    expect(confirm).toHaveBeenCalledWith("Delete this position and 5 fixtures?");
    expect(result.current.doc.positions[positionId]).toBeUndefined();
    expect(result.current.doc.positionOrder).toHaveLength(2);
    expect(result.current.doc.fixtureOrder).toHaveLength(5);
    expect(Object.values(result.current.doc.fixtures).some(fx => fx.positionId === positionId)).toBe(false);

    confirm.mockRestore();
  });

  it("onFixtureChange updates channel and DMX conflict count", () => {
    const { result } = renderHook(() => useShowDoc(seedShow));
    const [firstId, secondId] = result.current.doc.fixtureOrder;
    const secondFixture = result.current.doc.fixtures[secondId];

    expect(result.current.conflicts).toHaveLength(0);

    act(() => {
      result.current.onFixtureChange(firstId, {
        channel: secondFixture.channel,
        dmx: secondFixture.dmx
      });
    });

    expect(result.current.doc.fixtures[firstId].channel).toBe(secondFixture.channel);
    expect(result.current.conflicts).toHaveLength(1);
  });

  it("onFixtureDelete clears selectedFixtureId", () => {
    const { result } = renderHook(() => useShowDoc(seedShow));
    const fixtureId = result.current.doc.fixtureOrder[0];

    act(() => {
      result.current.onSelectFixture(fixtureId);
    });
    expect(result.current.selectedFixtureId).toBe(fixtureId);

    act(() => {
      result.current.onFixtureDelete(fixtureId);
    });

    expect(result.current.selectedFixtureId).toBeNull();
    expect(result.current.doc.fixtures[fixtureId]).toBeUndefined();
  });

  it("undo after a venue change restores prior dimensions", () => {
    const { result } = renderHook(() => useShowDoc(seedShow));
    const priorWidth = result.current.doc.venue.stageWidthMm;

    act(() => {
      result.current.onVenueChange({ stageWidthMm: feetToMm(42) });
    });
    expect(result.current.doc.venue.stageWidthMm).toBe(feetToMm(42));

    act(() => {
      result.current.history.undo();
    });

    expect(result.current.doc.venue.stageWidthMm).toBe(priorWidth);
  });

  it("onSave calls saveProjectFile with the doc and sanitized filename", async () => {
    const { result } = renderHook(() => useShowDoc(seedShow));

    await act(async () => {
      await result.current.onSave();
    });

    expect(saveProjectFile).toHaveBeenCalledWith(result.current.doc, "Studio_A_·_Spike.plot");
  });
});
