import { getProfile } from "./profiles.js";
import {
  DEFAULT_DMX_TEST_VALUES,
  getFixtureOutputCandidate,
  getFixtureOutputProfile,
  explainOutputChannel,
} from "./fixtureOutputProfiles.js";

export { DEFAULT_DMX_TEST_VALUES } from "./fixtureOutputProfiles.js";

export const DMX_OUTPUT_VERSION = 1;
export const DMX_SLOT_COUNT = 512;

export const DMX_OUTPUT_INTENTS = Object.freeze({
  selectedFixtureTest: "selected-fixture-test",
  blackout: "blackout",
});

function orderedFixtures(doc) {
  const fixtures = doc.fixtures || {};
  const ordered = (doc.fixtureOrder || [])
    .map(id => fixtures[id])
    .filter(Boolean);
  const seen = new Set(ordered.map(fixture => fixture.id));
  const rest = Object.values(fixtures)
    .filter(fixture => !seen.has(fixture.id))
    .sort((a, b) => String(a.id).localeCompare(String(b.id)));
  return [...ordered, ...rest];
}

function parseWholeNumber(value) {
  if (typeof value === "number") return Number.isInteger(value) ? value : NaN;
  if (typeof value === "string" && /^-?\d+$/.test(value.trim())) return Number(value.trim());
  return NaN;
}

function profileLabel(profile, profileId) {
  if (!profile) return profileId ? `Unknown profile ${profileId}` : "Unknown profile";
  return [profile.manufacturer, profile.model].filter(Boolean).join(" ") || profile.id || profileId || "Fixture profile";
}

function fixtureLabel(doc, fixture) {
  const position = doc.positions?.[fixture.positionId];
  const unit = fixture.unitNumber == null ? fixture.id : `U${fixture.unitNumber}`;
  return [position?.name, unit].filter(Boolean).join(" ") || fixture.id;
}

function hasAnyPatchField(fixture) {
  const dmx = fixture?.dmx;
  if (!dmx) return false;
  return dmx.universe != null || dmx.address != null;
}

function hasCompletePatch(fixture) {
  const dmx = fixture?.dmx;
  return dmx?.universe != null && dmx?.address != null;
}

function buildFixtureRange(doc, fixture) {
  const profile = getProfile(fixture.profileId, doc.fixtureProfiles);
  const footprint = Math.max(1, Number(profile?.dmxFootprint ?? 1) || 1);
  const universe = parseWholeNumber(fixture.dmx?.universe);
  const startAddress = parseWholeNumber(fixture.dmx?.address);
  const endAddress = startAddress + footprint - 1;
  const valid = Number.isInteger(universe)
    && Number.isInteger(startAddress)
    && universe >= 1
    && startAddress >= 1
    && endAddress <= DMX_SLOT_COUNT;

  return {
    fixtureId: fixture.id,
    fixtureLabel: fixtureLabel(doc, fixture),
    profileId: fixture.profileId,
    profileLabel: profileLabel(profile, fixture.profileId),
    universe,
    startAddress,
    endAddress,
    footprint,
    valid,
    reason: valid ? "" : invalidRangeReason({ universe, startAddress, endAddress }),
  };
}

function invalidRangeReason(range) {
  if (!Number.isInteger(range.universe) || !Number.isInteger(range.startAddress)) {
    return "DMX universe and address must be whole numbers.";
  }
  if (range.universe < 1 || range.startAddress < 1) {
    return "DMX universe and address must be positive.";
  }
  if (range.endAddress > DMX_SLOT_COUNT) {
    return `DMX range ${range.startAddress}-${range.endAddress} exceeds slot ${DMX_SLOT_COUNT}.`;
  }
  return "DMX range is invalid.";
}

function findOverlapErrors(ranges) {
  const byUniverse = new Map();
  for (const range of ranges.filter(item => item.valid)) {
    const list = byUniverse.get(range.universe) || [];
    list.push(range);
    byUniverse.set(range.universe, list);
  }

  const errors = [];
  for (const [universe, list] of byUniverse) {
    list.sort((a, b) => a.startAddress - b.startAddress || a.fixtureId.localeCompare(b.fixtureId));
    for (let i = 1; i < list.length; i += 1) {
      for (let j = 0; j < i; j += 1) {
        if (list[i].startAddress <= list[j].endAddress) {
          errors.push({
            code: "overlap",
            severity: "error",
            universe,
            fixtureIds: [list[j].fixtureId, list[i].fixtureId],
            message: `DMX U${universe} ${list[j].startAddress}-${list[j].endAddress} overlaps ${list[i].startAddress}-${list[i].endAddress}.`,
          });
        }
      }
    }
  }
  return errors;
}

function normalizeIntent(intent) {
  if (intent === DMX_OUTPUT_INTENTS.blackout) return DMX_OUTPUT_INTENTS.blackout;
  return DMX_OUTPUT_INTENTS.selectedFixtureTest;
}

function clampChannelValue(value, channel) {
  const fallback = Number(channel.default ?? 0);
  const parsed = Number(value ?? fallback);
  const min = Number.isFinite(channel.safeMin) ? channel.safeMin : 0;
  const max = Number.isFinite(channel.safeMax) ? channel.safeMax : 255;
  if (!Number.isFinite(parsed)) return Math.max(min, Math.min(max, fallback));
  return Math.max(min, Math.min(max, Math.round(parsed)));
}

function valueForChannel(channel, values) {
  if (Object.hasOwn(values, channel.type)) return values[channel.type];
  return channel.default ?? 0;
}

function rangeStatus(range, outputProfile, isSelected, blocked) {
  if (!range.valid) return "invalid";
  if (blocked) return "blocked";
  if (!outputProfile) return "unmapped";
  return isSelected ? "selected" : "ready";
}

function createUniverseReport(universe, ranges, blocked) {
  return {
    universe,
    blocked,
    slots: Array(DMX_SLOT_COUNT).fill(0),
    usedRanges: ranges
      .filter(range => range.universe === universe)
      .sort((a, b) => a.startAddress - b.startAddress || a.fixtureId.localeCompare(b.fixtureId))
      .map(range => ({ ...range })),
    nonZeroSlots: [],
  };
}

export function compileDmxOutput(doc, options = {}) {
  const intent = normalizeIntent(options.intent);
  const selectedFixtureId = options.selectedFixtureId || null;
  const values = { ...DEFAULT_DMX_TEST_VALUES, ...(options.values || {}) };
  const warnings = [];
  const errors = [];
  const fixtures = [];
  const ranges = [];

  for (const fixture of orderedFixtures(doc)) {
    if (!hasAnyPatchField(fixture)) {
      fixtures.push({
        fixtureId: fixture.id,
        fixtureLabel: fixtureLabel(doc, fixture),
        profileId: fixture.profileId,
        outputStatus: "paperwork-only",
      });
      continue;
    }

    if (!hasCompletePatch(fixture)) {
      const message = `${fixtureLabel(doc, fixture)} has an incomplete DMX patch.`;
      errors.push({
        code: "incomplete-range",
        severity: "error",
        fixtureId: fixture.id,
        message,
      });
      fixtures.push({
        fixtureId: fixture.id,
        fixtureLabel: fixtureLabel(doc, fixture),
        profileId: fixture.profileId,
        outputStatus: "invalid",
        message,
      });
      continue;
    }

    const range = buildFixtureRange(doc, fixture);
    const outputProfile = getFixtureOutputProfile(fixture.profileId, doc.fixtureProfiles);
    const outputCandidate = getFixtureOutputCandidate(fixture.profileId, doc.fixtureProfiles);
    ranges.push(range);

    if (!range.valid) {
      errors.push({
        code: "invalid-range",
        severity: "error",
        fixtureId: fixture.id,
        universe: Number.isInteger(range.universe) ? range.universe : null,
        message: `${range.fixtureLabel}: ${range.reason}`,
      });
    }

    if (!outputProfile) {
      if (outputCandidate) {
        warnings.push({
          code: "candidate-personality",
          severity: "warning",
          fixtureId: fixture.id,
          universe: Number.isInteger(range.universe) ? range.universe : null,
          message: `${range.fixtureLabel} has an imported output-map candidate that needs approval before output. Slots stay at zero.`,
        });
      } else {
        warnings.push({
          code: "unmapped-personality",
          severity: "warning",
          fixtureId: fixture.id,
          universe: Number.isInteger(range.universe) ? range.universe : null,
          message: `${range.fixtureLabel} uses ${range.profileLabel}, which has no DMX output map. Slots stay at zero.`,
        });
      }
    } else if (outputProfile.footprint !== range.footprint) {
      warnings.push({
        code: "footprint-mismatch",
        severity: "warning",
        fixtureId: fixture.id,
        universe: Number.isInteger(range.universe) ? range.universe : null,
        message: `${range.fixtureLabel} has a ${range.footprint}ch footprint, but the output map expects ${outputProfile.footprint}ch.`,
      });
    }

    fixtures.push({
      fixtureId: fixture.id,
      fixtureLabel: range.fixtureLabel,
      profileId: fixture.profileId,
      profileLabel: range.profileLabel,
      universe: range.universe,
      startAddress: range.startAddress,
      endAddress: range.endAddress,
      footprint: range.footprint,
      outputStatus: rangeStatus(range, outputProfile, fixture.id === selectedFixtureId, false),
      outputReady: Boolean(outputProfile) && range.valid,
      outputMapLabel: outputProfile?.label || outputCandidate?.label || "",
      outputMapStatus: outputProfile ? "output-ready" : outputCandidate ? "candidate" : "paperwork-only",
    });
  }

  errors.push(...findOverlapErrors(ranges));
  const blocked = errors.length > 0;
  const universes = [...new Set(
    ranges
      .filter(range => Number.isInteger(range.universe) && range.universe >= 1)
      .map(range => range.universe),
  )].sort((a, b) => a - b);
  const universeReports = universes.map(universe => createUniverseReport(universe, ranges, blocked));

  if (!blocked && intent !== DMX_OUTPUT_INTENTS.blackout) {
    for (const range of ranges.filter(item => item.valid)) {
      if (range.fixtureId !== selectedFixtureId) continue;
      const outputProfile = getFixtureOutputProfile(range.profileId, doc.fixtureProfiles);
      if (!outputProfile) continue;
      const universeReport = universeReports.find(item => item.universe === range.universe);
      if (!universeReport) continue;

      for (const channel of outputProfile.channels) {
        if (channel.unsafe || channel.type === "raw") continue;
        if (channel.slot < 1 || channel.slot > range.footprint) continue;
        const address = range.startAddress + channel.slot - 1;
        if (address < 1 || address > DMX_SLOT_COUNT) continue;
        const value = clampChannelValue(valueForChannel(channel, values), channel);
        universeReport.slots[address - 1] = value;
        if (value > 0) {
          universeReport.nonZeroSlots.push({
            address,
            value,
            fixtureId: range.fixtureId,
            fixtureLabel: range.fixtureLabel,
            type: channel.type,
            label: channel.label,
            explanation: explainOutputChannel(outputProfile, channel),
          });
        }
      }
    }
  }

  const fixturesById = new Map(fixtures.map(fixture => [fixture.fixtureId, fixture]));
  for (const range of ranges) {
    const outputProfile = getFixtureOutputProfile(range.profileId, doc.fixtureProfiles);
    const outputCandidate = getFixtureOutputCandidate(range.profileId, doc.fixtureProfiles);
    const fixture = fixturesById.get(range.fixtureId);
    if (fixture) {
      fixture.outputStatus = rangeStatus(range, outputProfile, range.fixtureId === selectedFixtureId, blocked);
      fixture.outputMapStatus = outputProfile ? "output-ready" : outputCandidate ? "candidate" : "paperwork-only";
    }
    for (const universeReport of universeReports) {
      for (const usedRange of universeReport.usedRanges) {
        if (usedRange.fixtureId !== range.fixtureId) continue;
        usedRange.outputStatus = rangeStatus(range, outputProfile, range.fixtureId === selectedFixtureId, blocked);
        usedRange.outputReady = Boolean(outputProfile) && range.valid;
        usedRange.outputMapStatus = outputProfile ? "output-ready" : outputCandidate ? "candidate" : "paperwork-only";
        usedRange.outputMapLabel = outputProfile?.label || outputCandidate?.label || "";
      }
    }
  }

  return {
    kind: "plotforge-dmx-output-preview",
    version: DMX_OUTPUT_VERSION,
    intent,
    selectedFixtureId,
    blocked,
    errors,
    warnings,
    fixtures,
    universes: universeReports,
  };
}

export function summarizeDmxOutput(compiled) {
  const nonZeroSlotCount = compiled.universes.reduce((count, universe) => count + universe.nonZeroSlots.length, 0);
  const patchedFixtureCount = compiled.fixtures.filter(fixture => fixture.outputStatus !== "paperwork-only").length;
  return {
    blocked: compiled.blocked,
    universeCount: compiled.universes.length,
    patchedFixtureCount,
    errorCount: compiled.errors.length,
    warningCount: compiled.warnings.length,
    nonZeroSlotCount,
  };
}
