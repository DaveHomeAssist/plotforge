/**
 * Coverage for the 2026-08 feature drop:
 * F1 command-palette query · F2 systems + migration · F3 rig check
 * F4 revision snapshots/diff · F5 focus charts.
 */
import { describe, expect, it } from "vitest";
import {
  newShow, newPosition, newFixture, newSystem, newRevision,
  addPosition, addFixture, addSystem, addRevision, removeSystem, removeFixture,
  systemFixtureIds, attachRevisionSnapshot, updateFixture, DOC_VERSION,
} from "../domain/show.js";
import { feetToMm } from "../domain/units.js";
import { queryFixtures } from "../domain/query.js";
import { rigCheckOrder, rigCheckSummary, nextRigCheckFixture, previousRigCheckFixture } from "../domain/rigCheck.js";
import { makeRevisionSnapshot, diffAgainstSnapshot, changeListText } from "../domain/revisionDiff.js";
import { focusChartHtml, focusChartPages, magicSheetGroups } from "../domain/focusChart.js";
import { serialize, deserialize, migrate } from "../serialization.js";

function rig() {
  let doc = newShow({ name: "Feature Rig" });
  const elec1 = newPosition({ name: "1ST ELEC", kind: "pipe", yMm: feetToMm(-8), lengthMm: feetToMm(28), trimMm: feetToMm(22) });
  const elec2 = newPosition({ name: "2ND ELEC", kind: "pipe", yMm: feetToMm(-14), lengthMm: feetToMm(28), trimMm: feetToMm(22) });
  doc = addPosition(doc, elec1);
  doc = addPosition(doc, elec2);
  [-12, 0, 12].forEach((ft, i) => {
    doc = addFixture(doc, newFixture({
      positionId: elec1.id, profileId: "s4_26", xMm: feetToMm(ft),
      channel: 11 + i, dmx: { universe: 1, address: 1 + i * 4 }, color: "R80",
      notes: { color: "", gobo: "breakup", focus: "hits center", crew: "" },
    }));
  });
  [-6, 6].forEach((ft, i) => {
    doc = addFixture(doc, newFixture({
      positionId: elec2.id, profileId: "fresnel", xMm: feetToMm(ft),
      channel: 412 + i, dmx: { universe: 2, address: 1 + i * 4 }, color: "L201",
    }));
  });
  return { doc, elec1, elec2 };
}

describe("F1 — command palette query", () => {
  it("finds a fixture by exact channel with top score", () => {
    const { doc } = rig();
    const hits = queryFixtures(doc, "412");
    expect(hits.length).toBeGreaterThan(0);
    expect(doc.fixtures[hits[0].fixtureId].channel).toBe(412);
  });

  it("matches dmx universe/address pairs", () => {
    const { doc } = rig();
    const hits = queryFixtures(doc, "2/5");
    expect(hits).toHaveLength(1);
    expect(doc.fixtures[hits[0].fixtureId].dmx).toEqual({ universe: 2, address: 5 });
  });

  it("ANDs tokens: gel + position narrows to one pipe", () => {
    const { doc, elec2 } = rig();
    const hits = queryFixtures(doc, "l201 2nd");
    expect(hits).toHaveLength(2);
    hits.forEach(hit => expect(doc.fixtures[hit.fixtureId].positionId).toBe(elec2.id));
  });

  it("matches instrument text and unit token", () => {
    const { doc } = rig();
    expect(queryFixtures(doc, "fresnel")).toHaveLength(2);
    expect(queryFixtures(doc, "u1").length).toBeGreaterThan(0);
  });

  it("returns nothing for a blank or unmatched query", () => {
    const { doc } = rig();
    expect(queryFixtures(doc, "")).toHaveLength(0);
    expect(queryFixtures(doc, "megapointe")).toHaveLength(0);
  });
});

describe("F2 — systems", () => {
  it("saves, selects, and deletes a named system", () => {
    const { doc } = rig();
    const ids = doc.fixtureOrder.slice(0, 2);
    const system = newSystem({ name: "Front Wash R80", fixtureIds: ids });
    let next = addSystem(doc, system);
    expect(next.systemOrder).toContain(system.id);
    expect(systemFixtureIds(next, system.id)).toEqual(ids);
    next = removeSystem(next, system.id);
    expect(next.systems[system.id]).toBeUndefined();
    expect(next.systemOrder).not.toContain(system.id);
  });

  it("strips deleted fixtures from systems", () => {
    const { doc } = rig();
    const ids = doc.fixtureOrder.slice(0, 2);
    const system = newSystem({ name: "Wash", fixtureIds: ids });
    let next = addSystem(doc, system);
    next = removeFixture(next, ids[0]);
    expect(systemFixtureIds(next, system.id)).toEqual([ids[1]]);
    expect(next.systems[system.id].fixtureIds).toEqual([ids[1]]);
  });

  it("migrates v9 docs to v10 with empty systems and snapshots", () => {
    const { doc } = rig();
    const legacy = { ...JSON.parse(serialize(doc)), version: 9 };
    delete legacy.systems;
    delete legacy.systemOrder;
    delete legacy.revisionSnapshots;
    const migrated = migrate(legacy);
    expect(migrated.version).toBe(DOC_VERSION);
    expect(migrated.systems).toEqual({});
    expect(migrated.systemOrder).toEqual([]);
    expect(migrated.revisionSnapshots).toEqual({});
  });

  it("round-trips systems through serialize/deserialize", () => {
    const { doc } = rig();
    const system = newSystem({ name: "Roundtrip", fixtureIds: [doc.fixtureOrder[0]] });
    const withSystem = addSystem(doc, system);
    const back = deserialize(serialize(withSystem));
    expect(back.systems[system.id].name).toBe("Roundtrip");
  });
});

describe("F3 — rig check", () => {
  it("walks positions in order, stage right to left", () => {
    const { doc } = rig();
    const order = rigCheckOrder(doc);
    expect(order).toHaveLength(5);
    const xs = order.slice(0, 3).map(id => doc.fixtures[id].xMm);
    expect(xs).toEqual([...xs].sort((a, b) => a - b));
  });

  it("summarizes checked counts as statuses land", () => {
    const { doc } = rig();
    expect(rigCheckSummary(doc)).toMatchObject({ total: 5, checked: 0 });
    const next = updateFixture(doc, doc.fixtureOrder[0], { status: "focused" });
    expect(rigCheckSummary(next)).toMatchObject({ total: 5, checked: 1 });
    expect(rigCheckSummary(next).counts.focused).toBe(1);
  });

  it("prefers the next unchecked fixture and wraps", () => {
    const { doc } = rig();
    const order = rigCheckOrder(doc);
    let next = doc;
    for (const id of order.slice(1)) next = updateFixture(next, id, { status: "hung" });
    // Everything but order[0] is checked: from the end, walk wraps to order[0].
    expect(nextRigCheckFixture(next, order[order.length - 1])).toBe(order[0]);
    expect(previousRigCheckFixture(doc, order[0])).toBe(order[order.length - 1]);
  });
});

describe("F4 — revision snapshots and diff", () => {
  it("captures a snapshot and reports no changes immediately", () => {
    const { doc } = rig();
    const snapshot = makeRevisionSnapshot(doc);
    const diff = diffAgainstSnapshot(doc, snapshot);
    expect(diff.summary.total).toBe(0);
  });

  it("detects adds, removes, moves, repatches, and regels", () => {
    const { doc, elec1 } = rig();
    const snapshot = makeRevisionSnapshot(doc);
    let next = doc;
    const [first, second, third] = doc.fixtureOrder;
    next = updateFixture(next, first, { xMm: doc.fixtures[first].xMm + feetToMm(2) });
    next = updateFixture(next, second, { channel: 999 });
    next = updateFixture(next, third, { color: "R26" });
    next = removeFixture(next, doc.fixtureOrder[3]);
    next = addFixture(next, newFixture({ positionId: elec1.id, profileId: "s4_26", xMm: feetToMm(5) }));
    const diff = diffAgainstSnapshot(next, snapshot);
    expect(diff.summary).toMatchObject({ added: 1, removed: 1, moved: 1, repatched: 1, regelled: 1 });
    expect(diff.moved[0].deltaMm).toBe(feetToMm(2));
    const text = changeListText(next, snapshot, "Rev B");
    expect(text).toContain("Changes since Rev B: 5");
    expect(text).toContain("+ added");
    expect(text).toContain("- removed");
  });

  it("attachRevisionSnapshot caps stored snapshots", () => {
    let { doc } = rig();
    for (let i = 0; i < 12; i += 1) {
      const revision = newRevision({ name: `Rev ${i}` });
      doc = addRevision(doc, revision);
      doc = attachRevisionSnapshot(doc, revision.id, makeRevisionSnapshot(doc));
    }
    expect(Object.keys(doc.revisionSnapshots).length).toBeLessThanOrEqual(8);
    // Newest revision always keeps its snapshot.
    const newest = doc.revisionOrder[doc.revisionOrder.length - 1];
    expect(doc.revisionSnapshots[newest]).toBeTruthy();
  });
});

describe("F5 — focus charts", () => {
  it("builds one chart page per hung position", () => {
    const { doc } = rig();
    const pages = focusChartPages(doc);
    expect(pages).toHaveLength(2);
    expect(pages[0].rows).toHaveLength(3);
    expect(pages[0].rows[0].focusNote).toBe("hits center");
  });

  it("groups the magic sheet by gel with sorted channels", () => {
    const { doc } = rig();
    const groups = magicSheetGroups(doc);
    const r80 = groups.find(group => group.gel === "R80");
    expect(r80.count).toBe(3);
    expect(r80.channels).toEqual([11, 12, 13]);
  });

  it("emits a standalone document with no theme tokens", () => {
    const { doc } = rig();
    const html = focusChartHtml(doc, { now: new Date("2026-08-09T04:00:00Z") });
    expect(html).toContain("Focus Charts");
    expect(html).toContain("1ST ELEC");
    expect(html).toContain("Magic sheet");
    expect(html).not.toContain("var(--");
    expect((html.match(/<tr>/g) || []).length).toBeGreaterThanOrEqual(5);
  });
});
