// JSON serialization for .plot project files.
// Forward-compatible: writes DOC_VERSION, reads with a migration table.

import { DOC_VERSION, defaultProjectMetadata } from "./domain/show.js";
import { normalizeFixtureNotes } from "./domain/fixtureNotes.js";
import { normalizeFixtureStatus } from "./domain/fixtureStatus.js";

export const PLOT_MIME = "application/x-plotforge+json";

export function serialize(doc) {
  return JSON.stringify({ ...doc, version: DOC_VERSION }, null, 2);
}

export function deserialize(text) {
  const parsed = JSON.parse(text);
  return migrate(parsed);
}

const migrators = {
  // 0 → 1: bootstrap any pre-versioned docs encountered during dev.
  0: (doc) => ({ ...doc, version: 1 }),
  1: (doc) => ({
    ...doc,
    version: 2,
    metadata: { ...defaultProjectMetadata(), ...(doc.metadata || {}) },
    fixtureProfiles: doc.fixtureProfiles || {},
  }),
  2: (doc) => ({
    ...doc,
    version: 3,
    revisions: doc.revisions || {},
    revisionOrder: doc.revisionOrder || [],
    activeRevisionId: doc.activeRevisionId || null,
  }),
  3: (doc) => ({
    ...doc,
    version: 4,
    fixtures: Object.fromEntries(
      Object.entries(doc.fixtures || {}).map(([id, fixture]) => [
        id,
        { ...fixture, status: normalizeFixtureStatus(fixture.status) },
      ]),
    ),
  }),
  4: (doc) => ({
    ...doc,
    version: 5,
    fixtures: Object.fromEntries(
      Object.entries(doc.fixtures || {}).map(([id, fixture]) => {
        const notes = normalizeFixtureNotes(fixture.notes, fixture.note);
        return [id, { ...fixture, note: notes.crew, notes }];
      }),
    ),
  }),
};

export function migrate(doc) {
  let v = doc.version ?? 0;
  let cur = doc;
  while (v < DOC_VERSION) {
    const fn = migrators[v];
    if (!fn) throw new Error(`No migrator for plot doc version ${v}`);
    cur = fn(cur);
    v = cur.version;
  }
  return cur;
}

// ---------- File System Access API + download fallback ----------

export async function saveProjectFile(doc, suggestedName = "show.plot") {
  const json = serialize(doc);
  if (window.showSaveFilePicker) {
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName,
        types: [{ description: "PlotForge project", accept: { [PLOT_MIME]: [".plot"] } }],
      });
      const w = await handle.createWritable();
      await w.write(json);
      await w.close();
      return { ok: true, mode: "fs" };
    } catch (e) {
      if (e?.name === "AbortError") return { ok: false, mode: "fs", aborted: true };
      // Fall through to download.
    }
  }
  const blob = new Blob([json], { type: PLOT_MIME });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = suggestedName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  return { ok: true, mode: "download" };
}

export async function openProjectFile() {
  if (window.showOpenFilePicker) {
    try {
      const [handle] = await window.showOpenFilePicker({
        types: [{ description: "PlotForge project", accept: { [PLOT_MIME]: [".plot"] } }],
        multiple: false,
      });
      const file = await handle.getFile();
      const text = await file.text();
      return { ok: true, doc: deserialize(text), name: file.name };
    } catch (e) {
      if (e?.name === "AbortError") return { ok: false, aborted: true };
      throw e;
    }
  }
  return new Promise((resolve, reject) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".plot,application/json";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return resolve({ ok: false, aborted: true });
      try {
        const text = await file.text();
        resolve({ ok: true, doc: deserialize(text), name: file.name });
      } catch (e) { reject(e); }
    };
    input.click();
  });
}
