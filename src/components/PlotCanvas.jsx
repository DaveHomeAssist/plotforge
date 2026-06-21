import { useCallback, useMemo, useRef, useState } from "react";
import usePanZoom from "../hooks/usePanZoom.js";
import FixtureSymbol from "./FixtureSymbol.jsx";
import { fixturesOnPosition } from "../domain/show.js";
import { feetToMm, MM_PER_FOOT } from "../domain/units.js";
import { focusBeamRows, snapFocusPoint } from "../domain/focus.js";

const GRID_MM = MM_PER_FOOT;          // 1 ft minor grid
const GRID_MAJOR_MM = MM_PER_FOOT * 5; // 5 ft major grid

export default function PlotCanvas({
  doc,
  selectedFixtureId,
  selectedFixtureIds = [],
  selectedPositionId,
  onSelectFixture,
  onSelectPosition,
  onMoveFixture,
  onSetFixtureFocus,
  onClearFixtureFocus,
}) {
  const svgRef = useRef(null);
  const dragState = useRef(null);

  const margin = feetToMm(8);
  const halfW = doc.venue.stageWidthMm / 2 + margin;
  const initial = {
    x: -halfW,
    y: -doc.venue.stageDepthMm - margin,
    width: halfW * 2,
    height: doc.venue.stageDepthMm + margin * 2 + feetToMm(20),
  };

  const { viewBox, onWheel, beginPan, panTo, endPan, screenToWorld, reset } =
    usePanZoom({ initialWorldRect: initial, viewportSize: { width: 800, height: 600 } });

  const [panActive, setPanActive] = useState(false);
  const [focusFixtureId, setFocusFixtureId] = useState(null);
  const selectedFixture = selectedFixtureId ? doc.fixtures[selectedFixtureId] : null;
  const selectedFixtureSet = useMemo(() => new Set(selectedFixtureIds), [selectedFixtureIds]);
  const focusActive = Boolean(selectedFixtureId && focusFixtureId === selectedFixtureId);

  const setFocusAtEvent = useCallback((e) => {
    if (!focusActive || !selectedFixtureId || e.button !== 0) return false;
    const svg = e.currentTarget.ownerSVGElement || e.currentTarget;
    const world = screenToWorld(e.clientX, e.clientY, svg);
    onSetFixtureFocus?.(selectedFixtureId, snapFocusPoint({ xMm: world.x, yMm: world.y }));
    setFocusFixtureId(null);
    return true;
  }, [focusActive, selectedFixtureId, screenToWorld, onSetFixtureFocus]);

  const onSvgPointerDown = useCallback((e) => {
    if (setFocusAtEvent(e)) return;
    if (e.target.closest(".fx")) return; // fixture handles its own drag
    if (e.button !== 0 && e.button !== 1) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setPanActive(true);
    beginPan(e.clientX, e.clientY);
  }, [beginPan, setFocusAtEvent]);

  const onSvgPointerMove = useCallback((e) => {
    if (panActive) panTo(e.clientX, e.clientY, e.currentTarget);
    if (dragState.current) {
      const { fixtureId, positionId } = dragState.current;
      const world = screenToWorld(e.clientX, e.clientY, e.currentTarget);
      const snap = 25.4;
      const xMm = Math.round(world.x / snap) * snap;
      onMoveFixture(fixtureId, positionId, xMm);
    }
  }, [panActive, panTo, screenToWorld, onMoveFixture]);

  const onSvgPointerUp = useCallback((e) => {
    if (panActive) {
      endPan();
      setPanActive(false);
      try { e.currentTarget.releasePointerCapture(e.pointerId); } catch { /* noop */ }
    }
    dragState.current = null;
  }, [panActive, endPan]);

  const onFixturePointerDown = useCallback((e, fixture) => {
    e.stopPropagation();
    if (focusActive && selectedFixtureId) return;
    const additive = e.shiftKey || e.metaKey || e.ctrlKey;
    onSelectFixture(fixture.id, { additive });
    if (additive) return;
    e.currentTarget.ownerSVGElement?.setPointerCapture?.(e.pointerId);
    dragState.current = { fixtureId: fixture.id, positionId: fixture.positionId };
  }, [focusActive, selectedFixtureId, onSelectFixture]);

  const focusRows = focusBeamRows(doc);

  // ---- grid ----
  const gridStartX = Math.floor(viewBox.x / GRID_MM) * GRID_MM;
  const gridEndX = Math.ceil((viewBox.x + viewBox.width) / GRID_MM) * GRID_MM;
  const gridStartY = Math.floor(viewBox.y / GRID_MM) * GRID_MM;
  const gridEndY = Math.ceil((viewBox.y + viewBox.height) / GRID_MM) * GRID_MM;
  const gridLines = [];
  for (let x = gridStartX; x <= gridEndX; x += GRID_MM) {
    const major = x % GRID_MAJOR_MM === 0;
    gridLines.push(<line key={`vx${x}`} x1={x} y1={viewBox.y} x2={x} y2={viewBox.y + viewBox.height}
      stroke={major ? "rgba(255,255,255,.08)" : "rgba(255,255,255,.035)"} strokeWidth={major ? 4 : 2} />);
  }
  for (let y = gridStartY; y <= gridEndY; y += GRID_MM) {
    const major = y % GRID_MAJOR_MM === 0;
    gridLines.push(<line key={`hy${y}`} x1={viewBox.x} y1={y} x2={viewBox.x + viewBox.width} y2={y}
      stroke={major ? "rgba(255,255,255,.08)" : "rgba(255,255,255,.035)"} strokeWidth={major ? 4 : 2} />);
  }

  return (
    <div className="canvas-wrap">
      <div className="canvas-toolbar">
        <button onClick={reset} type="button">Reset view</button>
        <button
          onClick={() => setFocusFixtureId(focusActive ? null : selectedFixtureId)}
          type="button"
          disabled={!selectedFixtureId}
          className={focusActive ? "tool-active" : ""}
        >
          Focus
        </button>
        <button
          onClick={() => selectedFixtureId && onClearFixtureFocus?.(selectedFixtureId)}
          type="button"
          disabled={!selectedFixture?.focus}
        >
          Clear focus
        </button>
        <span className="mono">
          {focusActive ? "click plot to place focus" : `view: ${Math.round(viewBox.x)}, ${Math.round(viewBox.y)} | ${Math.round(viewBox.width)} x ${Math.round(viewBox.height)} mm`}
        </span>
      </div>
      <svg
        ref={svgRef}
        className="plot-canvas"
        viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`}
        preserveAspectRatio="xMidYMid meet"
        onWheel={onWheel}
        onPointerDown={onSvgPointerDown}
        onPointerMove={onSvgPointerMove}
        onPointerUp={onSvgPointerUp}
        onPointerCancel={onSvgPointerUp}
        style={{ cursor: panActive ? "grabbing" : "default" }}
      >
        {/* Grid */}
        <g aria-hidden="true">{gridLines}</g>

        {/* Center line + plaster line */}
        <line x1={0} y1={viewBox.y} x2={0} y2={viewBox.y + viewBox.height}
          stroke="rgba(76,201,255,.25)" strokeWidth={4} strokeDasharray="40 40" />
        <line x1={viewBox.x} y1={0} x2={viewBox.x + viewBox.width} y2={0}
          stroke="rgba(255,181,71,.4)" strokeWidth={4} strokeDasharray="40 40" />

        {/* Stage outline */}
        <rect
          x={-doc.venue.stageWidthMm / 2}
          y={-doc.venue.stageDepthMm}
          width={doc.venue.stageWidthMm}
          height={doc.venue.stageDepthMm}
          fill="none"
          stroke="#1f2630"
          strokeWidth={6}
        />

        {/* Positions */}
        {doc.positionOrder.map(pid => {
          const p = doc.positions[pid];
          const halfLen = p.lengthMm / 2;
          const selected = p.id === selectedPositionId;
          return (
            <g
              key={p.id}
              className={`position-line ${selected ? "position-line--selected" : ""}`}
              onPointerDown={(event) => {
                event.stopPropagation();
                if (setFocusAtEvent(event)) return;
                onSelectPosition?.(p.id);
              }}
            >
              <line
                x1={-halfLen}
                y1={p.yMm}
                x2={halfLen}
                y2={p.yMm}
                stroke="transparent"
                strokeWidth={160}
              />
              <line
                x1={-halfLen}
                y1={p.yMm}
                x2={halfLen}
                y2={p.yMm}
                stroke={selected ? "#4cc9ff" : "#2a3340"}
                strokeWidth={selected ? 16 : 10}
              />
              <text x={-halfLen - 100} y={p.yMm - 20}
                fontFamily="ui-monospace, Menlo, monospace" fontSize={120}
                fill={selected ? "#4cc9ff" : "#5d6878"} textAnchor="end">{p.name}</text>
            </g>
          );
        })}

        <g className="focus-beams" aria-label="Focus beams">
          {focusRows.map(row => {
            const selected = row.fixtureId === selectedFixtureId;
            return (
              <g key={row.fixtureId} className={`focus-beam ${selected ? "focus-beam--selected" : ""}`}>
                <line
                  x1={row.fromX}
                  y1={row.fromY}
                  x2={row.toX}
                  y2={row.toY}
                  stroke={selected ? "#ffb547" : "rgba(255,181,71,.52)"}
                  strokeWidth={selected ? 14 : 9}
                  strokeDasharray="90 42"
                  pointerEvents="none"
                />
                <circle
                  cx={row.toX}
                  cy={row.toY}
                  r={selected ? 90 : 70}
                  fill={selected ? "rgba(255,181,71,.18)" : "rgba(255,181,71,.1)"}
                  stroke={selected ? "#ffb547" : "rgba(255,181,71,.68)"}
                  strokeWidth={selected ? 12 : 8}
                  pointerEvents="none"
                />
                <text
                  x={row.toX + 120}
                  y={row.toY - 90}
                  fill={selected ? "#ffb547" : "rgba(255,181,71,.8)"}
                  fontFamily="ui-monospace, Menlo, monospace"
                  fontSize={110}
                  pointerEvents="none"
                >
                  F{row.unitNumber ?? ""}
                </text>
              </g>
            );
          })}
        </g>

        {/* Fixtures */}
        {doc.fixtureOrder.map(fid => {
          const fx = doc.fixtures[fid];
          const pos = doc.positions[fx.positionId];
          if (!pos) return null;
          return (
            <FixtureSymbol
              key={fx.id}
              fixture={fx}
              position={pos}
              profiles={doc.fixtureProfiles}
              selected={fx.id === selectedFixtureId || selectedFixtureSet.has(fx.id)}
              onPointerDown={onFixturePointerDown}
            />
          );
        })}
      </svg>
    </div>
  );
}

// re-export used by tests
export { fixturesOnPosition };
