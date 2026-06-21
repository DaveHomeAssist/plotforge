import { getProfile } from "./profiles.js";

const EMPTY_GEL_LABELS = new Set(["", "OPEN", "NO COLOR", "NOCOLOR", "NO COLOUR", "NC", "N/C", "NONE"]);
const GEL_BRANDS = new Map([
  ["ROSCO", "R"],
  ["LEE", "L"],
  ["GAM", "G"],
  ["APOLLO", "AP"],
]);

function normalizeGelToken(token) {
  const trimmed = String(token || "").trim();
  if (!trimmed) return "";
  const upper = trimmed.toUpperCase().replace(/\s+/g, " ");
  const compact = upper.replace(/[^A-Z0-9]/g, "");
  if (EMPTY_GEL_LABELS.has(upper) || EMPTY_GEL_LABELS.has(compact)) return "";

  const match = upper.match(/^([A-Z]+)[\s-]*(\d{1,4}[A-Z]?)$/);
  if (!match) return compact || upper;
  const prefix = GEL_BRANDS.get(match[1]) ?? match[1];
  return `${prefix}${match[2]}`;
}

export function parseGelCodes(value) {
  const text = String(value || "");
  if (!text.trim()) return [];
  const detected = [];
  const gelPattern = /\b(ROSCO|LEE|GAM|APOLLO|[A-Z]{1,4})[\s-]*(\d{1,4}[A-Z]?)\b/gi;
  for (const match of text.matchAll(gelPattern)) {
    detected.push(normalizeGelToken(`${match[1]} ${match[2]}`));
  }
  if (detected.length) return [...new Set(detected.filter(Boolean))];

  const tokens = text
    .split(/[,;/+&|]|\band\b/gi)
    .map(normalizeGelToken)
    .filter(Boolean);
  return [...new Set(tokens)];
}

function profileLabel(doc, fixture) {
  const profile = getProfile(fixture.profileId, doc.fixtureProfiles);
  return [profile?.manufacturer, profile?.model].filter(Boolean).join(" ") || "Unknown profile";
}

function fixtureLabel(doc, fixture) {
  const position = doc.positions[fixture.positionId];
  const unit = fixture.unitNumber == null ? "No unit" : `U${fixture.unitNumber}`;
  const channel = fixture.channel == null ? "" : ` ch ${fixture.channel}`;
  return `${unit} ${position?.name ?? "Unassigned"}${channel}`;
}

function compareGelCodes(a, b) {
  const aMatch = a.match(/^([A-Z]+)(\d+)([A-Z]?)$/);
  const bMatch = b.match(/^([A-Z]+)(\d+)([A-Z]?)$/);
  if (aMatch && bMatch && aMatch[1] === bMatch[1]) {
    return Number(aMatch[2]) - Number(bMatch[2]) || aMatch[3].localeCompare(bMatch[3]);
  }
  return a.localeCompare(b, undefined, { numeric: true });
}

export function gelRollupRows(doc) {
  const rows = new Map();

  doc.fixtureOrder.forEach(fixtureId => {
    const fixture = doc.fixtures[fixtureId];
    if (!fixture) return;
    parseGelCodes(fixture.color).forEach(code => {
      const row = rows.get(code) || {
        code,
        count: 0,
        fixtureIds: [],
        fixtureLabels: [],
        profileLabels: [],
        positionNames: new Set(),
      };
      const position = doc.positions[fixture.positionId];
      row.count += 1;
      row.fixtureIds.push(fixture.id);
      row.fixtureLabels.push(fixtureLabel(doc, fixture));
      row.profileLabels.push(profileLabel(doc, fixture));
      if (position?.name) row.positionNames.add(position.name);
      rows.set(code, row);
    });
  });

  return [...rows.values()]
    .map(row => ({
      ...row,
      positionNames: [...row.positionNames].sort((a, b) => a.localeCompare(b)),
    }))
    .sort((a, b) => compareGelCodes(a.code, b.code));
}

export function escapeGelCsv(value) {
  if (value == null) return "";
  const text = String(value);
  if (!/[",\n\r]/.test(text)) return text;
  return `"${text.replaceAll("\"", "\"\"")}"`;
}

export function gelRollupCsv(doc) {
  const header = ["Gel", "Count", "Fixtures", "Positions", "Profiles"];
  const body = gelRollupRows(doc).map(row => [
    row.code,
    row.count,
    row.fixtureLabels.join("; "),
    row.positionNames.join("; "),
    row.profileLabels.join("; "),
  ]);

  return [header, ...body]
    .map(values => values.map(escapeGelCsv).join(","))
    .join("\n") + "\n";
}
