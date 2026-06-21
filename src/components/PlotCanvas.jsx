import { useCallback, useRef, useState } from "react";
import usePanZoom from "../hooks/usePanZoom.js";
import FixtureSymbol from "./FixtureSymbol.jsx";
import { fixturesOnPosition } from "../domain/show.js";
import { feetToMm, MM_PER_FOOT } from "../domain/units.js";

const GRID_MM = MM_PER_FOOT;          // 1 ft minor grid
const GRID_MAJOR_MM = MM_PER_FOOT * 5; // 5 ft major grid

export default function PlotCanvas({
  doc,
  selectedFixtureId,
  selectedPositionId,
  onSelectFixture,
  onSelectPosition,
  onMoveFixture,
}) {
  const svgRef = useRef(null);
  const dragState = useRef(null);

  // Initial world view: a generous margin around the venue.
  const margin = feetToMm(8);
  const halfW = doc.venue.stageWidthMm / 2 + margin;
  const initial = {
    x: -halfW,
    y: -doc.venue.stageDepthMm - margin,
    width: halfW * 2,
    height: doc.venue.stageDepthMm + margin * 2 + feetToMm(20),  // include FOH area
  };

  const { viewBox, onWheel, beginPan, panTo, endPan, screenToWorld, reset } =
    usePanZoom({ initialWorldRect: initial, viewportSize: { width: 800, height: 600 } });

  const [panActive, setPanActive] = useState(false);

  const onSvgPointerDown = useCallback((e) => {
    if (e.target.closest(".fx")) return; // fixture handles its own drag
    if (e.button !== 0 && e.button !== 1) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setPanActive(true);
    beginPan(e.clientX, e.clientY);
  }, [beginPan]);

  const onSvgPointerMove = useCallback((e) => {
    if (panActive) panTo(e.clientX, e.clientY, e.currentTarget);
    if (dragState.current) {
      const { fixtureId, positionId } = dragState.current;
      const world = screenToWorld(e.clientX, e.clientY, e.currentTarget);
      // Snap x to the nearest 1-inch increment for a calmer drag feel.
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
    onSelectFixture(fixture.id);
    e.currentTarget.ownerSVGElement?.setPointerCapture?.(e.pointerId);
    dragState.current = { fixtureId: fixture.id, positionId: fixture.positionId };
  }, [onSelectFixture]);

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
        <span className="mono">
          view: {Math.round(viewBox.x)}, {Math.round(viewBox.y)} · {Math.round(viewBox.width)} × {Math.round(viewBox.height)} mm
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
              selected={fx.id === selectedFixtureId}
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
