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

## What's deliberately missing

Named revisions, conflict reveal panel, inspector debouncing, focus beam tool, Lightwright roundtrip, auth, sharing, and production quality of life tools.
MVR import and export remain a later strategic interop track.

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
    profiles.js      curated GDTF seed profiles + OFL import normalization
    units.js         mm-as-integer conversions + imperial parser
    ids.js           collision-resistant id generator
  hooks/
    useHistory.js    document-snapshot undo/redo
    useAutosaveRecovery.js   debounced IndexedDB autosave + recovery probe
    usePanZoom.js    SVG viewBox-based pan + zoom
  components/
    ProjectMetadata.jsx  editable project metadata + title block source
    PlotCanvas.jsx   SVG drafting surface
    FixtureSymbol.jsx  fixture glyphs
    Inspector.jsx    fixture metadata editor
    DraftRecoveryBanner.jsx
    ErrorBoundary.jsx
  autosave.js        IndexedDB store (ported from PixelForge)
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

Current canonical status, reconciled from Notion on 2026-06-21:

- P0-1 venue and position editor: shipped.
- P0-2 fixture library and add-fixture flow: shipped on 2026-06-18. Curated GDTF profiles and OFL JSON import are implemented.
- P0-3 patch table plus CSV export: shipped on 2026-06-21. The sidepanel patch table lists fixture, profile, channel, DMX range, footprint, and conflict state, with CSV export.
- P0-4 print to PDF with title block: export path shipped on 2026-06-21. Physical ANSI D fidelity sign-off is parked until plotter access is available.
- P1-1 project metadata plus editable title block: shipped on 2026-06-21. The sidepanel edits show title, drawing title, venue, designer, draftsperson, company, show date, revision, and scale; print output uses the same metadata.

Documented remaining plan:

1. P0: complete except ANSI D fidelity sign-off parked on plotter access.
2. P1: named revisions, conflict panel, inspector parsing, focus beam tool.
3. P2: fixture status, layered notes, multi-select, gel rollup, circuit schema, comment pins.
4. P3: MVR and GDTF interop, OSC bridge, multi-show registry, PWA, AI plot starter.
