// Standalone domain smoke test. No npm deps, no React, no vitest.
// Run with: node scripts/smoke-domain.mjs
//
// Verifies the domain logic that doesn't need a DOM: show mutations,
// renumbering, patch conflicts, unit conversion, and serialization roundtrip.

import {
  newShow, newPosition, newFixture,
  addPosition, addFixture, updateFixture, removeFixture, renumberPosition,
  updateVenue, updatePosition, removePosition, fixturesOnPosition,
} from "../src/domain/show.js";
import { feetToMm, parseImperial, formatImperial, MM_PER_FOOT } from "../src/domain/units.js";
import { patchConflicts, channelConflicts } from "../src/domain/patch.js";
import { serialize, deserialize } from "../src/serialization.js";

let failed = 0;
const results = [];

function check(label, fn) {
  try {
    fn();
    results.push(["ok", label]);
  } catch (e) {
    failed += 1;
    results.push(["FAIL", label, e.message]);
  }
}

function eq(a, b, msg = "") {
  const A = JSON.stringify(a), B = JSON.stringify(b);
  if (A !== B) throw new Error(`${msg} expected ${B}, got ${A}`);
}

function seed() {
  let doc = newShow({ name: "Smoke" });
  const pos = newPosition({ name: "1ST ELEC", yMm: feetToMm(-8), lengthMm: feetToMm(28) });
  doc = addPosition(doc, pos);
  return { doc, posId: pos.id };
}

// ---- units ----
check("feetToMm rounds to integer mm", () => eq(feetToMm(1), Math.round(MM_PER_FOOT)));
check("parseImperial 12'-6\"", () => eq(parseImperial(`12'-6"`), Math.round(12 * 304.8 + 6 * 25.4)));
check("parseImperial 8'", () => eq(parseImperial(`8'`), Math.round(8 * 304.8)));
check("parseImperial garbage", () => eq(parseImperial("nope"), null));
check("formatImperial 12 ft", () => {
  const out = formatImperial(feetToMm(12));
  eq(out, `12'-0"`);
  eq(formatImperial(feetToMm(8)), `8'-0"`);
  eq(formatImperial(feetToMm(-8)), `-8'-0"`);
});

// ---- domain ----
check("addFixture renumbers stage-right to stage-left", () => {
  let { doc, posId } = seed();
  doc = addFixture(doc, newFixture({ positionId: posId, profileId: "s4_26", xMm: feetToMm(0) }));
  doc = addFixture(doc, newFixture({ positionId: posId, profileId: "s4_26", xMm: feetToMm(-12) }));
  doc = addFixture(doc, newFixture({ positionId: posId, profileId: "s4_26", xMm: feetToMm(12) }));
  const sorted = [...fixturesOnPosition(doc, posId)].sort((a, b) => a.xMm - b.xMm);
  eq(sorted.map(f => f.unitNumber), [1, 2, 3]);
});

check("renumberPosition reorders after a fixture moves past another", () => {
  let { doc, posId } = seed();
  doc = addFixture(doc, newFixture({ positionId: posId, profileId: "s4_26", xMm: feetToMm(-6) }));
  doc = addFixture(doc, newFixture({ positionId: posId, profileId: "s4_26", xMm: feetToMm(6) }));
  const [left, right] = fixturesOnPosition(doc, posId);
  if (left.unitNumber !== 1) throw new Error(`expected 1, got ${left.unitNumber}`);
  doc = renumberPosition(updateFixture(doc, left.id, { xMm: feetToMm(12) }), posId);
  const after = fixturesOnPosition(doc, posId);
  const movedNow = after.find(f => f.id === left.id).unitNumber;
  const otherNow = after.find(f => f.id === right.id).unitNumber;
  if (movedNow !== 2 || otherNow !== 1) {
    throw new Error(`expected moved=2 other=1, got moved=${movedNow} other=${otherNow}`);
  }
});

check("removeFixture renumbers the rest", () => {
  let { doc, posId } = seed();
  const ids = [-12, -6, 0, 6, 12].map(ft => {
    const fx = newFixture({ positionId: posId, profileId: "s4_26", xMm: feetToMm(ft) });
    doc = addFixture(doc, fx);
    return fx.id;
  });
  doc = removeFixture(doc, ids[2]);
  const nums = [...fixturesOnPosition(doc, posId).map(f => f.unitNumber)].sort();
  eq(nums, [1, 2, 3, 4]);
});

check("updateVenue patches stage dimensions", () => {
  const { doc } = seed();
  const next = updateVenue(doc, { stageWidthMm: feetToMm(40) });
  eq(next.venue.stageWidthMm, feetToMm(40));
  eq(next.venue.stageDepthMm, doc.venue.stageDepthMm);
});

check("updatePosition patches editable position fields", () => {
  let { doc, posId } = seed();
  doc = updatePosition(doc, posId, { name: "BOX BOOM SL", yMm: feetToMm(4) });
  eq(doc.positions[posId].name, "BOX BOOM SL");
  eq(doc.positions[posId].yMm, feetToMm(4));
});

check("removePosition removes the position and attached fixtures", () => {
  let { doc, posId } = seed();
  const keep = newPosition({ name: "FOH", yMm: feetToMm(8), lengthMm: feetToMm(20) });
  doc = addPosition(doc, keep);
  const doomedFx = newFixture({ positionId: posId, profileId: "s4_26", xMm: feetToMm(0) });
  const keptFx = newFixture({ positionId: keep.id, profileId: "s4_26", xMm: feetToMm(0) });
  doc = addFixture(doc, doomedFx);
  doc = addFixture(doc, keptFx);

  doc = removePosition(doc, posId);

  eq(doc.positions[posId], undefined);
  eq(doc.fixtures[doomedFx.id], undefined);
  eq(doc.fixtures[keptFx.id].positionId, keep.id);
  eq(doc.positionOrder, [keep.id]);
  eq(doc.fixtureOrder, [keptFx.id]);
});

check("serialize → deserialize roundtrip", () => {
  let { doc, posId } = seed();
  doc = addFixture(doc, newFixture({
    positionId: posId, profileId: "fresnel", xMm: feetToMm(0),
    channel: 7, dmx: { universe: 1, address: 41 }, color: "R02",
  }));
  const text = serialize(doc);
  const back = deserialize(text);
  eq(back, doc);
});

// ---- patch ----
check("patchConflicts catches DMX overlap on same universe", () => {
  let { doc, posId } = seed();
  doc = addFixture(doc, newFixture({ positionId: posId, profileId: "spot_mh", xMm: 0,
    dmx: { universe: 1, address: 1 } }));         // 1..24
  doc = addFixture(doc, newFixture({ positionId: posId, profileId: "s4_26", xMm: feetToMm(2),
    dmx: { universe: 1, address: 20 } }));        // 20..20 — overlaps
  const c = patchConflicts(doc);
  if (c.length !== 1) throw new Error(`expected 1 conflict, got ${c.length}`);
  if (c[0].universe !== 1) throw new Error(`expected universe 1`);
});

check("patchConflicts ignores cross-universe", () => {
  let { doc, posId } = seed();
  doc = addFixture(doc, newFixture({ positionId: posId, profileId: "s4_26", xMm: 0, dmx: { universe: 1, address: 1 } }));
  doc = addFixture(doc, newFixture({ positionId: posId, profileId: "s4_26", xMm: feetToMm(2), dmx: { universe: 2, address: 1 } }));
  eq(patchConflicts(doc).length, 0);
});

check("channelConflicts catches duplicates", () => {
  let { doc, posId } = seed();
  doc = addFixture(doc, newFixture({ positionId: posId, profileId: "s4_26", xMm: 0, channel: 11 }));
  doc = addFixture(doc, newFixture({ positionId: posId, profileId: "s4_26", xMm: feetToMm(2), channel: 11 }));
  eq(channelConflicts(doc).length, 1);
});

// ---- report ----
const passed = results.length - failed;
console.log("\nDomain smoke test\n=================");
for (const r of results) {
  if (r[0] === "ok") console.log(`  \x1b[32m✓\x1b[0m ${r[1]}`);
  else console.log(`  \x1b[31m✗\x1b[0m ${r[1]}\n      ${r[2]}`);
}
console.log(`\n${passed} passed, ${failed} failed (${results.length} total)\n`);
process.exit(failed ? 1 : 0);
