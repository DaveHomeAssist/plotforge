#!/usr/bin/env bash
set -euo pipefail

DEVICE_ID="${1:-445A14BE-DDF1-5220-8D09-B83312A28AE6}"
OUT_DIR="${2:-/private/tmp/plotforge-native-physical-smoke-2026-06-26}"
LAUNCH_APP="${3:-}"
BUNDLE_ID="${PLOTFORGE_BUNDLE_ID:-com.davehomeassist.plotforge.native}"
BUNDLE_PATTERN='plotforge|com\.davehomeassist\.plotforge'
LAUNCH_EXIT=0
CAPTURED_AT="$(date -u '+%Y-%m-%dT%H:%M:%SZ')"

mkdir -p "$OUT_DIR/smoke-screenshots" "$OUT_DIR/exported-files"

if [[ "$LAUNCH_APP" == "--launch" ]]; then
  set +e
  xcrun devicectl device process launch \
    --device "$DEVICE_ID" \
    --terminate-existing \
    "$BUNDLE_ID" \
    --json-output "$OUT_DIR/launch.json" \
    2> "$OUT_DIR/launch-stderr.txt"
  LAUNCH_EXIT=$?
  set -e
fi

set +e
xcrun devicectl device info apps \
  --device "$DEVICE_ID" \
  --json-output "$OUT_DIR/installed-apps.json" \
  > "$OUT_DIR/installed-apps.txt" \
  2> "$OUT_DIR/installed-apps-stderr.txt"
xcrun devicectl device info displays \
  --device "$DEVICE_ID" \
  --json-output "$OUT_DIR/display.json" \
  > "$OUT_DIR/display.txt" \
  2> "$OUT_DIR/display-stderr.txt"
xcrun devicectl device info lockState \
  --device "$DEVICE_ID" \
  --json-output "$OUT_DIR/lock-state.json" \
  > "$OUT_DIR/lock-state.txt" \
  2> "$OUT_DIR/lock-state-stderr.txt"
set -e

{
  echo "# PlotForge Native Physical Smoke Evidence"
  echo "captured_at=$CAPTURED_AT"
  echo "device_id=$DEVICE_ID"
  echo "bundle_id=$BUNDLE_ID"
  if [[ "$LAUNCH_APP" == "--launch" ]]; then
    echo "launch_exit=$LAUNCH_EXIT"
    echo "launch_stderr=$OUT_DIR/launch-stderr.txt"
  fi
  if [[ -f "$OUT_DIR/launch.json" ]]; then
    echo "launch_json=$OUT_DIR/launch.json"
  fi
  if [[ -f "$OUT_DIR/installed-apps.json" ]]; then
    echo "installed_apps_json=$OUT_DIR/installed-apps.json"
  fi
  if [[ -f "$OUT_DIR/display.json" ]]; then
    echo "display_json=$OUT_DIR/display.json"
  fi
  if [[ -f "$OUT_DIR/lock-state.json" ]]; then
    echo "lock_state_json=$OUT_DIR/lock-state.json"
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
| Output arm | Pending |  |  |
| Selected fixture output test | Pending |  |  |
| Blackout | Pending |  |  |
| Local network permission | Pending |  |  |
| Save/reopen | Pending |  |  |

## Defects

- None logged.
NOTES
fi

set_blank_note_field() {
  local label="$1"
  local value="$2"

  if grep -Eq "^${label}:[[:space:]]*$" "$OUT_DIR/notes.md"; then
    sed -i '' "s|^${label}:[[:space:]]*$|${label}: ${value}|" "$OUT_DIR/notes.md"
  fi
}

set_blank_note_field "Date" "$CAPTURED_AT"
set_blank_note_field "Device" "$DEVICE_ID"
set_blank_note_field "Build" "See installed-apps.json"
set_blank_note_field "Bundle" "$BUNDLE_ID"

missing_gate_rows=""

add_missing_gate_row() {
  local gate="$1"
  local evidence="$2"
  local notes="$3"

  if ! grep -Fq "| $gate |" "$OUT_DIR/notes.md"; then
    missing_gate_rows+="| $gate | Pending | $evidence | $notes |"$'\n'
  fi
}

add_missing_gate_row "Launch process" "device-process.txt, launch.json if captured" "CoreDevice proof only; visual launch choice still requires screenshot or recording"
add_missing_gate_row "Output arm" "" ""
add_missing_gate_row "Selected fixture output test" "" ""
add_missing_gate_row "Blackout" "" ""
add_missing_gate_row "Local network permission" "" ""

if [[ -n "$missing_gate_rows" ]]; then
  {
    echo
    echo "## Appended Gate Rows"
    echo
    echo "| Gate | Result | Evidence File | Notes |"
    echo "| --- | --- | --- | --- |"
    printf "%s" "$missing_gate_rows"
  } >> "$OUT_DIR/notes.md"
fi

echo "$OUT_DIR"

exit "$LAUNCH_EXIT"
