#!/usr/bin/env bash
set -euo pipefail

DEVICE_ID="${1:-445A14BE-DDF1-5220-8D09-B83312A28AE6}"
OUT_DIR="${2:-/private/tmp/plotforge-native-physical-smoke-2026-06-26}"
LAUNCH_APP="${3:-}"
BUNDLE_ID="${PLOTFORGE_BUNDLE_ID:-com.davehomeassist.plotforge.native}"
BUNDLE_PATTERN='plotforge|com\.davehomeassist\.plotforge'

mkdir -p "$OUT_DIR/smoke-screenshots" "$OUT_DIR/exported-files"

if [[ "$LAUNCH_APP" == "--launch" ]]; then
  xcrun devicectl device process launch \
    --device "$DEVICE_ID" \
    --terminate-existing \
    "$BUNDLE_ID" \
    --json-output "$OUT_DIR/launch.json"
fi

{
  echo "# PlotForge Native Physical Smoke Evidence"
  echo "captured_at=$(date -u '+%Y-%m-%dT%H:%M:%SZ')"
  echo "device_id=$DEVICE_ID"
  echo "bundle_id=$BUNDLE_ID"
  if [[ -f "$OUT_DIR/launch.json" ]]; then
    echo "launch_json=$OUT_DIR/launch.json"
  fi
  echo
  echo "## Devices"
  xcrun devicectl list devices
  echo
  echo "## PlotForge Processes"
  xcrun devicectl device info processes --device "$DEVICE_ID" | grep -Ei "$BUNDLE_PATTERN" || true
} > "$OUT_DIR/device-process.txt"

if [[ ! -f "$OUT_DIR/notes.md" ]]; then
  cat > "$OUT_DIR/notes.md" <<'NOTES'
# PlotForge Native Physical Smoke Notes

Date:
Device:
Build:
Bundle: com.davehomeassist.plotforge.native
Operator:

## CoreDevice Proof

- Command: `scripts/physical-smoke-evidence.sh`
- Result:

## Gate Results

| Gate | Result | Evidence File | Notes |
| --- | --- | --- | --- |
| Launch process | Pending | device-process.txt, launch.json if captured | CoreDevice proof only; visual launch choice still requires screenshot or recording |
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
NOTES
fi

echo "$OUT_DIR"
