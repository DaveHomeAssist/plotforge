# Continue PlotForge: build through all phases unless blocked

Status note, 2026-06-22: this prompt is historical runner context. The repo
README now documents P0 through P3 as shipped except MVR parser locking parked
on Vectorworks sample files, and the Inspector UX and validation artifact has
been implemented locally with tests.

Run this in Claude Code in the terminal from the repo root. It can read the
repo, run the build, test, and commit. Notion writes and deploys are flagged
where they need a different surface.

## Mission

Continue PlotForge from its current point and complete every documented phase
(P0 through P3) in order. Do not stop at the first hard item. Park anything
truly blocked, log it, and keep moving through the rest.

## Source of truth and read order

1. `/Users/daverobertson/Desktop/Code/90-governance/system/SESSION_BOOTSTRAP.md`
   and `WORKSPACE_OPERATING_RULES.md`
2. Notion project `SFT | PlotForge` and the hubs `PlotForge Landing`,
   `Spike Build`, `Design Spec`. Notion is canonical for phase status.
3. The repo: `/Users/daverobertson/Desktop/Code/10-projects/active/plot-forge`
   (Vite plus React, entry `/src/main.jsx`).
4. Local `README.md`. Treat it as stale until reconciled against Notion.

First action: reconcile Notion against the README so you start from the real
state, not the stale one. Notion records P0-2 fixture library shipped
2026-06-18; the README still lists it as future work.

## Verified current state (2026-06-21)

- App live: `https://plotforge-beta.vercel.app`
- Landing live: `https://plotforge-landing.vercel.app` (Vercel project
  `plotforge-landing`), CTA points at the app.
- Shipped: P0-1 venue editor, P0-2 fixture library.
- Documented next: P0-3 patch table plus CSV export.
- Known blocker: P0-4 print to PDF needs ANSI D plotter access for fidelity
  testing. Build everything except the fidelity sign-off, then park that check.

## Build order

Work top to bottom. Finish a tier before starting the next.

- P0: venue editor (done), fixture library (done), patch table plus CSV,
  print to PDF
- P1: metadata, revisions, conflict panel, inspector parsing, focus beam tool
- P2: fixture status, layered notes, multi select, gel rollup, circuit schema,
  comment pins
- P3: MVR and GDTF interop, OSC bridge, multi show registry, PWA,
  AI plot starter

For each item, read its spec in the Notion Design Spec before coding. If a spec
is missing or ambiguous, write a one paragraph assumption, proceed, and flag it
for review rather than stalling.

## Per item loop

1. Read the spec. State the acceptance criteria in one short list.
2. Implement in the smallest correct change set.
3. Build and lint. Run existing tests. Add tests for new logic. No silent
   swallowed errors. Fail loudly on unexpected state.
4. Verify against the acceptance criteria. For UI, describe the manual check.
5. Commit with the house inline log format:
   `[YYYY-MM-DD] [PLOTFORGE] [feat|fix|refactor|chore|docs|test] [title]`
   Imperative mood, no trailing period, one discrete change per commit.
6. Update Notion `SFT | PlotForge` status for the item. If you cannot write
   Notion from this surface, output a ready to paste status block instead.
7. Keep the README in sync with Notion as you go.

## Blocked protocol

- An item is blocked only when an external dependency or decision stops it,
  not when it is merely hard.
- When blocked: implement everything around the blocker, write a one line
  blocker note with the exact dependency, mark the item amber, and continue to
  the next item. Do not force it.
- P0-4 print to PDF: build the export, then park the fidelity sign-off on ANSI D
  plotter access. Note it and move on.

## Definition of done

- Per item: acceptance criteria met, build green, tests pass, committed, status
  updated.
- Per tier: every non-blocked item done, blockers logged with their dependency.
- Overall: P0 through P3 complete except items parked on a named external
  dependency. Produce a final phase report: shipped, parked with reason, and
  the single next action for each parked item.

## Deploy

- After a tier lands and is green, deploy the app per the existing Vercel setup.
- Do not overwrite the existing `plotforge` or `plotforge-landing` projects with
  the wrong target. Confirm the project name before each deploy.
- Verify each deploy with an HTTP 200 check and a smoke test of the new feature.

## Constraints

- No em dashes. No hyphens in prose. Never use the word `ever`.
- Default to zero comments. One line only when the why is non-obvious.
- Good names over comments. No multi paragraph docstrings.
- Never run `reset --hard`, `push --force`, or `branch -D` without flagging the
  blast radius and a safer alternative first.
- Query before you report. A failed or ungranted check is grey, not green. Do
  not upgrade a status to clear an alarm.

## Stop conditions

Stop and ask only if: a phase needs a product decision not in the spec, a deploy
target is ambiguous, or a destructive git action looks necessary. Otherwise keep
building.
