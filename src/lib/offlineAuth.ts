/**
 * Offline sign-in.
 *
 * Sign-up always needs the network (Supabase owns the account). On a successful
 * online password sign-in we store a PBKDF2 verifier for that email so the same
 * person can sign in again with no connection. Only the derived key is kept —
 * never the password.
 */

import { kvGet, kvSet } from "@/lib/db/kvStore";

const KEY = "slfv:offline-auth";
const ITERATIONS = 210_000;

interface OfflineCredential {
  userId: string;
  email: string;
  name: string;
  salt: string;
  hash: string;
  iterations: number;
  updatedAt: number;
}

export interface OfflineIdentity {
  userId: string;
  email: string;
  name: string;
}

const toHex = (buf: ArrayBuffer) =>
  Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

const fromHex = (hex: string) =>
  new Uint8Array((hex.match(/.{1,2}/g) ?? []).map((b) => parseInt(b, 16)));

function readAll(): Record<string, OfflineCredential> {
  return kvGet<Record<string, OfflineCredential>>(KEY) ?? {};
}

function normalize(email: string) {
  return email.trim().toLowerCase();
}

async function derive(password: string, salt: Uint8Array, iterations: number) {
  const material = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: salt as unknown as BufferSource, iterations, hash: "SHA-256" },
    material,
    256
  );
  return toHex(bits);
}

/** Length-independent comparison so a wrong password leaks no timing signal. */
function timingSafeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function rememberOfflineCredential(opts: {
  userId: string;
  email: string;
  name: string;
  password: string;
}): Promise<void> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await derive(opts.password, salt, ITERATIONS);
  const all = readAll();
  all[normalize(opts.email)] = {
    userId: opts.userId,
    email: opts.email.trim(),
    name: opts.name,
    salt: toHex(salt.buffer),
    hash,
    iterations: ITERATIONS,
    updatedAt: Date.now(),
  };
  kvSet(KEY, all);
}

export async function verifyOfflineCredential(
  email: string,
  password: string
): Promise<OfflineIdentity | null> {
  const entry = readAll()[normalize(email)];
  if (!entry) return null;
  const hash = await derive(password, fromHex(entry.salt), entry.iterations);
  if (!timingSafeEqual(hash, entry.hash)) return null;
  return { userId: entry.userId, email: entry.email, name: entry.name };
}

export function hasOfflineCredential(email: string): boolean {
  return Boolean(readAll()[normalize(email)]);
}

export function listOfflineIdentities(): OfflineIdentity[] {
  return Object.values(readAll()).map(({ userId, email, name }) => ({ userId, email, name }));
}

/** Called after a password change so the offline verifier stays usable. */
export async function updateOfflinePassword(email: string, password: string): Promise<void> {
  const entry = readAll()[normalize(email)];
  if (!entry) return;
  await rememberOfflineCredential({
    userId: entry.userId,
    email: entry.email,
    name: entry.name,
    password,
  });
}

export function forgetOfflineCredential(email: string): void {
  const all = readAll();
  delete all[normalize(email)];
  kvSet(KEY, all);
}
