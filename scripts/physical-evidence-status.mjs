#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import path from "node:path";

const DEFAULT_ARTNET_DIR = "docs/dmx-smoke-evidence/2026-06-30";
const DEFAULT_SACN_DIR = "docs/dmx-smoke-evidence/2026-06-30-sacn";
const DEFAULT_NATIVE_DIR = "/private/tmp/plotforge-native-physical-smoke-2026-06-30-dmx-output";

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
    "Usage: node scripts/physical-evidence-status.mjs [--artnet-dir <path>] [--sacn-dir <path>] [--native-dir <path>] [--json] [--no-fail]",
    "",
    "Runs the retained physical evidence checkers for D3 Art-Net, D4 sACN,",
    "and D6 native iPad output. Exits 0 only when every gate passes unless",
    "--no-fail is provided.",
  ].join("\n");
}

function runChecker({ phase, label, script, args }) {
  const result = spawnSync(process.execPath, [script, ...args, "--json"], {
    cwd: process.cwd(),
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });

  let parsed = null;
  try {
    parsed = JSON.parse(result.stdout);
  } catch {
    return {
      phase,
      label,
      status: "error",
      dir: "",
      failed: [
        {
          name: "checker output parsed",
          detail: `${path.basename(script)} did not return JSON`,
        },
      ],
      stderr: result.stderr.trim(),
      exitCode: result.status ?? 1,
    };
  }

  return {
    phase,
    label,
    status: parsed.status,
    dir: parsed.dir,
    failed: parsed.failed || [],
    stderr: result.stderr.trim(),
    exitCode: result.status ?? 0,
  };
}

function statusLine(status) {
  return status === "pass" ? "PASS" : "FAIL";
}

function printText(results) {
  const overall = results.every(result => result.status === "pass") ? "PASS" : "FAIL";
  process.stdout.write(`PlotForge physical evidence status: ${overall}\n`);

  for (const result of results) {
    const failedCount = result.failed.length;
    process.stdout.write(`\n${result.phase} ${result.label}: ${statusLine(result.status)}`);
    if (failedCount > 0) process.stdout.write(` (${failedCount} missing/failed checks)`);
    process.stdout.write(`\nDirectory: ${result.dir || "(unknown)"}\n`);

    for (const check of result.failed.slice(0, 8)) {
      process.stdout.write(`  - ${check.name}`);
      if (check.detail) process.stdout.write(`: ${check.detail}`);
      process.stdout.write("\n");
    }
    if (failedCount > 8) {
      process.stdout.write(`  - ... ${failedCount - 8} more\n`);
    }
  }

  process.stdout.write("\nNext required physical proof:\n");
  process.stdout.write("- D3/D4: relay log, packet capture, node UI screenshot, expected protocol, hardware metadata, and checked target/disconnect/recovery rows.\n");
  process.stdout.write("- D6: operator name, visual proof, content-valid native exported files, and checked UI/output/save rows.\n");
}

if (hasFlag("--help") || hasFlag("-h")) {
  process.stdout.write(`${usage()}\n`);
  process.exit(0);
}

const results = [
  runChecker({
    phase: "D3",
    label: "Art-Net hardware",
    script: "scripts/dmx-hardware-evidence-check.mjs",
    args: ["--dir", optionValue("--artnet-dir", DEFAULT_ARTNET_DIR), "--protocol", "artnet"],
  }),
  runChecker({
    phase: "D4",
    label: "sACN hardware",
    script: "scripts/dmx-hardware-evidence-check.mjs",
    args: ["--dir", optionValue("--sacn-dir", DEFAULT_SACN_DIR), "--protocol", "sacn"],
  }),
  runChecker({
    phase: "D6",
    label: "native iPad output",
    script: "scripts/native-physical-evidence-check.mjs",
    args: ["--dir", optionValue("--native-dir", DEFAULT_NATIVE_DIR)],
  }),
];

if (hasFlag("--json")) {
  process.stdout.write(`${JSON.stringify({ status: results.every(result => result.status === "pass") ? "pass" : "fail", results }, null, 2)}\n`);
} else {
  printText(results);
}

process.exit(results.every(result => result.status === "pass") || hasFlag("--no-fail") ? 0 : 1);
