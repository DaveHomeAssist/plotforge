import { migrate, serialize } from "./serialization.js";

const DB_NAME = "PlotForgeRegistry";
const DB_STORE = "shows";
const DB_VERSION = 1;

function openRegistryDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(DB_STORE)) db.createObjectStore(DB_STORE, { keyPath: "id" });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function registryRecord(doc, savedAt) {
  const serialized = JSON.parse(serialize(doc));
  return {
    id: serialized.id,
    name: serialized.name || "Untitled Show",
    savedAt,
    updatedAt: serialized.updatedAt || savedAt,
    fixtureCount: serialized.fixtureOrder?.length || 0,
    positionCount: serialized.positionOrder?.length || 0,
    doc: serialized,
  };
}

export async function saveRegistryShow(doc, { savedAt = Date.now() } = {}) {
  const record = registryRecord(doc, savedAt);
  const db = await openRegistryDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DB_STORE, "readwrite");
    tx.objectStore(DB_STORE).put(record);
    tx.oncomplete = () => { db.close(); resolve(record); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

export async function listRegistryShows() {
  const db = await openRegistryDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DB_STORE, "readonly");
    const req = tx.objectStore(DB_STORE).getAll();
    req.onsuccess = () => {
      db.close();
      resolve(req.result.sort((a, b) => b.savedAt - a.savedAt || a.name.localeCompare(b.name)));
    };
    req.onerror = () => { db.close(); reject(req.error); };
  });
}

export async function readRegistryShow(id) {
  const db = await openRegistryDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DB_STORE, "readonly");
    const req = tx.objectStore(DB_STORE).get(id);
    req.onsuccess = () => {
      db.close();
      const record = req.result;
      resolve(record ? { ...record, doc: migrate(record.doc) } : null);
    };
    req.onerror = () => { db.close(); reject(req.error); };
  });
}

export async function deleteRegistryShow(id) {
  const db = await openRegistryDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DB_STORE, "readwrite");
    tx.objectStore(DB_STORE).delete(id);
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

export function registryFileName(doc) {
  const base = String(doc.name || "plotforge")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return `${base || "plotforge"}.plot`;
}
