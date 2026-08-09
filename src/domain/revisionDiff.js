// Revision diff: what changed on the rig since a named revision.
// Compares the live document against a stored revision snapshot by fixture id.

/** Compact snapshot of rig state stored per revision. */
export function makeRevisionSnapshot(doc) {
  return {
    takenAt: doc.updatedAt ?? null,
    positions: Object.fromEntries(
      Object.entries(doc.positions).map(([id, p]) => [id, { name: p.name, yMm: p.yMm }]),
    ),
    fixtures: Object.fromEntries(
      doc.fixtureOrder
        .map(id => doc.fixtures[id])
        .filter(Boolean)
        .map(fx => [fx.id, {
          positionId: fx.positionId,
          profileId: fx.profileId,
          xMm: fx.xMm,
          unitNumber: fx.unitNumber ?? null,
          channel: fx.channel ?? null,
          universe: fx.dmx?.universe ?? null,
          address: fx.dmx?.address ?? null,
          color: fx.color || "",
        }]),
    ),
  };
}

const MOVE_THRESHOLD_MM = 1;

export function diffAgainstSnapshot(doc, snapshot) {
  const empty = { added: [], removed: [], moved: [], repatched: [], regelled: [] };
  if (!snapshot?.fixtures) return { ...empty, summary: summarize(empty) };

  const seen = new Set();
  const added = [];
  const moved = [];
  const repatched = [];
  const regelled = [];

  for (const id of doc.fixtureOrder) {
    const now = doc.fixtures[id];
    if (!now) continue;
    const then = snapshot.fixtures[id];
    if (!then) {
      added.push({ fixtureId: id, xMm: now.xMm, positionId: now.positionId });
      continue;
    }
    seen.add(id);

    const positionChanged = then.positionId !== now.positionId;
    const deltaMm = Math.abs((then.xMm ?? 0) - (now.xMm ?? 0));
    if (positionChanged || deltaMm > MOVE_THRESHOLD_MM) {
      moved.push({
        fixtureId: id,
        fromPositionId: then.positionId,
        toPositionId: now.positionId,
        fromXMm: then.xMm,
        toXMm: now.xMm,
        fromYMm: snapshot.positions?.[then.positionId]?.yMm ?? null,
        deltaMm: Math.round(deltaMm),
        positionChanged,
      });
    }

    const nowUniverse = now.dmx?.universe ?? null;
    const nowAddress = now.dmx?.address ?? null;
    if (then.channel !== (now.channel ?? null) || then.universe !== nowUniverse || then.address !== nowAddress) {
      repatched.push({
        fixtureId: id,
        from: { channel: then.channel, universe: then.universe, address: then.address },
        to: { channel: now.channel ?? null, universe: nowUniverse, address: nowAddress },
      });
    }

    if ((then.color || "") !== (now.color || "")) {
      regelled.push({ fixtureId: id, from: then.color || "", to: now.color || "" });
    }
  }

  const removed = Object.entries(snapshot.fixtures)
    .filter(([id]) => !doc.fixtures[id])
    .map(([id, then]) => ({
      fixtureId: id,
      unitNumber: then.unitNumber,
      channel: then.channel,
      xMm: then.xMm,
      yMm: snapshot.positions?.[then.positionId]?.yMm ?? null,
      positionName: snapshot.positions?.[then.positionId]?.name ?? "removed position",
    }));
  void seen;

  const result = { added, removed, moved, repatched, regelled };
  return { ...result, summary: summarize(result) };
}

function summarize({ added, removed, moved, repatched, regelled }) {
  return {
    added: added.length,
    removed: removed.length,
    moved: moved.length,
    repatched: repatched.length,
    regelled: regelled.length,
    total: added.length + removed.length + moved.length + repatched.length + regelled.length,
  };
}

/** Human-readable change list for handoff (clipboard / crew notes). */
export function changeListText(doc, snapshot, revisionName = "revision") {
  const diff = diffAgainstSnapshot(doc, snapshot);
  const label = id => {
    const fx = doc.fixtures[id];
    if (!fx) return id;
    const pos = doc.positions[fx.positionId];
    return `${pos?.name ?? "?"} U${fx.unitNumber ?? "?"}${fx.channel != null ? ` (ch ${fx.channel})` : ""}`;
  };
  const lines = [`Changes since ${revisionName}: ${diff.summary.total}`];
  diff.added.forEach(entry => lines.push(`+ added ${label(entry.fixtureId)}`));
  diff.removed.forEach(entry => lines.push(`- removed ${entry.positionName} U${entry.unitNumber ?? "?"}${entry.channel != null ? ` (ch ${entry.channel})` : ""}`));
  diff.moved.forEach(entry => lines.push(`> moved ${label(entry.fixtureId)} ${entry.positionChanged ? "to another position" : `${entry.deltaMm}mm`}`));
  diff.repatched.forEach(entry => lines.push(`~ repatch ${label(entry.fixtureId)}: ch ${entry.from.channel ?? "—"}→${entry.to.channel ?? "—"} dmx ${entry.from.universe ?? "—"}/${entry.from.address ?? "—"}→${entry.to.universe ?? "—"}/${entry.to.address ?? "—"}`));
  diff.regelled.forEach(entry => lines.push(`~ gel ${label(entry.fixtureId)}: ${entry.from || "open"}→${entry.to || "open"}`));
  return lines.join("\n");
}
