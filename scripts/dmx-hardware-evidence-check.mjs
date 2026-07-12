#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const DEFAULT_DIR = "docs/dmx-smoke-evidence/2026-06-30";
const REQUIRED_RESULTS = [
  "No output before arming",
  "Arm succeeds",
  "Selected fixture intensity test works",
  "Blackout works",
  "Bad target fails visibly",
  "Network disconnect faults visibly",
  "Relay crash or tab failure faults and blacks out",
  "Blackout recovery works",
];
const REQUIRED_METADATA = [
  "Protocol",
  "Node",
  "Node IP",
  "Network interface",
  "Fixture or dimmer",
  "DMX universe/address",
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
    "Usage: node scripts/dmx-hardware-evidence-check.mjs [--dir <path>] [--protocol <artnet|sacn>] [--fixture-verified] [--json]",
    "",
    "Checks the retained D3/D4 hardware evidence folder. Exits 0 only when",
    "required artifacts, hardware metadata, and pass checkboxes are present.",
  ].join("\n");
}

function existsNonEmpty(filePath) {
  try {
    return fs.statSync(filePath).isFile() && fs.statSync(filePath).size > 0;
  } catch {
    return false;
  }
}

function findFirstFile(dir, names) {
  return names.find(name => existsNonEmpty(path.join(dir, name))) || "";
}

function readText(filePath) {
  try {
    return fs.readFileSync(filePath, "utf8");
  } catch {
    return "";
  }
}

function fieldValue(readme, label) {
  const pattern = new RegExp(`^-\\s*${label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*:\\s*(.*?)\\s*$`, "i");
  for (const line of readme.split(/\r?\n/u)) {
    const match = line.match(pattern);
    if (match) return match[1].trim();
  }
  return "";
}

function checkboxPassed(readme, label) {
  const pattern = new RegExp(`^-\\s*\\[[xX]\\]\\s*${label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*$`, "i");
  return readme.split(/\r?\n/u).some(line => pattern.test(line));
}

function normalizeProtocol(value) {
  const compact = String(value || "").trim().toLowerCase().replace(/[^a-z0-9]/gu, "");
  if (compact === "artnet") return "artnet";
  if (compact === "sacn" || compact === "e131") return "sacn";
  return compact;
}

function protocolLabel(value) {
  if (value === "artnet") return "Art-Net";
  if (value === "sacn") return "sACN";
  return value || "(unspecified)";
}

function checkEvidence(dir, { fixtureVerified = false, expectedProtocol = "" } = {}) {
  const absoluteDir = path.resolve(dir);
  const readmePath = path.join(absoluteDir, "README.md");
  const readme = readText(readmePath);
  const protocol = fieldValue(readme, "Protocol");
  const normalizedProtocol = normalizeProtocol(protocol);
  const normalizedExpectedProtocol = normalizeProtocol(expectedProtocol);
  const checks = [];

  function add(name, passed, detail = "") {
    checks.push({ name, passed, detail });
  }

  add("README.md exists", readme.length > 0, readmePath);
  add("relay.log exists", existsNonEmpty(path.join(absoluteDir, "relay.log")), "required relay stdout/stderr capture");
  add("packet capture exists", Boolean(findFirstFile(absoluteDir, ["capture.pcap", "capture.pcapng"])), "capture.pcap or capture.pcapng");
  add("node-ui.png exists", existsNonEmpty(path.join(absoluteDir, "node-ui.png")), "node receive/output UI screenshot");

  for (const label of REQUIRED_METADATA) {
    add(`${label} recorded`, fieldValue(readme, label).length > 0, `README field: ${label}`);
  }
  if (normalizedExpectedProtocol) {
    add(
      `${protocolLabel(normalizedExpectedProtocol)} protocol recorded`,
      normalizedProtocol === normalizedExpectedProtocol,
      `README Protocol must be ${protocolLabel(normalizedExpectedProtocol)}; found ${protocol || "(blank)"}`,
    );
  }

  for (const label of REQUIRED_RESULTS) {
    add(`${label} passed`, checkboxPassed(readme, label), `README checkbox: ${label}`);
  }

  if (fixtureVerified) {
    add(
      "fixture video exists",
      Boolean(findFirstFile(absoluteDir, ["fixture-video.mov", "fixture-video.mp4"])),
      "required only for fixture verified status",
    );
  }

  const failed = checks.filter(check => !check.passed);
  return {
    status: failed.length === 0 ? "pass" : "fail",
    dir: absoluteDir,
    fixtureVerified,
    expectedProtocol: normalizedExpectedProtocol || null,
    checks,
    failed,
  };
}

if (hasFlag("--help") || hasFlag("-h")) {
  process.stdout.write(`${usage()}\n`);
  process.exit(0);
}

const result = checkEvidence(optionValue("--dir", DEFAULT_DIR), {
  fixtureVerified: hasFlag("--fixture-verified"),
  expectedProtocol: optionValue("--protocol", ""),
});

if (hasFlag("--json")) {
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
} else {
  process.stdout.write(`PlotForge DMX hardware evidence: ${result.status.toUpperCase()}\n`);
  process.stdout.write(`Directory: ${result.dir}\n`);
  for (const check of result.checks) {
    process.stdout.write(`  ${check.passed ? "ok" : "FAIL"}  ${check.name}`);
    if (check.detail) process.stdout.write(` — ${check.detail}`);
    process.stdout.write("\n");
  }
}

process.exit(result.status === "pass" ? 0 : 1);
