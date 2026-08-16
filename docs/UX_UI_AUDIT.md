# PlotForge — UX/UI Audit Protocol

*A repeatable, evidence-bound audit instrument for the PlotForge lighting plot editor.*

**Version:** 1.0 · **Status:** protocol defined, not yet executed · **Target build:** `v0.1` spike (web) + native SwiftUI port

---

## 0. Why this audit is shaped this way

PlotForge is not a generic web app. It is a **drafting tool for theatrical lighting designers**, and that changes what "good UX" means:

- The output is a **legal-ish document**. A plot goes to an electrician who hangs steel over people's heads. A wrong DMX address is a wasted tech rehearsal; a wrong trim is a safety issue. Data integrity outranks delight.
- The work happens **under time pressure in a dark room**. Screen legibility at low brightness, single-hand operation, and undo confidence matter more than onboarding polish.
- Users arrive with **deep muscle memory** from Vectorworks Spotlight, Lightwright, and console software. Novel interactions are a cost, not a feature.
- The document scales **two orders of magnitude** past the seed. The spike ships 10 fixtures (`src/PlotForge.jsx:29`). A real regional-house plot is 300–800. Anything that feels fine at 10 must be tested at 800.

So this audit weights **task completion, data safety, and input parity** far above aesthetic consistency — while still holding a hard line on the visual system, because a drafting tool that looks unreliable will not be trusted with a load-in.

---

## 1. Charter

### 1.1 Objective

Determine whether a working lighting designer can take PlotForge from empty file to issued plot **without losing data, without silent errors, and without leaving the keyboard for tasks that should not require a mouse** — and produce a prioritized, evidence-backed remediation list.

### 1.2 Surfaces in scope

| # | Surface | Entry point |
|---|---|---|
| S1 | Splash / start screen | `src/components/SplashScreen.jsx` (501 LOC — largest single UI file) |
| S2 | Plot canvas (SVG drafting surface) | `src/components/PlotCanvas.jsx`, `src/hooks/usePanZoom.js` |
| S3 | Tool rail + 9 tool panels | `src/PlotForge.jsx:51-61` |
| S4 | Inspector (per-fixture editing) | `src/components/Inspector.jsx`, `src/InspectorUx.css` |
| S5 | Topbar, status bar, mobile dock | `src/PlotForge.jsx:406-525` |
| S6 | Print / export output | `src/components/PrintExport.jsx`, `src/domain/printSheet.js` |
| S7 | Native SwiftUI port | `native/PlotForgeNative*` |
| S8 | Theme system (dark + light) | `src/PlotForge.css:1-70` |

### 1.3 Out of scope

Unbuilt features are not findings. Per `README.md`, the following are deliberately absent and must not be logged as defects: Lightwright roundtrip, auth/sharing, MVR import, vendor OSC macro packs, provider-backed AI generation.

### 1.4 Roles

| Role | Responsibility |
|---|---|
| Auditor | Runs all lenses, records evidence, assigns provisional severity |
| Domain reviewer | A practicing LD/ME. Validates scenario realism and re-weights severity. **No finding ships without domain sign-off on severity.** |
| Owner | Accepts/defers each finding, assigns to milestone |

---

## 2. Rules of engagement

These exist because audits fail by producing plausible, unverifiable opinions.

1. **Every finding cites evidence.** A `file:line` reference, a screenshot, a recorded interaction, or a measured number. "Feels cluttered" is not a finding; "the Setup panel stacks 4 sections totaling 1,840px at 1440×900, requiring 2.3 viewport scrolls to reach position editing" is.
2. **Every finding states a failure scenario.** Concrete inputs → concrete wrong outcome. If you cannot write the scenario, it is a preference, and it belongs in the Preferences appendix, not the findings list.
3. **Reproduce before reporting.** Two independent runs, stated browser + viewport + fixture count.
4. **Severity is assigned against the domain, not the screenshot.** See §3.
5. **No fixes during the audit.** Observation and remediation are separate passes; fixing mid-audit destroys the baseline.
6. **Record what you could not test** and why. Silence reads as "covered."

---

## 3. Severity model

Domain-weighted. The question is not "how ugly" but **"what does this cost on a load-in day?"**

| Sev | Name | Definition | Example |
|---|---|---|---|
| **S0** | Data loss | Work is destroyed or silently corrupted; user cannot tell | Autosave overwrites a good doc with a bad one; `.plot` save fails but reports success |
| **S1** | Wrong paperwork | The plot or patch ships incorrect information the user had no signal about | A DMX conflict exists but the status bar reads "DMX OK"; print sheet drops a fixture |
| **S2** | Task blocker | A real task cannot be completed, or requires an undocumented workaround | Cannot patch a 4-universe rig; keyboard-only user cannot place a fixture |
| **S3** | Task friction | Task completes but costs materially more time or error-prone steps than the reference workflow | Renumbering 40 units requires 40 separate drags |
| **S4** | Polish | Inconsistency, aesthetic, or minor clarity issue with no task cost | Two panels use different heading weights |

**Escalation rules.** A defect escalates one level if it is (a) silent — no error surfaced to the user, (b) irreversible — undo does not recover it, or (c) load-bearing on the printed output. An S3 that silently corrupts a print becomes S1.

---

## 4. The seven lenses

Each lens has **probes** (what to do) and **gates** (the pass threshold). A lens fails if any gate fails.

### L1 — Task throughput

*Can a designer actually get the job done, and at what cost?*

Run the full §5 scenario battery, timed, with a domain reviewer narrating aloud. Record: completion, time, error count, recovery count, and every moment the participant asks "how do I…".

**Gates**
- G1.1 All 10 core scenarios complete without auditor intervention.
- G1.2 No scenario requires reading source, README, or USER_GUIDE to complete.
- G1.3 Zero silent failures — every failed action produces a visible, specific message.
- G1.4 Scenario times fall within the budgets in §5.

### L2 — Canvas interaction integrity

*The drafting surface is the product. Hold it to CAD standards, not web-app standards.*

**Probes**
- Pan/zoom: wheel zoom anchoring (does the point under the cursor stay put?), zoom limits, trackpad pinch vs. wheel disambiguation (`usePanZoom.js:71` branches on `ctrlKey`/`metaKey` — verify against real trackpad, Magic Mouse, and external wheel mouse).
- Drag: 1" snap fidelity, drag against a fast pan, drag past position ends, drag with a fixture under the cursor at minimum zoom.
- Pointer capture correctness — drag off-canvas, release outside the window, alt-tab mid-drag, then return. Does `dragState` (`PlotCanvas.jsx:26`) clear?
- Mode state: focus-beam mode and comment-pin mode are transient booleans (`PlotCanvas.jsx:40-41`). Probe how a user knows which mode is active, how to cancel (Escape?), and what happens when a mode is armed and the user switches tool panels.
- Hit targets at working zoom: measure fixture glyph tap area in CSS px at the default view and at minimum zoom.
- Selection: shift-click additive, marquee (does one exist?), select-all, deselect, and whether selection survives a tool-panel switch.
- Overlap: two fixtures at the same coordinate — can both be selected and distinguished?

**Gates**
- G2.1 Zoom is cursor-anchored and stable across ≥20 alternating zoom in/out cycles (no drift).
- G2.2 No drag operation can leave the canvas in a stuck state; every drag terminates on pointer loss.
- G2.3 Every armed mode is visibly indicated and cancellable with Escape.
- G2.4 Fixture hit targets ≥ 24×24 CSS px at default zoom (WCAG 2.2 SC 2.5.8).
- G2.5 Canvas is operable by keyboard alone — see L5/G5.2.

### L3 — Information architecture & navigation

*Nine tabs is a lot. Prove the taxonomy.*

**Probes**
- Card-sort the 9 tools (`PlotForge.jsx:51-61`) with 5 domain participants: Inspect, Fixtures, Setup, Patch, Notes, Checks, Export, Files, Wizard. Where does each participant expect *venue dimensions*, *gel palette*, *revision log*, *circuit check*, *fixture status*? Measure agreement.
- Trace automatic tool switching. Selecting a fixture forces `inspect`; selecting a position forces `setup`; a recovered draft forces `files` (`PlotForge.jsx:196-248`). Probe whether the forced switch ever discards in-progress work in the panel being replaced.
- Depth audit: for each of the 10 scenarios, count tool-panel switches required. Flag any task needing >3.
- Panel density: measure scroll length of each panel at 1440×900 and 1280×800. Setup renders four stacked sections (`PlotForge.jsx:276-301`) — measure it specifically.
- Mobile dock exposes 5 of 9 tools (`PlotForge.jsx:519-525`). Determine which tasks are impossible on mobile and whether that is signalled.
- Naming: is "Wizard" discoverable as the AI starter? Is "Checks" understood as conflicts?

**Gates**
- G3.1 ≥70% card-sort agreement on placement of every audited feature.
- G3.2 No core scenario requires more than 3 tool-panel switches.
- G3.3 No automatic tool switch discards uncommitted user input.
- G3.4 Every panel's primary action is reachable without scrolling at 1280×800.

### L4 — State, feedback & data safety

*The highest-stakes lens. S0/S1 findings concentrate here.*

**Probes**
- Save-state truth: drive `saveStatus` through unsaved → saving → saved → error (`SaveStatus.jsx`, surfaced in both topbar and Files panel). Verify the pill in `console-overview` (`PlotForge.jsx:454`), the tool badge (`PlotForge.jsx:260`), and the topbar never disagree.
- Force a save failure (revoke File System Access permission mid-save; fill the disk quota). Does the UI report failure specifically enough to act on?
- Autosave/recovery: crash the tab mid-edit (kill the process, not a clean close). Verify the recovery banner offers the *right* draft, and that dismissing it is not silently destructive (`useAutosaveRecovery.js`, `DraftRecoveryBanner.jsx`).
- Undo depth and coverage: history is 80 entries of document snapshots (`useHistory.js`). Audit which actions enter history — specifically whether venue changes, position deletion, revision changes, and starter-plan apply are all undoable. Then overflow it: 100 discrete edits, confirm the oldest silently drops and decide whether that needs signalling.
- Destructive actions: position delete cascades to its fixtures. Verify confirmation, and verify undo restores both position and fixtures.
- Conflict truth: construct overlapping DMX footprints across universes and duplicate channels; verify status bar, `console-pill`, tool badges on both `patch` and `checks`, and the conflict panel agree. **Any disagreement here is S1.**
- Inspector commit semantics: debounced edits with per-field commit isolation and Escape recovery (`Inspector.jsx:284-332`). Probe: type an invalid value, then switch fixtures before the debounce fires. Does the edit land on the wrong fixture? Type, then Cmd+S before debounce — is the edit in the saved file?
- Multi-select editing: with 3 fixtures selected and differing values, what does the Inspector show, and what does an edit apply to?

**Gates**
- G4.1 Zero S0 findings. **This gate is non-negotiable for release.**
- G4.2 Every save/conflict indicator agrees with document truth in all states.
- G4.3 Every destructive action is either confirmed or fully undoable.
- G4.4 No debounced edit can land on a different fixture than the one it was typed into.
- G4.5 Every failure path produces a specific, actionable message — never a silent no-op.

### L5 — Accessibility & input parity

*Standard: WCAG 2.2 AA, plus a keyboard-only completion requirement.*

**Probes**
- Automated: axe-core on every panel state, both themes. Zero violations is table stakes, not a pass.
- Keyboard-only run of the full §5 battery. No mouse, no trackpad.
- Screen reader pass: VoiceOver/Safari + NVDA/Firefox. Focus on the canvas — what does a fixture announce? What does a DMX conflict announce?
- Tablist conformance: the tool rail declares `role="tablist"`/`role="tab"` (`PlotForge.jsx:464-484`). Verify against ARIA APG — arrow-key roving focus, Home/End, correct tab-stop count.
- Focus management: after opening a modal, applying a starter plan, restoring a draft, or deleting a fixture — where does focus land? Is it ever lost to `<body>`?
- Focus visibility: one shared rule covers a long selector list (`PlotForge.css:888`). Enumerate interactive elements *not* in that list.
- Contrast: measure every token pair in both themes, including SVG canvas strokes against canvas background — `--grid-minor: rgba(255,255,255,.035)` and `--position-label: #5d6878` (`PlotForge.css:18,23`) are the likely failures.
- Type scale: 9px, 8.5px, and 8px sizes exist in the stylesheet. Identify what they render and whether it is user-facing content.
- Zoom/reflow: 200% browser zoom and 320px width (WCAG 1.4.10). Only 3 breakpoints exist (760px, 420px, 760px).
- `prefers-reduced-motion` and `forced-colors`: verify behavior under both.

**Gates**
- G5.1 Zero axe-core violations, both themes, all panels.
- G5.2 **All 10 scenarios complete keyboard-only** — including placing, selecting, moving, and focusing a fixture on the canvas.
- G5.3 All text and meaningful non-text contrast meets AA (4.5:1 / 3:1) in both themes.
- G5.4 Focus is never lost after any state transition; focus indicator visible on 100% of interactive elements.
- G5.5 Tool rail conforms to ARIA APG tabs pattern.
- G5.6 No user-facing text below 12px; all sizes scale with browser text settings.

### L6 — Visual system & legibility

**Probes**
- Token discipline: `PlotForge.css` is 2,274 lines against ~40 tokens. Inventory hard-coded colors, spacings, and radii that bypass the token layer.
- Dark/light parity: every panel, both themes, side by side. The light theme redefines ~25 tokens (`PlotForge.css:44-70`) — find components that only look correct in dark.
- **Dark-room legibility test** (domain-specific, non-optional): view at 20% display brightness in a darkened room, at 6 feet, as during a tech. Grade readability of the status bar, conflict pills, and canvas labels.
- Print fidelity: export the ANSI D sheet and compare against the on-screen plot. Verify title block completeness, fixture symbol parity (`FixtureSymbol.jsx` on screen vs. `printSheet.js`), focus beams, comment pins, and status markers. Print physically at least once — screen-to-PDF is not proof.
- Symbol legibility: are S4 / Fresnel / moving-head glyphs distinguishable at print scale and at minimum canvas zoom?
- Label collision: place 12 fixtures at 6" spacing on one position; grade label overlap on canvas and in print.
- Copy audit: pass every user-facing string for domain correctness and consistency. Mixed register already visible — `spike · v0.1` in the topbar, `CONSOLE`/`SESSION`/`HANDOFF` eyebrow caps, and the status-bar hint sentence (`PlotForge.jsx:516`).

**Gates**
- G6.1 Every panel is fully legible and correctly styled in both themes.
- G6.2 Printed sheet contains 100% of on-screen plot content; no dropped or displaced elements.
- G6.3 Fixture types remain distinguishable at print scale and minimum zoom.
- G6.4 Status bar and conflict indicators readable at 20% brightness from 6 feet.

### L7 — Resilience & scale

**Probes**
- Scale ladder: 10 → 50 → 150 → 400 → 800 fixtures across 4 universes and 12 positions (fixture generators in §6). At each step measure: canvas frame time during pan/zoom/drag, patch-table render, conflict-detection time, `.plot` save/load duration, and autosave write duration.
- Snapshot-history memory: 80 document snapshots × an 800-fixture doc. Measure heap and watch for autosave stalls blocking input.
- Storage limits: fill IndexedDB to quota with the show registry. What does the user see?
- Offline: PWA service worker shell caching is implemented. Probe a cold offline start, an offline edit, and offline save.
- Cross-browser: Chrome, Safari, Firefox. File System Access API is Chromium-only — verify the download fallback is honest about what it did in Safari/Firefox.
- Error boundary: force a render throw. Is `ErrorBoundary.jsx` recoverable, and is unsaved work retrievable afterward?

**Gates**
- G7.1 Canvas sustains ≥30fps pan/zoom at 400 fixtures; no input blocking >100ms at 800.
- G7.2 Autosave never blocks typing.
- G7.3 Storage-quota and save-fallback paths tell the user exactly what happened and where the file went.
- G7.4 Full scenario battery passes in all three browsers, with divergences documented.
- G7.5 An error-boundary trip never costs unsaved work without warning.

### L8 — Native parity (SwiftUI port)

Run scenarios SC-01 through SC-05 on the native build. Compare against `docs/plotforge-native-physical-smoke-2026-06-26.md`.

**Gates**
- G8.1 No task achievable on web is impossible on native.
- G8.2 Native honors platform conventions (menu bar, ⌘Z/⌘S, Dynamic Type, VoiceOver) rather than transliterating web patterns.
- G8.3 `.plot` files roundtrip web ↔ native with zero data loss.

---

## 5. Scenario battery

Ten tasks drawn from real production workflow. Each is run **three ways**: mouse+keyboard, keyboard-only, and (for SC-01/03/07) on a tablet. Time budgets are for an experienced LD on their second run, and exist to detect friction — not to grade the participant.

| ID | Scenario | Budget | Pass gate |
|---|---|---|---|
| SC-01 | New show → set venue 40'×26' → add 3 positions → hang 24 fixtures across them | 8 min | Completes; unit numbering correct stage-right to left |
| SC-02 | Patch all 24 across 2 universes, avoiding conflicts | 6 min | Zero conflicts reported and zero actually present |
| SC-03 | Introduce a deliberate DMX overlap, find it via Checks, fix it | 2 min | Conflict surfaced within 1 interaction of it being created |
| SC-04 | Fill title block + create revision "Rev B" → print ANSI D | 4 min | PDF title block complete and accurate |
| SC-05 | Save `.plot`, close tab, reopen, load file, verify byte-identical document | 3 min | Zero data loss across all fields including notes/status/pins |
| SC-06 | Renumber a position after inserting 2 fixtures mid-run | 3 min | Renumber is automatic or one action — not N drags |
| SC-07 | Multi-select 6 fixtures → align center → distribute → set common gel R80 | 3 min | All 6 updated; undo reverts as one step |
| SC-08 | Add color/gobo/focus/crew notes to 4 fixtures → export interop manifest | 5 min | All note layers present in manifest |
| SC-09 | Crash recovery: edit 10 fields, kill the tab, reopen, restore draft | 3 min | All 10 edits recovered or explicit loss stated |
| SC-10 | Open an 800-fixture show → find fixture at channel 412 → change its address | 2 min | Findable without visual scanning; app stays responsive |

**Instrumented per run:** completion (Y/N), time, error count, undo count, help-seeking events, and verbatim confusion quotes.

---

## 6. Test fixtures

Build these once; reuse across every run so results are comparable.

| Fixture | Content | Exercises |
|---|---|---|
| `seed-10.plot` | Current `seedShow()` (`PlotForge.jsx:29`) | Baseline |
| `regional-400.plot` | 400 fixtures, 12 positions, 3 universes, mixed profiles, gels, statuses, notes | L7 scale, SC-10 |
| `stress-800.plot` | 800 fixtures, 4 universes, deliberate near-boundary footprints | L7 ceiling |
| `conflict-suite.plot` | Every conflict class: exact duplicate address, overlapping footprint, cross-universe collision, duplicate channel | L4 conflict truth |
| `legacy-v1.plot` | Pre-migration file with legacy notes + no status field | Migration integrity |
| `dense-labels.plot` | 12 fixtures at 6" spacing on one position | L6 label collision |
| `corrupt.plot` | Truncated JSON, wrong version, missing `fixtureOrder` | Error messaging |

---

## 7. Instrumentation

**Environment matrix (record on every finding):** browser + version, OS, viewport, device pixel ratio, theme, fixture-count fixture, input device.

**Capture:** screen recording for every scenario run; screenshot every finding; DevTools performance trace for every L7 probe; console captured throughout — **any console error during a scenario is automatically a finding.**

**Tooling:** axe-core (automated a11y), Chrome DevTools Performance + Memory, VoiceOver/NVDA, a contrast checker fed from the token table in `PlotForge.css:1-70`, and React Profiler for render-cost attribution.

---

## 8. Scorecard

Each lens scores 0–5. **Weights reflect domain stakes, not effort.**

| Lens | Weight | 5 | 3 | 1 |
|---|---|---|---|---|
| L1 Task throughput | 20% | All scenarios in budget, no help-seeking | All complete, some over budget | Any scenario fails |
| L2 Canvas integrity | 15% | CAD-grade; no stuck states | Minor drift/mode confusion | Stuck states or lost drags |
| L3 Information architecture | 10% | ≥85% sort agreement, ≤2 switches | ≥70%, ≤3 switches | Users cannot predict placement |
| L4 State & data safety | **25%** | Zero S0/S1; all indicators truthful | Indicators lag but never lie | Any silent data loss or false "OK" |
| L5 Accessibility & parity | **20%** | Full keyboard parity, AA clean | Panels accessible, canvas is not | Keyboard-only cannot complete core tasks |
| L6 Visual system | 5% | Both themes clean, print exact | Minor theme gaps | Print drops content |
| L7 Resilience & scale | 5% | 800 fixtures fluid, all browsers | Degrades at 400 but usable | Unusable past 150 |

**Release gates.** Ship requires: composite ≥ 3.5, **L4 ≥ 4 with zero S0**, **L5 ≥ 3 with G5.2 passing**, and zero open S1.

---

## 9. Finding record

```
ID:          PF-UX-###
Lens:        L4
Severity:    S1  (escalated from S2: silent)
Surface:     Inspector / Patch panel
Evidence:    src/components/Inspector.jsx:284-332 · recording 04:12 · screenshot 018
Environment: Chrome 141 / macOS 15 / 1440×900 / dark / regional-400.plot
Repro:       1. …  2. …  3. …
Expected:    …
Actual:      …
Failure scenario:  <concrete inputs → concrete wrong outcome>
Domain cost:       <what this costs on a load-in day>
Confidence:  Confirmed | Plausible
```

---

## 10. Triage & remediation

Findings sort by **(severity × frequency) ÷ fix cost**, with two overrides: every S0 is fixed before anything else regardless of cost, and every S1 touching printed output is fixed before any S2.

| Band | Action |
|---|---|
| S0 | Stop. Fix before further feature work. |
| S1 | Fix this milestone. |
| S2 | Fix this milestone or document the workaround in `USER_GUIDE.md`. |
| S3 | Backlog with domain-reviewer priority. |
| S4 | Batch into a single visual-consistency pass. |

Remediation is a **separate pass** from the audit. After fixes land, re-run only the failed gates plus the full L4 and L5 batteries — regression risk concentrates there.

---

## 11. Pre-audit reconnaissance

> **Epistemic status:** these came from a static read of the source on the audit-design pass. They are **hypotheses with code citations, not audit results.** None has been reproduced in a browser. They exist to prime the probes above and must be re-derived through the protocol before being logged as findings.

| Ref | Observation | Evidence | Lens | Provisional |
|---|---|---|---|---|
| R-01 | Canvas appears to have no keyboard path. No `tabIndex`, no `onKeyDown` in `PlotCanvas.jsx`; the pan/zoom hook carries the comment *"suppress unused warning until we wire keyboard navigation."* If confirmed, selecting/moving/focusing a fixture is mouse-only, and G5.2 fails outright. | `usePanZoom.js:110`; `PlotCanvas.jsx` (no tab stops) | L5 | S2 |
| R-02 | Only `Cmd/Ctrl+S` is bound globally. No undo/redo shortcut appears to exist — Undo/Redo are topbar buttons only, in a tool where undo is reflexive muscle memory. | `PlotForge.jsx:202-211` | L1/L5 | S3 |
| R-03 | The tool rail declares `role="tablist"` but no arrow-key handler is present, which would break the ARIA APG tabs pattern and leave 9 sequential tab stops. | `PlotForge.jsx:464-484` | L5 | S2 |
| R-04 | No `prefers-reduced-motion` or `forced-colors` handling anywhere in 2,398 lines of CSS. | `src/*.css` | L5 | S3 |
| R-05 | Canvas tokens sit at very low alpha — `--grid-minor: rgba(255,255,255,.035)`, `--position-label: #5d6878`. Contrast against `--bg: #0a0d12` is the likely AA failure, and the dark-room test is where it will bite. | `PlotForge.css:11,18,23` | L6/L5 | S2 |
| R-06 | Type scale bottoms out at 8px/8.5px/9px. If any of it is user-facing content rather than decorative rules, G5.6 fails. | `PlotForge.css` | L5 | S2 |
| R-07 | Mobile dock exposes 5 of 9 tools; Setup, Notes, Checks, and Export have no mobile entry point. Whether that is a deliberate scope cut or an omission is unstated in the UI. | `PlotForge.jsx:519-525` | L3 | S3 |
| R-08 | Selecting a fixture force-switches the panel to `inspect`; a recovered draft force-switches to `files`. Probe whether either can discard uncommitted input in the panel being replaced. | `PlotForge.jsx:196-248` | L3/L4 | S2 |
| R-09 | Inspector edits are debounced with refs tracking the active fixture. The switch-fixture-before-debounce-fires path is the highest-value L4 probe in the app; if an edit can land on the wrong fixture it is S1 by the silent-escalation rule. | `Inspector.jsx:208-216` | L4 | S1 if confirmed |
| R-10 | Focus-beam and comment-pin modes are transient booleans with no visible armed-state indicator found and no Escape handler in the canvas. | `PlotCanvas.jsx:40-41` | L2 | S3 |
| R-11 | The Setup panel stacks four full sections (metadata, revisions, text settings, positions) in one scroll column — the density measurement in L3 should start here. | `PlotForge.jsx:276-301` | L3 | S3 |
| R-12 | Only three breakpoints exist (760px ×2, 420px). WCAG 1.4.10 reflow at 320px and 200% zoom is untested territory. | `src/*.css` | L5 | S2 |

**Deliberately not flagged:** `role="status"` on the six status regions is correct — it carries an implicit `aria-live="polite"`. The `.plot` migration path and the debounced-commit design both look considered rather than accidental; they are listed as probes because they are high-stakes, not because they look wrong.

---

## 12. Execution plan

| Phase | Work | Effort |
|---|---|---|
| 0 | Build the §6 test fixtures; set up recording + axe tooling | 0.5 day |
| 1 | L4 + L5 (highest weight, highest risk) | 2 days |
| 2 | L1 scenario battery, all three input modes, with domain reviewer | 1.5 days |
| 3 | L2 + L3 | 1 day |
| 4 | L6 + L7 + L8 | 1.5 days |
| 5 | Severity calibration with domain reviewer; scorecard; report | 1 day |

**Total: ~7.5 days.** A single-day version runs L4 and L5 only, plus SC-01/03/05/09 — that subset catches the S0/S1 class, which is where the real risk lives.

---

## Appendix A — Preferences log

Observations that fail the §2 evidence bar go here, not in findings. They are input to design discussion, not defects. Keeping them separate is what keeps the findings list credible.
