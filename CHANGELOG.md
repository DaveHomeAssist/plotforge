# Changelog

All notable changes to PlotForge. Still versioned `0.1.0` throughout (Phase 0 spike) — entries are grouped by date. See `README.md` for the full current feature list.

## 2026-06-28 — 2026-06-29 · Native UI + patch hardening
- Added a **native SwiftUI port scaffold** with a physical smoke-test protocol (`docs/plotforge-swift-port-plan-2026-06-25.md`, `docs/plotforge-native-physical-smoke-2026-06-26.md`).
- Native canvas: distinct fixture symbols, a compact fixture list, and a collapsible inspector.
- Fixed seeded-profile glyph resolution and scale hit targets; hardened DMX patching and browser flows.
- Added the inspector UX handoff archive (`PlotForge Inspector UX-handoff.zip`).

## 2026-06-25 · Design shell + wizard
- Implemented the PlotForge design shell and locked the app frame.
- Added the PlotForge Wizard and fixture detail tools, a splash screen, and a light theme.

## 2026-06-22 — 2026-06-23 · Interop, registry, and AI starter
- Added interop manifest export (fixture paperwork, GDTF provenance, focus points, circuit data, comment pins).
- Added the OSC bridge relay (saved relay settings, JSON export, selected-fixture send, dependency-free local WebSocket-to-UDP relay).
- Added the multi-show registry (IndexedDB snapshots, load/delete, `.plot` share/export) plus PWA manifest and service-worker shell caching.
- Added the AI plot starter (brief parsing, local starter-plan generation, prompt copy, one-click apply).
- Shipped inspector UX validation (per-field validation, keyboard recovery).

## 2026-06-21 · Fixture library, patching, and print
This was the single largest day of feature work — the spike went from a bare drafting surface to a patchable, printable plot:
- Fixture library with curated GDTF seed profiles + OFL JSON import; patch table with CSV export.
- Print-to-PDF export with title block and ANSI D paper preset; editable project metadata (show title, drawing title, venue, designer, company, date, revision, scale).
- Named revision log with active-revision selection for title-block issue tracking.
- Circuit and dimmer schema, gel-order rollup, comment pins, layered fixture notes (color/gobo/focus/crew handoff).
- Multi-select fixture editing (align left/center/right, distribute); debounced inspector edits with imperial position parsing and invalid-field recovery.
- Focus beam tool, per-fixture status tracking, conflict-reveal panel for DMX/channel conflicts.

## 2026-06-17 — 2026-06-18 · Phase 0 spike foundation
- Initial spike: hardcoded venue (36'×22') seeded with 1ST ELEC/2ND ELEC/FOH TRUSS positions and 10 pre-placed fixtures.
- SVG canvas (pan/zoom/drag with 1" snap, automatic unit renumbering), IndexedDB autosave with crash recovery, `.plot` file save/load via File System Access API, document-snapshot undo/redo (80-entry history).
- Chassis ported from PixelForge; `useShowDoc` hook extracted for document state.
