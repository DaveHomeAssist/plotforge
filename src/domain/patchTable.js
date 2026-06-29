import { channelConflicts, invalidDmxRanges, patchConflicts } from "./patch.js";
import { circuitDisplay, normalizeFixtureCircuit } from "./circuiting.js";
import { formatFixtureNotes, normalizeFixtureNotes } from "./fixtureNotes.js";
import { getFixtureStatus } from "./fixtureStatus.js";
import { getProfile } from "./profiles.js";

function addConflict(map, fixtureId, label) {
  const labels = map.get(fixtureId) || [];
  labels.push(label);
  map.set(fixtureId, labels);
}

function buildConflictMaps(doc) {
  const dmx = new Map();
  const channels = new Map();

  patchConflicts(doc).forEach(conflict => {
    const label = `DMX U${conflict.universe}`;
    addConflict(dmx, conflict.a.id, label);
    addConflict(dmx, conflict.b.id, label);
  });

  invalidDmxRanges(doc).forEach(range => {
    addConflict(dmx, range.id, range.reason);
  });

  channelConflicts(doc).forEach(conflict => {
    const label = `channel ${conflict.channel}`;
    addConflict(channels, conflict.a, label);
    addConflict(channels, conflict.b, label);
  });

  return { dmx, channels };
}

function formatProfileName(profile) {
  if (!profile) return "Unknown profile";
  return [profile.manufacturer, profile.model].filter(Boolean).join(" ");
}

function orderRows(doc, rows) {
  const positions = new Map(doc.positionOrder.map((id, index) => [id, index]));
  return [...rows].sort((a, b) => {
    const aPosition = positions.get(a.positionId) ?? Number.MAX_SAFE_INTEGER;
    const bPosition = positions.get(b.positionId) ?? Number.MAX_SAFE_INTEGER;
    return (
      aPosition - bPosition ||
      (a.unitNumber ?? Number.MAX_SAFE_INTEGER) - (b.unitNumber ?? Number.MAX_SAFE_INTEGER) ||
      (a.channel ?? Number.MAX_SAFE_INTEGER) - (b.channel ?? Number.MAX_SAFE_INTEGER) ||
      a.id.localeCompare(b.id)
    );
  });
}

export function patchTableRows(doc) {
  const conflicts = buildConflictMaps(doc);
  const rows = doc.fixtureOrder
    .map(id => doc.fixtures[id])
    .filter(Boolean)
    .map(fixture => {
      const profile = getProfile(fixture.profileId, doc.fixtureProfiles);
      const position = doc.positions[fixture.positionId];
      const footprint = profile?.dmxFootprint ?? 1;
      const universe = fixture.dmx?.universe ?? null;
      const address = fixture.dmx?.address ?? null;
      const endAddress = address == null ? null : address + footprint - 1;
      const dmxLabels = conflicts.dmx.get(fixture.id) || [];
      const channelLabels = conflicts.channels.get(fixture.id) || [];
      const conflictLabels = [...dmxLabels, ...channelLabels];
      const status = getFixtureStatus(fixture.status);
      const notes = normalizeFixtureNotes(fixture.notes, fixture.note);
      const circuiting = normalizeFixtureCircuit(fixture);

      return {
        id: fixture.id,
        positionId: fixture.positionId,
        positionName: position?.name ?? "Unassigned",
        unitNumber: fixture.unitNumber,
        profileName: formatProfileName(profile),
        mode: profile?.defaultMode ?? "Default",
        channel: fixture.channel,
        universe,
        address,
        endAddress,
        dmxRangeLabel: universe == null || address == null ? "Unpatched" : `U${universe} ${address}-${endAddress}`,
        footprint,
        circuit: circuiting.circuit,
        dimmer: circuiting.dimmer,
        circuitLabel: circuitDisplay(circuiting),
        color: fixture.color ?? "",
        gobo: fixture.gobo ?? "",
        note: notes.crew,
        notes,
        notesLabel: formatFixtureNotes(notes),
        status: status.id,
        statusLabel: status.label,
        hasDmxConflict: dmxLabels.length > 0,
        hasChannelConflict: channelLabels.length > 0,
        conflictLabel: conflictLabels.join("; "),
      };
    });

  return orderRows(doc, rows);
}

export function escapeCsv(value) {
  if (value == null) return "";
  const text = String(value);
  if (!/[",\n\r]/.test(text)) return text;
  return `"${text.replaceAll("\"", "\"\"")}"`;
}

export function patchTableCsv(doc) {
  const header = [
    "Unit",
    "Position",
    "Profile",
    "Mode",
    "Status",
    "Channel",
    "Universe",
    "Address",
    "End Address",
    "Footprint",
    "Circuit",
    "Dimmer",
    "Color",
    "Gobo",
    "Color Note",
    "Gobo Note",
    "Focus Note",
    "Crew Note",
    "Conflicts",
  ];
  const body = patchTableRows(doc).map(row => [
    row.unitNumber,
    row.positionName,
    row.profileName,
    row.mode,
    row.statusLabel,
    row.channel,
    row.universe,
    row.address,
    row.endAddress,
    row.footprint,
    row.circuit,
    row.dimmer,
    row.color,
    row.gobo,
    row.notes.color,
    row.notes.gobo,
    row.notes.focus,
    row.notes.crew,
    row.conflictLabel,
  ]);

  return [header, ...body]
    .map(values => values.map(escapeCsv).join(","))
    .join("\n") + "\n";
}
