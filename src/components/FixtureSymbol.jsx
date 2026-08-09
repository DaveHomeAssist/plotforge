import { memo } from "react";
import { getFixtureStatus } from "../domain/fixtureStatus.js";
import { getProfile } from "../domain/profiles.js";
import { defaultLabelSettings } from "../domain/show.js";

/**
 * Renders a fixture symbol in world (mm) coordinates centered on (cx, cy).
 * Symbols are deliberately schematic — Phase 2 will swap these for GDTF-imported SVGs.
 */
function FixtureSymbol({
  fixture,
  position,
  profiles,
  selected,
  labelSettings,
  onPointerDown,
  onKeyDown,
  tabIndex = -1,
  describedBy,
}) {
  const labels = labelSettings || defaultLabelSettings();
  const profile = getProfile(fixture.profileId, profiles);
  if (!profile) return null;
  const r = profile.radiusMm;
  const cx = fixture.xMm;
  const cy = position.yMm;

  const stroke = selected ? "var(--fixture-selected)" : profile.color;
  const fill = "var(--fixture-body)";
  const strokeWidth = selected ? 28 : 18;
  const status = getFixtureStatus(fixture.status);

  return (
    <g
      transform={`translate(${cx} ${cy}) rotate(${fixture.rotation || 0})`}
      onPointerDown={(e) => onPointerDown?.(e, fixture)}
      onKeyDown={(e) => onKeyDown?.(e, fixture)}
      style={{ cursor: "grab" }}
      className={`fx ${selected ? "fx--selected" : ""}`}
      role="button"
      tabIndex={tabIndex}
      aria-pressed={selected}
      aria-describedby={describedBy}
      data-fixture-id={fixture.id}
      aria-label={[
        `Unit ${fixture.unitNumber ?? "unnumbered"}`,
        profile.name || "fixture",
        position.name ? `on ${position.name}` : null,
        fixture.channel != null ? `channel ${fixture.channel}` : "unpatched",
        `${status.label} status`,
      ].filter(Boolean).join(", ")}
    >
      <title>{status.label} status</title>
      {/* Transparent hit area — keeps the pointer/focus target at least 24 CSS px
          (WCAG 2.2 SC 2.5.8) even when the drawn glyph is smaller. */}
      <circle className="fx__hit" r={Math.max(r * 1.5, 290)} fill="transparent" />
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
      <circle
        className="fixture-status-marker"
        cx={r * 0.82}
        cy={r * 0.82}
        r={Math.max(56, r * 0.18)}
        fill={status.color}
        stroke="var(--fixture-marker-ring)"
        strokeWidth={18}
      />
      {labels.showFixtureUnit && fixture.unitNumber != null && (
        <text
          x={0} y={-r - 60}
          fontFamily="ui-monospace, Menlo, monospace"
          fontSize={labels.fixtureUnitSize}
          textAnchor="middle"
          fill={stroke}
          // Counter-rotate so the unit number stays upright.
          transform={`rotate(${-(fixture.rotation || 0)})`}
        >
          {fixture.unitNumber}
        </text>
      )}
      {labels.showFixtureChannel && fixture.channel != null && (
        <text
          x={0}
          y={r + labels.fixtureChannelSize}
          fontFamily="ui-monospace, Menlo, monospace"
          fontSize={labels.fixtureChannelSize}
          textAnchor="middle"
          fill={stroke}
          transform={`rotate(${-(fixture.rotation || 0)})`}
        >
          CH {fixture.channel}
        </text>
      )}
    </g>
  );
}

// Panning changes only the viewBox. Without memoization every pan frame
// re-rendered every fixture subtree, which dominated frame time at plot scale.
export default memo(FixtureSymbol);
