// Focus charts + magic sheet: a second paperwork artifact generated entirely
// from data already in the document (focus points, layered notes, gels).
// Same pattern as printSheet.js — a fully standalone HTML document with
// literal colors only, opened in its own window. No app CSS, no theme tokens.

import { escapeHtml } from "./printSheet.js";
import { formatImperial } from "./units.js";
import { getProfile } from "./profiles.js";
import { getFixtureStatus } from "./fixtureStatus.js";
import { normalizeFixtureNotes } from "./fixtureNotes.js";
import { gelRollupRows } from "./gelRollup.js";

function fixtureRow(doc, fixture) {
  const profile = getProfile(fixture.profileId, doc.fixtureProfiles);
  const notes = normalizeFixtureNotes(fixture.notes, fixture.note);
  const status = getFixtureStatus(fixture.status);
  return {
    unit: fixture.unitNumber ?? "—",
    channel: fixture.channel ?? "—",
    profile: [profile?.manufacturer, profile?.model].filter(Boolean).join(" ") || "Fixture",
    color: fixture.color || "—",
    hang: formatImperial(fixture.xMm),
    focus: fixture.focus
      ? `${formatImperial(fixture.focus.xMm)} × ${formatImperial(fixture.focus.yMm)}`
      : "—",
    focusNote: notes.focus || "",
    goboNote: notes.gobo || "",
    colorNote: notes.color || "",
    status: status.label,
  };
}

export function focusChartPages(doc) {
  return doc.positionOrder
    .map(positionId => {
      const position = doc.positions[positionId];
      if (!position) return null;
      const rows = doc.fixtureOrder
        .map(id => doc.fixtures[id])
        .filter(fx => fx && fx.positionId === positionId)
        .sort((a, b) => a.xMm - b.xMm)
        .map(fx => fixtureRow(doc, fx));
      return { positionId, name: position.name, trimMm: position.trimMm, rows };
    })
    .filter(page => page && page.rows.length > 0);
}

export function magicSheetGroups(doc) {
  return gelRollupRows(doc).map(row => ({
    gel: row.code,
    count: row.count,
    channels: row.fixtureIds
      .map(id => doc.fixtures[id]?.channel)
      .filter(channel => channel != null)
      .sort((a, b) => a - b),
    labels: row.fixtureLabels,
  }));
}

export function focusChartHtml(doc, { now = new Date() } = {}) {
  const metadata = doc.metadata || {};
  const pages = focusChartPages(doc);
  const groups = magicSheetGroups(doc);

  const pageMarkup = pages.map(page => `
<section class="chart">
  <header>
    <h2>${escapeHtml(page.name)}</h2>
    <span>${page.rows.length} units${page.trimMm != null ? ` · trim ${escapeHtml(formatImperial(page.trimMm))}` : ""}</span>
  </header>
  <table>
    <thead><tr><th>U#</th><th>Ch</th><th>Instrument</th><th>Gel</th><th>Hang</th><th>Focus point</th><th>Focus note</th><th>Gobo</th><th>Status</th></tr></thead>
    <tbody>
      ${page.rows.map(row => `<tr>
        <td>${escapeHtml(String(row.unit))}</td>
        <td>${escapeHtml(String(row.channel))}</td>
        <td>${escapeHtml(row.profile)}</td>
        <td>${escapeHtml(row.color)}</td>
        <td>${escapeHtml(row.hang)}</td>
        <td>${escapeHtml(row.focus)}</td>
        <td>${escapeHtml(row.focusNote)}</td>
        <td>${escapeHtml(row.goboNote)}</td>
        <td>${escapeHtml(row.status)}</td>
      </tr>`).join("\n")}
    </tbody>
  </table>
</section>`).join("\n");

  const magicMarkup = groups.length ? `
<section class="magic">
  <header><h2>Magic sheet — by gel</h2><span>${groups.length} gels</span></header>
  <div class="magic-grid">
    ${groups.map(group => `<div class="magic-cell">
      <h3>${escapeHtml(group.gel)}</h3>
      <p class="channels">${group.channels.length ? group.channels.map(channel => escapeHtml(String(channel))).join(" · ") : "unpatched"}</p>
      <p class="count">${group.count} unit${group.count === 1 ? "" : "s"}</p>
    </div>`).join("\n")}
  </div>
</section>` : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(doc.name || "PlotForge")} — Focus Charts</title>
<style>
@page { size: letter landscape; margin: 0.4in; }
* { box-sizing: border-box; }
body { margin: 0; background: #fff; color: #111; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; font-size: 9.5pt; }
.head { display: flex; justify-content: space-between; align-items: baseline; border-bottom: 2px solid #111; padding-bottom: .08in; margin-bottom: .14in; }
.head h1 { margin: 0; font-size: 14pt; }
.head span { font-family: ui-monospace, Menlo, monospace; font-size: 8pt; }
.chart, .magic { break-inside: avoid; margin-bottom: .2in; }
.chart header, .magic header { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: .05in; }
.chart h2, .magic h2 { margin: 0; font-size: 11pt; }
.chart header span, .magic header span { font-family: ui-monospace, Menlo, monospace; font-size: 8pt; color: #444; }
table { width: 100%; border-collapse: collapse; }
th { font-family: ui-monospace, Menlo, monospace; text-transform: uppercase; font-size: 6.5pt; text-align: left; border-bottom: 1px solid #111; padding: .03in .06in; }
td { border-bottom: 1px solid #ccc; padding: .035in .06in; font-size: 8.5pt; }
td:nth-child(1), td:nth-child(2) { font-family: ui-monospace, Menlo, monospace; font-weight: 700; }
.magic-grid { display: grid; grid-template-columns: repeat(6, 1fr); gap: .08in; }
.magic-cell { border: 1px solid #111; padding: .07in .09in; }
.magic-cell h3 { margin: 0; font-size: 10pt; font-family: ui-monospace, Menlo, monospace; }
.magic-cell .channels { margin: .03in 0 0; font-family: ui-monospace, Menlo, monospace; font-size: 8.5pt; font-weight: 700; }
.magic-cell .count { margin: .02in 0 0; font-size: 7.5pt; color: #444; }
</style>
</head>
<body>
<div class="head">
  <h1>${escapeHtml(doc.name || "Untitled Plot")} — Focus Charts</h1>
  <span>${escapeHtml(metadata.venueName || "")} · ${escapeHtml(metadata.revision || "")} · ${escapeHtml(now.toLocaleDateString())}</span>
</div>
${pageMarkup || '<p>No fixtures hung yet.</p>'}
${magicMarkup}
</body>
</html>`;
}
