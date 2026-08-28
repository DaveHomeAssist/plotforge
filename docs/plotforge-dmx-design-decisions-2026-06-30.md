# PlotForge DMX Design Decisions

Date: 2026-06-30

Status: companion rationale for `plotforge-dmx-integration-plan-2026-06-30.md`

## Purpose

This document records the D0 decisions behind the PlotForge DMX integration plan. The integration plan is the implementation contract; this document explains why the decisions were made and what evidence should prove each choice during later phases.

## Source Checks

Protocol and platform checks used for these decisions:

- ESTA published documents list ANSI E1.11 - 2024 as current for DMX512-A, and ANSI E1.31 - 2025 as current for sACN with IPv4 and IPv6 support: <https://tsp.esta.org/tsp/documents/published_docs.php>
- Art-Net 4 specification documents `OpDmx` / `OpOutput` as OpCode `0x5000`, identifies the Art-Net UDP port as `0x1936`, and defines the Port-Address as a 15-bit Net + Sub-Net + Universe value: <https://art-net.org.uk/downloads/art-net.pdf>
- Apple documents `NSLocalNetworkUsageDescription` as the purpose string for local network access: <https://developer.apple.com/documentation/bundleresources/information-property-list/nslocalnetworkusagedescription>
- Apple documents `com.apple.developer.networking.multicast` as an entitlement requiring Apple permission: <https://developer.apple.com/documentation/bundleresources/entitlements/com.apple.developer.networking.multicast>
- Apple local-network privacy guidance says local network activity triggers user permission and needs an Info.plist usage description: <https://developer.apple.com/videos/play/wwdc2020/10110/>
- DMXKing eDMX1 MAX official page describes a single-universe Ethernet DMX512 node supporting Art-Net and sACN: <https://shop.dmxking.com/eDMX1-MAX_p_59.html>
- ENTTEC ODE Mk3 official page describes a two-universe Ethernet to DMX converter supporting Art-Net and sACN, with web UI configuration: <https://www.enttec.com/product/dmx-ethernet/ode-mk3-dmx-ethernet-converter/>

Prices are intentionally not locked here. Vendor pricing and availability change faster than the design decision. Verify current hardware pricing before purchase.

## Decision 1: First Hardware Target

Decision: use a low-cost Ethernet Art-Net/sACN node as the primary v0 hardware target, with DMXKing eDMX1 MAX and ENTTEC ODE Mk3 as candidate classes. Park USB DMX and ETC gateways.

Rationale:

- Ethernet nodes work from macOS, iPadOS, and browser-plus-local-relay paths without vendor USB drivers.
- A single-universe Art-Net/sACN node is enough to prove buffer compilation, packet encoding, target addressing, blackout, and evidence capture.
- ETC gateways are operationally relevant but add venue-network assumptions and higher cost to an early smoke path.
- USB DMX creates platform-specific driver and iPad attachment problems before the output model is proven.

Implementation consequence:

- D3 should buy or borrow one known Ethernet node, not a USB interface.
- Hardware docs must name the exact device, firmware, protocol, universe, IP, and DMX connector used.

Verification:

- Relay log.
- Packet capture.
- Node web UI screenshot.
- Fixture or dimmer video for fixture-verified status.

## Decision 2: Protocol Order

Decision: implement Art-Net unicast first; add sACN as a planned co-equal protocol after Art-Net hardware smoke.

Rationale:

- Art-Net `ArtDmx` packet generation is compact and fits the current no-dependency Node UDP relay pattern.
- Art-Net unicast avoids multicast entitlement and network-behavior work during the first iPad and browser relay tests.
- sACN is still important because it is the ANSI E1.31 transport path and is common in modern venues.

Implementation consequence:

- D2 is Art-Net only.
- D4 adds sACN against the same universe compiler and test-vector corpus.

Verification:

- Art-Net golden packet tests before relay hardware work.
- sACN golden packet tests before declaring D4 complete.

## Decision 3: Fixture Schema

Decision: use a flat, slot-indexed typed channel descriptor schema.

Rationale:

- PlotForge is not a console profile engine.
- A flat schema answers the needed output-test question: which slot gets which value and what is safe to write.
- Slot-indexed descriptors are easy to diff, test, serialize, and mirror into Swift.
- The schema is smaller than GDTF but still supports fine channels, ranges, unsafe flags, and raw slots.

Implementation consequence:

- D1 should define the schema and a minimal validator with deterministic error messages.
- UI controls should be derived from channel `type`, `ranges`, `safeMin`, `safeMax`, `pairedFine`, and `unsafe`.

Verification:

- JSON schema or validator tests for valid/invalid descriptors.
- Golden fixture maps for generic dimmer, RGB, RGBW, and at least one moving-light-like stub.

## Decision 4: GDTF Role

Decision: use GDTF as an import source only; require explicit approval before a derived mapping becomes output-ready.

Rationale:

- GDTF can contain rich fixture details, but inferred mappings can be wrong or incomplete.
- Multi-cell fixtures, virtual channels, naming variance, and range semantics are not safe enough for automatic live output.
- A candidate mapping workflow gives value without pretending that import equals hardware-safe control.

Implementation consequence:

- D5 may parse GDTF into candidate slot maps.
- The app must show a diff and require an "Approve Mapping" action before a GDTF-derived profile can emit output.

Verification:

- Candidate mapping tests.
- Approval-state serialization tests.
- UI smoke showing unapproved profiles remain preview-only.

## Decision 5: Shared Profiles

Decision: maintain one platform-neutral JSON profile store consumed by web and native.

Rationale:

- Output mapping bugs are too risky to duplicate separately in JavaScript and Swift.
- A shared JSON source lets web and native verify against the same fixtures and buffers.
- Versioned schema migration is easier than reconciling divergent profile literals later.

Implementation consequence:

- D1 should create test vectors in a form native can later consume.
- D5 should move from starter local maps to a shared profile package or repo.

Verification:

- Web and Swift tests read the same fixture map fixture files.
- Byte-for-byte output buffer parity for the shared corpus.

## Decision 6: Complex Channel Types

Decision: support complex channel types in the schema but gate unsafe/movement controls in v0.

Rationale:

- The schema should not need a breaking redesign for pan/tilt, wheels, shutter, strobe, or reset.
- The UI should not casually expose parameters that can move fixtures, strobe, or trigger reset.
- Paired coarse/fine channels need to be written together to avoid abrupt movement.

Implementation consequence:

- v0 shows safe controls by default.
- Unsafe and movement controls need a per-session "Show Unsafe Channels" gate.
- Reset needs typed confirmation.

Verification:

- Compiler tests prove paired fine bytes are written in the same frame.
- UI tests prove unsafe channels are hidden until explicitly enabled.

## Decision 7: Conflicts

Decision: block output by default when a universe has fixture overlap or invalid ranges.

Rationale:

- Output testing should not guess which fixture wins a slot conflict.
- Blocking the universe makes patch defects visible and protects against unexpected output.
- A future override may exclude conflicted fixtures, but it should never overwrite or suppress conflicts silently.

Implementation consequence:

- D1 ships block-all behavior.
- Any override is deferred and per-session only.

Verification:

- Overlap and out-of-range tests assert no universe buffer is emitted.
- UI tests show blocked state and the responsible fixture ranges.

## Decision 8: Frame Rate

Decision: use 20 Hz as the v0 hardware smoke default, raise to 30 Hz only after stable tests, and enforce protocol ceilings in code.

Rationale:

- Test output does not need maximum refresh.
- Lower initial rate is easier to inspect with logs and packet captures.
- Physical DMX gateways usually top out around DMX refresh realities, so UI settings must not offer impossible rates.

Implementation consequence:

- Persisted `maxFps` cannot exceed relay-enforced limits.
- D2 packet tests and relay tests need timing/rate-limit coverage.

Verification:

- Relay rejects rates above its ceiling.
- Hardware smoke records actual configured frame rate.

## Decision 9: Blackout

Decision: blackout is burst-then-cease by default.

Rationale:

- A blackout command should feel like stopping output after sending a clear zero state.
- Continuous zeros can mask whether output is still active.
- Some nodes may need zero keep-alive behavior; that should be an explicit opt-in mode.

Implementation consequence:

- Default blackout sends a short zero burst, then stops transmission.
- `blackoutKeepAlive` exists but defaults off and must be clearly labeled.

Verification:

- Relay tests prove exactly the configured number of zero frames are emitted.
- Hardware smoke proves fixture returns to zero after blackout.

## Decision 10: Network Interface Selection

Decision: confirm the output interface explicitly before first output, and halt output if the confirmed interface disappears.

Rationale:

- Lighting laptops and iPads may have Wi-Fi, Ethernet, VPN, and virtual interfaces active.
- Sending to the wrong interface can look like an app failure or, worse, hit the wrong network.
- Interface names drift; MAC or stable hardware identity is safer when available.

Implementation consequence:

- D2/D3 should expose interface evidence even if v0 starts with a manual target host.
- Native output must handle iPad network changes and backgrounding separately.

Verification:

- Manual smoke with Wi-Fi/Ethernet/VPN states.
- Fault state when the active interface disappears.

## Decision 11: Verified Output Evidence

Decision: require tiered evidence for hardware output.

Rationale:

- Relay success only proves that PlotForge tried to send a packet.
- Packet capture proves network emission.
- Node UI proves the node received/understood it.
- Fixture video proves real-world output.

Implementation consequence:

- D3 must ship a smoke protocol and evidence folder template.
- "Verified" and "fixture verified" should mean different things.

Verification:

- Minimum verified: relay log, packet capture, node screenshot.
- Fixture verified: minimum set plus fixture video.

## Decision 12: Native iPad Path

Decision: start native iPad with unicast Art-Net and local-network permission handling; keep sACN multicast behind entitlement readiness.

Rationale:

- Local network access needs a user-facing usage description.
- Multicast networking requires Apple permission for the entitlement.
- Early iPad tests should avoid blocking on entitlement and provisioning work.
- Backgrounding a live-output app is a safety event.

Implementation consequence:

- Native Info.plist needs `NSLocalNetworkUsageDescription` before UDP output.
- sACN multicast waits for entitlement approval and provisioning profile support.
- On background or resign-active, send the blackout burst and close output.

Verification:

- Signed iPad smoke covers permission denied, permission allowed, background, lock, and reopen behavior.

## Decision 13: RDM Scope

Decision: keep RDM out of v0 and v1 output. A future commissioning mode may read RDM data only.

Rationale:

- RDM discovery interrupts or changes the DMX line timing model.
- RDM SET commands can modify real fixtures.
- Output testing should avoid becoming fixture management.

Implementation consequence:

- D2/D3 do not implement ArtRdm or RDM SET/GET.
- D5 may store RDM-related metadata but must not send RDM.

Verification:

- Relay rejects unsupported RDM command types.
- Docs and UI do not imply RDM commissioning support in v0/v1.

## Decision 14: Not A Console UI

Decision: present output as "Output Test Mode", not a show console.

Rationale:

- PlotForge is a drafting and preflight tool.
- Live busking, cue stacks, fades, and show playback create a different reliability and safety bar.
- Language, color, layout, and confirmation flows should prevent scope confusion.

Implementation consequence:

- Output-active screens carry a persistent amber "OUTPUT TEST MODE - Not for show use" banner.
- Use test-oriented labels: Test Patch, Channel Test, Send Test Frame, Test Rig.
- Blackout is always one tap.
- First output per session confirms interface, protocol, universe, and fixture count.

Verification:

- UI tests assert the banner and confirmation gate exist.
- Browser and native smoke prove blackout remains available during output.

## Open Follow-Up

These decisions unblock D1. They do not remove the need to recheck current protocol specs, Apple platform behavior, and hardware firmware before D2/D3 implementation. Any change that affects live packet bytes, local-network permissions, or hardware proof must update both this document and the integration plan.
