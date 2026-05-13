/**
 * Local filesystem storage layer using the File System Access API.
 *
 * Lets the user pick a directory on their disk; the app then mirrors all
 * data (auth, orgs, teams, players, tests, exports) into that directory
 * organised in clear sub-folders.
 *
 * Falls back silently to localStorage-only when the API is unavailable
 * (Firefox / Safari / iOS).
 */

export const FS_SUPPORTED =
  typeof window !== "undefined" && "showDirectoryPicker" in window;

type AnyHandle = FileSystemDirectoryHandle;

// ---------- IndexedDB persistence of the directory handle ----------

const IDB_NAME = "slfv-fs";
const IDB_STORE = "handles";
const HANDLE_KEY = "rootDir";

function openIdb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(IDB_STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbGet<T = unknown>(key: string): Promise<T | null> {
  try {
    const db = await openIdb();
    return await new Promise<T | null>((res, rej) => {
      const tx = db.transaction(IDB_STORE, "readonly");
      const req = tx.objectStore(IDB_STORE).get(key);
      req.onsuccess = () => res((req.result as T) ?? null);
      req.onerror = () => rej(req.error);
    });
  } catch {
    return null;
  }
}

async function idbSet(key: string, value: unknown): Promise<void> {
  try {
    const db = await openIdb();
    await new Promise<void>((res, rej) => {
      const tx = db.transaction(IDB_STORE, "readwrite");
      tx.objectStore(IDB_STORE).put(value, key);
      tx.oncomplete = () => res();
      tx.onerror = () => rej(tx.error);
    });
  } catch {
    /* ignore */
  }
}

async function idbDel(key: string): Promise<void> {
  try {
    const db = await openIdb();
    await new Promise<void>((res, rej) => {
      const tx = db.transaction(IDB_STORE, "readwrite");
      tx.objectStore(IDB_STORE).delete(key);
      tx.oncomplete = () => res();
      tx.onerror = () => rej(tx.error);
    });
  } catch {
    /* ignore */
  }
}

// ---------- Root directory handling ----------

let rootHandle: AnyHandle | null = null;
let rootName: string | null = null;
const listeners = new Set<() => void>();

export function onFsChange(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}
function notify() {
  for (const l of listeners) l();
}

export function getRootName(): string | null {
  return rootName;
}
export function isConnected(): boolean {
  return rootHandle !== null;
}

async function ensurePermission(handle: AnyHandle, mode: "read" | "readwrite" = "readwrite"): Promise<boolean> {
  const opts = { mode };
  const h = handle as unknown as {
    queryPermission?: (o: { mode: string }) => Promise<PermissionState>;
    requestPermission?: (o: { mode: string }) => Promise<PermissionState>;
  };
  const q = await h.queryPermission?.(opts);
  if (q === "granted") return true;
  const r = await h.requestPermission?.(opts);
  return r === "granted";
}

/** Try to silently restore the previously-picked directory. Returns true on success. */
export async function restoreRoot(silent = true): Promise<boolean> {
  if (!FS_SUPPORTED) return false;
  const stored = await idbGet<AnyHandle>(HANDLE_KEY);
  if (!stored) return false;
  try {
    const ok = silent
      ? // only check, don't prompt
        // @ts-expect-error
        ((await stored.queryPermission?.({ mode: "readwrite" })) === "granted")
      : await ensurePermission(stored, "readwrite");
    if (!ok) return false;
    rootHandle = stored;
    rootName = stored.name;
    notify();
    return true;
  } catch {
    return false;
  }
}

/** Prompt the user for a directory and remember it. */
export async function pickRoot(): Promise<boolean> {
  if (!FS_SUPPORTED) return false;
  try {
    // @ts-expect-error - showDirectoryPicker not in standard TS lib
    const handle: AnyHandle = await window.showDirectoryPicker({ id: "slfv-root", mode: "readwrite" });
    const ok = await ensurePermission(handle, "readwrite");
    if (!ok) return false;
    rootHandle = handle;
    rootName = handle.name;
    await idbSet(HANDLE_KEY, handle);
    await ensureSubdirs();
    notify();
    return true;
  } catch (e) {
    // user cancelled or error
    return false;
  }
}

export async function disconnectRoot(): Promise<void> {
  rootHandle = null;
  rootName = null;
  await idbDel(HANDLE_KEY);
  notify();
}

/** Re-prompt for permission if needed (used before writes after page reload). */
export async function reauthorize(): Promise<boolean> {
  if (!rootHandle) return false;
  return ensurePermission(rootHandle, "readwrite");
}

// ---------- Directory layout ----------

const SUBDIRS = [
  "auth",
  "organizations",
  "teams",
  "athletes",
  "tests",
  "exports",
  "exports/pdf",
  "exports/docx",
  "settings",
];

async function getDir(path: string, create = false): Promise<FileSystemDirectoryHandle | null> {
  if (!rootHandle) return null;
  let cur: FileSystemDirectoryHandle = rootHandle;
  if (!path) return cur;
  for (const seg of path.split("/").filter(Boolean)) {
    cur = await cur.getDirectoryHandle(seg, { create });
  }
  return cur;
}

async function ensureSubdirs() {
  if (!rootHandle) return;
  for (const p of SUBDIRS) {
    try { await getDir(p, true); } catch { /* */ }
  }
  // Manifest
  await writeJsonFile("", "manifest.json", {
    app: "SprintLab FV Pro",
    schema: 1,
    createdAt: new Date().toISOString(),
  }, { skipIfExists: true });
}

// ---------- File helpers ----------

async function writeFileRaw(dirPath: string, name: string, data: BlobPart) {
  const dir = await getDir(dirPath, true);
  if (!dir) return;
  const fileHandle = await dir.getFileHandle(name, { create: true });
  // @ts-expect-error - createWritable not in TS lib
  const w = await fileHandle.createWritable();
  await w.write(data);
  await w.close();
}

async function readFileRaw(dirPath: string, name: string): Promise<File | null> {
  try {
    const dir = await getDir(dirPath);
    if (!dir) return null;
    const fh = await dir.getFileHandle(name);
    return await fh.getFile();
  } catch {
    return null;
  }
}

export async function writeJsonFile(
  dirPath: string,
  name: string,
  data: unknown,
  opts: { skipIfExists?: boolean } = {}
) {
  if (!rootHandle) return;
  if (opts.skipIfExists) {
    const existing = await readFileRaw(dirPath, name);
    if (existing) return;
  }
  const text = JSON.stringify(data, null, 2);
  await writeFileRaw(dirPath, name, text);
}

export async function readJsonFile<T = unknown>(dirPath: string, name: string): Promise<T | null> {
  const f = await readFileRaw(dirPath, name);
  if (!f) return null;
  try {
    const text = await f.text();
    return text ? (JSON.parse(text) as T) : null;
  } catch {
    return null;
  }
}

export async function writeBinaryFile(dirPath: string, name: string, blob: Blob) {
  await writeFileRaw(dirPath, name, blob);
}

// ---------- Write queue (debounced, sequential) ----------

type Job = () => Promise<void>;
let queue: Job[] = [];
let flushing = false;

function schedule(job: Job) {
  queue.push(job);
  if (!flushing) void drain();
}

async function drain() {
  flushing = true;
  while (queue.length) {
    const job = queue.shift()!;
    try { await job(); } catch (e) { console.warn("[fsStorage] write failed", e); }
  }
  flushing = false;
}

/** Mirror a localStorage-style key→json blob to the filesystem (fire-and-forget). */
export function mirrorJson(dirPath: string, name: string, data: unknown) {
  if (!rootHandle) return;
  schedule(() => writeJsonFile(dirPath, name, data));
}

/** Synchronous-style mirror that returns the queued promise (for waiting). */
export function flushPending(): Promise<void> {
  return new Promise((res) => schedule(async () => res()));
}
