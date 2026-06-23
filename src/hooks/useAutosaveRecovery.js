import { useEffect, useRef, useState } from "react";
import { writeAutosave, readAutosave, deleteAutosave } from "../autosave.js";
import { recordDebugEvent } from "../debugEvents.js";

const AUTOSAVE_KEY = "current";
const DEBOUNCE_MS = 800;

/**
 * Autosave the document to IndexedDB on a debounced trigger. On mount, surface
 * any draft newer than a session-local "we already loaded this" sentinel.
 */
export default function useAutosaveRecovery(doc) {
  const [draft, setDraft] = useState(null);
  const timer = useRef(null);
  const ignoreFirst = useRef(true);

  // Recovery probe on mount.
  useEffect(() => {
    let cancelled = false;
    readAutosave(AUTOSAVE_KEY).then(data => {
      if (cancelled || !data) return;
      setDraft(data);
    }).catch(() => { /* IndexedDB unavailable — silent. */ });
    return () => { cancelled = true; };
  }, []);

  // Debounced writes whenever doc changes.
  useEffect(() => {
    if (ignoreFirst.current) { ignoreFirst.current = false; return; }
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      writeAutosave(AUTOSAVE_KEY, doc)
        .then(() => recordDebugEvent("autosave:write", { key: AUTOSAVE_KEY }))
        .catch(() => {});
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer.current);
  }, [doc]);

  const dismissDraft = () => { setDraft(null); deleteAutosave(AUTOSAVE_KEY).catch(() => {}); };
  const restoreDraft = () => { const d = draft; setDraft(null); return d; };

  return { draft, dismissDraft, restoreDraft };
}
