# PlotForge Calibrated Roadmap And Swift Port Plan

Date: 2026-06-25

## Intent

Port PlotForge to a native SwiftUI app for macOS and iPadOS without using a WebView wrapper. The first milestone is an N0 shell that proves document compatibility, app frame structure, file open and save, and native layout boundaries.

This plan has two tracks:

1. Finish or formally park the remaining web app backlog.
2. Port the shipped web app capabilities into the native SwiftUI app in ordered phases.

## Current Web Source

- React and Vite app.
- Canonical `.plot` document schema is JSON version 9.
- Internal distances are integer millimeters.
- Current model includes venue, positions, fixtures, fixture profiles, revisions, comment pins, OSC bridge settings, and label settings.
- Canvas, tools, inspector, Wizard, fixture library, exports, and registry are web implemented.

## Port Layers

| Layer | Responsibility | N0 Status |
| --- | --- | --- |
| PlotForgeCore | Codable schema, defaults, migration entry points, fixture document types | Started |
| PlotForgeDocumentUI | `FileDocument`, `.plot` UTType, read and write bridge | Started |
| PlotForgeApp | SwiftUI shell, app frame, sidebar, placeholder canvas, inspector | Started |
| Canvas Engine | Pan, zoom, selection, drag, fixture glyph rendering | Placeholder |
| Tool Modules | Setup, Fixtures, Patch, Wizard, Inspector, Reports, Files | Native N4 panels started |
| Interop | MVR, GDTF, OSC, CSV, PDF | Deferred |

## Global Definition Of Done

A roadmap item is done only when all of these are true:

- The feature is implemented in the intended surface, either web or native.
- The `.plot` document schema is preserved or migrated with explicit tests.
- Existing user workflows continue to pass their current tests.
- New domain logic has focused tests, and UI behavior has component or smoke coverage where practical.
- Build, lint, and test commands for the touched surface pass.
- Any external dependency is named directly if the item cannot be fully completed.
- Documentation states the shipped behavior, remaining gap, and next action.

## Definition Of Done For N0

- Swift package exists under `native/PlotForgeNative`.
- App builds as a native SwiftUI shell with no WebView.
- `.plot` files decode from current schema version 9.
- Save writes pretty JSON using schema version 9.
- `FileDocument` supports `.plot` open and save.
- New document creation seeds a usable starter plot with positions, fixtures, fixture profiles, labels, a revision, and a comment pin.
- Shell has locked app frame with sidebar, canvas, and inspector rail.
- Canvas draws basic stage, positions, and fixture points from the document.
- Unit tests cover Codable load, encode, roundtrip, defaults, and `FileDocument` read and write.
- MVR import is not present.

## Web App Parked And Future Items

| Item | Current State | Definition Of Done |
| --- | --- | --- |
| ANSI D physical print fidelity signoff | Parked on plotter access | Current production print output is printed on ANSI D hardware; title block, scale bar, fixture symbols, line weights, labels, and patch table are readable; any fidelity defects are fixed or logged; evidence includes the generated print artifact, hardware used, and signoff notes. |
| MVR parser locking | Parked on Vectorworks sample corpus | Vectorworks Spotlight 2024, 2025, and 2026 `.mvr` sample files are committed or stored in an agreed test corpus; importer parses expected venue, position, fixture, GDTF, focus, and paperwork data; unsupported variants fail with actionable errors; golden parser tests cover each sample version; web interop docs state supported and unsupported MVR behavior. |
| Vendor OSC macro packs | Future work | Supported console vendors and versions are listed; route templates generate vendor specific macro or cue payloads from the existing OSC route map; exports are deterministic JSON or vendor ready text files; at least one sample show verifies generated select, patch, status, and focus macros; tests cover route generation and missing fixture data. |
| Provider backed AI generation | Future work pending model and pricing decision | Provider, model, pricing guardrail, and failure policy are documented; no secrets are committed; generation uses the existing local starter schema as the contract; provider errors fall back to local starter behavior; generated plans are previewed before apply; tests cover prompt construction, response validation, malformed responses, and apply behavior. |
| Lightwright roundtrip | Future work | Import and export format is locked from real Lightwright samples; fixture identity, channel, address, circuit, dimmer, color, gobo, focus, status, and notes have explicit field mappings; roundtrip tests preserve supported fields; conflicts and unsupported fields produce a user visible report. |
| Auth and sharing | Future work | Product decision selects local only, account based sharing, or hybrid sharing; data ownership and privacy model are documented; shared shows have explicit access rules; save/load remains safe offline; tests cover unauthorized access, revoked access, and share link or export fallback behavior. |
| Production quality of life tools | Future work | The broad bucket is split into named items before implementation. Minimum accepted set includes variable label text size, stronger keyboard command coverage, project recovery affordances, fixture search/filtering, fixture profile detail pages, and handoff friendly export naming. Each item has its own test or manual smoke gate and no item remains as an undefined bucket. |

### Web Backlog Disposition Register

| Item | Disposition | Owner | Dependency | Evidence Required | Next Action |
| --- | --- | --- | --- | --- | --- |
| ANSI D physical print fidelity signoff | Parked | Dave | Physical ANSI D plotter or print service access | Printed sheet photo or scan plus signoff notes covering title block, scale bar, fixture symbols, line weights, labels, and patch table readability | Print current web PDF and native PDF on ANSI D hardware, then log defects or signoff |
| MVR parser locking | Parked | Dave for corpus, agent for parser after corpus | Vectorworks Spotlight 2024, 2025, and 2026 `.mvr` sample files from the same representative show when possible | Sample corpus stored in agreed location, golden parse fixtures, passing parser tests for each version, unsupported variant error checks | Add the 2026 sample when Vectorworks is updated, then lock parser scope and write golden tests |
| Vendor OSC macro packs | Parked | Dave for vendor priority, agent for implementation | First vendor and console version selection, plus sample console macro format | Generated vendor macro pack from a sample show, deterministic output snapshot, route tests, missing fixture data tests | Pick first console vendor and version, then map current generic OSC routes to vendor macro templates |
| Provider backed AI generation | Parked | Dave for provider and budget, agent for implementation | Provider, model, per run budget cap, secret storage route, failure policy | Prompt contract tests, response validation tests, malformed response tests, local fallback proof, no committed secrets | Choose provider, model, and spend cap before any network backed generation work |
| Lightwright roundtrip | Parked | Dave for sample files, agent for implementation | Real Lightwright import and export samples with supported column set | Field mapping doc, import/export fixture tests, unsupported field report, roundtrip preservation tests | Provide representative Lightwright files, then define supported column contract |
| Auth and sharing | Parked for native v1 | Dave | Product decision: local only, account backed sharing, or hybrid | Data ownership note, access model, offline behavior statement, authorization and revocation tests if sharing is selected | Keep native v1 local document based unless Dave explicitly selects account backed sharing |
| Production quality of life tools | Partially decomposed | Agent for decomposition, Dave for priority | Priority ordering for remaining items after native v1 core closes | Each named item has a status, test gate, and release decision | Use the decomposition table below as the tracked backlog, not the broad bucket |

### Production Quality Of Life Decomposition

| Item | Current Native State | Test Or Smoke Gate | Release Decision |
| --- | --- | --- | --- |
| Variable label text size | Implemented in native label controls for fixture unit, fixture channel, position, comment, and focus labels | `PlotToolModulesTests.testLabelSummaryReportsVisibilityAndVariableSizes` plus label panel compile coverage | Keep in native v1 |
| Stronger keyboard command coverage | Partially implemented for undo, redo, delete, selection navigation, select all, Escape clear, nudge, inspector numeric step, and field revert | Existing AppShell and core tests cover history, selection, nudge, and inspector step paths; signed physical iPad keyboard smoke remains | Release blocker until manual keyboard smoke is logged |
| Project recovery affordances | Web has IndexedDB autosave and registry; native iPadOS and Mac Catalyst launch to an app-owned PlotForge start screen with New Plot and Open .plot actions; Files is only shown after Open, and document state is backed by `FileDocument`; macOS SwiftPM still uses `DocumentGroup` | Native `.plot` read and write tests plus standalone document session tests pass; no autosave recovery workflow exists | Park native autosave recovery until v1.1 unless Dave marks it required for v1 |
| Fixture search and filtering | Implemented in native fixture library search | Native package compile plus fixture library search tests | Keep in native v1 |
| Fixture profile detail pages | Implemented as a native profile detail summary and SwiftUI detail view inside fixture library rows; full wiki style pages remain outside v1 | Fixture profile detail parse checks pass; focused imported profile detail test exists; full Swift package suite passes with 61 tests | Keep native row level profile details in v1; park wiki style fixture pages unless selected later |
| Handoff friendly export naming | Implemented for native PDF, CSV, OSC JSON, and interop JSON | `PlotNativeExportsTests.testDeterministicExportFilenames` | Keep in native v1 |

## Native Follow On Phases

### N1 Document Parity

Scope:

- Add version 0 through 8 migrators.
- Add fixture profile detail data parity with the web schema.
- Preserve unknown future keys on read and write.
- Keep native output compatible with web `.plot` schema version 9 where practical.

Definition Of Done:

- Sample `.plot` fixtures exist for every supported legacy schema version.
- Native decode migrates versions 0 through 8 into the current model.
- Native encode writes schema version 9 without losing current web fields.
- Unknown future keys are preserved through open and save or are explicitly reported as unsupported.
- Fixture profile data includes manufacturer, model, mode, footprint, source, and imported profile metadata matching the web model.
- Unit tests prove decode, migrate, encode, roundtrip, unknown key preservation, and fixture profile parity.
- Swift package tests and Xcode app builds pass for iPad simulator and Mac Catalyst.

Progress 2026-06-25:

- Implemented native preservation for unknown root document fields, metadata fields, fixture fields, fixture profile fields, and fixture profile info fields.
- Extended unknown field preservation to venue, positions, DMX addresses, focus points, fixture notes, fixture modes, revisions, comment pins, OSC bridge settings, and label settings.
- Implemented legacy fixture defaults for fields introduced after early web versions, including rotation, focus, notes, status, circuit, and dimmer.
- Added tests for schema v9 roundtrip, root and nested unknown future field preservation, legacy fixture defaults, and version 0 through 8 minimal document decode into the current model.
- Added fixture-backed legacy `.plot` corpus files for versions 0 through 8 and wired the Codable tests to load each schema stage from package resources.
- Added encode-after-migrate assertions that prove legacy fixture files write back as schema version 9 with native label settings present.
- Added a fixture profile parity `.plot` resource covering curated GDTF, imported Open Fixture Library, and legacy profile payloads.
- Added Codable roundtrip assertions for web profile metadata, modes, colors, library tiers, GDTF provenance, OFL provenance, and legacy seed provenance.
- Updated native DMX decoding and encoding so blank universe or address values stay blank instead of defaulting to `1`, matching the web document behavior for partially patched fixtures.
- Verified with Swift package tests and Xcode app builds for iPad simulator and Mac Catalyst.
- Verified Xcode app builds on 2026-06-25 with `xcodebuild -quiet -project native/PlotForgeNativeApp/PlotForgeNative.xcodeproj -scheme PlotForgeNative -configuration Debug -destination 'generic/platform=iOS Simulator' -derivedDataPath /tmp/PlotForgeNative-iOSSim-DD CODE_SIGNING_ALLOWED=NO build`, `xcodebuild -quiet -project native/PlotForgeNativeApp/PlotForgeNative.xcodeproj -scheme PlotForgeNative -configuration Debug -destination 'platform=iOS Simulator,id=BAD9FBCE-78E7-4874-B643-1DDAF45F3787' -derivedDataPath /tmp/PlotForgeNative-iPadSim-DD CODE_SIGNING_ALLOWED=NO build`, and `xcodebuild -quiet -project native/PlotForgeNativeApp/PlotForgeNative.xcodeproj -scheme PlotForgeNative -configuration Debug -destination 'generic/platform=macOS,variant=Mac Catalyst' -derivedDataPath /tmp/PlotForgeNative-CatalystGeneric-DD CODE_SIGNING_ALLOWED=NO build`.

Remaining:

- Decide whether the complete fixture profile library should be shared as external JSON between web and Swift before the native N4 fixture library implementation.
- Replace the hand-authored legacy corpus with captured old web exports if historical v0 through v8 project files are recovered.

### N2 Canvas Interaction

Scope:

- Implement pan and zoom.
- Implement fixture selection.
- Implement fixture drag along positions.
- Add keyboard shortcuts.

Definition Of Done:

- Canvas supports pointer or trackpad pan and zoom without layout scroll conflicts.
- Fit view and reset view are available.
- Fixture selection works with clear selected, single selected, and no selection states.
- Fixture drag is constrained to the assigned position and uses the same snap and unit renumbering rules as the web app.
- Keyboard shortcuts cover save, undo, redo, delete selection, escape clear or cancel, and arrow key nudge where applicable.
- Interaction tests cover canvas transforms and document mutations.
- Manual smoke passes on signed physical iPad and Mac Catalyst.

Progress 2026-06-26:

- Added native `PlotDocumentEditing` actions for fixture selection, 1-inch snap, position-constrained fixture movement, unit renumbering, fixture deletion, and document-snapshot undo/redo.
- Added focused Swift tests for snap/clamp movement, renumbering after movement, renumbering after deletion, selection prune/toggle behavior, and undo/redo history.
- Replaced the read-only native canvas placeholder with a SwiftUI canvas that supports fit/reset, zoom controls, background pan, fixture selection, fixture drag, selected fixture highlighting, delete selection, and command-key undo/redo.
- Wired the right inspector rail to the native canvas selection so selected fixture position, unit, profile, channel, and X location are visible.
- Added tested one-snap fixture nudging and wired left/right arrow shortcuts to nudge the selected fixture along its current position.
- Wired Escape to clear the current canvas fixture selection.
- Confirmed native document persistence remains owned by `PlotForgeFileDocument`; the iPadOS and Mac Catalyst app shell launches to a PlotForge start screen with New Plot and Open .plot actions, then exposes toolbar New, Open, and Save inside the workspace. The macOS SwiftPM app path still uses SwiftUI `DocumentGroup`.
- Added a native starter document factory and wired `PlotForgeFileDocument()` to seed new documents with two positions, two fixtures, embedded fixture profiles, label settings, a revision, and a comment pin so New Document enters a usable canvas instead of a blank shell.
- Verified the native app builds for named iPad simulator and full generic Mac Catalyst destinations with temporary DerivedData paths.
- Added AppShell tests for viewport zoom bounds, fit/reset behavior, pan offset, zoom scale, and screen-to-world X conversion used by fixture hit targets and dragging.
- Added explicit canvas selection controls for previous fixture, next fixture, select all fixtures, and additive tap selection so the native shell can enter single or multi select state without hidden gestures.
- Added tested selection helpers for fixture order navigation, extended adjacent selection, and select all fixture behavior.

Remaining:

- Add manual signed physical iPad and Mac Catalyst smoke evidence for interaction behavior.

### N3 Inspector Validation

Scope:

- Port field level validation.
- Port commit on blur.
- Port Escape revert.
- Add multi select state.

Definition Of Done:

- Inspector supports no selection, single fixture, multi select, invalid draft, and read only or unsupported object states.
- Channel, DMX universe, DMX address, circuit, dimmer, color, status, note layers, and position fields validate before commit.
- Invalid fields block only their own commit; valid sibling fields continue committing.
- Commit on blur, Enter commit, Tab flush, Escape revert, and arrow key numeric stepping match the web behavior.
- Multi select exposes primary fixture editing and batch safe controls without hidden direct mutation.
- Tests cover each validation rule, commit path, invalid recovery path, and multi select state.
- Native shell still opens and saves `.plot` files after invalid draft recovery.

Progress 2026-06-26:

- Added native inspector validation core for fixture drafts, imperial position parsing, numeric channel and DMX validation, address requires universe behavior, blank DMX address preservation, circuit and dimmer normalization, status normalization, layered notes, pending patch creation, and patch application through document update helpers.
- Added native inspector state classification for no selection, single fixture, multi fixture, invalid selection, and read only routing.
- Wired the SwiftUI inspector rail to the native state classifier so no selection, single fixture, multi fixture, and invalid selection display as distinct states.
- Added editable native inspector controls for fixture position, channel, DMX, circuit, dimmer, color, status, and note layers. Drafts stay local until blur, Enter, picker change, or numeric step commits through the ToolWorkspace history path.
- Added Escape field revert plus up and down numeric stepping for the focused channel, universe, or address field.
- Extracted the native inspector edit session out of the SwiftUI view so draft updates, blur style commits, invalid field recovery, duplicate commit suppression, focus advancement, and numeric stepping are AppShell testable.
- Added focused Swift tests proving invalid fields block only their own patch, valid sibling fields continue, universe clearing removes the DMX address, address without universe is rejected, unknown status drafts normalize safely, patch apply updates the fixture, inspector state classification covers the required modes, and numeric stepping clamps to field limits.
- Added AppShell tests proving valid sibling commits with invalid field revert, duplicate patch suppression, Escape style field revert, Enter style focus advance, and numeric step commit behavior.
- Added batch safe multi selection inspector commits: the primary fixture receives the full valid patch, while selected sibling fixtures receive only color, status, and note layer changes.
- Tightened invalid selection classification so any missing selected fixture produces an invalid state, not only a missing primary fixture.
- Added tests for batch safe patch application across a multi selection and for preserving unsafe fields on selected sibling fixtures.
- Verified the direct checkout Swift package with `swift test --package-path native/PlotForgeNative --scratch-path /tmp/PlotForgeNativeN3BatchScratch`: 39 tests passed with 0 failures after the edited file timestamps settled.

Remaining:

- Add native signed physical iPad smoke coverage for real SwiftUI focus behavior, including blur commit, Tab focus flush, Escape key routing, additive tap selection, and multi select primary plus batch safe fixture editing.

### N4 Tool Modules

Scope:

- Port fixture library.
- Port label controls.
- Port patch table and checks.
- Port Wizard starter.

Definition Of Done:

- Fixture library supports curated GDTF seed profiles, imported profile display, profile search or filtering, and add to selected position.
- Fixture information includes at least manufacturer, model, mode, footprint, source, notes, and room for richer profile detail without hard coding the shell to one fixture type.
- Label controls include fixture unit labels, position labels, comment labels, and variable text size.
- Patch table lists unit, position, profile, mode, channel, DMX range, footprint, status, circuit, dimmer, notes, and conflict state.
- Checks report duplicate channels, DMX overlaps, incomplete circuit or dimmer data, and missing profile data.
- Wizard starter generates a preview plan, applies it without clearing existing work, and preserves undo.
- Tests cover fixture profile normalization, add flow, label settings, patch rows, checks, and Wizard apply behavior.

Progress 2026-06-25:

- Added native `PlotToolModules` core logic for seeded fixture profiles, imported profile display/search, add fixture from library to a position, patch rows, conflict checks, label control summaries, and Wizard starter plan/apply behavior.
- Seeded the native fixture library with curated GDTF profiles plus legacy web profiles, with profile info fields for manufacturer, model, mode, footprint, source, summary, capabilities, and notes.
- Added patch table row generation covering unit, position, profile, mode, channel, DMX range, footprint, status, circuit, dimmer, color, gobo, notes, and conflict labels.
- Added checks for duplicate channels, DMX overlaps, incomplete circuit or dimmer data, and missing profile data.
- Added label summaries for fixture unit, fixture channel, position, comment, focus labels, and variable text sizes.
- Added a native Wizard starter that builds a preview plan, appends positions and fixtures without clearing existing work, assigns channels and DMX addresses, and routes SwiftUI apply through the existing history commit path.
- Added a dedicated Labels tool section and replaced deferred Fixtures, Patch, Wizard, and Reports sidebar summaries with live native module counts.
- Verified with `swift test --package-path native/PlotForgeNative --scratch-path /tmp/PlotForgeNativeN4Scratch`: 44 tests passed with 0 failures.

Progress 2026-06-26:

- Replaced summary-only N4 sections with native SwiftUI panels for fixture library search and add, patch rows, open checks, label visibility and text size controls, Wizard brief preview and apply, and report readiness.
- Wired fixture add, label setting updates, and Wizard apply through the same `ToolWorkspace` history commit path as canvas and inspector edits.
- Fixture add targets the selected fixture position when available and falls back to the first document position, so the library can be used without hidden setup state.
- Added a first class fixture profile detail summary for manufacturer, model, mode, footprint, source, custom imported source/profile/info fields, best uses, capabilities, notes, and mode footprints.
- Added a native SwiftUI fixture profile detail view and wired fixture library rows through the shared summary so seeded and imported profiles use the same display contract.
- Added focused test coverage for rich imported profile details, including source metadata, custom profile fields, custom info fields, modes, capabilities, and notes.
- Expanded the native seeded fixture library from 6 to 12 profiles by adding starter-generic LED profile, LED PAR, pixel bar, cyc strip, audience blinder, and followspot profiles with best-use guidance, capabilities, notes, modes, and detail rows. These are drafting starters, not manufacturer-locked profiles.
- Added focused tests for starter-generic profile search, add-to-document behavior, mode summaries, and wiki-like detail rows.
- Label controls now expose fixture unit, fixture channel, position, comment, and focus visibility plus variable text sizes through steppers.
- Patch and Reports panels now surface the generated patch rows and check rows instead of only aggregate counts.
- Wizard now accepts an editable brief, shows generated positions, fixture groups, assumptions, and applies the preview without clearing existing work.
- Verified with `swift test --package-path native/PlotForgeNative --scratch-path /tmp/PlotForgeNativeN4ViewsScratch`: 44 tests passed with 0 failures.
- Verified iPad simulator app build with `xcodebuild -quiet -project native/PlotForgeNativeApp/PlotForgeNative.xcodeproj -scheme PlotForgeNative -configuration Debug -destination 'generic/platform=iOS Simulator' -derivedDataPath /tmp/PlotForgeNative-iOSSim-N4Views-DD CODE_SIGNING_ALLOWED=NO build`.
- Verified Mac Catalyst app build with `xcodebuild -quiet -project native/PlotForgeNativeApp/PlotForgeNative.xcodeproj -scheme PlotForgeNative -configuration Debug -destination 'generic/platform=macOS,variant=Mac Catalyst' -derivedDataPath /tmp/PlotForgeNative-MacCat-N4Views-DD CODE_SIGNING_ALLOWED=NO build`.
- Verified fixture profile detail integration with `swift test --package-path native/PlotForgeNative --scratch-path /private/tmp/PlotForgeNativeProfileDetailScratch`: 54 tests passed with 0 failures.
- Verified seeded fixture profile expansion with `swift test --package-path native/PlotForgeNative --scratch-path /private/tmp/PlotForgeNativeFixtureProfileExpansionScratch3 --filter 'PlotToolModulesTests|FixtureProfileDetailSummaryTests'`: 7 tests passed with 0 failures.
- Verified physical-device compile for David's iPad with `xcodebuild -quiet -project native/PlotForgeNativeApp/PlotForgeNative.xcodeproj -scheme PlotForgeNative -configuration Debug -destination 'platform=iOS,id=445A14BE-DDF1-5220-8D09-B83312A28AE6' -derivedDataPath /private/tmp/PlotForgeNative-DavidIPad-DD CODE_SIGNING_ALLOWED=NO build`.
- Verified physical-device compile for Ignacio with `xcodebuild -quiet -project native/PlotForgeNativeApp/PlotForgeNative.xcodeproj -scheme PlotForgeNative -configuration Debug -destination 'platform=iOS,id=DC7932E0-2339-5F41-B1EE-A6AF9CB35BD4' -derivedDataPath /private/tmp/PlotForgeNative-Ignacio-DD CODE_SIGNING_ALLOWED=NO build`.
- Earlier unsigned install attempts are preserved as context: Ignacio reached install and failed with `No code signature found`; David's iPad install attempt timed out while opening the CoreDevice tunnel.
- Verified signed physical iPad launch on David's iPad after Dave's signed build: `xcrun devicectl device info processes --device 445A14BE-DDF1-5220-8D09-B83312A28AE6` lists `PlotForgeNative.app/PlotForgeNative` as process `3214`.
- Added the signed physical iPad smoke protocol at `docs/plotforge-native-physical-smoke-2026-06-26.md` to capture screen recording or screenshot evidence, CoreDevice proof, export files, and pass/fail notes for N2 through N5.
- Replaced the iPadOS and Mac Catalyst document-browser-first launch path with an app-owned `WindowGroup` shell and PlotForge start screen. Launch now shows New Plot and Open .plot actions; New Plot enters the canvas without the system document picker, and Files is only shown after Open. This is compiled for generic iOS and Mac Catalyst, installed on David's iPad, and launched via CoreDevice, but still requires physical iPad visual proof.
- Installed and launched the corrected start-screen build on David's iPad. CoreDevice launch proof is in `/private/tmp/plotforge-native-physical-smoke-2026-06-26/launch-start-screen-david.json`, and refreshed process proof lists `PlotForgeNative.app/PlotForgeNative` as process `3514`.
- Reverified the corrected start-screen code after temp cleanup with `swift test --package-path native/PlotForgeNative --scratch-path /private/tmp/PlotForgeNativeStartScreenTestRecheck --filter 'PlotForgeStandaloneDocumentSessionTests|PlotForgeDocumentUITests|PlotForgeAppShellTests'`: 17 tests passed with 0 failures.
- Reverified generic iOS build with `xcodebuild -quiet -project native/PlotForgeNativeApp/PlotForgeNative.xcodeproj -scheme PlotForgeNative -configuration Debug -destination generic/platform=iOS -derivedDataPath /private/tmp/PlotForgeNativeStartScreenIOSRecheck CODE_SIGNING_ALLOWED=NO build`.
- Reverified Mac Catalyst build with `xcodebuild -quiet -project native/PlotForgeNativeApp/PlotForgeNative.xcodeproj -scheme PlotForgeNative -configuration Debug -destination 'generic/platform=macOS,variant=Mac Catalyst' -derivedDataPath /private/tmp/PlotForgeNativeStartScreenMacCatRecheck CODE_SIGNING_ALLOWED=NO build`.
- Added `PlotNativeV1WorkflowTests.testNativeV1WorkflowEditsSavesReopensAndExports`, an automated v1 workflow proof that starts from the native starter document, adds a fixture from the library, applies inspector edits, changes label settings, applies a Wizard plan without clearing existing work, saves and reopens through `PlotDocumentCodec`, verifies patch rows, and generates all nine supported export artifacts.
- Verified the v1 workflow test with `swift test --package-path native/PlotForgeNative --scratch-path /private/tmp/PlotForgeNativeV1WorkflowScratch2 --filter PlotNativeV1WorkflowTests`: 1 test passed with 0 failures.
- Verified the v1 workflow together with related document, inspector, tool module, and export contracts using `swift test --package-path native/PlotForgeNative --scratch-path /private/tmp/PlotForgeNativeV1WorkflowRelatedScratch --filter 'PlotNativeV1WorkflowTests|PlotToolModulesTests|PlotNativeExportsTests|PlotDocumentCodableTests|PlotInspectorValidationTests'`: 35 tests passed with 0 failures.
- Extracted the app-owned launch file workflow into a tested standalone document session covering New state, `.plot` open, dirty edit status, save status, export filename generation, export bytes, starter reset, and failed-open protection.

Remaining:

- Add signed physical iPad visual smoke evidence for launch choice, fixture add, profile detail readability, label display changes, Wizard apply undo/redo, patch/check readability, save/reopen, and exports.

### N5 Export And Interop

Scope:

- Native PDF export.
- CSV export.
- OSC manifest export.
- MVR import only after sample file locking.

Definition Of Done:

- Native PDF export includes plot, title block, legend, focus beams, comment pins, and patch summary.
- CSV export includes patch, gel rollup, circuit summary, and fixture paperwork outputs matching web column contracts.
- OSC manifest export matches the web manifest contract and includes relay settings, select routes, patch routes, status routes, and focus routes.
- MVR import is implemented only after the 2024, 2025, and 2026 Vectorworks sample corpus exists.
- Interop exports have deterministic filenames and stable schemas.
- PDF review manifest export captures ANSI D media box, scale, content counts, expected content flags, and physical signoff evidence requirements.
- Tests cover export generation, schema contracts, empty document behavior, malformed document behavior, and MVR sample parsing when unlocked.

Progress 2026-06-26:

- Added native `PlotNativeExports` core support for deterministic export filenames and local export payload generation.
- Added a native `PlotForgeExportSmoke` CLI target that writes the `.plot`, PDF, PDF review manifest, patch CSV, gel CSV, circuit CSV, fixture paperwork CSV, OSC JSON, and interop JSON artifacts into a smoke evidence folder from either a supplied `.plot` file or the native starter document.
- Added native patch CSV output matching the web patch table header and escaping behavior.
- Added native gel rollup CSV, circuit summary CSV, and fixture paperwork CSV outputs for the remaining CSV contract surfaces.
- Added native OSC bridge manifest JSON matching the web contract shape, including relay settings, UDP target, select routes, patch routes, status routes, and focus routes.
- Added native interop manifest JSON with show metadata, venue, positions, fixture paperwork, GDTF provenance, focus points, comment pins, and explicit MVR parked disposition.
- Added deterministic vector PDF generation for ANSI D style output with plot frame, stage, positions, fixture markers, focus beams, comment pins, title block, fixture legend, and patch status.
- Added PDF review manifest JSON export with paper/media box, scale, content counts, content inclusion flags, pending physical signoff, and evidence requirements for ANSI D fidelity review.
- Wired the native Reports panel to file export buttons for PDF, PDF review manifest, patch CSV, gel CSV, circuit CSV, fixture paperwork CSV, OSC JSON, and interop JSON.
- Added focused export tests for filenames, CSV contracts, JSON manifests, PDF review manifest, vector PDF payload, empty documents, malformed documents, and MVR parked disposition.
- Added AppShell export smoke tests proving the shared `NativeExportDocument` wrapper writes all Reports export payloads with stable bytes.
- Verified with `swift test --package-path native/PlotForgeNative --scratch-path /tmp/PlotForgeNativeN5Scratch`: 51 tests passed with 0 failures.
- Verified after export wrapper smoke with `swift test --package-path native/PlotForgeNative --scratch-path /tmp/PlotForgeNativeExportSmokeScratch`: 53 tests passed with 0 failures.
- Verified iPad simulator app build with `xcodebuild -quiet -project native/PlotForgeNativeApp/PlotForgeNative.xcodeproj -scheme PlotForgeNative -configuration Debug -destination 'generic/platform=iOS Simulator' -derivedDataPath /tmp/PlotForgeNative-iOSSim-N5-DD CODE_SIGNING_ALLOWED=NO build`.
- Verified Mac Catalyst app build with `xcodebuild -quiet -project native/PlotForgeNativeApp/PlotForgeNative.xcodeproj -scheme PlotForgeNative -configuration Debug -destination 'generic/platform=macOS,variant=Mac Catalyst' -derivedDataPath /tmp/PlotForgeNative-MacCat-N5-DD CODE_SIGNING_ALLOWED=NO build`.
- Verified post-smoke iPad simulator app build with `xcodebuild -quiet -project native/PlotForgeNativeApp/PlotForgeNative.xcodeproj -scheme PlotForgeNative -configuration Debug -destination 'generic/platform=iOS Simulator' -derivedDataPath /tmp/PlotForgeNative-iOSSim-ExportSmoke-DD CODE_SIGNING_ALLOWED=NO build`.
- Verified post-smoke Mac Catalyst app build with `xcodebuild -quiet -project native/PlotForgeNativeApp/PlotForgeNative.xcodeproj -scheme PlotForgeNative -configuration Debug -destination 'generic/platform=macOS,variant=Mac Catalyst' -derivedDataPath /tmp/PlotForgeNative-MacCat-ExportSmoke-DD CODE_SIGNING_ALLOWED=NO build`.
- Verified export smoke CLI with `swift run --package-path native/PlotForgeNative --scratch-path /private/tmp/PlotForgeNativeExportSmokeCliRunScratch PlotForgeExportSmoke --input native/PlotForgeNative/Tests/PlotForgeCoreTests/Fixtures/sample-v9.plot --output /private/tmp/plotforge-native-export-smoke-2026-06-26 --generated-at 2026-06-26T00:00:00Z`.
- Verified `/private/tmp/plotforge-native-export-smoke-2026-06-26/` contains nine artifacts: `.plot`, PDF, PDF review JSON, patch CSV, gel CSV, circuit CSV, fixture paperwork CSV, OSC bridge JSON, and interop manifest JSON. Spot checks confirmed `%PDF-1.4`, ANSI D `/MediaBox [0 0 2448 1584]`, CSV headers, `plotforge-pdf-review`, `physicalSignoff: pending`, `plotforge-osc-bridge`, `plotforge-interop-manifest`, and MVR `importParser: parked`.
- Reverified the export smoke CLI with `swift run --package-path native/PlotForgeNative --scratch-path /private/tmp/PlotForgeNativeExportSmokeRecheckScratch PlotForgeExportSmoke --input native/PlotForgeNative/Tests/PlotForgeCoreTests/Fixtures/sample-v9.plot --output /private/tmp/plotforge-native-export-smoke-2026-06-26 --generated-at 2026-06-26T05:45:00Z`.
- Rechecked the refreshed export folder and confirmed all nine artifacts are present. Spot checks again confirmed `%PDF-1.4`, ANSI D `/MediaBox [0 0 2448 1584]`, patch/gel/circuit/fixture paperwork CSV headers, `plotforge-pdf-review`, `physicalSignoff: pending`, `plotforge-osc-bridge`, `plotforge-interop-manifest`, and MVR `importParser: parked`.

Remaining:

- Run manual platform file exporter smoke on signed physical iPad and Mac Catalyst and compare or inspect the generated PDF, PDF review manifest, CSV, OSC JSON, and interop JSON files against `/private/tmp/plotforge-native-export-smoke-2026-06-26/`.
- Do visual PDF fidelity review for native ANSI D output before calling native print export complete.
- Keep MVR import parked until the Vectorworks Spotlight 2024, 2025, and 2026 `.mvr` sample corpus is locked.

## Product Decision Register

| Decision | Current Position | Release Impact | Owner | Evidence Required | Next Action |
| --- | --- | --- | --- | --- | --- |
| Schema longevity | Native v1 preserves web `.plot` schema compatibility and writes schema version 9 where practical | Resolved for native v1 | Agent | Codable migration tests, unknown key preservation tests, web shaped fixture profile parity tests | Keep schema compatibility as a v1 invariant; revisit schema fork only after native v1 ships |
| Shared fixture data source | Current native build uses seeded Swift profiles plus document imported profiles; shared external JSON is not yet selected | Release blocker for full fixture library expansion, not for current v1 core | Dave for product choice, agent for implementation | Decision note selecting Swift seeded data, shared JSON, or generated shared artifact; tests proving web and native profile parity | Decide whether fixture data should be extracted from web into a shared JSON source before adding more profiles |
| Primary platform interaction model | macOS pointer and keyboard workflow is primary for dense plot editing; iPadOS touch workflow must pass launch choice, open, edit, export, and save smoke before v1 | Release blocker for v1 QA | Agent | Manual Mac Catalyst and signed physical iPad smoke notes covering launch choice, canvas, inspector, Reports export, save, and reopen | Run and log `docs/plotforge-native-physical-smoke-2026-06-26.md` plus Mac Catalyst smoke notes |
| AI provider and budget | Provider backed AI remains parked; native v1 ships local Wizard only | Release blocker only for provider backed AI, not for local Wizard | Dave | Provider, model, budget cap, secret storage, failure policy | Pick provider and budget cap before network backed AI work starts |
| Auth and sharing | Native v1 remains local document based with `.plot` open and save; account backed sharing is parked | Resolved for native v1 unless Dave changes scope | Dave | Decision note that local documents are acceptable for v1, or a replacement sharing model | Keep auth and sharing out of native v1; revisit after local parity closes |
| First class OSC vendors | Native v1 exports generic OSC bridge manifest only; vendor macro packs are parked | Release blocker only for vendor macro packs | Dave for vendor priority, agent for implementation | First console vendor and version, sample macro format, generated macro snapshot tests | Select first console vendor after generic OSC export smoke passes |
| MVR import | MVR stays blocked until the Vectorworks 2024, 2025, and 2026 sample corpus exists | Release blocker for MVR import only | Dave for corpus, agent for parser | Three version sample corpus, golden parser tests, unsupported variant errors | Wait for 2026 export, then lock the corpus and parser definition |
