import { beforeEach, describe, expect, it } from "vitest";
import { seedShow } from "../PlotForge.jsx";
import {
  deleteRegistryShow,
  listRegistryShows,
  readRegistryShow,
  registryFileName,
  saveRegistryShow,
} from "../showRegistry.js";

function deleteRegistryDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.deleteDatabase("PlotForgeRegistry");
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
    req.onblocked = () => resolve();
  });
}

describe("show registry", () => {
  beforeEach(async () => {
    await deleteRegistryDB();
  });

  it("saves, lists, reads, and deletes show snapshots", async () => {
    const doc = seedShow();
    const saved = await saveRegistryShow(doc, { savedAt: 10 });

    expect(saved).toEqual(expect.objectContaining({
      id: doc.id,
      name: doc.name,
      fixtureCount: 10,
      positionCount: 3,
    }));

    const list = await listRegistryShows();
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe(doc.id);

    const loaded = await readRegistryShow(doc.id);
    expect(loaded.doc.name).toBe(doc.name);
    expect(loaded.doc.fixtureOrder).toHaveLength(10);

    await deleteRegistryShow(doc.id);
    expect(await listRegistryShows()).toEqual([]);
  });

  it("normalizes project filenames for share fallback", () => {
    expect(registryFileName({ name: "Studio A / Tech" })).toBe("studio_a_tech.plot");
    expect(registryFileName({ name: "" })).toBe("plotforge.plot");
  });
});
