import { getProfile } from "../domain/profiles.js";

/**
 * Renders a fixture symbol in world (mm) coordinates centered on (cx, cy).
 * Symbols are deliberately schematic — Phase 2 will swap these for GDTF-imported SVGs.
 */
export default function FixtureSymbol({ fixture, position, profiles, selected, onPointerDown }) {
  const profile = getProfile(fixture.profileId, profiles);
  if (!profile) return null;
  const r = profile.radiusMm;
  const cx = fixture.xMm;
  const cy = position.yMm;

  const stroke = selected ? "#4cc9ff" : profile.color;
  const fill = "#11161f";
  const strokeWidth = selected ? 28 : 18;

  return (
    <g
      transform={`translate(${cx} ${cy}) rotate(${fixture.rotation || 0})`}
      onPointerDown={(e) => onPointerDown?.(e, fixture)}
      style={{ cursor: "grab" }}
      className={`fx ${selected ? "fx--selected" : ""}`}
    >
      {profile.symbol === "ellipsoidal" && (
        <>
          <circle r={r} fill={fill} stroke={stroke} strokeWidth={strokeWidth} />
          <line x1={-r * 0.55} y1={0} x2={r * 0.55} y2={0} stroke={stroke} strokeWidth={strokeWidth} />
        </>
      )}
      {profile.symbol === "fresnel" && (
        <>
          <polygon
            points={`${-r * 0.85},${-r * 0.55} ${0},${-r} ${r * 0.85},${-r * 0.55} ${r * 0.85},${r * 0.55} ${0},${r} ${-r * 0.85},${r * 0.55}`}
            fill={fill} stroke={stroke} strokeWidth={strokeWidth}
          />
          <circle r={r * 0.3} fill={stroke} />
        </>
      )}
      {profile.symbol === "par" && (
        <>
          <circle r={r} fill={fill} stroke={stroke} strokeWidth={strokeWidth} />
          <circle r={r * 0.45} fill={stroke} />
        </>
      )}
      {profile.symbol === "spot" && (
        <>
          <rect x={-r} y={-r} width={r * 2} height={r * 2} fill={fill} stroke={stroke} strokeWidth={strokeWidth} />
          <line x1={-r * 0.6} y1={0} x2={r * 0.6} y2={0} stroke={stroke} strokeWidth={strokeWidth} />
        </>
      )}
      {fixture.unitNumber != null && (
        <text
          x={0} y={-r - 60}
          fontFamily="ui-monospace, Menlo, monospace"
          fontSize={120}
          textAnchor="middle"
          fill={stroke}
          // Counter-rotate so the unit number stays upright.
          transform={`rotate(${-(fixture.rotation || 0)})`}
        >
          {fixture.unitNumber}
        </text>
      )}
    </g>
  );
}
