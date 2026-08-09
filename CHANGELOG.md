# Changelog

All notable changes to PlotForge. Still versioned `0.1.0` throughout (Phase 0 spike) — entries are grouped by date. See `README.md` for the full current feature list.

Reconciled 2026-08-09 from git history, deploy records, and project notes. Entries dated 2026-07-06 onward were appended in that pass; entries before it are preserved from the original file. Undated or unshipped work is excluded.

## [Unreleased]
### Added
### Changed
### Fixed

## 2026-08-09 · Command palette, systems, rig check, revision diff, focus charts
- Added a command palette (Cmd/Ctrl+K): find any fixture by channel, unit number, DMX universe/address pair, gel, instrument, position, or status, then jump the canvas to it. Shift+Enter selects every match.
- Added marquee selection (Shift+drag on the plot) and named Systems: save any selection as a reusable set with one-click reselect and delete.
- Added Rig Check mode: a guided channel-check walk that selects each unit on the plot, fires its OSC select route through the local relay when one is running, and records a status per unit with one tap. Fully usable offline.
- Added revision rig diff: adding a revision now snapshots the rig, and any snapshot can be compared against the live plot with ghost markers on the canvas (moves, adds, removals) plus a copyable crew change list.
- Added focus charts and a gel-grouped magic sheet as a printable document generated from existing focus points, layered notes, and gels.
- Changed the `.plot` document format to version 10 (systems, revision snapshots). Older files migrate automatically.

## 2026-08-09 · Print fidelity fixes
- Fixed fixture symbols printing as solid black shapes: print stroke widths now scale with the drawing like the on-screen canvas (S4, Fresnel, and moving-head glyphs are distinguishable on paper again). Present since the first print export on 2026-06-21.
- Fixed position labels clipping under the first unit on the printed sheet ("1ST EL...") by anchoring label text like the canvas does.
- Added regression tests pinning how legacy off-pipe fixtures are clamped on edit.

## 2026-08-07 — 2026-08-09 · UX/UI audit and remediation
- Added a repeatable UX/UI audit protocol and the results of its first run (docs/UX_UI_AUDIT.md, docs/UX_UI_AUDIT_RESULTS_2026-08-07.md).
- Fixed the Inspector silently discarding keystrokes after each debounced commit; focus now stays in the field being edited.
- Fixed fixture drags escaping their pipe: positions are clamped to the physical extent on drag and typed edits.
- Added full keyboard access to the canvas: Tab to fixtures, arrows to nudge (Shift for 1'), Home/End to pipe ends, Enter to select, Delete to remove, Escape to cancel tools.
- Added Ctrl/Cmd+Z undo and Ctrl/Cmd+Shift+Z / Ctrl+Y redo shortcuts that defer to text fields while typing.
- Fixed 298 accessibility violations across all panels in both themes (contrast tokens recomputed to WCAG AA, minimum user-facing text raised to 12px, tool rail now implements the ARIA tabs pattern, dialogs close on Escape and manage focus, reduced-motion and forced-colors supported).
- Fixed wheel zoom logging a console error on every tick and scrolling the page under the canvas.
- Changed fixture hit targets to meet the 24px minimum and made panning fluid at 800 fixtures (worst frame 191ms to 30ms).
- Changed the Setup panel to lead with positions; title block, revisions, and plot text are collapsible.
- Changed the mobile dock to reach all nine tools.

## 2026-07-06 · Project documentation
- Added this changelog, the license, and a user-facing guide (docs/USER_GUIDE.md).

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
