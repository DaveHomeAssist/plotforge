import { describe, expect, it } from "vitest";
import { deserialize, serialize } from "../serialization.js";
import { DOC_VERSION, newRevision, newShow, addRevision, updateProjectMetadata } from "../domain/show.js";

describe("serialization", () => {
  it("roundtrips project metadata", () => {
    const doc = updateProjectMetadata(newShow({ name: "Save Test" }), {
      venueName: "North Hall",
      designer: "Sam LD",
      revision: "Tech",
    });

    const parsed = deserialize(serialize(doc));

    expect(parsed.version).toBe(DOC_VERSION);
    expect(parsed.metadata).toEqual(expect.objectContaining({
      venueName: "North Hall",
      designer: "Sam LD",
      revision: "Tech",
    }));
  });

  it("migrates older documents with default metadata", () => {
    const parsed = deserialize(JSON.stringify({
      version: 1,
      name: "Legacy Plot",
      positions: {},
      positionOrder: [],
      fixtures: {},
      fixtureOrder: [],
      venue: {},
    }));

    expect(parsed.version).toBe(DOC_VERSION);
    expect(parsed.metadata).toEqual(expect.objectContaining({
      drawingTitle: "Lighting Plot",
      venueName: "Studio A",
      revision: "Draft",
    }));
    expect(parsed.fixtureProfiles).toEqual({});
    expect(parsed.revisions).toEqual({});
    expect(parsed.revisionOrder).toEqual([]);
    expect(parsed.activeRevisionId).toBeNull();
  });

  it("roundtrips named revisions", () => {
    const revision = newRevision({ name: "Rev A", note: "Focus notes", createdAt: 1 });
    const doc = addRevision(newShow({ name: "Revision Test" }), revision);

    const parsed = deserialize(serialize(doc));

    expect(parsed.activeRevisionId).toBe(revision.id);
    expect(parsed.revisionOrder).toEqual([revision.id]);
    expect(parsed.revisions[revision.id]).toEqual(expect.objectContaining({
      name: "Rev A",
      note: "Focus notes",
    }));
  });
});
