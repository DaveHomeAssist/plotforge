# PlotForge — User Guide

*A browser-based lighting plot editor: draft positions and fixtures, patch DMX, and print a title-blocked plot — no install, autosaves as you work.*

> This is a Phase 0 spike. Everything below is real and working today; some professional workflow features (Lightwright roundtrip, sharing, vendor OSC macro packs) are intentionally not built yet — see "Not yet built" at the end.

## Getting started

Open the app in a browser — it loads with a seeded 36'×22' venue, three positions (1ST ELEC, 2ND ELEC, FOH TRUSS), and 10 pre-placed fixtures so you can see a working plot immediately. Everything autosaves to your browser (IndexedDB) as you work; if the tab crashes or closes, a recovery banner offers your last saved state back.

## The canvas

- **Pan:** drag an empty area of the canvas.
- **Zoom:** mouse wheel.
- **Move a fixture:** drag it along its position — fixtures snap to 1" increments and automatically renumber stage-right-to-left.
- **Focus beams:** place a focus point for a fixture directly on the plot; it shows on both the canvas and the printed sheet.
- **Comment pins:** drop a pin anywhere on the canvas for crew notes; pins print and travel with the file.

## Positions and venue

Use the venue editor to set stage width, stage depth, and proscenium width. The position editor lets you add, rename, re-kind, move (by Y), resize (length), and delete truss/pipe positions.

## Fixtures and the Inspector

Click a fixture to open the **Inspector**: edit channel, DMX address, circuit, dimmer, color, and status, with per-field validation and keyboard recovery if you make a bad edit. Add fixtures from the **fixture library**, which ships curated GDTF profiles and also accepts OFL JSON import.

- **Multi-select:** shift-click fixtures to edit several at once, or use align-left/center/right and distribute to line them up on a position.
- **Layered notes:** attach color, gobo, focus, and crew-handoff notes per fixture — these travel through file migrations, so old plots keep their notes.
- **Status tracking:** mark fixtures with a status (e.g. needs focus, done) that shows in the Inspector, on the plot, and in the patch table.

## Patching and conflicts

The **patch table** lists every fixture's channel/DMX/circuit/dimmer and exports to CSV. PlotForge checks for DMX conflicts across universes (footprint-aware) and duplicate channels automatically — the status bar always shows fixture count, position count, and "DMX OK" or a conflict count. Open the **conflict panel** to see exactly which channels collide and jump straight to them.

Circuits and dimmers have their own schema with a circuit-check summary, and a **gel palette rollup** shows per-gel fixture counts for ordering.

## Saving, sharing, and printing

- **`.plot` files** save/load via the File System Access API (with a download fallback in browsers that don't support it) — this is your project file format, versioned with migrations so older files keep opening.
- **Multiple shows:** the show registry keeps several shows in IndexedDB with load/delete and `.plot` export per show; PlotForge also installs as a PWA with offline shell caching.
- **Print to PDF:** exports a title-blocked plot on ANSI D paper. Fill in show title, drawing title, venue, designer, company, date, revision, and scale in the metadata editor first — and use the **named revision log** to track issue history in the title block.
- **Interop export:** a manifest bundling fixture paperwork, GDTF provenance, focus points, circuit data, and comment pins, for handing off to other tools.
- **OSC bridge:** save relay settings, export them as JSON, or send the selected fixture directly — includes a small local WebSocket-to-UDP relay with no extra dependencies, for talking to a real console.

## AI plot starter

Describe your show in a sentence or two (the "brief"); PlotForge parses it and generates a local starter plan you can review and apply with one click, or copy the prompt elsewhere. This runs locally — no external AI provider is wired up yet.

## Not yet built

Lightwright roundtrip, user accounts/auth, real-time sharing, and other production quality-of-life tools aren't here yet. MVR import is parked pending sample files from Vectorworks Spotlight. Vendor-specific OSC console macro packs and provider-backed (cloud) AI generation are future work.
