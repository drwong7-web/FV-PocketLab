/**
 * Local storage repository for SprintLab FV Pro (prototype persistence).
 * Wraps a simple namespaced key/value store, returning typed entities.
 * Easy to swap for Lovable Cloud later — keep the same function shapes.
 */

import type { Organization, Player, Team, TestSession, User } from "./types";

const KEYS = {
  users: "slfv:users",
  orgs: "slfv:orgs",
  teams: "slfv:teams",
  players: "slfv:players",
  tests: "slfv:tests",
  session: "slfv:session",
} as const;

function read<T>(k: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(k);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function write<T>(k: string, v: T) {
  localStorage.setItem(k, JSON.stringify(v));
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
export function listUsers(): User[] { return read(KEYS.users, []); }
export function listOrgs(): Organization[] { return read(KEYS.orgs, []); }

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
  write(KEYS.session, { userId: user.id });
  return user;
}

export function currentUser(): User | null {
  const s = read<{ userId?: string }>(KEYS.session, {});
  if (!s.userId) return null;
  return listUsers().find((u) => u.id === s.userId) ?? null;
}
export function signOut() { localStorage.removeItem(KEYS.session); }

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
  // cascade
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
