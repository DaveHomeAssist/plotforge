import { getProfile } from "./profiles.js";

export function normalizeCircuitValue(value) {
  return String(value ?? "").trim().replace(/\s+/g, " ");
}

export function normalizeFixtureCircuit(fixture = {}) {
  return {
    circuit: normalizeCircuitValue(fixture.circuit),
    dimmer: normalizeCircuitValue(fixture.dimmer),
  };
}

export function normalizeCircuitPatch(patch) {
  const next = { ...patch };
  if (Object.hasOwn(patch, "circuit")) next.circuit = normalizeCircuitValue(patch.circuit);
  if (Object.hasOwn(patch, "dimmer")) next.dimmer = normalizeCircuitValue(patch.dimmer);
  return next;
}

export function circuitDisplay({ circuit = "", dimmer = "" } = {}) {
  const cleanCircuit = normalizeCircuitValue(circuit);
  const cleanDimmer = normalizeCircuitValue(dimmer);
  if (cleanCircuit && cleanDimmer) return `Circuit ${cleanCircuit} / Dimmer ${cleanDimmer}`;
  if (cleanCircuit) return `Circuit ${cleanCircuit}`;
  if (cleanDimmer) return `Dimmer ${cleanDimmer}`;
  return "Unassigned";
}

function fixtureLabel(doc, fixture) {
  const position = doc.positions[fixture.positionId];
  const profile = getProfile(fixture.profileId, doc.fixtureProfiles);
  const unit = fixture.unitNumber == null ? "No unit" : `U${fixture.unitNumber}`;
  const channel = fixture.channel == null ? "" : ` ch ${fixture.channel}`;
  const type = profile?.model ? ` ${profile.model}` : "";
  return `${unit} ${position?.name ?? "Unassigned"}${channel}${type}`;
}

function sortFixturesByPaperworkOrder(doc, fixtures) {
  const positions = new Map(doc.positionOrder.map((id, index) => [id, index]));
  return [...fixtures].sort((a, b) => {
    const aPosition = positions.get(a.positionId) ?? Number.MAX_SAFE_INTEGER;
    const bPosition = positions.get(b.positionId) ?? Number.MAX_SAFE_INTEGER;
    return (
      aPosition - bPosition ||
      (a.unitNumber ?? Number.MAX_SAFE_INTEGER) - (b.unitNumber ?? Number.MAX_SAFE_INTEGER) ||
      a.id.localeCompare(b.id)
    );
  });
}

export function circuitSummary(doc) {
  const groups = new Map();
  const missingFixtures = [];
  const partialFixtures = [];

  const fixtures = sortFixturesByPaperworkOrder(
    doc,
    doc.fixtureOrder.map(id => doc.fixtures[id]).filter(Boolean),
  );

  fixtures.forEach(fixture => {
    const circuit = normalizeCircuitValue(fixture.circuit);
    const dimmer = normalizeCircuitValue(fixture.dimmer);
    if (!circuit && !dimmer) {
      missingFixtures.push(fixture);
      return;
    }
    if (!circuit || !dimmer) partialFixtures.push(fixture);
    const key = `${dimmer || "No dimmer"}::${circuit || "No circuit"}`;
    const group = groups.get(key) || {
      key,
      circuit,
      dimmer,
      fixtureIds: [],
      fixtureLabels: [],
      isPartial: !circuit || !dimmer,
    };
    group.fixtureIds.push(fixture.id);
    group.fixtureLabels.push(fixtureLabel(doc, fixture));
    group.isPartial = group.isPartial || !circuit || !dimmer;
    groups.set(key, group);
  });

  const rows = [...groups.values()]
    .map(row => ({ ...row, isShared: row.fixtureIds.length > 1 }))
    .sort((a, b) => {
      return (
        (a.dimmer || "ZZZ").localeCompare(b.dimmer || "ZZZ", undefined, { numeric: true }) ||
        (a.circuit || "ZZZ").localeCompare(b.circuit || "ZZZ", undefined, { numeric: true })
      );
    });

  return {
    totalFixtures: fixtures.length,
    assignedCount: fixtures.length - missingFixtures.length,
    missingCount: missingFixtures.length,
    partialCount: partialFixtures.length,
    sharedCount: rows.filter(row => row.isShared).length,
    rows,
    missingFixtureLabels: missingFixtures.map(fixture => fixtureLabel(doc, fixture)),
    partialFixtureLabels: partialFixtures.map(fixture => fixtureLabel(doc, fixture)),
  };
}
