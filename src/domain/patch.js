// Patch conflict detection: each fixture occupies [addr, addr + footprint) on its
// universe. Conflicts surface when two ranges overlap.

import { getProfile } from "./profiles.js";

export function patchConflicts(doc) {
  const byUni = new Map();
  for (const fx of Object.values(doc.fixtures)) {
    if (!fx.dmx || fx.dmx.universe == null || fx.dmx.address == null) continue;
    const profile = getProfile(fx.profileId, doc.fixtureProfiles);
    const footprint = profile?.dmxFootprint ?? 1;
    const start = fx.dmx.address;
    const end = start + footprint;
    if (start < 1 || end > 513) continue;
    const list = byUni.get(fx.dmx.universe) || [];
    list.push({ id: fx.id, unit: fx.unitNumber, start, end });
    byUni.set(fx.dmx.universe, list);
  }
  const conflicts = [];
  for (const [uni, list] of byUni) {
    list.sort((a, b) => a.start - b.start);
    for (let i = 1; i < list.length; i++) {
      if (list[i].start < list[i - 1].end) {
        conflicts.push({ universe: uni, a: list[i - 1], b: list[i] });
      }
    }
  }
  return conflicts;
}

export function channelConflicts(doc) {
  const seen = new Map();
  const conflicts = [];
  for (const fx of Object.values(doc.fixtures)) {
    if (fx.channel == null) continue;
    if (seen.has(fx.channel)) {
      conflicts.push({ channel: fx.channel, a: seen.get(fx.channel), b: fx.id });
    } else {
      seen.set(fx.channel, fx.id);
    }
  }
  return conflicts;
}
