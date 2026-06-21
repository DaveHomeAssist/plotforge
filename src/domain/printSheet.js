import { patchConflicts, channelConflicts } from "./patch.js";
import { focusBeamRows } from "./focus.js";
import { getProfile } from "./profiles.js";
import { MM_PER_FOOT, formatImperial } from "./units.js";

export const PRINT_PAPERS = {
  ansi_d: { id: "ansi_d", label: "ANSI D", widthIn: 34, heightIn: 22 },
  tabloid: { id: "tabloid", label: "Tabloid", widthIn: 17, heightIn: 11 },
  letter: { id: "letter", label: "Letter", widthIn: 11, heightIn: 8.5 },
};

export const PRINT_PAPER_ORDER = ["ansi_d", "tabloid", "letter"];

export function getPrintPaper(id) {
  return PRINT_PAPERS[id] || PRINT_PAPERS.ansi_d;
}

export function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&#39;");
}

export function printWorldBounds(doc) {
  const margin = MM_PER_FOOT * 8;
  const xValues = [
    -doc.venue.stageWidthMm / 2,
    doc.venue.stageWidthMm / 2,
    ...doc.positionOrder.flatMap(id => {
      const position = doc.positions[id];
      if (!position) return [];
      const half = position.lengthMm / 2;
      return [-half, half];
    }),
    ...doc.fixtureOrder.map(id => doc.fixtures[id]?.xMm).filter(value => value != null),
    ...focusBeamRows(doc).map(row => row.toX),
  ];
  const yValues = [
    -doc.venue.stageDepthMm,
    0,
    ...doc.positionOrder.map(id => doc.positions[id]?.yMm).filter(value => value != null),
    ...focusBeamRows(doc).map(row => row.toY),
  ];
  const minX = Math.min(...xValues) - margin;
  const maxX = Math.max(...xValues) + margin;
  const minY = Math.min(...yValues) - margin;
  const maxY = Math.max(...yValues) + margin;
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

export function printLegendRows(doc) {
  const counts = new Map();
  doc.fixtureOrder.forEach(id => {
    const fixture = doc.fixtures[id];
    if (!fixture) return;
    const profile = getProfile(fixture.profileId, doc.fixtureProfiles);
    const key = fixture.profileId;
    const current = counts.get(key) || { profile, count: 0 };
    current.count += 1;
    counts.set(key, current);
  });
  return [...counts.values()].sort((a, b) => {
    const aName = [a.profile?.manufacturer, a.profile?.model].filter(Boolean).join(" ");
    const bName = [b.profile?.manufacturer, b.profile?.model].filter(Boolean).join(" ");
    return aName.localeCompare(bName);
  });
}

function plural(count, singular) {
  return `${count} ${singular}${count === 1 ? "" : "s"}`;
}

export function printPatchStatus(doc) {
  const dmx = patchConflicts(doc).length;
  const channels = channelConflicts(doc).length;
  if (!dmx && !channels) return "Patch clear";
  return [dmx ? plural(dmx, "DMX conflict") : "", channels ? plural(channels, "channel conflict") : ""]
    .filter(Boolean)
    .join(", ");
}

function gridLines(bounds) {
  const startX = Math.floor(bounds.x / (MM_PER_FOOT * 5)) * MM_PER_FOOT * 5;
  const endX = Math.ceil((bounds.x + bounds.width) / (MM_PER_FOOT * 5)) * MM_PER_FOOT * 5;
  const startY = Math.floor(bounds.y / (MM_PER_FOOT * 5)) * MM_PER_FOOT * 5;
  const endY = Math.ceil((bounds.y + bounds.height) / (MM_PER_FOOT * 5)) * MM_PER_FOOT * 5;
  const lines = [];
  for (let x = startX; x <= endX; x += MM_PER_FOOT * 5) {
    lines.push(`<line x1="${x}" y1="${bounds.y}" x2="${x}" y2="${bounds.y + bounds.height}" class="grid"/>`);
  }
  for (let y = startY; y <= endY; y += MM_PER_FOOT * 5) {
    lines.push(`<line x1="${bounds.x}" y1="${y}" x2="${bounds.x + bounds.width}" y2="${y}" class="grid"/>`);
  }
  return lines.join("");
}

function fixtureSymbol(profile, fixture, position) {
  if (!profile) return "";
  const radius = profile.radiusMm;
  const stroke = escapeHtml(profile.color || "#ffb547");
  const unit = fixture.unitNumber == null ? "" : `<text x="0" y="${-radius - 70}" class="unit">${fixture.unitNumber}</text>`;
  const transform = `translate(${fixture.xMm} ${position.yMm}) rotate(${fixture.rotation || 0})`;

  if (profile.symbol === "fresnel") {
    return `<g class="fixture" transform="${transform}"><polygon points="${-radius * 0.85},${-radius * 0.55} 0,${-radius} ${radius * 0.85},${-radius * 0.55} ${radius * 0.85},${radius * 0.55} 0,${radius} ${-radius * 0.85},${radius * 0.55}" stroke="${stroke}"/><circle r="${radius * 0.3}" fill="${stroke}"/>${unit}</g>`;
  }
  if (profile.symbol === "spot") {
    return `<g class="fixture" transform="${transform}"><rect x="${-radius}" y="${-radius}" width="${radius * 2}" height="${radius * 2}" stroke="${stroke}"/><line x1="${-radius * 0.6}" y1="0" x2="${radius * 0.6}" y2="0" stroke="${stroke}"/>${unit}</g>`;
  }
  return `<g class="fixture" transform="${transform}"><circle r="${radius}" stroke="${stroke}"/><line x1="${-radius * 0.55}" y1="0" x2="${radius * 0.55}" y2="0" stroke="${stroke}"/>${unit}</g>`;
}

function plotSvg(doc, bounds) {
  const beams = focusBeamRows(doc).map(row => (
    `<g class="focus-beam"><line x1="${row.fromX}" y1="${row.fromY}" x2="${row.toX}" y2="${row.toY}"/><circle class="focus-point" cx="${row.toX}" cy="${row.toY}" r="80"/><text x="${row.toX + 120}" y="${row.toY - 90}">F${escapeHtml(row.unitNumber ?? "")}</text></g>`
  )).join("");
  const positions = doc.positionOrder.map(id => {
    const position = doc.positions[id];
    if (!position) return "";
    const half = position.lengthMm / 2;
    return `<g><line x1="${-half}" y1="${position.yMm}" x2="${half}" y2="${position.yMm}" class="position"/><text x="${-half - 120}" y="${position.yMm - 40}" class="position-label">${escapeHtml(position.name)}</text></g>`;
  }).join("");
  const fixtures = doc.fixtureOrder.map(id => {
    const fixture = doc.fixtures[id];
    const position = fixture ? doc.positions[fixture.positionId] : null;
    if (!fixture || !position) return "";
    return fixtureSymbol(getProfile(fixture.profileId, doc.fixtureProfiles), fixture, position);
  }).join("");
  const scaleX = bounds.x + MM_PER_FOOT;
  const scaleY = bounds.y + bounds.height - MM_PER_FOOT;
  const scaleLength = MM_PER_FOOT * 10;

  return `<svg viewBox="${bounds.x} ${bounds.y} ${bounds.width} ${bounds.height}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="${escapeHtml(doc.name)} lighting plot">
    ${gridLines(bounds)}
    <line x1="0" y1="${bounds.y}" x2="0" y2="${bounds.y + bounds.height}" class="center"/>
    <line x1="${bounds.x}" y1="0" x2="${bounds.x + bounds.width}" y2="0" class="plaster"/>
    <rect x="${-doc.venue.stageWidthMm / 2}" y="${-doc.venue.stageDepthMm}" width="${doc.venue.stageWidthMm}" height="${doc.venue.stageDepthMm}" class="stage"/>
    ${positions}
    ${beams}
    ${fixtures}
    <g class="scale"><line x1="${scaleX}" y1="${scaleY}" x2="${scaleX + scaleLength}" y2="${scaleY}"/><text x="${scaleX}" y="${scaleY - 120}">10 ft</text></g>
  </svg>`;
}

function legendMarkup(doc) {
  const rows = printLegendRows(doc);
  if (!rows.length) return "<p>No fixtures</p>";
  return `<table><thead><tr><th>Qty</th><th>Fixture</th><th>Mode</th><th>Footprint</th></tr></thead><tbody>${rows.map(row => {
    const profile = row.profile;
    return `<tr><td>${row.count}</td><td>${escapeHtml([profile?.manufacturer, profile?.model].filter(Boolean).join(" ") || "Unknown")}</td><td>${escapeHtml(profile?.defaultMode || "Default")}</td><td>${escapeHtml(profile?.dmxFootprint ?? 1)}ch</td></tr>`;
  }).join("")}</tbody></table>`;
}

export function printSheetHtml(doc, { paperId = "ansi_d", now = new Date() } = {}) {
  const paper = getPrintPaper(paperId);
  const bounds = printWorldBounds(doc);
  const metadata = doc.metadata || {};
  const date = now.toLocaleDateString("en-US", { year: "numeric", month: "2-digit", day: "2-digit" });
  const patchStatus = printPatchStatus(doc);
  const drawingTitle = metadata.drawingTitle || "Lighting Plot";
  const venueName = metadata.venueName || "";
  const printTitle = `${doc.name || "Untitled Show"} ${drawingTitle}`;

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(printTitle)}</title>
<style>
@page { size: ${paper.widthIn}in ${paper.heightIn}in; margin: 0.35in; }
* { box-sizing: border-box; }
body { margin: 0; background: #fff; color: #111; font-family: -apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", sans-serif; }
.sheet { min-height: calc(${paper.heightIn}in - .7in); display: grid; grid-template-rows: minmax(0, 1fr) auto; gap: .18in; }
.plot-frame { border: 1px solid #111; min-height: 0; }
svg { display: block; width: 100%; height: 100%; min-height: 6.5in; }
.grid { stroke: #d6d9de; stroke-width: 3; }
.center { stroke: #111; stroke-width: 6; stroke-dasharray: 42 42; }
.plaster { stroke: #111; stroke-width: 6; }
.stage, .fixture circle, .fixture rect, .fixture polygon { fill: none; stroke: #111; stroke-width: 18; vector-effect: non-scaling-stroke; }
.fixture line { stroke-width: 18; vector-effect: non-scaling-stroke; }
.focus-beam line { stroke: #111; stroke-width: 8; stroke-dasharray: 90 42; vector-effect: non-scaling-stroke; }
.focus-point { fill: none; stroke: #111; stroke-width: 8; vector-effect: non-scaling-stroke; }
.focus-beam text { fill: #111; font-family: ui-monospace, Menlo, monospace; font-size: 120px; }
.position { stroke: #111; stroke-width: 10; vector-effect: non-scaling-stroke; }
.position-label, .unit, .scale text { fill: #111; font-family: ui-monospace, Menlo, monospace; font-size: 130px; }
.unit { text-anchor: middle; font-weight: 700; }
.scale line { stroke: #111; stroke-width: 12; vector-effect: non-scaling-stroke; }
.sheet-footer { display: grid; grid-template-columns: 1.1fr .9fr; border: 1px solid #111; }
.title-block, .legend { padding: .12in .16in; }
.title-block { border-right: 1px solid #111; }
h1, h2 { margin: 0 0 .06in; font-size: 14pt; line-height: 1.1; }
h2 { font-size: 10pt; text-transform: uppercase; letter-spacing: .08em; }
dl { display: grid; grid-template-columns: 1.1in 1fr; gap: .04in .12in; margin: 0; font-size: 8pt; }
dt { font-family: ui-monospace, Menlo, monospace; text-transform: uppercase; }
dd { margin: 0; }
table { width: 100%; border-collapse: collapse; font-size: 7.5pt; }
th, td { text-align: left; border-top: 1px solid #555; padding: .035in .04in; }
th { font-family: ui-monospace, Menlo, monospace; text-transform: uppercase; font-size: 6.5pt; }
@media screen { body { padding: 24px; background: #e8ebef; } .sheet { background: #fff; max-width: ${paper.widthIn}in; margin: 0 auto; padding: .35in; box-shadow: 0 20px 60px rgba(0,0,0,.22); } }
</style>
</head>
<body>
<main class="sheet">
  <section class="plot-frame">${plotSvg(doc, bounds)}</section>
  <section class="sheet-footer">
    <div class="title-block">
      <h1>${escapeHtml(doc.name || "Untitled Show")}</h1>
      <dl>
        <dt>Drawing</dt><dd>${escapeHtml(drawingTitle)}</dd>
        <dt>Venue</dt><dd>${escapeHtml(venueName || "Unspecified")}</dd>
        <dt>Designer</dt><dd>${escapeHtml(metadata.designer || "Unassigned")}</dd>
        <dt>Drafted by</dt><dd>${escapeHtml(metadata.draftsperson || "Unassigned")}</dd>
        <dt>Company</dt><dd>${escapeHtml(metadata.company || "Unassigned")}</dd>
        <dt>Show date</dt><dd>${escapeHtml(metadata.showDate || "Unscheduled")}</dd>
        <dt>Revision</dt><dd>${escapeHtml(metadata.revision || "Draft")}</dd>
        <dt>Scale</dt><dd>${escapeHtml(metadata.scaleLabel || "Not set")}</dd>
        <dt>Print date</dt><dd>${escapeHtml(date)}</dd>
        <dt>Paper</dt><dd>${escapeHtml(paper.label)} ${paper.widthIn} x ${paper.heightIn} in</dd>
        <dt>Stage</dt><dd>${escapeHtml(formatImperial(doc.venue.stageWidthMm))} wide x ${escapeHtml(formatImperial(doc.venue.stageDepthMm))} deep</dd>
        <dt>Fixtures</dt><dd>${doc.fixtureOrder.length}</dd>
        <dt>Positions</dt><dd>${doc.positionOrder.length}</dd>
        <dt>Patch</dt><dd>${escapeHtml(patchStatus)}</dd>
      </dl>
    </div>
    <div class="legend">
      <h2>Fixture legend</h2>
      ${legendMarkup(doc)}
    </div>
  </section>
</main>
<script>window.addEventListener("load", () => setTimeout(() => window.print(), 150));</script>
</body>
</html>`;
}
