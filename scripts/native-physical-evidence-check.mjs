#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const DEFAULT_DIR = "/private/tmp/plotforge-native-physical-smoke-2026-06-26";

const REQUIRED_METADATA = ["Date", "Device", "Build", "Bundle", "Operator"];
const REQUIRED_GATES = [
  { label: "Launch process" },
  { label: "Launch choice" },
  { label: "Launch document" },
  { label: "N2 canvas" },
  { label: "N3 inspector" },
  { label: "N3 multi select" },
  { label: "N4 fixtures" },
  { label: "N4 labels" },
  { label: "N4 Wizard" },
  { label: "N4 patch/checks" },
  { label: "N5 exports" },
  { label: "N5 export baseline" },
  { label: "Output arm" },
  { label: "Selected fixture output test", aliases: ["Selected fixture test"] },
  { label: "Blackout" },
  { label: "Local network permission" },
  { label: "Save/reopen" },
];

const PROCESS_PATTERN = /PlotForgeNative\.app\/PlotForgeNative|com\.davehomeassist\.plotforge|PlotForgeNative/i;
const PASS_WORDS = new Set(["pass", "passed", "green", "verified", "done", "complete", "yes", "ok", "x"]);
const VISUAL_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".heic", ".mov", ".mp4"]);
const REQUIRED_CSV_HEADERS = [
  {
    name: "patch CSV",
    prefix: "Unit,Position,Profile,Mode,Status,Channel,Universe,Address,End Address,Footprint,Circuit,Dimmer,Color,Gobo,Color Note,Gobo Note,Focus Note,Crew Note,Conflicts",
  },
  {
    name: "gel rollup CSV",
    prefix: "Gel,Count,Fixtures,Positions,Profiles",
  },
  {
    name: "circuit summary CSV",
    prefix: "Circuit,Dimmer,Fixtures,Shared,Partial",
  },
  {
    name: "fixture paperwork CSV",
    prefix: "Unit,Position,Profile,Manufacturer,Model,Mode,Channel,Universe,Address,Footprint,Status,Circuit,Dimmer,Color,Gobo,Focus X,Focus Y,Color Note,Gobo Note,Focus Note,Crew Note",
  },
];

function optionValue(name, fallback) {
  const index = process.argv.indexOf(name);
  if (index === -1 || index + 1 >= process.argv.length) return fallback;
  return process.argv[index + 1];
}

function hasFlag(name) {
  return process.argv.includes(name);
}

function usage() {
  return [
    "Usage: node scripts/native-physical-evidence-check.mjs [--dir <path>] [--json]",
    "",
    "Checks retained physical iPad smoke evidence for the native PlotForge app.",
    "Exits 0 only when process proof, visual proof, export artifacts, metadata,",
    "and all required pass rows are present.",
  ].join("\n");
}

function existsNonEmpty(filePath) {
  try {
    const stat = fs.statSync(filePath);
    return stat.isFile() && stat.size > 0;
  } catch {
    return false;
  }
}

function dirExists(dirPath) {
  try {
    return fs.statSync(dirPath).isDirectory();
  } catch {
    return false;
  }
}

function readText(filePath) {
  try {
    return fs.readFileSync(filePath, "utf8");
  } catch {
    return "";
  }
}

function walkFiles(dirPath) {
  let entries;
  try {
    entries = fs.readdirSync(dirPath, { withFileTypes: true });
  } catch {
    return [];
  }

  const files = [];
  for (const entry of entries) {
    const entryPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkFiles(entryPath));
    } else if (entry.isFile() && existsNonEmpty(entryPath)) {
      files.push(entryPath);
    }
  }
  return files;
}

function metadataValue(notes, label) {
  const pattern = new RegExp(`^${escapeRegExp(label)}\\s*:\\s*(.*?)\\s*$`, "i");
  for (const line of notes.split(/\r?\n/u)) {
    const match = line.match(pattern);
    if (match) return match[1].trim();
  }
  return "";
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalize(value) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function resultPassed(value) {
  const normalized = normalize(value).replace(/[^a-z0-9 ]/g, " ").trim();
  return PASS_WORDS.has(normalized) || /\bpass(ed)?\b/i.test(value) || /\bverified\b/i.test(value);
}

function parseGateRows(notes) {
  const rows = new Map();
  for (const line of notes.split(/\r?\n/u)) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("|") || !trimmed.endsWith("|")) continue;
    const cells = trimmed.split("|").slice(1, -1).map(cell => cell.trim());
    if (cells.length < 4) continue;
    const gate = normalize(cells[0]);
    if (!gate || gate === "gate" || gate.startsWith("---")) continue;
    rows.set(gate, {
      gate: cells[0],
      result: cells[1],
      evidence: cells[2],
      notes: cells[3],
    });
  }
  return rows;
}

function processProofListed(processText) {
  let inProcessSection = false;
  for (const line of processText.split(/\r?\n/u)) {
    if (/^##\s+PlotForge Processes\s*$/i.test(line.trim())) {
      inProcessSection = true;
      continue;
    }
    if (inProcessSection && /^##\s+/u.test(line.trim())) break;
    if (inProcessSection && PROCESS_PATTERN.test(line)) return true;
  }
  return false;
}

function findGateRow(rows, gate) {
  const labels = [gate.label, ...(gate.aliases || [])].map(normalize);
  for (const label of labels) {
    if (rows.has(label)) return rows.get(label);
  }
  return null;
}

function hasRequiredExports(exportFiles) {
  const byExtension = new Map();
  for (const file of exportFiles) {
    const ext = path.extname(file).toLowerCase();
    byExtension.set(ext, (byExtension.get(ext) || 0) + 1);
  }
  return {
    plot: (byExtension.get(".plot") || 0) >= 1,
    pdf: (byExtension.get(".pdf") || 0) >= 1,
    csv: (byExtension.get(".csv") || 0) >= 4,
    json: (byExtension.get(".json") || 0) >= 3,
  };
}

function filesWithExtension(files, extension) {
  return files.filter(file => path.extname(file).toLowerCase() === extension);
}

function textStartsWith(filePath, prefix) {
  return readText(filePath).startsWith(prefix);
}

function jsonKindMatches(filePath, kind) {
  const text = readText(filePath);
  try {
    const parsed = JSON.parse(text);
    return parsed?.kind === kind;
  } catch {
    return new RegExp(`"kind"\\s*:\\s*"${escapeRegExp(kind)}"`, "u").test(text);
  }
}

function jsonFieldMatches(filePath, field, value) {
  const text = readText(filePath);
  try {
    const parsed = JSON.parse(text);
    return parsed?.[field] === value;
  } catch {
    return new RegExp(`"${escapeRegExp(field)}"\\s*:\\s*"${escapeRegExp(value)}"`, "u").test(text);
  }
}

function plotFileLooksValid(filePath) {
  try {
    const parsed = JSON.parse(readText(filePath));
    return Number(parsed?.version) === 9 && typeof parsed?.id === "string" && typeof parsed?.name === "string";
  } catch {
    return false;
  }
}

function inspectExportArtifacts(exportFiles) {
  const plotFiles = filesWithExtension(exportFiles, ".plot");
  const pdfFiles = filesWithExtension(exportFiles, ".pdf");
  const csvFiles = filesWithExtension(exportFiles, ".csv");
  const jsonFiles = filesWithExtension(exportFiles, ".json");
  const pdfReviewFiles = jsonFiles.filter(file => /pdf-review/i.test(path.basename(file)));

  return {
    validPlot: plotFiles.some(plotFileLooksValid),
    validPdf: pdfFiles.some(file => textStartsWith(file, "%PDF-1.4")),
    csvHeaders: REQUIRED_CSV_HEADERS.map(header => ({
      ...header,
      passed: csvFiles.some(file => textStartsWith(file, `${header.prefix}\n`) || textStartsWith(file, header.prefix)),
    })),
    oscBridgeJson: jsonFiles.some(file => jsonKindMatches(file, "plotforge-osc-bridge")),
    interopManifestJson: jsonFiles.some(file => jsonKindMatches(file, "plotforge-interop-manifest")),
    pdfReviewJson: pdfReviewFiles.some(file => jsonKindMatches(file, "plotforge-pdf-review")),
    pdfReviewPending: pdfReviewFiles.some(file => jsonFieldMatches(file, "physicalSignoff", "pending")),
  };
}

function checkEvidence(dir) {
  const absoluteDir = path.resolve(dir);
  const notesPath = path.join(absoluteDir, "notes.md");
  const processPath = path.join(absoluteDir, "device-process.txt");
  const exportDir = path.join(absoluteDir, "exported-files");
  const notes = readText(notesPath);
  const processText = readText(processPath);
  const files = walkFiles(absoluteDir);
  const exportFiles = walkFiles(exportDir);
  const rows = parseGateRows(notes);
  const checks = [];

  function add(name, passed, detail = "") {
    checks.push({ name, passed, detail });
  }

  const launchJsonFiles = files.filter(file => /^launch.*\.json$/i.test(path.basename(file)));
  const installedAppsFiles = files.filter(file => /^installed-apps.*\.json$/i.test(path.basename(file)));
  const displayFiles = files.filter(file => /^display.*\.json$/i.test(path.basename(file)));
  const lockStateFiles = files.filter(file => /^lock-state.*\.json$/i.test(path.basename(file)));
  const visualFiles = files.filter(file => VISUAL_EXTENSIONS.has(path.extname(file).toLowerCase()));
  const exportSet = hasRequiredExports(exportFiles);
  const exportArtifacts = inspectExportArtifacts(exportFiles);
  const plotForgeProcessListed = processProofListed(processText);
  const plotForgeAppInstalled = installedAppsFiles.some(file => /"bundleIdentifier"\s*:\s*"com\.davehomeassist\.plotforge\.native"/u.test(readText(file)));
  const coreDeviceLaunchProof =
    plotForgeProcessListed &&
    launchJsonFiles.length > 0 &&
    plotForgeAppInstalled &&
    displayFiles.length > 0 &&
    lockStateFiles.length > 0;

  add("notes.md exists", notes.length > 0, notesPath);
  add("device-process.txt exists", existsNonEmpty(processPath), processPath);
  add("PlotForge process is listed", plotForgeProcessListed, "device-process.txt must list the running app in the PlotForge Processes section");
  add("launch JSON exists", launchJsonFiles.length > 0, "launch*.json");
  add("installed apps JSON exists", installedAppsFiles.length > 0, "installed-apps*.json");
  add(
    "PlotForge app is installed",
    plotForgeAppInstalled,
    "installed-apps*.json must include com.davehomeassist.plotforge.native",
  );
  add("display JSON exists", displayFiles.length > 0, "display*.json");
  add("lock state JSON exists", lockStateFiles.length > 0, "lock-state*.json");
  add("CoreDevice launch proof complete", coreDeviceLaunchProof, "process, launch JSON, installed app, display, and lock-state evidence");
  add("visual proof exists", visualFiles.length > 0, "smoke-recording.mov/mp4 or screenshot image");
  add("exported-files exists", dirExists(exportDir), exportDir);
  add("exported .plot exists", exportSet.plot, "at least one .plot under exported-files");
  add("exported .plot is valid v9 JSON", exportArtifacts.validPlot, "version 9 .plot with id and name");
  add("exported PDF exists", exportSet.pdf, "at least one .pdf under exported-files");
  add("exported PDF starts with %PDF-1.4", exportArtifacts.validPdf, "native vector PDF signature");
  add("exported CSV set exists", exportSet.csv, "at least four .csv files under exported-files");
  for (const header of exportArtifacts.csvHeaders) {
    add(`${header.name} header matches`, header.passed, header.prefix);
  }
  add("exported JSON set exists", exportSet.json, "at least three .json files under exported-files");
  add("OSC bridge JSON is valid", exportArtifacts.oscBridgeJson, "kind: plotforge-osc-bridge");
  add("interop manifest JSON is valid", exportArtifacts.interopManifestJson, "kind: plotforge-interop-manifest");
  add("PDF review JSON is valid", exportArtifacts.pdfReviewJson, "kind: plotforge-pdf-review");
  add("PDF review physical signoff is pending", exportArtifacts.pdfReviewPending, "physicalSignoff: pending");

  for (const label of REQUIRED_METADATA) {
    add(`${label} recorded`, metadataValue(notes, label).length > 0, `notes.md field: ${label}`);
  }

  for (const gate of REQUIRED_GATES) {
    const row = findGateRow(rows, gate);
    const autoPassed = gate.label === "Launch process" && coreDeviceLaunchProof;
    const passed = Boolean(row) && (resultPassed(row.result) || autoPassed);
    const evidenceReferenced = Boolean(row) && (row.evidence.trim().length > 0 || autoPassed);
    add(`${gate.label} row exists`, Boolean(row), "notes.md Gate Results table");
    add(`${gate.label} passed`, passed, row ? `result: ${row.result}${autoPassed ? " (CoreDevice proof)" : ""}` : "");
    add(`${gate.label} evidence referenced`, evidenceReferenced, "Evidence File column");
  }

  const failed = checks.filter(check => !check.passed);
  return {
    status: failed.length === 0 ? "pass" : "fail",
    dir: absoluteDir,
    checks,
    failed,
  };
}

if (hasFlag("--help") || hasFlag("-h")) {
  process.stdout.write(`${usage()}\n`);
  process.exit(0);
}

const result = checkEvidence(optionValue("--dir", DEFAULT_DIR));

if (hasFlag("--json")) {
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
} else {
  process.stdout.write(`PlotForge native physical evidence: ${result.status.toUpperCase()}\n`);
  process.stdout.write(`Directory: ${result.dir}\n`);
  for (const check of result.checks) {
    process.stdout.write(`  ${check.passed ? "ok" : "FAIL"}  ${check.name}`);
    if (check.detail) process.stdout.write(` - ${check.detail}`);
    process.stdout.write("\n");
  }
}

process.exit(result.status === "pass" ? 0 : 1);
