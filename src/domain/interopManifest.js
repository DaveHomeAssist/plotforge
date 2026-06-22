import { commentPinRows } from "./show.js";
import { focusBeamRows } from "./focus.js";
import { getProfile } from "./profiles.js";

export const INTEROP_MANIFEST_VERSION = 1;
export const MVR_CORPUS_BLOCKER = "Vectorworks Spotlight 2024/2025/2026 .mvr test corpus required before locking import parser.";

function positionLabel(doc, fixture) {
  return doc.positions[fixture.positionId]?.name ?? "Unassigned";
}

function profileLabel(profile) {
  return [profile?.manufacturer, profile?.model].filter(Boolean).join(" ") || "Unknown profile";
}

function profileSource(profile) {
  const source = profile?.source || {};
  if (source.type === "gdtf-share") {
    return {
      type: source.type,
      fixtureId: source.fixtureId,
      revisionId: source.revisionId,
      revision: source.revision,
      revisionDate: source.revisionDate,
      gdtfVersion: source.gdtfVersion,
      apiUrl: source.apiUrl,
    };
  }
  return { type: source.type || "unknown" };
}

export function interopFixtureRows(doc) {
  const focusByFixture = new Map(focusBeamRows(doc).map(row => [row.fixtureId, row]));
  return doc.fixtureOrder
    .map(id => doc.fixtures[id])
    .filter(Boolean)
    .map(fixture => {
      const profile = getProfile(fixture.profileId, doc.fixtureProfiles);
      const focus = focusByFixture.get(fixture.id);
      return {
        id: fixture.id,
        mvrName: [positionLabel(doc, fixture), fixture.unitNumber == null ? "No unit" : `U${fixture.unitNumber}`].join(" "),
        positionId: fixture.positionId,
        positionName: positionLabel(doc, fixture),
        unitNumber: fixture.unitNumber,
        profileId: fixture.profileId,
        profileName: profileLabel(profile),
        manufacturer: profile?.manufacturer ?? "",
        model: profile?.model ?? "",
        mode: profile?.defaultMode ?? "Default",
        dmxFootprint: profile?.dmxFootprint ?? 1,
        gdtf: profileSource(profile),
        xMm: fixture.xMm,
        yMm: doc.positions[fixture.positionId]?.yMm ?? 0,
        rotation: fixture.rotation || 0,
        channel: fixture.channel ?? null,
        dmx: fixture.dmx || null,
        color: fixture.color ?? "",
        gobo: fixture.gobo ?? "",
        status: fixture.status ?? "planned",
        circuit: fixture.circuit ?? "",
        dimmer: fixture.dimmer ?? "",
        focus: focus ? { xMm: focus.toX, yMm: focus.toY } : null,
        notes: fixture.notes || null,
      };
    });
}

export function interopManifest(doc, { generatedAt = new Date().toISOString() } = {}) {
  return {
    schemaVersion: INTEROP_MANIFEST_VERSION,
    kind: "plotforge-interop-manifest",
    generatedAt,
    show: {
      id: doc.id,
      name: doc.name,
      metadata: doc.metadata || {},
    },
    venue: doc.venue,
    positions: doc.positionOrder.map(id => doc.positions[id]).filter(Boolean),
    fixtures: interopFixtureRows(doc),
    commentPins: commentPinRows(doc),
    mvr: {
      importParser: "parked",
      blocker: MVR_CORPUS_BLOCKER,
    },
  };
}

export function interopManifestJson(doc, options = {}) {
  return JSON.stringify(interopManifest(doc, options), null, 2) + "\n";
}
