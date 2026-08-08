# PlotForge — UX/UI Audit Results

**Run date:** 2026-08-07 · **Protocol:** `docs/UX_UI_AUDIT.md` v1.0
**Build:** branch `claude/plotforge-ux-ui-audit-gacber` @ `aae4ac0` · dev server, Node v22.22.2
**Environment:** Chromium 1194 (Playwright 1.62.1), Linux, 1440×900 unless stated, both themes
**Baseline:** `npm run lint` 0 errors · `vitest run` 28 files / 129 tests passed

---

## Verdict

**Composite 1.9 / 5. Does not pass any release gate.**

| Release gate | Required | Actual | |
|---|---|---|---|
| Composite | ≥ 3.5 | **1.9** | ✗ |
| L4 data safety | ≥ 4, zero S0 | **2**, zero S0 | ✗ (S0 clear) |
| L5 accessibility | ≥ 3, G5.2 passing | **1**, G5.2 failed | ✗ |
| Open S1 findings | 0 | **2** | ✗ |

The good news is real and worth stating first: **no S0 was found.** The document model holds up. Conflict detection is truthful, destructive deletes are confirmed and fully undoable in one step, save-state indicators agree with each other, `.plot` migration is unit-covered, and the zoom transform is numerically exact. The chassis is sound.

What fails is the **input layer between the user and that model**. Two silent defects let a designer believe they typed something the document never received, and the canvas — the actual product — is completely unreachable by keyboard.

---

## Scorecard

| Lens | Weight | Score | Gates failed |
|---|---:|---:|---|
| L1 Task throughput | 20% | 2 | G1.3 (silent failures), G5.2-dependent scenarios |
| L2 Canvas integrity | 15% | 2 | G2.4, G2.5 · G2.1/G2.2 passed |
| L3 Information architecture | 10% | 3 | G3.4 · card sort not run |
| L4 State & data safety | 25% | 2 | G4.5 · G4.1–G4.4 **passed** |
| L5 Accessibility & parity | 20% | 1 | G5.1–G5.6 all failed |
| L6 Visual system | 5% | 2 | G6.1 · G6.2–G6.4 not verified |
| L7 Resilience & scale | 5% | 2 | G7.1 · G7.4 partial |

*Weighted composite: 1.90.*

---

## What was NOT run

Stated plainly, per §2.6 of the protocol — silence would read as "covered."

| Not run | Why | Gates left unverified |
|---|---|---|
| Domain reviewer severity calibration | No practicing LD/ME in the loop. **All severities below are provisional and unratified.** | Severity column throughout |
| Full 10-scenario timed battery | Ran fragments (SC-03, SC-05, SC-07, SC-10 partially) plus targeted probes; no participant, no times | G1.1, G1.4 |
| Card sort (5 participants) | Requires human participants | G3.1 |
| Screen reader passes (VoiceOver/NVDA) | Not available on Linux CI | Announcement quality |
| Dark-room legibility at 6 ft | Requires physical setup | G6.4 |
| Physical plot on ANSI D | No plotter | G6.2 |
| Safari / Firefox | Chromium only in this environment | G7.4 |
| Native SwiftUI port (L8) | Requires macOS + Xcode | G8.1–G8.3 |
| Tablet runs | No device | SC-01/03/07 tablet mode |

---

## Findings

Severity per §3. Two S1s, both escalated by the **silent** rule.

### PF-UX-001 — Inspector silently discards keystrokes after every commit · **S1**

**Lens:** L4 (G4.5) · **Confidence:** Confirmed, 3/3 trials + timeline trace

Every committed Inspector edit destroys the input element and drops focus to `<body>`, where it stays. Anything the user types next goes nowhere, with no error, no visual change, and no indication the field is no longer live.

Cause: `Inspector.jsx:176-193` builds `editorKey` from `fx.id` **plus every committed field value**, and passes it as `key` to `FixtureInspector`. When the 450ms debounce commits (`Inspector.jsx:243-250`), the committed value changes, the key changes, React unmounts and remounts the subtree, and the focused `<input>` is destroyed mid-edit.

Focus timeline after a keystroke, sampled every 50ms for 2s:

```
0ms: channel  ->  450ms: BODY   (stays BODY for the remainder of the sample)
FOCUS ON BODY from 450ms onward — it never returns
```

Confirmation with values guaranteed to differ each trial:

```
type "7", wait 700ms (commit fires), type "3" -> focus was BODY  field="7"  expected "73"  LOST
type "8", wait 700ms (commit fires), type "4" -> focus was BODY  field="8"  expected "84"  LOST
type "9", wait 700ms (commit fires), type "6" -> focus was BODY  field="9"  expected "96"  LOST
```

The dropped character does not land anywhere else (0 other inputs received it) — it is discarded.

**Failure scenario.** An electrician is patching from a paper worksheet. They type `1` for channel 15, glance down at the sheet for half a second, type `5`. The debounce commits during the glance. The `5` is discarded. The Inspector shows `1`, the patch table shows `1`, the status bar shows DMX OK. The plot ships with channel 1 where channel 15 was intended, and nothing anywhere signalled the loss.

**Domain cost.** Wrong paperwork with no signal — exactly the S1 definition. Under time pressure with eyes moving between a worksheet and the screen, sub-second pauses mid-field are the normal typing rhythm, not an edge case.

**Note:** the related hypothesis R-09 (edits landing on the *wrong fixture*) is **refuted** — see Refuted below. The unmount flush targets the correct fixture. The defect is loss, not misdirection.

---

### PF-UX-002 — Fixtures drag off the end of their position with no clamping · **S1**

**Lens:** L2 · **Confidence:** Confirmed

Dragging a fixture past the end of its pipe applies no bounds check. On the seeded 28 ft `1ST ELEC`, a single drag placed a unit at **−13741mm = −45.1 ft from centre** — 31 feet past the end of the pipe it is nominally hung on, and well outside the 36 ft stage.

```
start:                    translate(-3658 -2438)     (-12.0 ft, on-pipe)
after one drag left:      translate(-13741.4 -2438)  (-45.1 ft, off-pipe)
still rendered:           yes, at viewport x = -81.8px  (off-screen)
after "Reset view":       boundingBox unchanged — still off-screen
statusbar:                "10 fixtures · 3 positions · DMX OK"
```

No validation fires, no conflict is raised, the status bar stays clean, and **"Reset view" does not bring the fixture back into view**. Recovery requires knowing to select the fixture elsewhere and type a new X in the Inspector.

**Failure scenario.** A designer drags a unit, the pointer leaves the canvas mid-drag, the unit lands 45 ft out. It vanishes off-screen. The plot count still reads 10 fixtures and DMX OK, so nothing prompts a second look. The printed plot places a unit in the air outside the building.

**Domain cost.** Silent, affects printed output, and the recovery path is non-obvious. S2 by task cost, escalated to S1 by both the silent and print-bearing rules.

---

### PF-UX-003 — Canvas has no keyboard access at all · **S2**

**Lens:** L5 (G5.2) · **Confidence:** Confirmed · *R-01 confirmed*

```
Tab presses from topbar:              160  (never reached a fixture)
Reached a canvas fixture via Tab:     false
Focusable elements inside <svg>:      0
Canvas <svg> tabindex attribute:      null
Arrow keys on a selected fixture:     no movement (368,367) -> (368,367)
Delete on a selected fixture:         10 fixtures -> 10 fixtures
Focus after clicking a fixture:       BODY
```

A keyboard-only user cannot select, move, focus, delete, or even reach a fixture. G5.2 requires all ten scenarios to complete keyboard-only; **SC-01, SC-06, SC-07 and SC-10 are impossible.** `usePanZoom.js:110` acknowledges this in a comment: *"suppress unused warning until we wire keyboard navigation."*

Clicking a fixture also sends focus to `<body>` rather than to the selected object, which independently fails G5.4.

---

### PF-UX-004 — 298 axe-core violations across every panel, both themes · **S2**

**Lens:** L5 (G5.1, G5.3, G5.6) · **Confidence:** Confirmed

| Rule | Impact | Instances | Where |
|---|---|---:|---|
| `color-contrast` | serious | 250 | all 9 panels + splash, both themes |
| `aria-prohibited-attr` | serious | 36 | all 9 panels, both themes |
| `scrollable-region-focusable` | serious | 8 | patch, checks, export |
| `landmark-main-is-top-level` | moderate | 2 | splash |
| `label` | **critical** | 2 | fixtures panel |

**Contrast (G5.3).** `--ink-dim` is the systematic failure, and the worst offenders are the tool-rail eyebrow labels — user-facing navigation text:

| Element | Theme | fg / bg | Ratio | Required |
|---|---|---|---:|---|
| `.tool-tab__meta` ("SELECTION", "LIBRARY"…) 8.5px | dark | `#5d6878` / `#111f29` | **2.96:1** | 4.5:1 |
| `.tool-tab__meta` 8.5px | light | `#8a99aa` / `#e5f0f7` | **2.51:1** | 4.5:1 |
| `.profile-info-block .mono.small` 11px | light | `#8a99aa` / `#f0f7fb` | **2.68:1** | 4.5:1 |
| `dt` in inspector 9px | dark | `#5d6878` / `#11161f` | **3.20:1** | 4.5:1 |
| `.save-status__mode` 11px | dark | `#5d6878` / `#0e131a` | **3.29:1** | 4.5:1 |

The **light theme is consistently worse than dark** (2.51 vs 2.96 floor) — worth noting, since light is the likelier choice for printing and daytime paperwork.

**Type scale (G5.6).** R-06 confirmed: `.tool-tab__meta` renders at **8.5px** and inspector `dt` labels at **9px**. These are user-facing content, not decoration — every tool in the rail is labelled at 8.5px.

**`aria-prohibited-attr`.** `aria-label` on `<g class="focus-beams">` and `<g class="comment-pins">` with no `role` — prohibited, so the label is simply not exposed.

---

### PF-UX-005 — Tool rail claims the tabs pattern but does not implement it · **S2**

**Lens:** L5 (G5.5) · **Confidence:** Confirmed · *R-03 confirmed*

```
focus #tool-tab-inspect | ArrowRight -> #tool-tab-inspect | End -> #tool-tab-inspect
roving tabindex values: [null,null,null,null,null,null,null,null,null]
```

`role="tablist"`/`role="tab"` are declared (`PlotForge.jsx:464-484`) but arrow keys and Home/End do nothing and there is no roving tabindex, so all nine tabs are sequential tab stops. A screen reader announces a tabs widget that does not behave like one — worse than plain buttons, because the announced affordance is false.

---

### PF-UX-006 — Modals ignore Escape and never receive focus · **S2**

**Lens:** L5 (G5.4) · **Confidence:** Confirmed

The splash "Sign in" and "Settings" dialogs both declare `aria-modal="true"`, but:

```
"Sign in"  focus moved into dialog: false | closed by Escape: false | closed via Close button: true
"Settings" focus moved into dialog: false | closed by Escape: false | closed via Close button: true
```

Focus stays behind the dialog, so a keyboard or screen-reader user is left tabbing through inert background content while a modal is open. Both are dismissible via their Close button — this is not a trap — but Escape is dead and there is no focus containment.

---

### PF-UX-007 — Wheel zoom errors on every tick and cannot suppress page scroll · **S2**

**Lens:** L2 / L7 (G7.4) · **Confidence:** Confirmed

`usePanZoom.js:70` calls `e.preventDefault()` inside React's `onWheel`, which React attaches as a **passive** listener. The call is a no-op and logs an error every wheel event:

```
Unable to preventDefault inside passive event listener invocation.   (repeats per tick)
```

Two consequences: the console fills during ordinary zooming (per §7, any console error during a scenario is automatically a finding), and the browser's default scroll is never suppressed, so wheel/trackpad zoom can scroll the page underneath the canvas. Needs a non-passive listener registered via `addEventListener(..., { passive: false })`.

---

### PF-UX-008 — Fixture hit targets below the WCAG minimum · **S3**

**Lens:** L2 (G2.4) · **Confidence:** Confirmed

Fixture glyph at default zoom measures **19.5 × 26.8 px**. Width is under the 24×24 CSS px floor (WCAG 2.2 SC 2.5.8), and this is the primary selection target in the app.

---

### PF-UX-009 — Performance degrades below gate at production scale · **S3**

**Lens:** L7 (G7.1) · **Confidence:** Confirmed

Measured on generated fixtures (12 positions, mixed profiles):

| Metric | 400 fixtures | 800 fixtures | Gate |
|---|---:|---:|---|
| Pan p50 | 63 fps | 63 fps | ≥30 fps ✓ |
| Pan **p95** | **22 fps** | **22 fps** | ≥30 fps ✗ |
| Worst frame | 128 ms | **191 ms** | <100 ms ✗ |
| 12 zoom steps | 510 ms | 1068 ms | — |
| Patch panel open | 468 ms | 457 ms | — |
| Checks panel open | 682 ms | **1714 ms** | — |
| Draft restore → settle | 436 ms | 563 ms | — |

Median pan is fine; the tail is not. G7.1 fails on p95 at 400 and on worst-frame input blocking at 800. The checks panel at 1.7s is the sharpest single regression.

---

### PF-UX-010 — Setup panel is 3.3 screens deep · **S3**

**Lens:** L3 (G3.4) · **Confidence:** Confirmed · *R-11 confirmed*

Content height vs. available viewport at 1280×800:

| Panel | Content | Screens |
|---|---:|---:|
| **setup** | 1624px | **3.31** |
| fixtures | 1310px | 2.67 |
| export | 1122px | 2.29 |
| wizard | 800px | 1.63 |
| patch | 763px | 1.50 |
| checks | 558px | 1.14 |
| inspect / notes / files | ≤507px | 1.00 |

Setup stacks metadata, revisions, text settings and positions in one column (`PlotForge.jsx:276-301`). Position editing — the reason to open Setup during drafting — sits below two full screens of scroll.

---

### PF-UX-011 — Mobile dock reaches 5 of 9 tools, silently · **S3**

**Lens:** L3 · **Confidence:** Confirmed · *R-07 confirmed*

Dock exposes Inspect, Fixtures, Patch, Wizard, Files. **Missing: Setup, Notes, Checks, Export** — so on a phone a user cannot edit the venue, add positions, review conflicts, or print. Nothing in the UI says these exist elsewhere.

---

### PF-UX-012 — Splash advertises unbuilt features as live controls · **S3**

**Lens:** L3 · **Confidence:** Confirmed

The splash nav renders **Templates (3)**, **Shared (1)**, **Archive (0)** with counts, plus a **Sign in** dialog offering an email field and "Continue". Clicking Templates, Shared or Archive opens nothing and changes no DOM. The README lists auth and sharing as deliberately not built — but the counts imply real content exists.

Not scoped as "unbuilt feature missing" (which §1.3 excludes); scoped as **existing UI making false claims**, which is in scope.

---

### PF-UX-013 — No undo/redo keyboard shortcut · **S3**

**Lens:** L1/L5 · **Confidence:** Confirmed · *R-02 confirmed*

```
edit channel -> 42 ; Ctrl+Z -> channel still 42   (no effect)
click Undo button -> channel 11                    (works)
```

Only `Cmd/Ctrl+S` is bound (`PlotForge.jsx:202-211`). Undo is reflexive muscle memory in every drafting tool; requiring a mouse trip to the topbar is friction on the single most-used recovery action. Compounded by PF-UX-001: the moment a user notices a dropped keystroke, the instinctive `Ctrl+Z` also does nothing.

---

### PF-UX-014 — `prefers-reduced-motion` and `forced-colors` unhandled · **S3**

**Lens:** L5 · **Confidence:** Confirmed · *R-04 confirmed*

Under `prefers-reduced-motion: reduce`, `.tool-tab` still computes `transition: all`. Neither media feature appears anywhere in 2,398 lines of CSS.

---

## Refuted hypotheses

Recorded because a protocol that only reports hits is not measuring anything. Five reconnaissance hypotheses and two gates came back clean.

| Ref | Hypothesis | Result |
|---|---|---|
| **R-09** | Debounced edit could land on the **wrong fixture** | **Refuted.** Typed `301` into fixture 0, switched to fixture 1 inside the 450ms window. `301` committed to fixture 0 and appears correctly on its patch row; fixture 1 kept channel 12. The unmount flush in `Inspector.jsx:254-258` targets the right fixture. The real defect (PF-UX-001) is loss, not misdirection. |
| **R-12** | Reflow broken at 320px / 200% zoom | **Refuted.** No horizontal overflow at 1440/1024/760/420/**320**px, or at 200% zoom. The mobile dock activates correctly at ≤760px. WCAG 1.4.10 holds. |
| **R-10** | Focus/comment modes may be unindicated and un-cancellable | **Not confirmed.** Canvas exposes explicit `Reset view · Focus · Clear focus · Comment` controls. Escape-to-cancel and armed-state styling were not fully characterised — carried forward as an open probe, not a finding. |
| — | Zoom drift (G2.1) | **Passed.** viewBox after 20 alternating zoom cycles is byte-identical to start: `-7924.5 -9144 15849 17678`. Zero drift. |
| — | Stuck drag on pointer loss (G2.2) | **Passed.** Releasing the pointer outside the viewport terminates the drag cleanly; the fixture does not follow the cursor afterward. |
| — | Conflict truth (G4.2) | **Passed.** Forced a duplicate U1/41. All four surfaces agreed: statusbar `1 DMX conflict`, overview pill `1 CONFLICTS`, patch badge `1`, checks badge `1`, and the conflict panel named both fixtures with a working Reveal. |
| — | Destructive delete + undo (G4.3) | **Passed.** Deleting a position prompts *"Delete this position and 5 fixtures?"*, cascades correctly (10→5), and **one** undo restores all 10. |
| — | Save indicator agreement (G4.2) | **Passed.** Topbar, Files panel and overview pill all read unsaved consistently. |

---

## Triage

Per §10: every S1 touching printed output before any S2.

| Order | Finding | Sev | Notes |
|---:|---|---|---|
| 1 | PF-UX-001 keystroke loss | S1 | Root cause is one line — `editorKey` should key on `fx.id` only, with commits reconciled through state rather than remount |
| 2 | PF-UX-002 no drag clamping | S1 | Clamp x to the position's extent in the drag path; consider flagging off-pipe units in Checks |
| 3 | PF-UX-003 canvas keyboard access | S2 | Largest fix; gates G5.2 and four scenarios |
| 4 | PF-UX-004 contrast + type scale | S2 | Mostly a token change: raise `--ink-dim`, lift 8.5/9px to ≥12px |
| 5 | PF-UX-007 passive wheel listener | S2 | Small, mechanical |
| 6 | PF-UX-005 / 006 tabs + modal focus | S2 | Standard APG patterns |
| 7 | PF-UX-008 hit targets | S3 | |
| 8 | PF-UX-009 scale tail | S3 | Checks panel first |
| 9 | PF-UX-010 / 011 / 012 IA | S3 | 012 is a product decision, not a bug fix |
| 10 | PF-UX-013 / 014 | S3 | Both small |

Findings 1, 2, 5, 7 and 14 are individually small. Fixing 1 and 2 alone clears both S1s and removes the silent-data class entirely.

## Re-run instructions

Harness in `.audit/` (git-ignored). Requires `npm install --no-save playwright axe-core`, a dev server on `:5173`, and Chromium at `/opt/pw-browsers/chromium-1194`. `gen-fixtures.mjs` regenerates the 400/800-fixture files. After remediation, re-run the failed gates plus the full L4 and L5 batteries per §10.

---

# Remediation pass — 2026-08-08

All findings patched and re-verified against the same harness. Application code changed; the protocol and the findings above are unchanged (they are the record of the pre-fix build).

**Baseline after fixes:** `npm run lint` 0 errors · `vitest run` 29 files / **136 tests** passed (7 new regression tests) · `npm run build` clean.

## Gate results, before → after

| Gate | Before | After | |
|---|---|---|---|
| G5.1 axe violations (9 panels × 2 themes) | **298** | **0** | ✓ |
| G5.2 canvas reachable by keyboard | never (160 tab stops) | reached, 10 focusable | ✓ |
| G5.3 contrast AA | 250 failures | 0 | ✓ |
| G5.4 focus after selecting a fixture | `BODY` | the fixture | ✓ |
| G5.5 tablist arrows / roving tabindex | dead / all `null` | works / one `0` | ✓ |
| G5.6 minimum user-facing type | 8.5px | 12px | ✓ |
| G2.4 fixture hit target | 19.5 × 26.8px | **26.7 × 26.7px** | ✓ |
| G7.1 pan p95 @800 | 22 fps | **44 fps** | ✓ |
| G7.1 worst frame @800 | 191 ms | **30 ms** | ✓ |
| G3.4 Setup panel depth | 3.31 screens | **1.26 screens** | ✓ |
| Console errors while zooming | every wheel tick | none | ✓ |

## Per-finding outcome

| ID | Sev | Outcome |
|---|---|---|
| PF-UX-001 keystroke loss | S1 | **Fixed.** `Inspector.jsx` keys the editor on `fx.id` alone; external changes reconcile into the draft instead of remounting. Verified 3/3: type → commit → keep typing now yields `73`/`84`/`96` with focus retained. |
| PF-UX-002 unclamped drag | S1 | **Fixed.** `clampFixtureX()` in the domain layer, applied inside `updateFixture`, so drags *and* typed positions are held to the pipe. A drag that reached −45.1 ft now stops at −14.0 ft. |
| PF-UX-003 no canvas keyboard | S2 | **Fixed.** Fixtures are focusable with roving tabindex and a labelled `role="button"`. ←/→ nudge 1" (Shift 1'), Home/End jump to the pipe ends, ↑/↓ walk units, Enter selects, Delete removes, Escape cancels. Measured exactly 25.4mm and 304.8mm per step. |
| PF-UX-004 axe / contrast / type | S2 | **Fixed.** Tokens recomputed for AA on every surface: dark `--ink-dim` `#8794a6`; light `--ink-dim` `#5b6979`, `--ink-mute` `#59687a`, `--amber` `#9a5800`, `--green` `#0f7a4f`, `--blue` `#0a6ea8`. All sub-12px type lifted to 12px. `aria-prohibited-attr`, `label`, `scrollable-region-focusable` and the nested-`main` landmark all resolved. |
| PF-UX-005 tablist | S2 | **Fixed.** Arrow/Home/End with roving tabindex on the tool rail. |
| PF-UX-006 modal focus | S2 | **Fixed.** Overlays take focus on open, close on Escape, and return focus to the opener. |
| PF-UX-007 passive wheel | S2 | **Fixed.** Wheel registered via `addEventListener(..., { passive: false })`. Console is clean while zooming. |
| PF-UX-008 hit targets | S3 | **Fixed.** Transparent hit circle sized so the target clears 24 CSS px at default zoom. |
| PF-UX-009 scale tail | S3 | **Fixed.** `FixtureSymbol` memoized and the fixture layer hoisted into `useMemo`, so panning no longer rebuilds every fixture subtree. Checks panel 1714 → 1341 ms. *Caveat:* that figure is against a synthetic file carrying 2,506 simultaneous conflicts; a realistic plot renders far fewer rows. |
| PF-UX-010 Setup density | S3 | **Fixed.** Positions lead the panel; title block, revisions and plot text are collapsed by default. |
| PF-UX-011 mobile dock | S3 | **Fixed.** All nine tools reachable via a scrolling dock; targets raised to 44px. |
| PF-UX-012 splash dead controls | — | **Retracted — false positive.** Templates/Shared/Archive are working section switchers (`SplashScreen.jsx:181-183`) driving real card lists, and the counts (3/1/0) are accurate. The original probe only checked for a `[role="dialog"]`, which a section switch correctly does not create, and an earlier probe had an open modal intercepting the clicks. No code change; the finding was wrong. |
| PF-UX-013 undo shortcut | S3 | **Fixed.** Ctrl/Cmd+Z undoes, Ctrl/Cmd+Shift+Z and Ctrl+Y redo. Verified `11 → 42 → undo 11 → redo 42`, including while the field is focused. |
| PF-UX-014 reduced motion | S3 | **Fixed.** `prefers-reduced-motion` and `forced-colors` blocks added; `.tool-tab` transition drops from `all` to `1e-05s` under reduce. |

## Notes on the fixes

**The undo interaction was the subtle part.** Protecting the focused field from being clobbered mid-typing is what makes PF-UX-001 stay fixed — but a naive guard also blocked undo from reverting a focused field, and then blocked redo when it restored a value the field had once held. The guard is therefore one-shot: it ignores only our own commit's immediate echo, so any later external change wins. All three behaviours are covered by regression tests.

**Regression tests added** (`src/__tests__/auditRegressions.test.jsx`, 7 tests): keystroke retention across a commit, external changes reaching the draft, undo reverting a focused field, and four clamping cases including the degenerate zero-length position.

## Still not run

Unchanged from the original run: domain-reviewer severity ratification, card sort, screen readers, dark-room legibility, physical ANSI D print, Safari/Firefox, the native port, and the full timed scenario battery. The keyboard model added here satisfies G5.2 mechanically, but **it has not been driven by a real screen-reader user**, and the announcement quality of the new `aria-label` on each fixture is unverified.
