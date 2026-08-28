// @vitest-environment node

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

const tempDirs = [];

afterEach(() => {
  while (tempDirs.length) {
    fs.rmSync(tempDirs.pop(), { recursive: true, force: true });
  }
});

function makeTempDir(prefix) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  tempDirs.push(dir);
  return dir;
}

function runChecker(script, args = []) {
  const result = spawnSync(process.execPath, [script, ...args, "--json"], {
    cwd: process.cwd(),
    encoding: "utf8",
  });
  return {
    exitCode: result.status,
    stderr: result.stderr,
    json: JSON.parse(result.stdout),
  };
}

function writeHardwareEvidence({ protocol = "sACN" } = {}) {
  const dir = makeTempDir("plotforge-dmx-hardware-evidence-");
  fs.writeFileSync(path.join(dir, "relay.log"), "relay ok\n");
  fs.writeFileSync(path.join(dir, "capture.pcap"), "pcap bytes\n");
  fs.writeFileSync(path.join(dir, "node-ui.png"), "png bytes\n");
  fs.writeFileSync(path.join(dir, "README.md"), [
    "# PlotForge Hardware Evidence",
    "",
    "## Hardware",
    "",
    `- Protocol: ${protocol}`,
    "- Node: Test node",
    "- Node IP: 192.0.2.10",
    "- Network interface: en0",
    "- Fixture or dimmer: Test dimmer",
    "- DMX universe/address: 1/1",
    "",
    "## Results",
    "",
    "- [x] No output before arming",
    "- [x] Arm succeeds",
    "- [x] Selected fixture intensity test works",
    "- [x] Blackout works",
    "- [x] Bad target fails visibly",
    "- [x] Network disconnect faults visibly",
    "- [x] Relay crash or tab failure faults and blacks out",
    "- [x] Blackout recovery works",
    "",
  ].join("\n"));
  return dir;
}

function gateRows() {
  const gates = [
    "Launch process",
    "Launch choice",
    "Launch document",
    "N2 canvas",
    "N3 inspector",
    "N3 multi select",
    "N4 fixtures",
    "N4 labels",
    "N4 Wizard",
    "N4 patch/checks",
    "N5 exports",
    "N5 export baseline",
    "Output arm",
    "Selected fixture output test",
    "Blackout",
    "Local network permission",
    "Save/reopen",
  ];
  return gates.map(gate => `| ${gate} | Pass | smoke-recording.mov | ok |`).join("\n");
}

function writeNativeEvidence({ validArtifacts = true } = {}) {
  const dir = makeTempDir("plotforge-native-evidence-");
  const exportDir = path.join(dir, "exported-files");
  fs.mkdirSync(exportDir);

  fs.writeFileSync(path.join(dir, "device-process.txt"), "## PlotForge Processes\nPlotForgeNative.app/PlotForgeNative pid 123\n");
  fs.writeFileSync(path.join(dir, "launch-start-screen.json"), "{\"launch\":\"ok\"}\n");
  fs.writeFileSync(path.join(dir, "installed-apps.json"), "{\"bundleIdentifier\":\"com.davehomeassist.plotforge.native\"}\n");
  fs.writeFileSync(path.join(dir, "display.json"), "{\"display\":\"ok\"}\n");
  fs.writeFileSync(path.join(dir, "lock-state.json"), "{\"locked\":false}\n");
  fs.writeFileSync(path.join(dir, "smoke-recording.mov"), "video proof\n");
  fs.writeFileSync(path.join(dir, "notes.md"), [
    "# PlotForge Native Physical Smoke Notes",
    "",
    "Date: 2026-07-01",
    "Device: Test iPad",
    "Build: Test build",
    "Bundle: com.davehomeassist.plotforge.native",
    "Operator: Test operator",
    "",
    "## Gate Results",
    "",
    "| Gate | Result | Evidence File | Notes |",
    "| --- | --- | --- | --- |",
    gateRows(),
    "",
  ].join("\n"));

  fs.writeFileSync(
    path.join(exportDir, "show.plot"),
    validArtifacts ? "{\"version\":9,\"id\":\"show\",\"name\":\"Show\"}\n" : "{}\n",
  );
  fs.writeFileSync(
    path.join(exportDir, "show-plot.pdf"),
    validArtifacts ? "%PDF-1.4\n%%EOF\n" : "not a pdf\n",
  );
  fs.writeFileSync(
    path.join(exportDir, "show-patch.csv"),
    `${validArtifacts ? "Unit,Position,Profile,Mode,Status,Channel,Universe,Address,End Address,Footprint,Circuit,Dimmer,Color,Gobo,Color Note,Gobo Note,Focus Note,Crew Note,Conflicts" : "wrong"}\n`,
  );
  fs.writeFileSync(
    path.join(exportDir, "show-gel-order.csv"),
    `${validArtifacts ? "Gel,Count,Fixtures,Positions,Profiles" : "wrong"}\n`,
  );
  fs.writeFileSync(
    path.join(exportDir, "show-circuit-summary.csv"),
    `${validArtifacts ? "Circuit,Dimmer,Fixtures,Shared,Partial" : "wrong"}\n`,
  );
  fs.writeFileSync(
    path.join(exportDir, "show-fixture-paperwork.csv"),
    `${validArtifacts ? "Unit,Position,Profile,Manufacturer,Model,Mode,Channel,Universe,Address,Footprint,Status,Circuit,Dimmer,Color,Gobo,Focus X,Focus Y,Color Note,Gobo Note,Focus Note,Crew Note" : "wrong"}\n`,
  );
  fs.writeFileSync(
    path.join(exportDir, "show-osc-bridge.json"),
    validArtifacts ? "{\"kind\":\"plotforge-osc-bridge\"}\n" : "{\"kind\":\"wrong\"}\n",
  );
  fs.writeFileSync(
    path.join(exportDir, "show-interop-manifest.json"),
    validArtifacts ? "{\"kind\":\"plotforge-interop-manifest\"}\n" : "{\"kind\":\"wrong\"}\n",
  );
  fs.writeFileSync(
    path.join(exportDir, "show-pdf-review.json"),
    validArtifacts
      ? "{\"kind\":\"plotforge-pdf-review\",\"physicalSignoff\":\"pending\"}\n"
      : "{\"kind\":\"wrong\",\"physicalSignoff\":\"done\"}\n",
  );

  return dir;
}

describe("physical evidence checker scripts", () => {
  it("requires the expected protocol for hardware smoke evidence", () => {
    const dir = writeHardwareEvidence({ protocol: "sACN" });

    const wrongProtocol = runChecker("scripts/dmx-hardware-evidence-check.mjs", ["--dir", dir, "--protocol", "artnet"]);
    expect(wrongProtocol.exitCode).toBe(1);
    expect(wrongProtocol.json.status).toBe("fail");
    expect(wrongProtocol.json.failed.map(check => check.name)).toContain("Art-Net protocol recorded");

    const matchingProtocol = runChecker("scripts/dmx-hardware-evidence-check.mjs", ["--dir", dir, "--protocol", "sacn"]);
    expect(matchingProtocol.stderr).toBe("");
    expect(matchingProtocol.exitCode).toBe(0);
    expect(matchingProtocol.json.status).toBe("pass");
  });

  it("validates native physical export artifact contents, not just file counts", () => {
    const validDir = writeNativeEvidence({ validArtifacts: true });
    const invalidDir = writeNativeEvidence({ validArtifacts: false });

    const valid = runChecker("scripts/native-physical-evidence-check.mjs", ["--dir", validDir]);
    expect(valid.stderr).toBe("");
    expect(valid.exitCode).toBe(0);
    expect(valid.json.status).toBe("pass");

    const invalid = runChecker("scripts/native-physical-evidence-check.mjs", ["--dir", invalidDir]);
    expect(invalid.exitCode).toBe(1);
    expect(invalid.json.status).toBe("fail");
    expect(invalid.json.failed.map(check => check.name)).toEqual(expect.arrayContaining([
      "exported .plot is valid v9 JSON",
      "exported PDF starts with %PDF-1.4",
      "patch CSV header matches",
      "gel rollup CSV header matches",
      "circuit summary CSV header matches",
      "fixture paperwork CSV header matches",
      "OSC bridge JSON is valid",
      "interop manifest JSON is valid",
      "PDF review JSON is valid",
      "PDF review physical signoff is pending",
    ]));
  });
});
