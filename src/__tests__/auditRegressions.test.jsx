/**
 * Regressions for findings from the 2026-08-07 UX/UI audit
 * (docs/UX_UI_AUDIT_RESULTS_2026-08-07.md).
 */
import { describe, expect, it } from "vitest";
import { useState } from "react";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Inspector from "../components/Inspector.jsx";
import { clampFixtureX, updateFixture, newShow, newPosition, newFixture, addPosition, addFixture } from "../domain/show.js";
import { feetToMm } from "../domain/units.js";

function seedDoc() {
  let doc = newShow({ name: "Audit" });
  const pipe = newPosition({ name: "1ST ELEC", kind: "pipe", yMm: feetToMm(-8), lengthMm: feetToMm(28), trimMm: feetToMm(22) });
  doc = addPosition(doc, pipe);
  doc = addFixture(doc, newFixture({ positionId: pipe.id, profileId: "s4_26", xMm: 0, channel: 1 }));
  return { doc, pipeId: pipe.id, fixtureId: doc.fixtureOrder[0] };
}

describe("PF-UX-002 — fixture position is clamped to its pipe", () => {
  it("clamps a coordinate past the end of the position", () => {
    const position = { lengthMm: feetToMm(28) };
    const half = feetToMm(28) / 2;
    expect(clampFixtureX(position, feetToMm(-45))).toBe(-half);
    expect(clampFixtureX(position, feetToMm(45))).toBe(half);
  });

  it("leaves an on-pipe coordinate untouched", () => {
    expect(clampFixtureX({ lengthMm: feetToMm(28) }, feetToMm(-12))).toBe(feetToMm(-12));
  });

  it("clamps through updateFixture so drags cannot leave the pipe", () => {
    const { doc, fixtureId } = seedDoc();
    const next = updateFixture(doc, fixtureId, { xMm: feetToMm(-45) });
    expect(next.fixtures[fixtureId].xMm).toBe(-feetToMm(28) / 2);
  });

  it("tolerates a position with no usable length", () => {
    expect(clampFixtureX({ lengthMm: 0 }, 1234)).toBe(1234);
    expect(clampFixtureX(undefined, 1234)).toBe(1234);
  });
});

/** Mirrors the real app: commits are applied back into the document. */
function LiveInspector({ doc: initialDoc, fixtureId }) {
  const [doc, setDoc] = useState(initialDoc);
  return (
    <Inspector
      doc={doc}
      fixtureId={fixtureId}
      selectedFixtureIds={[fixtureId]}
      onChange={(id, patch) => setDoc(current => updateFixture(current, id, patch))}
      onDelete={() => {}}
    />
  );
}

describe("PF-UX-001 — a committed edit does not steal focus or drop keystrokes", () => {
  it("keeps focus in the field across a debounced commit and keeps typing", async () => {
    const user = userEvent.setup();
    const { doc, fixtureId } = seedDoc();
    render(<LiveInspector doc={doc} fixtureId={fixtureId} />);

    const channel = screen.getByDisplayValue("1");
    await user.clear(channel);
    await user.type(channel, "7");

    // Wait past the 450ms debounce so the commit lands mid-edit.
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 700)); });

    // Before the fix the commit remounted the editor, sending focus to <body>
    // and silently discarding whatever the user typed next.
    expect(document.activeElement).toBe(channel);

    await user.type(channel, "3");
    expect(channel).toHaveValue("73");
  }, 15000);
});

describe("Codex review — keyboard nudges are undoable", () => {
  it("onNudgeFixture records history while onMoveFixture does not", async () => {
    const { renderHook, act: hookAct } = await import("@testing-library/react");
    const useShowDoc = (await import("../hooks/useShowDoc.js")).default;
    const { doc, fixtureId, pipeId } = seedDoc();
    const { result } = renderHook(() => useShowDoc(() => doc));

    const startX = result.current.doc.fixtures[fixtureId].xMm;
    expect(result.current.history.undoN).toBe(0);

    // Drag tick: intentionally not undoable.
    hookAct(() => { result.current.onMoveFixture(fixtureId, pipeId, startX + 25.4); });
    expect(result.current.history.undoN).toBe(0);

    // Discrete keyboard nudge: must be undoable.
    const beforeNudge = result.current.doc.fixtures[fixtureId].xMm;
    hookAct(() => { result.current.onNudgeFixture(fixtureId, pipeId, beforeNudge + 304.8); });
    expect(result.current.history.undoN).toBe(1);
    expect(result.current.doc.fixtures[fixtureId].xMm).toBeCloseTo(beforeNudge + 304.8, 3);

    hookAct(() => { result.current.history.undo(); });
    expect(result.current.doc.fixtures[fixtureId].xMm).toBeCloseTo(beforeNudge, 3);
  });

  it("clamps a keyboard nudge to the pipe", async () => {
    const { renderHook, act: hookAct } = await import("@testing-library/react");
    const useShowDoc = (await import("../hooks/useShowDoc.js")).default;
    const { doc, fixtureId, pipeId } = seedDoc();
    const { result } = renderHook(() => useShowDoc(() => doc));
    hookAct(() => { result.current.onNudgeFixture(fixtureId, pipeId, feetToMm(500)); });
    expect(result.current.doc.fixtures[fixtureId].xMm).toBe(feetToMm(28) / 2);
  });
});

describe("PF-UX-013 — undo reverts a field even while it is focused", () => {
  it("adopts an external value that is not the echo of our own commit", async () => {
    const user = userEvent.setup();
    const { doc, fixtureId } = seedDoc();

    function Harness() {
      const [current, setCurrent] = useState(doc);
      return (
        <>
          <button type="button" onClick={() => setCurrent(updateFixture(current, fixtureId, { channel: 11 }))}>
            external
          </button>
          <Inspector
            doc={current}
            fixtureId={fixtureId}
            selectedFixtureIds={[fixtureId]}
            onChange={(id, patch) => setCurrent(now => updateFixture(now, id, patch))}
            onDelete={() => {}}
          />
        </>
      );
    }

    render(<Harness />);
    const channel = screen.getByDisplayValue("1");
    await user.clear(channel);
    await user.type(channel, "42");
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 700)); });
    expect(document.activeElement).toBe(channel);

    // An external change (stand-in for undo) lands while the field is focused.
    await user.click(screen.getByText("external"));
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 100)); });
    expect(channel).toHaveValue("11");
  }, 15000);
});

describe("PF-UX-001 — external document changes still reach the draft", () => {
  it("adopts a committed value the user is not editing", async () => {
    const { doc, fixtureId } = seedDoc();
    const { rerender } = render(
      <Inspector doc={doc} fixtureId={fixtureId} selectedFixtureIds={[fixtureId]} onChange={() => {}} onDelete={() => {}} />,
    );
    expect(screen.getByDisplayValue("1")).toBeTruthy();

    // Simulate an undo / canvas drag landing a new channel from outside.
    const moved = updateFixture(doc, fixtureId, { channel: 42 });
    rerender(
      <Inspector doc={moved} fixtureId={fixtureId} selectedFixtureIds={[fixtureId]} onChange={() => {}} onDelete={() => {}} />,
    );
    expect(screen.getByDisplayValue("42")).toBeTruthy();
  });
});
