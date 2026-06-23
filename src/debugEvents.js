export function recordDebugEvent(type, detail = {}) {
  if (!import.meta.env.DEV || typeof window === "undefined") return;
  const entry = { type, detail, at: Date.now() };
  const current = Array.isArray(window.__pf_debug) ? window.__pf_debug : [];
  window.__pf_debug = [...current, entry].slice(-100);
}
