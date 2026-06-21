export const FOCUS_SNAP_MM = 25.4;

export function snapFocusPoint(point, snapMm = FOCUS_SNAP_MM) {
  return {
    xMm: Math.round(point.xMm / snapMm) * snapMm,
    yMm: Math.round(point.yMm / snapMm) * snapMm,
  };
}

export function focusBeamRows(doc) {
  return doc.fixtureOrder.flatMap(id => {
    const fixture = doc.fixtures[id];
    const position = fixture ? doc.positions[fixture.positionId] : null;
    const focus = fixture?.focus;
    if (!fixture || !position || focus?.xMm == null || focus?.yMm == null) return [];
    return [{
      fixtureId: fixture.id,
      unitNumber: fixture.unitNumber,
      fromX: fixture.xMm,
      fromY: position.yMm,
      toX: focus.xMm,
      toY: focus.yMm,
    }];
  });
}
