/**
 * Authentification device-native : PIN (PBKDF2 + AES-GCM) avec déverrouillage
 * biométrique optionnel via WebAuthn (Face ID / Touch ID / Windows Hello).
 *
 * - PIN obligatoire : sert de master pour dériver la clé AES qui chiffre
 *   la clé API IA et tout secret futur.
 * - Passkey optionnel : raccourci UX. La vérification utilisateur (biométrie)
 *   débloque l'accès au PIN chiffré localement, qui dérive la master key.
 * - Auto-lock après inactivité (5 / 15 / 60 min, configurable).
 */

const SALT_KEY = "fv:auth:salt";
const VERIFIER_KEY = "fv:auth:verifier";
const PASSKEY_CRED_KEY = "fv:auth:passkey-cred";
const PASSKEY_WRAP_KEY = "fv:auth:passkey-wrap";
const PASSKEY_PIN_BLOB = "fv:auth:passkey-blob";
const AUTOLOCK_KEY = "fv:auth:autolock-min";
const VERIFIER_PLAIN = "FV-PRO-OK";

export function b64(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
}
/** Crypto APIs expect a BufferSource — TS strict mode rejects Uint8Array<ArrayBufferLike>. */
const bs = (u: Uint8Array): BufferSource => u as unknown as BufferSource;
export function unb64(s: string): Uint8Array {
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function deriveMaster(pin: string, salt: Uint8Array): Promise<CryptoKey> {
  const baseKey = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(pin),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: bs(salt), iterations: 250_000, hash: "SHA-256" },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

export async function aesEncrypt(key: CryptoKey, plain: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: bs(iv) },
    key,
    new TextEncoder().encode(plain),
  );
  return `${b64(iv)}:${b64(ct)}`;
}
export async function aesDecrypt(key: CryptoKey, payload: string): Promise<string> {
  const [ivb, ctb] = payload.split(":");
  const pt = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: bs(unb64(ivb)) },
    key,
    bs(unb64(ctb)),
  );
  return new TextDecoder().decode(pt);
}

// ---- State (in-memory only) ----
let _masterKey: CryptoKey | null = null;
export function getMasterKey() { return _masterKey; }
export function clearMasterKey() { _masterKey = null; }
export function isUnlocked() { return _masterKey !== null; }

// ---- Enrollment status ----
export function isEnrolled(): boolean {
  return !!localStorage.getItem(VERIFIER_KEY);
}
export function hasPasskey(): boolean {
  return !!localStorage.getItem(PASSKEY_CRED_KEY);
}
export async function isPasskeySupported(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  if (typeof PublicKeyCredential === "undefined") return false;
  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch { return false; }
}

// ---- PIN flow ----
export async function enrollPin(pin: string): Promise<void> {
  if (!/^\d{4,8}$/.test(pin)) throw new Error("PIN : 4 à 8 chiffres.");
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await deriveMaster(pin, salt);
  const verifier = await aesEncrypt(key, VERIFIER_PLAIN);
  localStorage.setItem(SALT_KEY, b64(salt));
  localStorage.setItem(VERIFIER_KEY, verifier);
  _masterKey = key;
}

export async function changePin(oldPin: string, newPin: string): Promise<void> {
  await unlockWithPin(oldPin);
  // Retire passkey car le blob serait obsolète
  removePasskey();
  await enrollPin(newPin);
}

export async function unlockWithPin(pin: string): Promise<void> {
  const saltB = localStorage.getItem(SALT_KEY);
  const verifier = localStorage.getItem(VERIFIER_KEY);
  if (!saltB || !verifier) throw new Error("Aucun PIN configuré.");
  const key = await deriveMaster(pin, unb64(saltB));
  try {
    const plain = await aesDecrypt(key, verifier);
    if (plain !== VERIFIER_PLAIN) throw new Error("PIN incorrect.");
    _masterKey = key;
  } catch {
    throw new Error("PIN incorrect.");
  }
}

// ---- Passkey flow ----
const RP_NAME = "SprintLab FV Pro";
function rpId() { return window.location.hostname; }

export async function enrollPasskey(currentPin: string): Promise<void> {
  if (!(await isPasskeySupported())) throw new Error("Biométrie indisponible sur cet appareil.");
  await unlockWithPin(currentPin); // valide le PIN
  const userId = crypto.getRandomValues(new Uint8Array(16));
  const challenge = crypto.getRandomValues(new Uint8Array(32));
  const cred = (await navigator.credentials.create({
    publicKey: {
      rp: { name: RP_NAME, id: rpId() },
      user: { id: userId, name: "fv-pro-local", displayName: "FV Pro" },
      challenge,
      pubKeyCredParams: [
        { type: "public-key", alg: -7 },
        { type: "public-key", alg: -257 },
      ],
      authenticatorSelection: {
        authenticatorAttachment: "platform",
        userVerification: "required",
        residentKey: "preferred",
      },
      timeout: 60_000,
    },
  })) as PublicKeyCredential | null;
  if (!cred) throw new Error("Enregistrement biométrique annulé.");

  const wrapKey = await crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"],
  );
  const wrapKeyRaw = await crypto.subtle.exportKey("raw", wrapKey);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv }, wrapKey, new TextEncoder().encode(currentPin),
  );
  localStorage.setItem(PASSKEY_CRED_KEY, b64(cred.rawId));
  localStorage.setItem(PASSKEY_WRAP_KEY, b64(wrapKeyRaw));
  localStorage.setItem(PASSKEY_PIN_BLOB, `${b64(iv)}:${b64(ct)}`);
}

export function removePasskey(): void {
  localStorage.removeItem(PASSKEY_CRED_KEY);
  localStorage.removeItem(PASSKEY_WRAP_KEY);
  localStorage.removeItem(PASSKEY_PIN_BLOB);
}

export async function unlockWithPasskey(): Promise<void> {
  const credIdB = localStorage.getItem(PASSKEY_CRED_KEY);
  const wrapKeyB = localStorage.getItem(PASSKEY_WRAP_KEY);
  const blob = localStorage.getItem(PASSKEY_PIN_BLOB);
  if (!credIdB || !wrapKeyB || !blob) throw new Error("Aucun passkey enrôlé.");
  const challenge = crypto.getRandomValues(new Uint8Array(32));
  const assertion = (await navigator.credentials.get({
    publicKey: {
      challenge,
      rpId: rpId(),
      allowCredentials: [{ type: "public-key", id: unb64(credIdB) }],
      userVerification: "required",
      timeout: 60_000,
    },
  })) as PublicKeyCredential | null;
  if (!assertion) throw new Error("Vérification biométrique annulée.");
  const wrapKey = await crypto.subtle.importKey(
    "raw", unb64(wrapKeyB), "AES-GCM", false, ["decrypt"],
  );
  const [ivb, ctb] = blob.split(":");
  const pinBuf = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: unb64(ivb) }, wrapKey, unb64(ctb),
  );
  const pin = new TextDecoder().decode(pinBuf);
  await unlockWithPin(pin);
}

// ---- Auto-lock ----
export function getAutoLockMinutes(): number {
  const v = parseInt(localStorage.getItem(AUTOLOCK_KEY) || "15", 10);
  return Number.isFinite(v) && v > 0 ? v : 15;
}
export function setAutoLockMinutes(m: number) {
  localStorage.setItem(AUTOLOCK_KEY, String(Math.max(1, Math.min(720, m))));
}

// ---- Reset ----
export function resetAuth() {
  for (const k of [SALT_KEY, VERIFIER_KEY, PASSKEY_CRED_KEY, PASSKEY_WRAP_KEY, PASSKEY_PIN_BLOB]) {
    localStorage.removeItem(k);
  }
  _masterKey = null;
}
