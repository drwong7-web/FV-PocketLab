import { downloadBlob } from "./docxExport";

const DB_NAME = "fv-exports";
const HANDLE_STORE = "handles";
const HANDLE_KEY = "exportDir";
const LABEL_KEY = "sprintlab_export_dir_label";

function openHandleDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 2);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains("files")) db.createObjectStore("files", { keyPath: "name" });
      if (!db.objectStoreNames.contains(HANDLE_STORE)) db.createObjectStore(HANDLE_STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function getStoredHandle(): Promise<FileSystemDirectoryHandle | null> {
  try {
    const db = await openHandleDB();
    return await new Promise((res) => {
      const tx = db.transaction(HANDLE_STORE, "readonly");
      const r = tx.objectStore(HANDLE_STORE).get(HANDLE_KEY);
      r.onsuccess = () => res((r.result as FileSystemDirectoryHandle) ?? null);
      r.onerror = () => res(null);
    });
  } catch {
    return null;
  }
}

async function setStoredHandle(handle: FileSystemDirectoryHandle | null) {
  try {
    const db = await openHandleDB();
    await new Promise<void>((res, rej) => {
      const tx = db.transaction(HANDLE_STORE, "readwrite");
      if (handle) tx.objectStore(HANDLE_STORE).put(handle, HANDLE_KEY);
      else tx.objectStore(HANDLE_STORE).delete(HANDLE_KEY);
      tx.oncomplete = () => res();
      tx.onerror = () => rej(tx.error);
    });
  } catch { /* */ }
}

export function isFileSystemAccessSupported(): boolean {
  return typeof window !== "undefined" && typeof (window as any).showDirectoryPicker === "function";
}

function isCapacitor(): boolean {
  return typeof window !== "undefined" && !!(window as any).Capacitor?.isNativePlatform?.();
}

export function isDirectoryPickerSupported(): boolean {
  return isFileSystemAccessSupported() || isCapacitor();
}

export function isInIframe(): boolean {
  try {
    return typeof window !== "undefined" && window.self !== window.top;
  } catch {
    return true;
  }
}

export type PickResult =
  | { ok: true; name: string }
  | { ok: false; reason: "unsupported" | "iframe-blocked" | "cancelled" | "error"; message?: string };

export function getExportDirectoryLabel(): string | null {
  try {
    return localStorage.getItem(LABEL_KEY);
  } catch {
    return null;
  }
}

function setExportDirectoryLabel(label: string | null) {
  try {
    if (label) localStorage.setItem(LABEL_KEY, label);
    else localStorage.removeItem(LABEL_KEY);
  } catch { /* */ }
}

export async function pickExportDirectory(): Promise<PickResult> {
  // Capacitor native: no real picker; use Documents/FV-PocketLab as a virtual choice.
  if (isCapacitor()) {
    const label = "Documents/FV-PocketLab";
    setExportDirectoryLabel(label);
    return { ok: true, name: label };
  }
  if (!isFileSystemAccessSupported()) {
    return { ok: false, reason: "unsupported" };
  }
  try {
    const handle: FileSystemDirectoryHandle = await (window as any).showDirectoryPicker({
      id: "sprintlab-exports",
      mode: "readwrite",
    });
    await setStoredHandle(handle);
    setExportDirectoryLabel(handle.name);
    return { ok: true, name: handle.name };
  } catch (e: any) {
    const msg = String(e?.message || e?.name || "");
    if (e?.name === "AbortError") return { ok: false, reason: "cancelled" };
    if (
      e?.name === "SecurityError" ||
      /not allowed|sandbox|permissions policy|cross-origin/i.test(msg) ||
      isInIframe()
    ) {
      return { ok: false, reason: "iframe-blocked", message: msg };
    }
    return { ok: false, reason: "error", message: msg };
  }
}

export async function clearExportDirectory() {
  await setStoredHandle(null);
  setExportDirectoryLabel(null);
}

async function ensurePermission(handle: FileSystemDirectoryHandle): Promise<boolean> {
  try {
    const opts = { mode: "readwrite" as const };
    // @ts-ignore
    const q = await handle.queryPermission?.(opts);
    if (q === "granted") return true;
    // @ts-ignore
    const r = await handle.requestPermission?.(opts);
    return r === "granted";
  } catch {
    return false;
  }
}

async function writeViaCapacitor(blob: Blob, filename: string): Promise<boolean> {
  if (!isCapacitor()) return false;
  try {
    // Hide specifier behind a runtime value so Vite skips static resolution in dev.
    const name = ["@capacitor", "filesystem"].join("/");
    // @ts-ignore
    const mod: any = await import(/* @vite-ignore */ name).catch(() => null);
    if (!mod?.Filesystem) return false;
    const { Filesystem, Directory } = mod;
    const buf = await blob.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
    await Filesystem.writeFile({
      path: `FV-PocketLab/${filename}`,
      data: base64,
      directory: Directory.Documents,
      recursive: true,
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Writes the blob to the user-selected directory if possible, otherwise falls
 * back to a classic browser download. Returns the human-readable destination.
 */
export async function saveBlobToTarget(blob: Blob, filename: string): Promise<string> {
  if (isCapacitor() && getExportDirectoryLabel()) {
    const ok = await writeViaCapacitor(blob, filename);
    if (ok) return getExportDirectoryLabel() || "Documents/FV-PocketLab";
  }
  if (isFileSystemAccessSupported()) {
    const handle = await getStoredHandle();
    if (handle && (await ensurePermission(handle))) {
      try {
        const fileHandle = await handle.getFileHandle(filename, { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(blob);
        await writable.close();
        return handle.name;
      } catch { /* fall through */ }
    }
  }
  downloadBlob(blob, filename);
  return "Downloads";
}
