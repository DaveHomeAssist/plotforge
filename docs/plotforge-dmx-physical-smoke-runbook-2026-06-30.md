# PlotForge DMX Physical Smoke Runbook

Date: 2026-06-30

Status: operator runbook prepared; D3 Art-Net hardware, D4 sACN hardware, and D6 signed iPad output smoke remain pending until retained evidence passes the checkers below.

## Purpose

This runbook is the execution checklist for the remaining physical gates in the PlotForge DMX plan:

- D3: web app to local relay to Art-Net node to one safe fixture or dimmer channel.
- D4: same hardware path using sACN through the shared compiler.
- D6: signed native iPad app output path, local network permission behavior, blackout, and save/reopen safety.

The detailed protocols remain the source for step-by-step smoke behavior:

- `docs/plotforge-dmx-hardware-smoke-2026-06-30.md`
- `docs/plotforge-native-physical-smoke-2026-06-26.md`
- `docs/plotforge-dmx-integration-plan-2026-06-30.md`

## Done Rules

Do not call a physical gate complete from relay logs alone.

| Gate | Required retained evidence | Required checker |
| --- | --- | --- |
| D3 Art-Net hardware verified | `relay.log`, `capture.pcap` or `capture.pcapng`, `node-ui.png`, `Protocol: Art-Net`, complete hardware metadata, all required pass checkboxes | `npm run dmx:evidence-check -- --protocol artnet` |
| D3 fixture verified | D3 verified evidence plus `fixture-video.mov` or `fixture-video.mp4` | `npm run dmx:evidence-check -- --protocol artnet --fixture-verified` |
| D4 sACN hardware verified | Same evidence shape as D3, with `Protocol: sACN` and packet capture on UDP 5568 | `npm run dmx:evidence-check -- --dir <sacn-evidence-dir> --protocol sacn` |
| D6 signed iPad output verified | CoreDevice process proof, launch JSON, installed-apps JSON, display JSON, lock-state JSON, visual proof, content-valid native export artifacts, metadata, and all native/D6 gate rows passing | `npm run native:physical-evidence-check -- --dir <native-evidence-dir>` |

## Preflight

Use Node 22 for every web-side command:

```bash
export PATH=/opt/homebrew/opt/node@22/bin:$PATH
```

Confirm the local automated proof still passes before connecting physical output:

```bash
npm run dmx:local-smoke
node scripts/smoke-domain.mjs
node scripts/syntax-check.mjs
npm audit --omit=dev
```

Confirm the evidence folders fail closed before the run:

```bash
npm run dmx:evidence-check -- --protocol artnet
npm run native:physical-evidence-check -- --dir /private/tmp/plotforge-native-physical-smoke-2026-06-30-dmx-output
npm run physical:evidence-status -- --no-fail
```

Expected pre-run result: both evidence commands fail and list missing hardware or physical iPad proof.

The consolidated status command checks D3 Art-Net, D4 sACN, and D6 native iPad evidence in one pass. Without `--no-fail`, it exits nonzero until every physical gate passes.

## D3 Art-Net Hardware Smoke

Evidence folder:

```text
docs/dmx-smoke-evidence/2026-06-30/
```

Required hardware:

- One low-cost Ethernet Art-Net/sACN node, currently targeted at DMXKing eDMX1 MAX or ENTTEC ODE Mk3 class hardware.
- One known safe dimmer or static fixture intensity channel.
- Bench or isolated network, not a production show network.

Command sequence:

```bash
npm run dmx:local-smoke
npm run dev -- --host 127.0.0.1 --port 5173
```

In a second terminal:

```bash
PLOTFORGE_DMX_TARGET_HOST=<node-ip> \
PLOTFORGE_DMX_TARGET_PORT=6454 \
PLOTFORGE_DMX_ALLOWED_ORIGINS=http://127.0.0.1:5173,http://localhost:5173 \
npm run dmx:relay 2>&1 | tee docs/dmx-smoke-evidence/2026-06-30/relay.log
```

In a third terminal, start packet capture before arming output:

```bash
sudo tcpdump -i <interface> udp port 6454 -w docs/dmx-smoke-evidence/2026-06-30/capture.pcap
```

Operator actions:

1. Open the web Output panel.
2. Copy the relay token from the relay terminal.
3. Confirm no output is possible before arming.
4. Arm Art-Net output to the node IP.
5. Send one selected fixture intensity test.
6. Blackout.
7. Exercise a bad target failure.
8. Exercise a network disconnect or disconnected node failure.
9. Exercise relay crash or tab failure after a nonzero send.
10. Recover by rearming and proving blackout returns output to zero.
11. Capture `node-ui.png`.
12. Fill every metadata field and checkbox in `docs/dmx-smoke-evidence/2026-06-30/README.md`.

Verification:

```bash
npm run dmx:evidence-check -- --protocol artnet
```

Optional fixture verified upgrade:

```bash
npm run dmx:evidence-check -- --protocol artnet --fixture-verified
```

## D4 sACN Hardware Smoke

Recommended evidence folder:

```text
docs/dmx-smoke-evidence/2026-06-30-sacn/
```

Create the folder by copying the D3 evidence template, then set `Protocol: sACN`.

Command differences from D3:

```bash
PLOTFORGE_DMX_TARGET_HOST=<node-ip> \
PLOTFORGE_DMX_TARGET_PORT=5568 \
PLOTFORGE_DMX_ALLOWED_ORIGINS=http://127.0.0.1:5173,http://localhost:5173 \
npm run dmx:relay 2>&1 | tee docs/dmx-smoke-evidence/2026-06-30-sacn/relay.log
```

Packet capture:

```bash
sudo tcpdump -i <interface> udp port 5568 -w docs/dmx-smoke-evidence/2026-06-30-sacn/capture.pcap
```

Operator actions:

1. Select sACN in the web Output panel.
2. Use unicast first unless the node requires multicast.
3. If testing multicast, confirm the relay derives the E1.31 multicast target from the selected universe.
4. Run the same selected intensity, blackout, bad target, network disconnect, relay/tab failure, and blackout recovery checks as D3.
5. Capture the node UI and complete all evidence fields.

Verification:

```bash
npm run dmx:evidence-check -- --dir docs/dmx-smoke-evidence/2026-06-30-sacn --protocol sacn
```

## D6 Native Signed iPad Output Smoke

Evidence folder:

```text
/private/tmp/plotforge-native-physical-smoke-2026-06-30-dmx-output/
```

Primary device:

```text
David's iPad: 445A14BE-DDF1-5220-8D09-B83312A28AE6
```

Current physical state:

- CoreDevice sees David's iPad.
- The 2026-06-30 14:35Z launch capture in `/private/tmp/plotforge-native-physical-smoke-2026-06-30-dmx-output/` succeeded with `launch_exit=0` and listed `PlotForgeNative.app/PlotForgeNative` in `device-process.txt`.
- Installed-apps, display, and lock-state JSON evidence has been captured for the same folder.
- The Launch process gate is machine-verifiable from that evidence. D6 is still pending because the evidence folder does not yet contain visual proof, native export artifacts, completed metadata, or passing UI/output/save gate rows.

Device check:

```bash
xcrun devicectl list devices
```

Capture process and launch evidence:

```bash
scripts/physical-smoke-evidence.sh \
  445A14BE-DDF1-5220-8D09-B83312A28AE6 \
  /private/tmp/plotforge-native-physical-smoke-2026-06-30-dmx-output \
  --launch
```

The helper also captures installed-apps, display, and lock-state JSON evidence into the same folder.
It auto-fills blank `Date`, `Device`, `Build`, and `Bundle` values in `notes.md`. `Operator` and all behavior/result rows remain manual.

Operator evidence:

1. Record the full run with QuickTime or save screenshots under `smoke-screenshots/`.
2. Launch to the PlotForge start screen.
3. Open or create a plot.
4. Prove native canvas, inspector, multi-select, fixture library, labels, Wizard, patch/checks, exports, and save/reopen.
5. Open the native Output tool.
6. Exercise Local Network permission success or denial.
7. Arm output to a safe Art-Net unicast target.
8. Send one selected fixture output test.
9. Blackout.
10. Save/reopen and confirm the document remains intact.
11. Put exported `.plot`, PDF, PDF review JSON, patch CSV, gel CSV, circuit CSV, fixture paperwork CSV, OSC JSON, and interop JSON files under `exported-files/`.
12. Fill every metadata field and gate row in `notes.md` with pass/fail, evidence file, and notes.

Verification:

```bash
npm run native:physical-evidence-check -- --dir /private/tmp/plotforge-native-physical-smoke-2026-06-30-dmx-output
```

## Closeout Checklist

Only after the relevant evidence checker passes:

- Update `docs/plotforge-dmx-integration-plan-2026-06-30.md` current status for the completed gate.
- Keep D3, D4, and D6 status separate; one passing physical gate does not imply the others passed.
- Preserve the evidence folders in the repo for web hardware evidence and in `/private/tmp` or copied docs for native iPad evidence.
- Record whether the result is hardware verified or fixture verified.
- Run `npm run physical:evidence-status` as the final combined physical evidence gate.
