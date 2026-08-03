/**
 * Repository local — API synchrone stable, persistance IndexedDB via Dexie
 * (voir `src/lib/db/kvStore.ts`). Les lectures viennent d'un cache mémoire
 * hydraté au boot ; les écritures sont miroir cache + write-through Dexie.
 * Compatible avec les appelants historiques (aucun changement de signature).
 */

import type { Organization, Player, Team, TestSession, User } from "./types";
import { kvGet, kvSet, kvRemove } from "./db/kvStore";

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

// Light prototype-only password "hash"
export function hashPassword(p: string) {
  let h = 0;
  for (let i = 0; i < p.length; i++) h = (h << 5) - h + p.charCodeAt(i);
  return `h_${(h >>> 0).toString(16)}_${p.length}`;
}

// ----- Users / Orgs -----
export function listUsers(): User[] { return read(KEYS.users, [] as User[]); }
export function listOrgs(): Organization[] { return read(KEYS.orgs, [] as Organization[]); }

export function createUserAndOrg(email: string, password: string, name: string, orgName: string): User {
  const users = listUsers();
  if (users.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
    throw new Error("An account with this email already exists.");
  }
  const orgs = listOrgs();
  const org: Organization = { id: uid(), name: orgName };
  orgs.push(org);
  write(KEYS.orgs, orgs);
  const user: User = {
    id: uid(),
    email,
    name,
    passwordHash: hashPassword(password),
    organizationId: org.id,
  };
  users.push(user);
  write(KEYS.users, users);
  return user;
}

export function authenticate(email: string, password: string): User {
  const user = listUsers().find((u) => u.email.toLowerCase() === email.toLowerCase());
  if (!user || user.passwordHash !== hashPassword(password)) {
    throw new Error("Invalid email or password.");
  }
  writeSession({ userId: user.id });
  return user;
}

export function currentUser(): User | null {
  const s = readSession();
  if (!s.userId) return null;
  return listUsers().find((u) => u.id === s.userId) ?? null;
}
export function signOut() {
  clearSession();
}

export function findUserByName(name: string): User | null {
  const trimmed = name.trim();
  if (!trimmed) return null;
  const email = `${trimmed.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "user"}@local`;
  const users = listUsers();
  return (
    users.find((u) => u.email.toLowerCase() === email) ??
    users.find((u) => u.name.trim().toLowerCase() === trimmed.toLowerCase()) ??
    null
  );
}

export function setUserWebAuthnCredential(userId: string, credentialId: string | undefined): User {
  const users = listUsers();
  const idx = users.findIndex((u) => u.id === userId);
  if (idx < 0) throw new Error("USER_NOT_FOUND");
  const updated: User = { ...users[idx] };
  if (credentialId) updated.webauthnCredentialId = credentialId;
  else delete updated.webauthnCredentialId;
  users[idx] = updated;
  write(KEYS.users, users);
  return updated;
}

export function resetPasswordForUser(userId: string, newPassword: string): User {
  if (newPassword.length < 6) throw new Error("PASSWORD_TOO_SHORT");
  const users = listUsers();
  const idx = users.findIndex((u) => u.id === userId);
  if (idx < 0) throw new Error("USER_NOT_FOUND");
  const updated: User = { ...users[idx], passwordHash: hashPassword(newPassword) };
  users[idx] = updated;
  write(KEYS.users, users);
  writeSession({ userId: updated.id });
  return updated;
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
export function createTeam(orgId: string, name: string, sport?: string): Team {
  const teams = read<Team[]>(KEYS.teams, []);
  const team: Team = { id: uid(), name, sport, organizationId: orgId, createdAt: Date.now() };
  teams.push(team);
  write(KEYS.teams, teams);
  return team;
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
  const tests = read<TestSession[]>(KEYS.tests, []);
  const test: TestSession = { ...t, id: uid(), createdAt: Date.now() };
  tests.push(test);
  write(KEYS.tests, tests);
  return test;
}
export function deleteTest(id: string) {
  write(KEYS.tests, read<TestSession[]>(KEYS.tests, []).filter((t) => t.id !== id));
}
