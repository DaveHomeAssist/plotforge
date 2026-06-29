// Patch conflict detection: each fixture occupies [addr, addr + footprint) on its
// universe. Conflicts surface when two ranges overlap.

import { getProfile } from "./profiles.js";

function dmxRange(doc, fx) {
  if (!fx?.dmx || fx.dmx.universe == null || fx.dmx.address == null) return null;
  const profile = getProfile(fx.profileId, doc.fixtureProfiles);
  const footprint = Math.max(1, Number(profile?.dmxFootprint ?? 1) || 1);
  const universe = Number(fx.dmx.universe);
  const start = Number(fx.dmx.address);
  return {
    id: fx.id,
    unit: fx.unitNumber,
    universe,
    start,
    end: start + footprint,
    footprint,
  };
}

function isValidRange(range) {
  return Number.isInteger(range.universe)
    && Number.isInteger(range.start)
    && range.universe >= 1
    && range.start >= 1
    && range.end <= 513;
}

export function patchConflicts(doc) {
  const byUni = new Map();
  for (const fx of Object.values(doc.fixtures || {})) {
    const range = dmxRange(doc, fx);
    if (!range || !isValidRange(range)) continue;
    const list = byUni.get(range.universe) || [];
    list.push(range);
    byUni.set(range.universe, list);
  }
  const conflicts = [];
  for (const [uni, list] of byUni) {
    list.sort((a, b) => a.start - b.start);
    for (let i = 1; i < list.length; i++) {
      for (let j = 0; j < i; j++) {
        if (list[i].start < list[j].end) {
          conflicts.push({ universe: uni, a: list[j], b: list[i] });
        }
      }
    }
  }
  return conflicts;
}

export function invalidDmxRanges(doc) {
  return Object.values(doc.fixtures || {})
    .map(fx => dmxRange(doc, fx))
    .filter(Boolean)
    .filter(range => !isValidRange(range))
    .map(range => ({
      ...range,
      reason: range.end > 513
        ? `DMX range ${range.start}-${range.end - 1} exceeds 512`
        : "DMX universe and address must be positive whole numbers",
    }));
}

export function channelConflicts(doc) {
  const seen = new Map();
  const conflicts = [];
  for (const fx of Object.values(doc.fixtures || {})) {
    if (fx.channel == null) continue;
    if (seen.has(fx.channel)) {
      conflicts.push({ channel: fx.channel, a: seen.get(fx.channel), b: fx.id });
    } else {
      seen.set(fx.channel, fx.id);
    }
  }
  return conflicts;
}
