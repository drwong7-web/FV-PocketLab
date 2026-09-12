/**
 * Repository local — API synchrone stable, persistance IndexedDB via Dexie
 * (voir `src/lib/db/kvStore.ts`). Les lectures viennent d'un cache mémoire
 * hydraté au boot ; les écritures sont miroir cache + write-through Dexie.
 * Compatible avec les appelants historiques (aucun changement de signature).
 *
 * Les comptes sont gérés par Supabase (`src/lib/auth.tsx`) : ici on ne garde
 * qu'un miroir local de l'utilisateur connecté, sans mot de passe.
 */

import type { Organization, Player, Team, TestSession, User } from "./types";
import { kvGet, kvSet, kvRemove } from "./db/kvStore";
import { FREE_LIMITS, FreeLimitError, isInCurrentCalendarMonth, isPaidUser } from "./plan";

const KEYS = {
  users: "slfv:users",
  orgs: "slfv:orgs",
  teams: "slfv:teams",
  players: "slfv:players",
  tests: "slfv:tests",
  session: "slfv:session",
} as const;

function read<T>(k: string, fallback: T): T {
  const v = kvGet<T>(k);
  return v === undefined || v === null ? fallback : v;
}
function write<T>(k: string, v: T) {
  kvSet(k, v);
}

/** Ephemeral login session — cleared when the PWA/tab process ends. */
const SESSION_KEY = KEYS.session;
let legacySessionCleared = false;

function purgeLegacyPersistentSession() {
  if (legacySessionCleared) return;
  legacySessionCleared = true;
  try {
    kvRemove(SESSION_KEY);
  } catch { /* */ }
}

function readSession(): { userId?: string } {
  purgeLegacyPersistentSession();
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as { userId?: string };
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeSession(session: { userId: string }) {
  purgeLegacyPersistentSession();
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch { /* */ }
}

function clearSession() {
  purgeLegacyPersistentSession();
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch { /* */ }
}

export const uid = () =>
  (crypto.randomUUID?.() ?? Math.random().toString(36).slice(2) + Date.now().toString(36));

// ----- Users / Orgs -----
export function listUsers(): User[] { return read(KEYS.users, [] as User[]); }
export function listOrgs(): Organization[] { return read(KEYS.orgs, [] as Organization[]); }

/**
 * Mirror a Supabase identity into the local repository and open the session.
 *
 * Accounts live in Supabase; teams, athletes and tests stay on the device and
 * are keyed by `organizationId`. So the first time an account signs in on a
 * device that already holds data, we attach it to the organization that is
 * already there instead of creating an empty one — otherwise the existing
 * teams and tests would be orphaned.
 */
export function ensureLocalUserForRemote(remote: {
  id: string;
  email: string;
  name: string;
}): User {
  const users = listUsers();
  const idx = users.findIndex((u) => u.id === remote.id);

  if (idx >= 0) {
    const current = users[idx];
    const patched: User = {
      ...current,
      email: remote.email || current.email,
      name: remote.name || current.name,
    };
    if (patched.email !== current.email || patched.name !== current.name) {
      users[idx] = patched;
      write(KEYS.users, users);
    }
    writeSession({ userId: patched.id });
    return patched;
  }

  const orgs = listOrgs();
  let organizationId = users[0]?.organizationId ?? orgs[0]?.id;
  if (!organizationId) {
    const org: Organization = { id: uid(), name: remote.name || remote.email };
    orgs.push(org);
    write(KEYS.orgs, orgs);
    organizationId = org.id;
  }

  const user: User = {
    id: remote.id,
    email: remote.email,
    name: remote.name || remote.email,
    organizationId,
  };
  users.push(user);
  write(KEYS.users, users);
  writeSession({ userId: user.id });
  return user;
}

export function currentUser(): User | null {
  const s = readSession();
  if (!s.userId) return null;
  return listUsers().find((u) => u.id === s.userId) ?? null;
}

function isPaidSession(): boolean {
  return isPaidUser(currentUser()?.id);
}

export function signOut() {
  clearSession();
}

export function getOrganization(id: string) {
  return listOrgs().find((o) => o.id === id) ?? null;
}

// ----- Teams -----
export function listTeams(orgId: string): Team[] {
  return read<Team[]>(KEYS.teams, []).filter((t) => t.organizationId === orgId);
}
export function getTeam(id: string) {
  return read<Team[]>(KEYS.teams, []).find((t) => t.id === id) ?? null;
}
export function createTeam(orgId: string, name: string, sport?: string, logoDataUrl?: string): Team {
  if (!isPaidSession() && listTeams(orgId).length >= FREE_LIMITS.maxTeams) {
    throw new FreeLimitError("team");
  }
  const teams = read<Team[]>(KEYS.teams, []);
  const team: Team = { id: uid(), name, sport, organizationId: orgId, createdAt: Date.now() };
  if (logoDataUrl) team.logoDataUrl = logoDataUrl;
  teams.push(team);
  write(KEYS.teams, teams);
  return team;
}
export function updateTeam(id: string, patch: Partial<Pick<Team, "name" | "sport" | "logoDataUrl">>): Team | null {
  const teams = read<Team[]>(KEYS.teams, []);
  const i = teams.findIndex((t) => t.id === id);
  if (i < 0) return null;
  const next: Team = { ...teams[i], ...patch };
  if ("logoDataUrl" in patch && !patch.logoDataUrl) delete next.logoDataUrl;
  teams[i] = next;
  write(KEYS.teams, teams);
  return next;
}
export function deleteTeam(id: string) {
  write(KEYS.teams, read<Team[]>(KEYS.teams, []).filter((t) => t.id !== id));
  const players = read<Player[]>(KEYS.players, []).filter((p) => p.teamId !== id);
  write(KEYS.players, players);
}

// ----- Players -----
export function listPlayers(teamId?: string, orgId?: string): Player[] {
  const all = read<Player[]>(KEYS.players, []);
  return all.filter((p) =>
    (teamId ? p.teamId === teamId : true) && (orgId ? p.organizationId === orgId : true)
  );
}
export function getPlayer(id: string) {
  return read<Player[]>(KEYS.players, []).find((p) => p.id === id) ?? null;
}
export function createPlayer(p: Omit<Player, "id" | "createdAt">): Player {
  if (!isPaidSession() && listPlayers(p.teamId).length >= FREE_LIMITS.maxAthletesPerTeam) {
    throw new FreeLimitError("athlete");
  }
  const players = read<Player[]>(KEYS.players, []);
  const player: Player = { ...p, id: uid(), createdAt: Date.now() };
  players.push(player);
  write(KEYS.players, players);
  return player;
}
export function deletePlayer(id: string) {
  write(KEYS.players, read<Player[]>(KEYS.players, []).filter((p) => p.id !== id));
  write(KEYS.tests, read<TestSession[]>(KEYS.tests, []).filter((t) => t.playerId !== id));
}
export function updatePlayer(
  id: string,
  patch: Partial<Pick<Player, "firstName" | "lastName" | "birthDate" | "mass" | "height" | "position" | "photoDataUrl">>
): Player | null {
  const players = read<Player[]>(KEYS.players, []);
  const i = players.findIndex((p) => p.id === id);
  if (i < 0) return null;
  const next: Player = { ...players[i], ...patch };
  if ("photoDataUrl" in patch && !patch.photoDataUrl) delete next.photoDataUrl;
  players[i] = next;
  write(KEYS.players, players);
  return next;
}

// ----- Tests -----
export function listTests(playerId?: string, orgId?: string): TestSession[] {
  const all = read<TestSession[]>(KEYS.tests, []);
  return all
    .filter((t) =>
      (playerId ? t.playerId === playerId : true) && (orgId ? t.organizationId === orgId : true)
    )
    .sort((a, b) => b.createdAt - a.createdAt);
}
export function getTest(id: string) {
  return read<TestSession[]>(KEYS.tests, []).find((t) => t.id === id) ?? null;
}
export function saveTest(t: Omit<TestSession, "id" | "createdAt">): TestSession {
  if (!isPaidSession()) {
    const n = listTests(t.playerId).filter((x) => isInCurrentCalendarMonth(x.createdAt)).length;
    if (n >= FREE_LIMITS.maxTestsPerAthletePerMonth) throw new FreeLimitError("test");
  }
  const tests = read<TestSession[]>(KEYS.tests, []);
  const test: TestSession = { ...t, id: uid(), createdAt: Date.now() };
  tests.push(test);
  write(KEYS.tests, tests);
  return test;
}
export function deleteTest(id: string) {
  write(KEYS.tests, read<TestSession[]>(KEYS.tests, []).filter((t) => t.id !== id));
}
