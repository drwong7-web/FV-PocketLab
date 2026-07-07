/**
 * KV store persisté sur IndexedDB (Dexie) avec cache mémoire synchrone.
 *
 * Objectif : remplacer `localStorage` (quota 5–10 Mo, éviction en navigation
 * privée) par IndexedDB (centaines de Mo, transactionnel) pour toutes les
 * données applicatives (`slfv:*` + flags), tout en conservant une API
 * synchrone pour ne pas casser les dizaines d'appelants existants.
 *
 * Fonctionnement :
 *   1. `bootstrapKvStore()` hydrate la Map depuis IndexedDB (blocking à la
 *      première frame, appelé dans `main.tsx` avant `createRoot`).
 *   2. Si IndexedDB est vide et que `localStorage` contient encore des clés
 *      `slfv:*`, migration one-shot puis suppression des clés migrées.
 *   3. Lectures : synchrones sur la Map.
 *   4. Écritures : Map + push dans une queue série qui persiste vers Dexie.
 *
 * En cas d'échec d'IndexedDB (mode privé Firefox strict, quota, etc.), on
 * retombe sur `localStorage` de façon transparente pour éviter toute perte.
 */

import Dexie, { type Table } from "dexie";
import { useEffect, useState } from "react";

interface KvRow { key: string; value: unknown }

class SlfvDb extends Dexie {
  kv!: Table<KvRow, string>;
  constructor() {
    super("slfv");
    this.version(1).stores({ kv: "key" });
  }
}

const DATA_PREFIXES = ["slfv:", "fv:"];
const cache = new Map<string, unknown>();
let db: SlfvDb | null = null;
let ready = false;
let bootPromise: Promise<void> | null = null;
let writeChain: Promise<unknown> = Promise.resolve();
const readyListeners = new Set<() => void>();
function notifyReady() { for (const fn of readyListeners) { try { fn(); } catch { /* */ } } }

export function isKvReady(): boolean { return ready; }
export function onKvReady(fn: () => void): () => void {
  if (ready) { fn(); return () => {}; }
  readyListeners.add(fn);
  return () => readyListeners.delete(fn);
}
export function useKvReady(): boolean {
  const [r, setR] = useState<boolean>(() => ready);
  useEffect(() => {
    if (ready) { setR(true); return; }
    const off = onKvReady(() => setR(true));
    return off;
  }, []);
  return r;
}

function isDataKey(k: string): boolean {
  return DATA_PREFIXES.some((p) => k.startsWith(p));
}

async function tryOpenDexie(): Promise<SlfvDb | null> {
  try {
    const d = new SlfvDb();
    await d.open();
    return d;
  } catch (err) {
    console.warn("[kvStore] IndexedDB unavailable, falling back to localStorage:", err);
    return null;
  }
}

function migrateLocalStorageIntoCache(): { migrated: string[] } {
  const migrated: string[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k || !isDataKey(k)) continue;
      if (cache.has(k)) continue;
      const raw = localStorage.getItem(k);
      if (raw == null) continue;
      try { cache.set(k, JSON.parse(raw)); }
      catch { cache.set(k, raw); }
      migrated.push(k);
    }
  } catch { /* */ }
  return { migrated };
}

export async function bootstrapKvStore(): Promise<void> {
  if (ready) return;
  if (bootPromise) return bootPromise;
  bootPromise = (async () => {
    db = await tryOpenDexie();
    // Load existing rows from Dexie into cache.
    if (db) {
      try {
        const rows = await db.kv.toArray();
        for (const r of rows) cache.set(r.key, r.value);
      } catch (err) {
        console.warn("[kvStore] read failed:", err);
      }
    }
    // Migrate localStorage → IndexedDB the first time.
    const { migrated } = migrateLocalStorageIntoCache();
    if (migrated.length && db) {
      try {
        await db.kv.bulkPut(migrated.map((key) => ({ key, value: cache.get(key) })));
        // Keep a JSON backup of the legacy keys before removing them.
        const backup: Record<string, unknown> = {};
        for (const k of migrated) backup[k] = cache.get(k);
        try { localStorage.setItem("slfv:__backup-v0", JSON.stringify({ at: Date.now(), data: backup })); } catch { /* */ }
        for (const k of migrated) { try { localStorage.removeItem(k); } catch { /* */ } }
        console.info(`[kvStore] migrated ${migrated.length} keys from localStorage → IndexedDB`);
      } catch (err) {
        console.warn("[kvStore] migration write failed, keeping localStorage:", err);
      }
    }
    ready = true;
  })();
  return bootPromise;
}

export function kvGet<T = unknown>(key: string): T | undefined {
  return cache.get(key) as T | undefined;
}

export function kvHas(key: string): boolean {
  return cache.has(key);
}

export function kvKeys(): string[] {
  return Array.from(cache.keys());
}

function persistWrite(op: () => Promise<unknown>) {
  writeChain = writeChain.then(op, op).catch((err) => {
    console.warn("[kvStore] write failed:", err);
  });
}

export function kvSet<T>(key: string, value: T): void {
  cache.set(key, value);
  if (db) {
    persistWrite(() => db!.kv.put({ key, value }));
  } else {
    // Fallback to localStorage if Dexie is unavailable.
    try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* */ }
  }
}

export function kvRemove(key: string): void {
  cache.delete(key);
  if (db) {
    persistWrite(() => db!.kv.delete(key));
  } else {
    try { localStorage.removeItem(key); } catch { /* */ }
  }
}

/** Attend que tous les writes en attente soient persistés (utile aux tests / avant reload critique). */
export async function kvFlush(): Promise<void> {
  await writeChain;
}

/** Efface tout et repart de zéro (utilisé par signOut). */
export async function kvClearPrefix(prefix: string): Promise<void> {
  const toDelete = kvKeys().filter((k) => k.startsWith(prefix));
  for (const k of toDelete) cache.delete(k);
  if (db) {
    persistWrite(() => db!.kv.bulkDelete(toDelete));
  } else {
    for (const k of toDelete) { try { localStorage.removeItem(k); } catch { /* */ } }
  }
}
