import { channelConflicts, invalidDmxRanges, patchConflicts } from "./patch.js";
import { getProfile } from "./profiles.js";

function fixtureLabel(doc, fixtureId) {
  const fixture = doc.fixtures[fixtureId];
  if (!fixture) return "Missing fixture";
  const position = doc.positions[fixture.positionId];
  const profile = getProfile(fixture.profileId, doc.fixtureProfiles);
  const unit = fixture.unitNumber == null ? "?" : fixture.unitNumber;
  const positionName = position?.name || "Unassigned";
  const profileName = [profile?.manufacturer, profile?.model].filter(Boolean).join(" ") || "Unknown profile";
  return `${positionName} ${unit} | ${profileName}`;
}

function dmxRangeLabel(item) {
  return `${item.start}-${item.end - 1}`;
}

export function conflictPanelRows(doc) {
  const dmxRows = patchConflicts(doc).map(conflict => ({
    id: `dmx-${conflict.universe}-${conflict.a.id}-${conflict.b.id}`,
    kind: "dmx",
    title: `DMX U${conflict.universe} overlap`,
    detail: `${dmxRangeLabel(conflict.a)} overlaps ${dmxRangeLabel(conflict.b)}`,
    fixtureIds: [conflict.a.id, conflict.b.id],
    fixtureLabels: [fixtureLabel(doc, conflict.a.id), fixtureLabel(doc, conflict.b.id)],
  }));

  const invalidDmxRows = invalidDmxRanges(doc).map(range => ({
    id: `dmx-invalid-${range.universe}-${range.id}`,
    kind: "dmx",
    title: `DMX U${range.universe} range invalid`,
    detail: range.reason,
    fixtureIds: [range.id],
    fixtureLabels: [fixtureLabel(doc, range.id)],
  }));

  const channelRows = channelConflicts(doc).map(conflict => ({
    id: `channel-${conflict.channel}-${conflict.a}-${conflict.b}`,
    kind: "channel",
    title: `Channel ${conflict.channel} duplicate`,
    detail: `Channel ${conflict.channel} is assigned twice`,
    fixtureIds: [conflict.a, conflict.b],
    fixtureLabels: [fixtureLabel(doc, conflict.a), fixtureLabel(doc, conflict.b)],
  }));

  return [...dmxRows, ...invalidDmxRows, ...channelRows]
    .sort((a, b) => a.title.localeCompare(b.title) || a.id.localeCompare(b.id));
}
