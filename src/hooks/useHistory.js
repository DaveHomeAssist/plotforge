import { useCallback, useRef, useState } from "react";

const HISTORY_LIMIT = 80;

/**
 * Document-snapshot undo/redo. The PlotForge document is a small JSON tree
 * (no raster pixels), so naive full-doc snapshots are cheap and correct.
 *
 * Usage:
 *   const { push, undo, redo, undoN, redoN } = useHistory(doc, setDoc);
 *   // before mutating: const before = doc;
 *   // after mutating:  push(before, nextDoc);
 */
export default function useHistory(setDoc) {
  const undoStack = useRef([]);
  const redoStack = useRef([]);
  const [undoN, setUndoN] = useState(0);
  const [redoN, setRedoN] = useState(0);

  const sync = useCallback(() => {
    setUndoN(undoStack.current.length);
    setRedoN(redoStack.current.length);
  }, []);

  const push = useCallback((before, after) => {
    if (before === after) return;
    undoStack.current.push({ before, after });
    if (undoStack.current.length > HISTORY_LIMIT) undoStack.current.shift();
    redoStack.current = [];
    sync();
  }, [sync]);

  const undo = useCallback(() => {
    const entry = undoStack.current.pop();
    if (!entry) return false;
    redoStack.current.push(entry);
    setDoc(entry.before);
    sync();
    return true;
  }, [setDoc, sync]);

  const redo = useCallback(() => {
    const entry = redoStack.current.pop();
    if (!entry) return false;
    undoStack.current.push(entry);
    setDoc(entry.after);
    sync();
    return true;
  }, [setDoc, sync]);

  const clear = useCallback(() => {
    undoStack.current = [];
    redoStack.current = [];
    sync();
  }, [sync]);

  return { push, undo, redo, clear, undoN, redoN };
}
