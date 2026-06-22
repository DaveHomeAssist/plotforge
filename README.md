# PlotForge — Phase 0 spike

Lighting plot generator. Vector-only SVG drafting surface, structured document model, IndexedDB autosave, project file save/load.

This started as the **Phase 0 spike** that validates the chassis ported from PixelForge.
Notion is the canonical phase source for this project. README status was reconciled against `SFT | PlotForge` on 2026-06-21.

## What works in this spike

- Hardcoded venue (36' × 22') seeded with 1ST ELEC, 2ND ELEC, FOH TRUSS positions
- 10 fixtures pre-placed (5 S4s, 3 Fresnels, 2 moving spots)
- SVG canvas: pan (drag empty area), zoom (wheel), drag fixtures along their position
- 1" snap on drag, automatic stage-right-to-left unit renumbering
- Inspector: channel, DMX universe + address, color (gel string), notes, delete
- IndexedDB autosave with crash-recovery banner
- `.plot` file save/load via File System Access API + download fallback
- Document-snapshot undo/redo (80-entry history)
- DMX conflict detection across universes (footprint-aware) + duplicate channel detection
- Status bar reflects fixture count, position count, DMX OK / N conflicts
- Venue editor for stage width, stage depth, and proscenium width
- Position editor: add, select, rename, change kind, move by Y, resize length, edit trim, and delete positions
- Fixture library with curated GDTF seed profiles and OFL JSON import
- Patch table with CSV export
- Print to PDF export with title block and ANSI D paper preset
- Project metadata editor for show title, drawing title, venue, designer, company, show date, revision, and scale
- Named revision log with active revision selection for title block issue tracking
- Conflict panel that lists channel and DMX issues with reveal selection
- Debounced fixture inspector edits with imperial position parsing
- Focus beam tool for placing fixture focus points on the plot and print sheet
- Per-fixture status with inspector control, plot markers, patch table display, CSV export, and `.plot` migration
- Layered fixture notes for color, gobo, focus, and crew handoff, with legacy note migration
- Multi-select fixture editing with align left, align center, align right, and distribute controls
- Gel palette rollup with per-gel fixture counts, fixture labels, and CSV export
- Circuit and dimmer schema with inspector edits, patch table display, CSV export, and circuit check summary
- Comment pins with canvas placement, sidepanel editing, print output, and `.plot` migration
- Interop manifest export with fixture paperwork, GDTF provenance, focus points, circuit data, and comment pins
- OSC bridge route map with saved relay settings, JSON export, selected fixture send, and a dependency-free local WebSocket-to-UDP relay
- Multi-show registry with IndexedDB snapshots, load/delete actions, `.plot` share/export, and PWA manifest plus service worker shell caching
- AI plot starter with brief parsing, local starter plan generation, prompt copy, and one click plan apply

## What's deliberately missing

Lightwright roundtrip, auth, sharing, and production quality of life tools.
MVR import parser locking is parked until Vectorworks Spotlight 2024 / 2025 / 2026 `.mvr` sample files are available.
Vendor-specific OSC console macro packs remain future work.
Provider backed AI generation remains future work until a model and pricing decision exists.

## Run

```bash
cd plot-forge
npm install        # pulls React 19, Vite 8, vitest 4
npm run dev        # http://localhost:5173
npm run build
npm test
```

Requires Node 22+.

## Verification status

Verified locally on 2026-06-11 with Node v22.22.1 and npm 10.9.4:

- Cleared the locked partial install directory `_trash-nm`.
- `npm install` completed with 346 packages audited and 0 vulnerabilities.
- `node scripts/smoke-domain.mjs`: 15 / 15 passing.
- `node scripts/syntax-check.mjs`: 21 / 21 JS and JSX files parsed cleanly.
- `npm run lint`: 0 errors and 0 warnings.
- `npm test`: 2 files passed, 13 tests passed.
- `npm run build`: Vite production build completed.
- Browser check at `http://127.0.0.1:5173/`: app renders the seeded plot with 10 fixtures, 3 positions, and DMX OK. Console has only the React DevTools info message.
- P0-1 browser check: Add created a fourth position, edit changed it to `BALC PIPE` / `FOH` / `-4'-0"` / `24'-0"`, delete returned the app to 3 positions, mobile width had no horizontal overflow, and console errors stayed at 0.
- Browser screenshot saved at `docs/plotforge-dev-verified-2026-06-11.png`.
- P0-1 editor screenshot saved at `docs/plotforge-p0-1-editor-2026-06-11.png`.

## Layout

```
src/
  domain/
    show.js          show / venue / position / fixture types + pure mutations
    patch.js         DMX + channel conflict detection
    oscBridge.js     OSC route map, manifest, and packet encoding
    plotStarter.js   local AI starter planning and apply helpers
    fixtureNotes.js  color / gobo / focus / crew note normalization
    fixtureStatus.js per-fixture status options + normalization
    focus.js         focus point snapping + beam rows
    profiles.js      curated GDTF seed profiles + OFL import normalization
    units.js         mm-as-integer conversions + imperial parser
    ids.js           collision-resistant id generator
  hooks/
    useHistory.js    document-snapshot undo/redo
    useAutosaveRecovery.js   debounced IndexedDB autosave + recovery probe
    usePanZoom.js    SVG viewBox-based pan + zoom
  components/
    ProjectMetadata.jsx  editable project metadata + title block source
    RevisionsPanel.jsx  named revision log
    ConflictPanel.jsx  conflict list + reveal action
    PlotCanvas.jsx   SVG drafting surface
    FixtureSymbol.jsx  fixture glyphs
    Inspector.jsx    fixture metadata editor with debounced commits
    PlotStarterPanel.jsx  AI plot starter sidepanel
    DraftRecoveryBanner.jsx
    ErrorBoundary.jsx
  autosave.js        IndexedDB store (ported from PixelForge)
  showRegistry.js    multi-show IndexedDB snapshot registry
  serialization.js   .plot JSON schema + File System Access API + migrations
  PlotForge.jsx      app root
  PlotForge.css      tokens + layout
  main.jsx           entry
scripts/
  smoke-domain.mjs   no-deps smoke harness for the domain layer
  syntax-check.mjs   walks src/ and parses every JS/JSX with @babel/parser
```

## Coordinate system

- **Internal canonical unit: millimeters as integers.** No float drift, no unit confusion at the data layer.
- Display scale (`1/4" = 1'`, metric, etc.) is a presentation concern only.
- Origin (0, 0) is at center-line / plaster-line. +x is stage-right (audience-left), +y is upstage.
- Position lines are horizontal (constant y). Fixtures slide along x.
- SVG `viewBox` IS world coordinates (mm). CSS sizing handles the viewport.

## What's reused from PixelForge

The chassis: build pipeline (Vite, ESLint, Vitest), `autosave.js` IndexedDB store (renamed DB), the structural shape of `useHistory` (rewritten for whole-doc snapshots — pixel-shaped layer-patch logic was dropped), the dark UI palette pattern, the `ErrorBoundary` component pattern, the project-file save/load pattern with File System Access API + download fallback.

Everything raster (`brushes`, `floodFill`, `imageEffects`, `imageImport`, `canvasOps`, `render`, `text`, `marquee`, `clipboard`, `shapes`) was dropped — wrong architecture for vector drafting.

## Phase status

Current canonical status, reconciled from Notion on 2026-06-22:

- P0-1 venue and position editor: shipped.
- P0-2 fixture library and add-fixture flow: shipped on 2026-06-18. Curated GDTF profiles and OFL JSON import are implemented.
- P0-3 patch table plus CSV export: shipped on 2026-06-21. The sidepanel patch table lists fixture, profile, channel, DMX range, footprint, and conflict state, with CSV export.
- P0-4 print to PDF with title block: export path shipped on 2026-06-21. Physical ANSI D fidelity sign-off is parked until plotter access is available.
- P1-1 project metadata plus editable title block: shipped on 2026-06-21. The sidepanel edits show title, drawing title, venue, designer, draftsperson, company, show date, revision, and scale; print output uses the same metadata.
- P1-2 named revisions: shipped on 2026-06-21. The sidepanel saves named revision records with notes, can activate a prior revision, and drives the title block revision field from the active record.
- P1-3 conflict panel with reveal: shipped on 2026-06-21. The sidepanel lists channel and DMX conflicts with affected fixtures and a Reveal action that selects the first fixture in the conflict.
- P1-4 inspector debouncing plus imperial parsing: shipped on 2026-06-21. The inspector stages channel, DMX, color, note, and position edits locally, commits after a short pause or blur, parses feet and inch position text, and shows inline errors for invalid measurements.
- P1-5 focus beam tool: shipped on 2026-06-21. The canvas Focus tool places snapped focus points for the selected fixture, renders focus beams on the live plot, includes focus beams in print output, and can clear the selected fixture focus.
- P1 tier deploy: shipped on 2026-06-21. Production alias `https://plotforge-beta.vercel.app` points at the P1 focus beam build.
- P2-1 fixture status: shipped in the repo on 2026-06-21. Fixtures store normalized status, legacy `.plot` docs migrate to planned, the inspector edits status, canvas symbols show a status marker, and patch table plus CSV output include status.
- P2-2 layered notes: shipped in the repo on 2026-06-21. Fixtures store color, gobo, focus, and crew note layers, older `note` values migrate into the crew note, the inspector edits each layer, and patch table plus CSV output include layered note data.
- P2-3 multi-select plus align and distribute: shipped in the repo on 2026-06-21. Modifier-click selection tracks multiple fixtures, the primary fixture still drives the inspector and focus tools, and the selection panel aligns or distributes selected fixtures along the X axis.
- P2-4 gel palette plus order rollup: shipped in the repo on 2026-06-21. Fixture color strings are parsed into normalized gel codes, the sidepanel lists per-gel counts and fixture labels, and CSV export produces the gel order.
- P2-5 circuit and dimmer schema: shipped in the repo on 2026-06-21. Fixtures store normalized circuit and dimmer fields, legacy `.plot` docs migrate with empty defaults, the inspector edits both fields, the patch table and CSV include both fields, and the circuit check panel flags unassigned, partial, and shared assignments.
- P2-6 comment pins: shipped in the repo on 2026-06-21. Plot clicks in Comment mode create pinned notes, the canvas renders selectable numbered pins, the sidepanel edits and deletes pin text, print output includes pin callouts, and legacy `.plot` docs migrate with empty pin stores.
- P2 tier deploy: shipped on 2026-06-21. Production alias `https://plotforge-beta.vercel.app` serves the P2 comment pin build.
- P3-1 MVR and GDTF interop: partially shipped in the repo on 2026-06-21. The P3 Interop manifest exports fixture paperwork, GDTF Share provenance, focus points, circuit and dimmer data, layered notes, and comment pins as JSON. MVR import parser locking is parked until Vectorworks Spotlight 2024 / 2025 / 2026 `.mvr` sample files are available.
- P3-2 OSC console bridge: shipped in the repo on 2026-06-22. The sidepanel stores relay settings in the `.plot` document, exports a JSON OSC bridge manifest, creates select / patch / status / focus routes from fixture data, sends the selected fixture route over WebSocket, and includes `npm run osc:relay` as a local UDP OSC relay.
- P3-3 multi-show registry plus share plus PWA: shipped in the repo on 2026-06-22. The sidepanel saves named show snapshots into IndexedDB, loads or deletes saved shows, shares the current `.plot` through Web Share with download fallback, and adds a web app manifest plus service worker shell cache.
- P3-4 AI plot starter: shipped in the repo on 2026-06-22. The sidepanel accepts a production brief, generates a local starter plan with positions, fixture groups, colors, channels, DMX starts, and focus notes, applies that plan into the document without clearing existing work, and copies a structured prompt for future provider backed AI refinement.

Documented remaining plan:

1. P0: complete except ANSI D fidelity sign-off parked on plotter access.
2. P1: complete and deployed.
3. P2: complete and deployed.
4. P3: feature work complete except MVR import parser locking parked on sample file access. Tier deploy is next.
