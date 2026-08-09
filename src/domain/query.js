// Fixture search for the command palette.
// Pure: builds an index from the doc and matches free-text queries against it.
//
// Query grammar (all tokens must match a fixture, AND semantics):
//   412            channel 412 (also matches unit/address as weaker hits)
//   u3 / unit 3    unit number 3
//   1/41           DMX universe 1, address 41
//   r80 / l201     gel code (case-insensitive)
//   fresnel, s4    profile manufacturer/model text
//   "2nd elec"     position name text
//   focused        fixture status

import { getProfile } from "./profiles.js";
import { getFixtureStatus } from "./fixtureStatus.js";

export function buildQueryIndex(doc) {
  return doc.fixtureOrder
    .map(id => doc.fixtures[id])
    .filter(Boolean)
    .map(fixture => {
      const position = doc.positions[fixture.positionId];
      const profile = getProfile(fixture.profileId, doc.fixtureProfiles);
      const status = getFixtureStatus(fixture.status);
      const profileName = [profile?.manufacturer, profile?.model].filter(Boolean).join(" ");
      return {
        fixtureId: fixture.id,
        channel: fixture.channel ?? null,
        unitNumber: fixture.unitNumber ?? null,
        universe: fixture.dmx?.universe ?? null,
        address: fixture.dmx?.address ?? null,
        color: String(fixture.color || "").toLowerCase(),
        profileText: profileName.toLowerCase(),
        positionText: String(position?.name || "").toLowerCase(),
        statusId: status.id,
        statusText: status.label.toLowerCase(),
        xMm: fixture.xMm,
        yMm: position?.yMm ?? 0,
        label: [
          position?.name || "No position",
          fixture.unitNumber == null ? "U?" : `U${fixture.unitNumber}`,
          profileName || "Fixture",
        ].join(" · "),
        detail: [
          fixture.channel == null ? "unpatched" : `ch ${fixture.channel}`,
          fixture.dmx ? `${fixture.dmx.universe}/${fixture.dmx.address}` : null,
          fixture.color || null,
          status.label,
        ].filter(Boolean).join(" · "),
      };
    });
}

function tokenScore(row, token) {
  // Returns 0 when the token does not match this fixture; otherwise a weight.
  const dmxMatch = token.match(/^(\d+)\/(\d+)$/);
  if (dmxMatch) {
    return row.universe === Number(dmxMatch[1]) && row.address === Number(dmxMatch[2]) ? 90 : 0;
  }

  const unitMatch = token.match(/^u(?:nit)?\s*(\d+)$/);
  if (unitMatch) return row.unitNumber === Number(unitMatch[1]) ? 80 : 0;

  if (/^\d+$/.test(token)) {
    const n = Number(token);
    if (row.channel === n) return 100;
    if (row.unitNumber === n) return 40;
    if (row.address === n) return 30;
    return 0;
  }

  let score = 0;
  if (row.color && (row.color === token || row.color.startsWith(token))) score = Math.max(score, 70);
  if (row.statusId === token || row.statusText === token) score = Math.max(score, 60);
  if (row.profileText.includes(token)) score = Math.max(score, 50);
  if (row.positionText.includes(token)) score = Math.max(score, 50);
  return score;
}

export function queryFixtures(doc, query, { limit = 12 } = {}) {
  const text = String(query || "").trim().toLowerCase();
  if (!text) return [];
  const tokens = text.split(/\s+/).filter(Boolean);
  const index = buildQueryIndex(doc);

  const hits = [];
  for (const row of index) {
    let total = 0;
    let matchedAll = true;
    for (const token of tokens) {
      const score = tokenScore(row, token);
      if (score === 0) { matchedAll = false; break; }
      total += score;
    }
    if (matchedAll) hits.push({ ...row, score: total });
  }

  hits.sort((a, b) =>
    b.score - a.score
    || (a.channel ?? Infinity) - (b.channel ?? Infinity)
    || a.label.localeCompare(b.label));
  return hits.slice(0, limit);
}
