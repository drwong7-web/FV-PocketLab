import type { JumpResults, SprintResults } from "./fvCalculations";
import { currentUser } from "./storage";

const BASE_KEY = "fv:local-tests:v1";
const LEGACY_KEY = "fv:local-tests:v1";

export interface LocalTest {
  id: string;
  type: "jump" | "sprint";
  test_date: string;
  athlete_id: string;
  athlete_snapshot: { first_name: string; last_name: string; sport: string | null; body_mass: number | null };
  raw_data: Record<string, unknown>;
  results: JumpResults | SprintResults;
  saved?: boolean;
}

function currentKey(): string | null {
  const u = currentUser();
  if (!u) return null;
  return `${BASE_KEY}:${u.id}`;
}

function readRaw(key: string): LocalTest[] {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as LocalTest[]) : [];
  } catch { return []; }
}

function writeRaw(key: string, items: LocalTest[]) {
  try { localStorage.setItem(key, JSON.stringify(items)); } catch { /* */ }
}

/** One-shot migration: if the current profile has no bucket yet but a legacy
 * global bucket exists, attribute those tests to the current profile. */
function migrateLegacyIfNeeded(key: string) {
  try {
    if (localStorage.getItem(key)) return;
    const legacy = localStorage.getItem(LEGACY_KEY);
    if (!legacy || legacy === "[]") return;
    // If the legacy key IS the current key (same string), nothing to do.
    if (LEGACY_KEY === key) return;
    localStorage.setItem(key, legacy);
    localStorage.removeItem(LEGACY_KEY);
  } catch { /* */ }
}

function read(): LocalTest[] {
  const key = currentKey();
  if (!key) return [];
  migrateLegacyIfNeeded(key);
  return readRaw(key);
}

function write(items: LocalTest[]) {
  const key = currentKey();
  if (!key) return;
  writeRaw(key, items);
}

export function saveLocalTest(t: Omit<LocalTest, "id"> & { id?: string }): LocalTest {
  const items = read();
  const id = t.id ?? `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const full: LocalTest = { ...t, id } as LocalTest;
  items.unshift(full);
  write(items);
  return full;
}

export function getAllLocalTests(): LocalTest[] { return read(); }
export function getLocalTests(): LocalTest[] { return read().filter((t) => t.saved); }
export function getLocalTestsForAthlete(athleteId: string): LocalTest[] {
  return read().filter((t) => t.saved && t.athlete_id === athleteId);
}
export function getLocalTest(id: string): LocalTest | null {
  return read().find((t) => t.id === id) ?? null;
}
export function markLocalTestSaved(id: string): boolean {
  const items = read();
  const idx = items.findIndex((t) => t.id === id);
  if (idx === -1) return false;
  if (items[idx].saved) return true;
  items[idx] = { ...items[idx], saved: true };
  write(items);
  return true;
}
export function deleteLocalTest(id: string) {
  write(read().filter((t) => t.id !== id));
}

const DRAFT_KEY = "fv:test-draft";
export interface TestDraft {
  type: "jump" | "sprint";
  athleteId: string;
  rawData: Record<string, unknown>;
  savedAt: number;
}
export function setTestDraft(d: TestDraft) {
  try { sessionStorage.setItem(DRAFT_KEY, JSON.stringify(d)); } catch { /* */ }
}
export function consumeTestDraft(type: "jump" | "sprint", athleteId: string): TestDraft | null {
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const d = JSON.parse(raw) as TestDraft;
    if (d.type !== type || d.athleteId !== athleteId) return null;
    sessionStorage.removeItem(DRAFT_KEY);
    return d;
  } catch { return null; }
}

const CALIB_KEY = "fv:calib-pxpercm";
export function getSessionCalibration(): number {
  try { return parseFloat(sessionStorage.getItem(CALIB_KEY) ?? "0") || 0; } catch { return 0; }
}
export function setSessionCalibration(px: number) {
  try { sessionStorage.setItem(CALIB_KEY, String(px)); } catch { /* */ }
}
