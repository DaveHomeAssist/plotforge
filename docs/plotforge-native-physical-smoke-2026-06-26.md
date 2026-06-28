# PlotForge Native Physical iPad Smoke Protocol

Date: 2026-06-26

## Purpose

This protocol closes the remaining native iPad interaction evidence gap for PlotForge Native v1. It verifies the signed SwiftUI app on a real iPad, not a simulator, while keeping visual proof separate from CoreDevice process proof.

## Devices

| Device | Identifier | Current Use |
| --- | --- | --- |
| David's iPad | `445A14BE-DDF1-5220-8D09-B83312A28AE6` | Primary signed smoke target |
| Ignacio | `DC7932E0-2339-5F41-B1EE-A6AF9CB35BD4` | Secondary hardware target |

## Evidence Paths

Store smoke evidence in one folder:

`/private/tmp/plotforge-native-physical-smoke-2026-06-26/`

Expected files:

| File | Required | Source |
| --- | --- | --- |
| `device-process.txt` | Yes | CoreDevice process proof |
| `launch-start-screen-david.json` | Yes for current run | CoreDevice launch proof for the corrected start-screen build |
| `installed-apps-david.json` | Yes for current run | CoreDevice installed app metadata showing bundle id and version |
| `display-david.json` | Yes for current run | CoreDevice display metadata showing active iPad display and orientation |
| `smoke-recording.mov` or `smoke-screenshots/` | Yes | QuickTime iPad capture or Xcode screenshots |
| `exported-files/` | Yes for N5 | Exported PDF, CSV, OSC JSON, and interop JSON |
| `/private/tmp/plotforge-native-export-smoke-2026-06-26/` | Reference | CLI-generated export artifact baseline from `PlotForgeExportSmoke` |
| `notes.md` | Yes | Operator notes, pass/fail rows, defects |

## Preflight

1. iPad is connected by USB or visible to CoreDevice.
2. iPad is unlocked and trusted by the Mac.
3. PlotForge Native is signed and installed.
4. PlotForge Native launches on the physical iPad.
5. CoreDevice process proof is captured:

```sh
xcrun devicectl device info processes --device 445A14BE-DDF1-5220-8D09-B83312A28AE6 | rg -i 'plotforge|com\.davehomeassist\.plotforge'
```

Known current proof:

- Corrected start-screen build installed and launched on David's iPad on 2026-06-26.
- David's iPad listed `PlotForgeNative.app/PlotForgeNative` as process `3514` in `/private/tmp/plotforge-native-physical-smoke-2026-06-26/device-process.txt`.
- CoreDevice launch JSON for that run is `/private/tmp/plotforge-native-physical-smoke-2026-06-26/launch-start-screen-david.json`.
- Ignacio did not list PlotForge as running in the last check.

## Screen Capture

Preferred capture:

1. Open QuickTime Player on the Mac.
2. `File` -> `New Movie Recording`.
3. Use the dropdown next to record and select the iPad.
4. Record the full smoke path.
5. Save as `smoke-recording.mov`.

Still capture fallback:

1. Open Xcode.
2. `Window` -> `Devices and Simulators`.
3. Select the iPad.
4. Use `Take Screenshot`.
5. Save PNG files under `smoke-screenshots/`.

## Smoke Matrix

| Gate | Action | Pass Evidence | Result |
| --- | --- | --- | --- |
| Launch choice | Open PlotForge Native from a clean app state | Recording or screenshot shows the PlotForge start screen with New Plot and Open .plot actions; the user is not stranded in the raw Files browser | Pending visual proof; CoreDevice launch proof captured |
| Launch document | Create a new plot or open an existing `.plot` | Recording or screenshot shows native app frame with sidebar, canvas, and inspector | Pending |
| N2 canvas | Select fixture, pan or zoom canvas, fit or reset view, drag fixture along position, nudge if keyboard is attached | Fixture selection, movement, snap behavior, and renumbered unit display are visible | Pending |
| N3 inspector | Edit channel, DMX, circuit, dimmer, color, status, and note layers; trigger one invalid numeric draft and recover | Valid fields commit, invalid field blocks only itself, Escape or blur recovery is visible | Pending |
| N3 multi select | Select multiple fixtures and edit a batch safe field such as color or status | Primary and sibling behavior matches batch safe rules | Pending |
| N4 fixtures | Search fixture library, inspect profile detail rows, add a fixture to a selected or default position | Manufacturer, model, mode, footprint, source, capabilities or notes are readable; added fixture appears on canvas and patch table | Pending |
| N4 labels | Change fixture unit, fixture channel, position, comment, and focus label visibility or text size | Canvas label visibility and size changes are visible | Pending |
| N4 Wizard | Preview and apply Wizard starter, then undo and redo | New positions and fixtures append without clearing existing work; undo and redo recover the expected states | Pending |
| N4 patch/checks | Open Patch and Reports readiness with conflicts or incomplete circuit data if present | Patch rows and check rows are readable on physical iPad | Pending |
| N5 exports | Export PDF, patch CSV, gel CSV, circuit CSV, fixture paperwork CSV, OSC JSON, and interop JSON | Files appear under `exported-files/`; filenames are deterministic; basic contents inspect cleanly | Pending |
| N5 export baseline | Compare platform-exported files against the CLI-generated export smoke folder where applicable | `.plot`, PDF, PDF review JSON, CSV, OSC JSON, and interop JSON names and basic contents align with the baseline | Pending |
| Save/reopen | Save the `.plot`, close or background the app, reopen the saved document | Existing fixtures, labels, inspector data, Wizard additions, and exported state are preserved | Pending |

## Pass Rules

- A gate is green only when visual proof or exported files show the behavior.
- CoreDevice process proof alone proves launch, not UI correctness.
- Any crash, signing error, missing exported file, unreadable panel, layout clipping, data loss, or failed save/reopen keeps the gate open.
- If a gesture is hard to capture, write the exact operator action in `notes.md` and include before/after screenshots.

## Notes Template

```md
# PlotForge Native Physical Smoke Notes

Date:
Device:
Build:
Bundle:
Operator:

## CoreDevice Proof

- Command:
- Result:

## Gate Results

| Gate | Result | Evidence File | Notes |
| --- | --- | --- | --- |
| Launch choice | Pending |  |  |
| Launch document | Pending |  |  |
| N2 canvas | Pending |  |  |
| N3 inspector | Pending |  |  |
| N3 multi select | Pending |  |  |
| N4 fixtures | Pending |  |  |
| N4 labels | Pending |  |  |
| N4 Wizard | Pending |  |  |
| N4 patch/checks | Pending |  |  |
| N5 exports | Pending |  |  |
| N5 export baseline | Pending |  |  |
| Save/reopen | Pending |  |  |

## Defects

- None logged.
```
