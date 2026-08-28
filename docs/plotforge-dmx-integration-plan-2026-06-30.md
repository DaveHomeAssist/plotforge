# PlotForge DMX Integration Plan

Date: 2026-06-30

Status: D0 resolved; D1 web simulator/buffer compiler, D2 Art-Net relay MVP, D4 sACN encoder/web relay/UI unicast path, D5 fixture personality/output-readiness slice, and the D6 native compiler/UI/Art-Net UDP slice implemented locally on 2026-06-30; D3/D4 hardware smoke protocol/evidence scaffolds prepared; D6 native physical smoke evidence checker prepared; D3/D4 physical smoke plus D6 signed iPad output smoke remain pending

## Review Notes (2026-06-30)

Verdict: approve the direction and proceed with D1 as written. The six-layer architecture and the safety philosophy are strong. Three items must be resolved before the phase that depends on them, and the most important live-output safety control — a relay-side dead-man's watchdog — was missing and has now been folded into the Relay Layer and Safety Rules below.

- Blocking, before D2: relay watchdog/dead-man's switch (see Relay Layer, Safety Rules); Art-Net Port-Address encoding as 15-bit Net/Sub-Net/Universe (see Transport Encoder Layer, Data Model Sketch); HTTPS-to-`ws://localhost` mixed-content constraint (see Safety Rules).
- High: continuous-refresh keep-alive while armed (see Relay Layer, Safety Rules); ArtDmx parity/opcode/sequence pinned in golden tests (see D2 acceptance).
- Medium: full-frame vs partial-frame decision (see Transport Encoder Layer); shared compiler test-vector corpus pulled forward into D1 (see D1); conflict-override default set to block-all for v0 (see D1).
- Resolved (2026-06-30): all fourteen original Research Questions are now answered and recorded in [Decisions (D0)](#decisions-d0), sourced from the companion [DMX design decisions document](plotforge-dmx-design-decisions-2026-06-30.md). Notable consequences folded into this plan: blackout is burst-then-cease (not perpetual zeros); v0 frame rate default drops to 20 Hz with per-protocol hard ceilings; the fixture schema is the typed channel-descriptor array; and the hardware "verified" bar is tiered (relay log + packet capture + node screenshot, fixture video for "fixture verified").

## Intent

PlotForge already knows enough about fixtures, patch addresses, footprints, conflicts, status, notes, OSC export, and native/web document compatibility to become useful for output verification. The right next step is not to turn PlotForge into a full lighting console. The right next step is to add a controlled DMX output layer that can preview and test what the plotted patch says.

The product stance should stay conservative:

- PlotForge remains a drafting, paperwork, preflight, and handoff tool.
- DMX output is opt-in and disabled by default.
- Live output must require an explicit arm action every session.
- The first implementation should drive a simulator and one test universe before it drives real rigs.
- Any real output must have visible target, protocol, universe, rate, conflict, and blackout state.

## Current Foundation

The current codebase gives us useful starting points:

- The web document model stores per-fixture channel, DMX universe, DMX address, profile, mode, status, focus, circuit, dimmer, and note data.
- DMX conflicts are already footprint-aware and visible in patch/check surfaces.
- Fixture profiles already carry a DMX footprint.
- The web app includes an OSC bridge panel and `scripts/osc-relay.mjs`, which proves a browser-to-local-WebSocket-to-UDP relay pattern.
- Native code preserves blank DMX patch fields and has export support for OSC JSON and interop JSON.
- MVR import is still parked on a Vectorworks sample corpus, so DMX integration should not depend on MVR.

The missing foundation is fixture personality detail. A footprint tells PlotForge how many slots a fixture occupies, but it does not say which slot is intensity, red, green, blue, pan, tilt, shutter, strobe, zoom, gobo, color wheel, or control reset. That means the earliest DMX feature should compile and inspect buffers safely, while real fixture parameter control should start with a limited set of known generic profiles.

## Protocol Context

DMX512-A is the baseline lighting control concept: a controller sends repeated values to controlled devices over up to 512 slots per universe. ESTA lists ANSI E1.11 - 2024 as the current DMX512-A standard. The older published E1.11 document describes DMX512-A as a method of digital transmission between controllers and controlled equipment, including dimmers, and notes that it is for repetitive control data for lighting devices and related non-hazardous effects.

Art-Net and sACN are the practical network transports:

- Art-Net carries DMX512 and RDM style data over Ethernet. The official Art-Net 4 specification identifies `OpDmx` as the packet that carries zero-start-code DMX512 data for a single universe, and Art-Net uses UDP port `0x1936`, decimal `6454`.
- sACN, ANSI E1.31, carries DMX512 style data and metadata over IP networks using an ACN subset. ESTA lists ANSI E1.31 - 2025 as current and notes IPv6 support in that revision.

For PlotForge, Art-Net is the simpler first network output target because the packet is compact, many low-cost nodes support it, and it fits the existing no-dependency UDP relay style. sACN is important, but it should come after the buffer compiler and output safety model are proven.

## Product Goals

The DMX feature set should answer these operator questions:

- Does the document patch compile into the universe and slot values I expect?
- Are there overlaps, out-of-range addresses, missing universes, or incomplete profile mappings?
- Can I safely send a selected fixture test to a local node?
- Can I blackout all output if the app, relay, or target state is unclear?
- Can I generate evidence that the output mapping matched the paperwork?

The feature should not promise:

- Cue stack playback.
- Timecode.
- Show-critical live busking.
- Full moving-light programming.
- RDM discovery/configuration in the first pass.
- USB DMX hardware in the first pass.
- Hazardous effects control.
- Cloud-routed live output.

## Proposed Architecture

Use six layers.

### 1. Document Patch Layer

Existing document data remains the source for fixture identity, universe, address, profile, mode, and footprint. The core invariant is that a fixture can only compile into a universe buffer when:

- It has a positive integer universe.
- It has a positive integer address.
- Its address plus footprint stays within 512.
- Its occupied range does not overlap another output-enabled fixture in that universe.
- Its profile has a known output map, or the output mode is explicitly raw slot testing.

Do not use `armed`, `live`, or current channel levels as persistent document state. The `.plot` file can remember output preferences, but not whether a session is armed.

### 2. Output Intent Layer

Add an in-memory output state that represents what the operator is trying to do:

```text
idle
preview
armed
sending
blackout
fault
```

Output intent should include:

- Selected fixture test.
- Whole patch blackout.
- Whole patch hold at zero.
- Fixture intensity test.
- RGBW color test for mapped fixtures.
- Raw slot test for a selected fixture range.

The UI should show this state in plain language. If output is armed, it should be impossible to miss.

### 3. Fixture Parameter Mapping Layer

The mapping schema is a flat, slot-indexed list of typed channel descriptors — no hierarchy, no console-style attribute trees. It answers exactly one question per fixture: which DMX slot does what, and what value range is safe to write. (Decided in D0; see [Decisions (D0)](#decisions-d0) §3.)

```json
{
  "id": "uuid-or-slug",
  "schemaVersion": 1,
  "label": "Robe ROBIN 600E Spot - Mode 2",
  "footprint": 24,
  "channels": [
    { "slot": 1, "label": "Dimmer", "type": "intensity", "default": 0, "safeMin": 0, "safeMax": 255 },
    { "slot": 2, "label": "Pan", "type": "panCoarse", "default": 128, "pairedFine": 3 },
    { "slot": 3, "label": "Pan Fine", "type": "panFine", "default": 128 },
    { "slot": 4, "label": "Shutter/Strobe", "type": "shutter", "default": 0,
      "ranges": [
        { "label": "Closed", "dmxFrom": 0, "dmxTo": 3 },
        { "label": "Open", "dmxFrom": 4, "dmxTo": 7 },
        { "label": "Strobe", "dmxFrom": 64, "dmxTo": 95, "unsafe": true }
      ]
    },
    { "slot": 9, "label": "Fixture Reset", "type": "reset", "unsafe": true,
      "triggerValue": 255, "holdMs": 3000 }
  ]
}
```

Rules:

- `slot` is 1-based and maps directly to the universe offset; no abstraction layer.
- `type` is an enum (`intensity`, `panCoarse`, `panFine`, `tiltCoarse`, `tiltFine`, `colorWheel`, `goboWheel`, `shutter`, `strobe`, `reset`, `raw`). The renderer uses it to choose a fader, a wheel/indexed picker, or a locked input.
- `pairedFine` links coarse/fine slots so a 16-bit value is presented as one 0-65535 control and both bytes are always written in the same frame. Never write coarse without its declared fine — partial writes cause fixture lurches.
- `unsafe: true` on a channel or range gates output behind an explicit, per-session confirmation.
- `safeMin`/`safeMax` are per-channel output clamps enforced at the serialization layer, not just the UI.
- Values are clamped to 0-255; unknown/unmapped slots default to 0.

The schema can represent pan/tilt, reset, and other moving-light parameters, but v0 keeps those types gated/hidden in the UI (revealed only by a per-session "Show Unsafe Channels" toggle) so the schema is complete while v0 behavior stays conservative. Continuous types get type-aware fader rendering; pan/tilt carry a slew-rate guard to avoid motor slam. This map can live beside fixture profiles initially, then move to the shared canonical JSON store (see [Decisions (D0)](#decisions-d0) §5).

### 4. Universe Compiler

The compiler turns document fixtures plus output intent into universe buffers:

```text
PlotShowDocument
  -> selected output profile mappings
  -> validation report
  -> Map<universe, Uint8Array(512)>
  -> transport frames
```

Compiler responsibilities:

- Produce one 512-slot buffer per active universe.
- Track which fixture wrote each slot for explainability.
- Return blocking errors for overlaps and out-of-range ranges.
- Return warnings for incomplete mappings.
- Support blackout by emitting all-zero buffers for every active universe.
- Support selected fixture test by zeroing all other fixtures by default.
- Produce deterministic output for tests.

The compiler should be pure domain logic with no browser, native, UDP, or file-system dependency.

### 5. Transport Encoder Layer

Transport encoders convert universe buffers into protocol packets.

Art-Net v0 should support:

- `ArtDmx` packet generation with the `Art-Net\0` ID and OpCode `0x5000` (`OpDmx`).
- Configurable target host.
- Configurable target port, default `6454`.
- Configurable universe mapping. The Art-Net Port-Address is 15-bit, split across Net (7-bit), Sub-Net (4-bit), and Universe (4-bit). Do not model it as a flat integer — a flat int silently caps output at one Net/Sub-Net and mis-routes once a universe exceeds 15. Encode the three fields explicitly.
- Even data length only (2-512). Pad odd lengths up; set LengthHi/LengthLo accordingly. v0 sends full 512-slot frames for determinism; partial frames are a later optimization.
- Sequence field policy, starting simple: `0` disables sequence checking, otherwise increment 1-255 with wraparound.
- Unicast first.

sACN v1 should support later:

- Source name.
- CID.
- Universe.
- Priority.
- Sequence number.
- Preview-data flag.
- Multicast or unicast target mode.
- IPv4 first, then IPv6 after the current standard revision is reviewed in detail.

Keep transport encoders isolated and covered by golden packet tests. A packet encoder bug can put values on the wrong universe.

### 6. Relay Layer

Browsers cannot send raw UDP directly, so the web app needs a local relay. The existing OSC relay shape is a useful precedent:

```text
Browser UI
  -> WebSocket JSON command
  -> local Node relay
  -> UDP Art-Net or sACN packet
  -> lighting node
  -> DMX line
  -> fixture
```

Create a separate relay rather than overloading `osc-relay.mjs`:

```text
scripts/dmx-relay.mjs
```

Relay responsibilities:

- Bind only to `127.0.0.1` by default.
- Expose `/health`.
- Accept WebSocket commands from the local app, but only after authenticating the connection (see below). A loopback bind is not access control: any process or browser tab on the machine can reach `127.0.0.1:8766`, so a malicious page the user has open could arm and drive the rig (cross-site WebSocket hijacking / DNS-rebinding class). Treat every connection as untrusted until it proves origin and token.
- Reject the WebSocket upgrade unless the `Origin` header is in an allowlist. Default allowlist is the local dev origins only (e.g. `http://localhost:5173`, `http://127.0.0.1:5173`); the hosted Vercel origin is never allowlisted, which is consistent with the mixed-content reality that an HTTPS page cannot open `ws://127.0.0.1` anyway.
- Require a per-launch bearer token. The relay generates a random token at startup, prints it to its own stdout, and rejects any command session that does not present it in the auth handshake. The token is a relay-side/session secret: never persist it in the `.plot` document and never log it from the browser. A user copies it from the relay console into the Output panel once per launch (or the dev launcher injects it).
- Validate protocol, target host, port, universe, and payload length.
- Emit Art-Net first.
- Rate-limit frame sends to a per-protocol ceiling (see [Decisions (D0)](#decisions-d0) §8). While armed and sending live values, stream a continuous keep-alive at a minimum refresh — some nodes and fixtures fail-safe or hold stale values without periodic refresh, so live output is a steady stream, not change-only. This applies only to live (non-zero) output, not to blackout.
- Blackout is burst-then-cease, not perpetual zeros: emit a short burst of all-zero frames (default 5) at the operating rate, then stop transmitting. A test tool's blackout must feel like cutting power, not dimming to zero, so output truly stops. An opt-in, default-off "keep alive" toggle sends continuous zeros for nodes whose data-loss failsafe is hold-last-look or go-to-scene rather than zero; it must be clearly labeled because it means output never fully stops. (Decided in D0; see [Decisions (D0)](#decisions-d0) §9.)
- Run a dead-man's watchdog: while armed, if no heartbeat or frame arrives from the UI within a short timeout, auto-emit blackout and drop to fault. This must not depend on a clean disconnect — a crashed tab, killed renderer, or frozen UI cannot be relied on to flush a blackout. This watchdog is the primary live-output safety control.
- Return structured success/failure messages.
- Emit blackout frames on shutdown if configured.
- Refuse public network binding unless an explicit environment variable is set.

Potential environment variables:

```text
PLOTFORGE_DMX_WS_PORT=8766
PLOTFORGE_DMX_PROTOCOL=artnet
PLOTFORGE_DMX_TARGET_HOST=127.0.0.1
PLOTFORGE_DMX_TARGET_PORT=6454
PLOTFORGE_DMX_MAX_FPS=20             # v0 default; per-protocol hard cap enforced in code (see D0 §8)
PLOTFORGE_DMX_MIN_REFRESH_FPS=1      # live-output keep-alive only, not blackout
PLOTFORGE_DMX_BLACKOUT_BURST=5       # all-zero frames sent on blackout before transmission ceases
PLOTFORGE_DMX_BLACKOUT_KEEPALIVE=0   # opt-in: send continuous zeros instead of ceasing (default off)
PLOTFORGE_DMX_HEARTBEAT_TIMEOUT_MS=1000
PLOTFORGE_DMX_ALLOW_PUBLIC_BIND=0
PLOTFORGE_DMX_ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
PLOTFORGE_DMX_TOKEN=                 # blank = generate a random token at startup and print it
PLOTFORGE_DMX_REQUIRE_TOKEN=1        # set 0 only for headless local tests, never for hardware
```

#### WebSocket Command Schema And Authentication

Every connection runs a two-step handshake before any frame is accepted. The relay rejects, with a structured error and a closed socket, any session that sends a non-`auth` message first, presents a bad token, or arrives from a non-allowlisted origin.

Step 1 — client authenticates immediately on connect:

```json
{
  "type": "auth",
  "protocolVersion": 1,
  "token": "f3a9c2…"        // copied from the relay console; matched in constant time
}
```

Relay reply:

```json
{ "type": "auth.ok", "relayVersion": "0.1.0", "maxFps": 20, "boundHost": "127.0.0.1" }
```

or

```json
{ "type": "auth.error", "reason": "bad-token" }   // also: bad-origin, unsupported-version
```

Step 2 — only after `auth.ok`, the client may send commands. Every command repeats the token (cheap defense against a hijacked-but-unauthed socket racing in) and carries an explicit target so the relay never infers a destination:

```json
{
  "type": "frame",
  "token": "f3a9c2…",
  "protocol": "artnet",
  "target": { "host": "10.0.0.51", "port": 6454 },
  "portAddress": { "net": 0, "subNet": 0, "universe": 0 },
  "length": 512,
  "data": "<512 bytes, base64>"
}
```

```json
{ "type": "heartbeat", "token": "f3a9c2…" }     // resets the dead-man's watchdog
{ "type": "blackout", "token": "f3a9c2…" }      // force all-zero on every active universe
```

Relay → client results are always structured:

```json
{ "type": "frame.ok", "portAddress": { "net": 0, "subNet": 0, "universe": 0 }, "bytesSent": 530 }
{ "type": "frame.error", "reason": "odd-length", "detail": "length 511 is not even" }
{ "type": "fault", "reason": "heartbeat-timeout" }   // relay has already emitted blackout
```

Validation the relay enforces per command, independent of the UI: token match, target host/port present and not a cloud/public address unless explicitly allowed, `portAddress` fields within range (net 0-127, subNet 0-15, universe 0-15), `length` even and 2-512, decoded `data` length equal to `length`.

Native can eventually send UDP directly, but the first native pass should share the compiler and packet rules rather than inventing a separate behavior. Native does not need the WebSocket token (it owns the send path in-process), but it should keep the same per-command validation so behavior matches the relay byte-for-byte.

## UI Proposal

Add an Output panel, separate from Patch and OSC.

Core regions:

1. **Safety header**
   - Output status: idle, preview, armed, sending, blackout, fault.
   - Target protocol, host, port, and universes.
   - Conflict count.
   - Last frame time.
   - Big arm/disarm control.
   - Blackout button.

2. **Protocol settings**
   - Protocol: Preview only, Art-Net, later sACN.
   - Relay URL.
   - Target host.
   - Target port.
   - Universe map.
   - Max frame rate.
   - Blackout on disconnect toggle.

3. **Universe inspector**
   - Universe list.
   - Used slot ranges.
   - Fixture labels per range.
   - Conflict/warning badges.
   - Raw slot value table for selected universe.

4. **Selected fixture test**
   - Fixture label, position, unit, address range.
   - Intensity slider if mapped.
   - RGBW controls if mapped.
   - Raw slot sliders for testing.
   - Reset to zero.

5. **Evidence export**
   - Export output manifest JSON.
   - Export last compiled buffer summary.
   - Export hardware smoke notes template.

## Data Model Sketch

Persist only preferences and mappings:

```json
{
  "dmxOutput": {
    "version": 1,
    "protocol": "preview",
    "relayUrl": "ws://127.0.0.1:8766",
    "targetHost": "127.0.0.1",
    "targetPort": 6454,
    "maxFps": 20,
    "blackoutOnDisconnect": true,
    "blackoutBurst": 5,
    "blackoutKeepAlive": false,
    "universeMap": {
      "1": {
        "artnet": { "net": 0, "subNet": 0, "universe": 0 },
        "targetHost": "10.0.0.51",
        "label": "Stage Node A"
      }
    }
  }
}
```

The Art-Net target universe is stored as explicit Net/Sub-Net/Universe fields rather than a flat `protocolUniverse` integer, so the 15-bit Port-Address is represented faithfully and the encoder has no ambiguity to resolve at send time. `targetHost`/`targetPort` at the top level are the default; a per-universe `targetHost` overrides it so distinct universes can route to distinct nodes. `maxFps` is the v0 default rate; the per-protocol hard ceiling (see [Decisions (D0)](#decisions-d0) §8) is enforced in code and the persisted value can never exceed it.

Do not persist:

- Armed state.
- Current fader values.
- Last live frame.
- Temporary raw slot test values.

Those should be session state only.

## Safety Rules

Output should be blocked unless all of these are true:

- The user explicitly arms output in the current session.
- The relay health check passes.
- The target host and port are visible.
- At least one universe compiles without blocking errors.
- Conflicting fixtures are either excluded or output is blocked.
- All out-of-range DMX addresses are blocked.
- Unsupported fixture personalities are either excluded or in raw test mode.

Additional safeguards:

- Default to zero output.
- Blackout on disarm, using burst-then-cease (default 5 zero frames, then stop) so output truly stops rather than holding zero forever; the perpetual-zeros keep-alive is opt-in and default-off (see Relay Layer, [Decisions (D0)](#decisions-d0) §9).
- Blackout on window unload where possible.
- Blackout on relay SIGINT where configured.
- Rate-limit output to the per-protocol ceiling (see [Decisions (D0)](#decisions-d0) §8).
- Run the relay dead-man's watchdog: blackout and fault on heartbeat timeout, independent of clean disconnect (see Relay Layer).
- Stream a continuous keep-alive while sending live (non-zero) values so a stalled UI is detected rather than latching the last frame on the rig. This is distinct from blackout, which ceases transmission.
- Refuse to send to cloud deployment targets.
- Never send from the hosted Vercel app directly to arbitrary internet hosts.
- Confirm the supported-browser path for an HTTPS page opening `ws://127.0.0.1`. Chromium treats `ws://localhost` as potentially-trustworthy and allows it; Firefox historically blocks it as mixed content. Record the supported-browser matrix so deployed-app output does not silently fail after preview works in dev.
- Do not support hazardous effects output without a separate explicit safety design.

## Implementation Phases

Definition of done rule: a phase is not called complete unless its deliverables are implemented, automated verification passes, and any listed manual or hardware evidence is retained. Local compiler, relay, and simulator proof is "implemented locally"; hardware phases stay pending until packet capture, node UI, and fixture/dimmer evidence exists.

| Phase | Definition of done | Current status |
| --- | --- | --- |
| D0 Planning and protocol lock | Decisions for first transport, hardware target class, fixture mapping schema, safety model, and protocol order are written down and folded into this plan. | Done. |
| D1 Simulator and buffer compiler | Web compiler produces deterministic 512-slot buffers, blocks unsafe patch states, exposes preview/inspection UI, and passes compiler/UI tests without network output. | Implemented locally. |
| D2 Art-Net relay MVP | Local relay authenticates browser commands, emits Art-Net to a UDP listener, rejects unsafe commands, blackouts on timeout/disconnect/shutdown, and writes retained local smoke evidence. | Implemented locally. |
| D3 Hardware smoke | A real Art-Net node and safe fixture/dimmer pass arm, selected test, blackout, bad-target, and failure-path checks with relay log, packet capture, node UI screenshot, completed evidence notes, and passing evidence check; optional fixture video upgrades status. | Pending hardware. |
| D4 sACN support | sACN encoder, relay send path, UI protocol selection, controlled multicast mode, local smoke, and tests share the same compiler path; physical sACN node smoke passes before marking verified. | Implemented locally; pending hardware. |
| D5 Fixture personality expansion | Output schema, generic fixture maps, unsafe-channel defaults, slot explanations, and output-readiness UI exist, with paperwork-only fixtures clearly separated. | Implemented locally. |
| D6 Native output | Native compiler matches web bytes, native UI can arm/send/blackout through UDP, permission denial is clear, and signed physical iPad smoke proves output plus save/reopen safety with passing native physical evidence check. | Implemented and locally verified; pending signed physical iPad output smoke. |

Current verification snapshot, 2026-06-30:

- Web CI is green with Node 22 after reinstalling local dependencies from `package-lock.json`: `npm run ci` passed lint, 34 Vitest files / 172 tests, and production build.
- Additional web/domain checks passed: `node scripts/syntax-check.mjs` parsed 92/92 files, `node scripts/smoke-domain.mjs` passed 15/15 checks, `npm audit --omit=dev` found 0 production vulnerabilities, and `npm run dmx:local-smoke` passed with retained local Art-Net and sACN loopback evidence.
- DMX-focused automated set remains green through full CI, and the relay/panel/serialization/sACN focused set passed 37/37 assertions across 4 files after multicast support was added.
- Controlled sACN multicast support is implemented locally: the web Output panel can select unicast or sACN multicast, the relay derives the E1.31 multicast address from the universe (`239.255.x.y`) instead of accepting arbitrary public hosts, and focused relay/panel/serialization/sACN tests passed 37/37 assertions across 4 files.
- Hardware evidence is now machine-checkable: `npm run dmx:evidence-check -- --protocol artnet` fails closed until the retained Art-Net folder has `relay.log`, packet capture, node UI screenshot, the expected protocol, required hardware metadata, and all required pass checkboxes. The same checker enforces `--protocol sacn` for the sACN folder. Art-Net and sACN smoke execution is consolidated in `docs/plotforge-dmx-physical-smoke-runbook-2026-06-30.md`; the sACN scaffold lives at `docs/dmx-smoke-evidence/2026-06-30-sacn/`.
- Native physical evidence is now machine-checkable: `npm run native:physical-evidence-check` fails closed until the retained signed iPad smoke folder has CoreDevice process proof, launch JSON, installed-apps JSON, display JSON, lock-state JSON, visual proof, content-valid export artifacts, required notes metadata, and all native/D6 output pass rows. The capture helper auto-fills machine-known notes metadata. The Launch process gate can be satisfied by machine evidence; visual UI, export, output, and save/reopen gates still require retained operator proof.
- Combined physical status is available with `npm run physical:evidence-status`, which checks D3 Art-Net, D4 sACN, and D6 native evidence together and exits nonzero until all three gates pass.
- Native SwiftPM verification is green after hydrating previously dataless source files: `swift test --package-path native/PlotForgeNative --scratch-path /private/tmp/PlotForgeNativeScratchHydrated` passed 79/79 tests. Native export smoke passed and wrote `.plot`, PDF, CSV, OSC JSON, and interop JSON artifacts to `/private/tmp/plotforge-native-export-smoke-current`.
- Native unsigned app builds are green: iOS Simulator and Mac Catalyst `xcodebuild ... CODE_SIGNING_ALLOWED=NO build` both passed.
- David's iPad is paired and reachable through CoreDevice. The 2026-06-30 14:35Z launch capture succeeded with `launch_exit=0`, and `/private/tmp/plotforge-native-physical-smoke-2026-06-30-dmx-output/device-process.txt` lists `PlotForgeNative.app/PlotForgeNative`. Installed-apps, display, and lock-state JSON evidence was captured for the same folder. The native physical evidence checker still fails, correctly, until an operator captures visual proof, export artifacts, metadata, and passing D6 output gate rows.
- Hardware verification remains pending for D3 Art-Net, D4 sACN, and D6 signed physical iPad output.

### D0: Planning And Protocol Lock

Deliverables:

- This document.
- Protocol decision for first transport.
- Sample hardware target decision.
- Fixture profile mapping decision for the first test fixture.

Recommended decision:

- Start with simulator and Art-Net unicast.
- Add sACN after Art-Net v0 has tests and one hardware smoke pass.
- Keep USB DMX parked.

### D1: DMX Simulator And Buffer Compiler

Implementation status: implemented locally on 2026-06-30 for the web app. The current D1 slice includes `src/domain/dmxOutput.js`, golden compiler vectors under `src/__tests__/fixtures/dmx-output/`, compiler and preview-panel tests, and a no-network Output tab with compiler warnings plus universe/range/slot inspection. It does not send Art-Net, sACN, OSC, WebSocket, or UDP.

Deliverables:

- Pure `src/domain/dmxOutput.js`.
- Unit tests for buffer compilation.
- Shared compiler test-vector corpus (golden input documents plus expected buffers), authored here so the future native compiler targets the same fixtures from the start rather than drifting and reconciling at D6.
- Output panel preview with no network sends.
- Conflict and warning report.
- Universe slot inspector.

Acceptance:

- Selected fixture test produces deterministic 512-slot buffers.
- Blackout produces all-zero buffers.
- Invalid ranges block output.
- Overlaps block output. v0 default is block-all: any overlap blocks the whole universe. An advanced exclude-only-conflicted override is deferred.
- Unknown personalities show warnings and do not emit mapped parameter values.

### D2: Art-Net Relay MVP

Implementation status: implemented locally on 2026-06-30. The current D2 slice includes `src/domain/artnet.js` for ArtDmx packet encoding, `src/domain/dmxRelay.js` for the no-dependency local relay server, `scripts/dmx-relay.mjs`, `npm run dmx:relay`, `scripts/dmx-local-smoke.mjs`, `npm run dmx:local-smoke`, packet golden tests, relay validation tests, a local UDP-listener send test, origin/token rejection tests, heartbeat-watchdog blackout test, authenticated active-client disconnect blackout test, and relay shutdown blackout smoke. This is still pre-hardware: it proves localhost UDP emission and relay safety behavior, not a physical node or fixture.

Deliverables:

- `scripts/dmx-relay.mjs`.
- `scripts/dmx-local-smoke.mjs`.
- Art-Net packet encoder.
- WebSocket command schema with the two-step auth handshake (origin allowlist + per-launch token).
- `/health` endpoint.
- Tests for packet bytes and relay validation.
- `npm run dmx:relay`.
- `npm run dmx:local-smoke`.
- `npm run dmx:evidence-check`.

Acceptance:

- Relay can send a selected fixture test to a UDP listener in local tests.
- Golden packet tests cover ArtDmx header (`Art-Net\0` ID, OpCode `0x5000`), Net/Sub-Net/Universe Port-Address encoding, even data length with correct LengthHi/LengthLo, sequence policy, and payload bytes.
- Relay refuses invalid universe, odd/oversized payloads, and out-of-range Port-Address fields.
- Relay rejects a connection from a non-allowlisted `Origin` and a command session with a missing or wrong token, in both cases without emitting any UDP. A `frame` sent before `auth.ok` is dropped.
- Relay watchdog blackouts and faults on heartbeat timeout in a local test.
- Relay attempts a blackout burst when an authenticated active client disconnects or the relay shuts down.
- Relay returns structured send results to the UI.
- Local smoke writes retained JSON evidence for health, origin rejection, no-output-before-frame, bad target rejection, UDP-listener send, blackout burst, heartbeat timeout blackout, active-client disconnect blackout, and relay shutdown blackout.

### D3: Hardware Smoke

Implementation status: protocol and evidence scaffold prepared locally on 2026-06-30 in `docs/plotforge-dmx-hardware-smoke-2026-06-30.md`, `docs/dmx-smoke-evidence/2026-06-30/`, and the consolidated `docs/plotforge-dmx-physical-smoke-runbook-2026-06-30.md`. The web Output panel now has an armed relay path with token auth, explicit target fields, Send Test Frame, Blackout, Disarm, relay fault display, persisted safe target preferences, and no persisted arm/token state. `docs/dmx-smoke-evidence/local/` records repeatable pre-hardware local smoke evidence. D3 is not complete until a real Art-Net node plus fixture/dimmer channel pass the protocol and retained evidence is added.

Deliverables:

- Hardware smoke protocol document.
- One known Art-Net node — primary target class is a low-cost Ethernet Art-Net/sACN node such as DMXKing eDMX1 MAX or ENTTEC ODE Mk3. Verify current pricing and availability before purchase (see [Decisions (D0)](#decisions-d0) §1).
- One known fixture or dimmer channel.
- Evidence folder meeting the tiered verification bar below.

Acceptance:

- Blackout works (burst-then-cease; fixtures observably return to zero).
- Selected fixture intensity test works.
- Wrong target state fails visibly.
- Removing relay or node moves UI into fault state.
- Network disconnect, relay crash/tab failure, and blackout recovery are recorded as separate pass rows.
- No output happens without arming.
- Evidence bar met: **relay log + packet capture (Wireshark/tcpdump) + node web-UI screenshot** = "verified"; adding fixture video (slo-mo) upgrades to "fixture verified." Relay log alone proves only that the app *tried* (see [Decisions (D0)](#decisions-d0) §11).
- `npm run dmx:evidence-check -- --protocol artnet` passes against the retained evidence folder. `npm run dmx:evidence-check -- --protocol artnet --fixture-verified` also passes before using the "fixture verified" label.

### D4: sACN Support

Implementation status: sACN packet encoder, relay send path, web protocol selector, persisted preference defaults, controlled multicast target mode, local smoke path, and sACN evidence scaffold are implemented locally. `src/domain/sacn.js` has golden packet coverage for source/CID, priority, sequence, synchronization address, preview/terminate/force-sync option bits, unicast-ready packet bytes, and multicast address derivation for later hardware tests. `src/domain/dmxRelay.js`, `src/components/DmxOutputPanel.jsx`, and `scripts/dmx-local-smoke.mjs` now send sACN unicast frames and sACN blackout bursts through the same compiled 512-slot universe buffers as Art-Net. Multicast support is constrained to derived E1.31 addresses from the selected universe, so the relay does not accept arbitrary public targets as a multicast escape hatch. `docs/dmx-smoke-evidence/2026-06-30-sacn/` is ready for retained hardware proof. D4 is not complete until a hardware smoke passes on a sACN-capable node using the shared compiler path.

Deliverables:

- sACN packet encoder.
- Source/CID handling.
- Priority and sequence handling.
- Unicast mode first.
- Web Output panel protocol selector.
- Relay command validation and UDP emission for sACN.
- Local smoke proof for selected sACN frame and sACN blackout burst.
- Controlled multicast target mode with universe-derived `239.255.x.y` host.

Acceptance:

- Golden packet tests match expected E1.31 packet structure.
- Local relay smoke emits a selected sACN frame and all-zero sACN blackout burst to a UDP listener.
- Persisted sACN preferences default to UDP port 5568 and preserve 1-63999 universe routing.
- Multicast relay tests prove the derived target host and blackout path without permitting arbitrary public hosts.
- Hardware smoke passes on the same fixture path or a second sACN-capable node.
- Art-Net and sACN share the same universe compiler.

### D5: Fixture Personality Expansion

Implementation status: implemented locally on 2026-06-30 for the web app output path. The current D5 slice includes `src/domain/fixtureOutputProfiles.js` with the shared slot-indexed output schema, generic dimmer/RGB/RGBW/simple moving-light maps, unsafe-channel zero defaults, compiler slot explanations, OFL candidate output-map inference, and Fixture Library output-readiness UI. GDTF Share profiles remain paperwork-only unless a parsed, reliable channel map exists; PlotForge does not infer output from footprint-only GDTF metadata.

Deliverables:

- Shared fixture output mapping schema.
- Generic dimmer, RGB, RGBW, and simple moving-light mappings.
- UI display of mapped and unmapped parameters.
- Import path from GDTF/OFL metadata where reliable.

Acceptance:

- PlotForge can explain exactly which document field or test control writes each slot.
- Unsafe slots default to zero.
- The user can see which fixtures are output-ready and which are paperwork-only.

### D6: Native Output

Implementation status: implemented and locally verified on 2026-06-30. The current D6 slice adds `native/PlotForgeNative/Sources/PlotForgeCore/PlotDmxOutput.swift`, a pure Swift DMX compiler mirroring the web compiler's selected-test, blackout, invalid range, overlap, generic output-map, unsafe-channel, and approved custom-map behavior. `native/PlotForgeNative/Tests/PlotForgeCoreTests/PlotDmxOutputTests.swift` covers byte-level slot parity against the web golden LED vector, moving-light unsafe defaults, and native Art-Net packet bytes. The native SwiftUI shell now includes an Output sidebar tool with arm, send test, blackout, disarm, Art-Net unicast target fields, preview diagnostics, explicit Local Network failure copy, and a real UDP sender with timeout. The Xcode app target declares `NSLocalNetworkUsageDescription`. `swift test`, native export smoke, and unsigned iOS Simulator/Mac Catalyst app builds pass locally. Signed physical iPad output smoke remains pending, so the native path is not yet hardware verified.

Deliverables:

- Swift shared compiler or mirrored tests against the web compiler fixtures.
- Native Output panel.
- Native UDP send path or native relay control.
- iPad local-network permission handling.
- Signed physical iPad hardware smoke.
- `npm run native:physical-evidence-check`.

Acceptance:

- Native output matches web compiler output byte-for-byte for test documents.
- iPad denial of local network permission fails clearly.
- Physical iPad smoke proves arm, selected fixture test, blackout, and save/reopen safety.
- Native physical evidence check passes against the retained evidence folder.

## Verification Strategy

Automated tests:

- Domain tests for every compiler rule.
- Packet golden tests for Art-Net.
- Packet golden tests for sACN.
- Relay validation tests for malformed commands.
- Serialization tests for `dmxOutput` preferences.
- Relay disconnect/shutdown blackout tests for active authenticated sessions.
- Local smoke script for loopback relay plus UDP-listener evidence.
- Hardware evidence checker for retained relay log, packet capture, node screenshot, metadata, and pass checkboxes.
- UI tests for arm/disarm, blackout, relay fault, conflict blocked, and selected fixture test.

Manual smoke:

- Preview-only browser smoke.
- UDP listener smoke with no lighting hardware.
- Hardware node smoke with one universe.
- Hardware fixture smoke with one known profile.
- Network disconnect smoke.
- Relay crash smoke.
- Blackout recovery smoke.

CI should never require hardware. Hardware proof should live as retained evidence, similar to the native physical smoke protocol.

## Failure Modes To Design Around

- Wrong universe sends values to the wrong node.
- Fixture overlap causes two fixtures to fight for the same slots.
- Fixture personality mismatch turns on strobe, reset, macro, or movement unexpectedly.
- Browser tab closes while output remains nonzero.
- Relay crashes without blackout.
- Network interface changes and packets go nowhere.
- Multicast floods a production network.
- Public deploy exposes controls that look live but cannot safely send.
- Native iPad local network permission blocks UDP.
- User assumes PlotForge is now a show console.

The UI and docs should make these failure modes hard to miss.

## Recommendation

Build `D1 DMX Simulator And Buffer Compiler` first. It adds real value immediately because it lets PlotForge inspect exact universe output without touching hardware. It also forces the correct abstractions before UDP, sACN, native output, or fixture personality expansion.

After D1, build Art-Net unicast through a local relay. This matches the current OSC relay precedent, keeps the browser safe, and gives us the shortest path to one real hardware smoke.

## References Checked

- [ESTA TSP published documents](https://tsp.esta.org/tsp/documents/published_docs.php), checked for ANSI E1.11 - 2024 and ANSI E1.31 - 2025 current listings.
- [Art-Net overview, Artistic Licence](https://artisticlicence.com/pages/art-net-overview), checked for Art-Net ownership, purpose, and general Ethernet DMX/RDM positioning.
- [Art-Net 4 protocol specification PDF](https://art-net.org.uk/downloads/art-net.pdf), checked for ArtDmx, UDP port, universe addressing, and sACN interoperability notes.
- [ANSI E1.31 - 2016 public PDF](https://tsp.esta.org/tsp/documents/docs/E1-31-2016.pdf), checked for sACN transport intent and data classes. It is superseded, so implementation should use the current E1.31 - 2025 standard before packet-locking.
- [ANSI E1.11 - 2008 (R2018) public PDF](https://tsp.esta.org/tsp/documents/docs/ANSI-ESTA_E1-11_2008R2018.pdf), checked for DMX512-A scope and historical behavior. It is superseded, so implementation should use the current E1.11 - 2024 standard before claiming compliance.

## Decisions (D0)

These fourteen questions were open in the original plan and are now resolved. Full rationale and source links live in the companion [DMX design decisions document](plotforge-dmx-design-decisions-2026-06-30.md); this section is the binding summary that the rest of this plan references.

1. **First hardware target.** Low-cost Ethernet Art-Net/sACN node as primary v0 target: DMXKing eDMX1 MAX or ENTTEC ODE Mk3 are candidate classes; verify current pricing and availability before purchase. Standard Ethernet keeps the target reachable from macOS and iPadOS with no driver stack. USB interfaces are parked (driver friction on macOS, effectively impossible on iPadOS). ETC gateways are post-v0. An Arduino node is acceptable for personal smoke tests but is never declared a "verified" target (firmware timing quirks at 44 Hz, no ArtPollReply conformance).

2. **Protocol order.** Art-Net is the first-class v0 protocol; sACN is a planned co-equal target reached at D4, not deferred indefinitely. The path is Art-Net-proven-first because Art-Net unicast needs no special entitlement while sACN multicast does (§12); the end state ships both, selectable, defaulting to Art-Net unicast on iOS and Art-Net broadcast on macOS.

3. **Fixture schema.** A flat, slot-indexed list of typed channel descriptors (`type` enum, `ranges`, `pairedFine`, `safeMin`/`safeMax`, per-channel/range `unsafe`) — deliberately smaller than GDTF, no attribute trees. Defined in [§3 Fixture Parameter Mapping Layer](#3-fixture-parameter-mapping-layer).

4. **GDTF.** Import source only. Parse to a *candidate* slot map, present a diff (inferred vs. datasheet), require an explicit "Approve Mapping" action before the JSON becomes output-ready. Never write a GDTF-derived mapping to hardware without that gate (GDTF does not validate range overlaps, multi-cell reconstruction is unreliable, attribute names vary, virtual channels inflate footprints).

5. **Shared profiles.** Yes — one canonical platform-neutral JSON profile format in a shared package/repo, consumed by both web (runtime fetch) and native (build-time snapshot + launch update check). `schemaVersion` gates breaking changes. UI layers never mutate canonical JSON; edits go through a profile editor that writes back to the shared store.

6. **Complex channel types.** Type-aware rendering with hard guards: `intensity` scrubs freely; `panCoarse`+`panFine`/`tiltCoarse`+`tiltFine` render as one 16-bit fader with a slew-rate guard and always write both bytes in the same frame; wheels render as indexed selectors; `shutter`/`strobe`/`reset` are gated behind per-session confirmation (`reset` requires a typed confirmation); `raw` shows a no-type-safety warning. v0 hides unsafe/movement types behind a per-session "Show Unsafe Channels" toggle.

7. **Conflicts.** Always block output by default — a conflicted universe emits no frames for any slot until resolved. A per-session advanced override may *exclude* (remove from patch), never *suppress/overwrite*, conflicted fixtures; the remaining fixtures then output normally. The override does not persist without explicit save. v0 ships block-all; the exclude override is deferred (see D1 acceptance).

8. **Frame rate.** 20 Hz v0 smoke default, 30 Hz once stable. Per-protocol hard ceilings enforced in code and never exceedable from the UI: 44 Hz for any Art-Net/sACN-to-physical-DMX gateway, up to 60 Hz for direct IP→pixel paths (no DMX layer), 40 Hz for USB DMX.

9. **Blackout.** Burst-then-cease: send a short burst of all-zero frames (default 5) at the operating rate, then stop transmitting — blackout should feel like cutting power, not dimming to zero. Perpetual-zeros keep-alive is an opt-in, default-off, clearly-labeled toggle for nodes whose data-loss failsafe is hold-last-look or go-to-scene.

10. **NIC selection.** Enumerate active NICs at launch and on network change; score them (wired 2.x/10.x highest, Wi-Fi 192.168.x medium, Tailscale 100.x negative with a warning, loopback/virtual filtered out); present the top candidate in an explicit "Confirm Output Interface" dialog before first output; persist the choice by MAC (not interface name); halt output and re-prompt if the confirmed NIC disappears.

11. **Verified-output evidence.** Tiered. Minimum to log a test as "verified": relay log + packet capture (Wireshark/tcpdump) + node web-UI screenshot. Adding fixture video (slo-mo) upgrades to "fixture verified." Oscilloscope is optional, for node characterization only. Relay log alone proves only that the app tried. Enforced at [D3 acceptance](#d3-hardware-smoke).

12. **Native iPad.** Unicast Art-Net is the safest iOS path (only `NSLocalNetworkUsageDescription`, fires once); sACN multicast needs the `com.apple.developer.networking.multicast` entitlement (Apple approval, ~3-7 business days) and must be on the provisioning profile before TestFlight — so iOS uses unicast for both protocols during early development. On background/resign-active, send the blackout burst and close the socket; never hold output while backgrounded. Disable the idle timer while output is active. On terminate, send the burst synchronously in the termination callback.

13. **RDM.** Out of scope for v0 and v1. A future "commissioning mode" may read RDM device data (GET only, passive, operator-initiated, never automatic); PlotForge never sends RDM SET commands. Rationale: RDM pauses DMX output during discovery (incompatible with clean output testing), is sensitive to signal-chain quality, and an accidental SET to a live fixture is exactly the danger an output tester must avoid.

14. **"Not a console" UI.** Persistent non-dismissible amber banner "OUTPUT TEST MODE — Not for show use" on every output-active screen (distinct from red errors / green status); transport controls visually distinct with large touch targets; non-console language ("Test Patch", "Channel Test", "Send Test Frame", "Test Rig"); first output per session requires a confirmation naming interface/protocol/universe/fixture-count; blackout is always one tap with no confirmation; safe channels respond immediately after the first-session gate; the verification log is a first-class tab, not buried in settings.
