/**
 * WebAuthn platform authenticator helpers for local password recovery.
 * Uses the device lock (biometrics / PIN / pattern) via the OS.
 * Requires a secure context (HTTPS or localhost).
 */

const RP_NAME = "FV PocketLab";
const TIMEOUT_MS = 60_000;

/** In-memory failed assert counter (per page session). */
let failedAsserts = 0;
const MAX_FAILED_ASSERTS = 8;

/** Exact-length Uint8Array copy — preferred BufferSource across browsers. */
function toUint8Array(input: ArrayBuffer | ArrayBufferView | Uint8Array): Uint8Array {
  const view = ArrayBuffer.isView(input)
    ? new Uint8Array(input.buffer, input.byteOffset, input.byteLength)
    : new Uint8Array(input);
  const copy = new Uint8Array(view.byteLength);
  copy.set(view);
  return copy;
}

function randomChallenge(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(32));
}

export function isSecureAuthContext(): boolean {
  return typeof window !== "undefined" && window.isSecureContext === true;
}

/** True for private IPv4 hosts used for LAN testing. */
export function isPrivateLanHostname(hostname = typeof window !== "undefined" ? window.location.hostname : ""): boolean {
  if (!hostname) return false;
  if (hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]") return false;
  const m = hostname.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
  if (!m) return false;
  const a = Number(m[1]);
  const b = Number(m[2]);
  if (a === 10) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  return false;
}

/**
 * WebAuthn RP ID must be a domain (or omitted). Never pass a raw IP —
 * browsers reject `rp.id = "192.168.x.x"` / `127.0.0.1`.
 */
function relyingPartyId(): string | undefined {
  if (typeof window === "undefined") return undefined;
  const host = window.location.hostname;
  if (!host || host === "localhost") return "localhost";
  if (/^\d+\.\d+\.\d+\.\d+$/.test(host) || host.startsWith("[")) return undefined;
  return host;
}

/**
 * Why device unlock cannot run in this browsing context, or null if OK to try.
 */
export function getDeviceUnlockBlockReason(): "INSECURE_CONTEXT" | "LAN_HTTP" | "UNSUPPORTED" | null {
  if (typeof window === "undefined") return "UNSUPPORTED";
  if (isPrivateLanHostname() && window.location.protocol === "http:") return "LAN_HTTP";
  if (!isSecureAuthContext()) return "INSECURE_CONTEXT";
  if (typeof PublicKeyCredential === "undefined") return "UNSUPPORTED";
  if (!navigator.credentials?.create || !navigator.credentials?.get) return "UNSUPPORTED";
  return null;
}

/** API + secure context only — do not gate on isUVPAA (often false-negative). */
export function isPlatformAuthAvailable(): boolean {
  return getDeviceUnlockBlockReason() === null;
}

export async function isPlatformAuthenticatorLikely(): Promise<boolean> {
  if (!isPlatformAuthAvailable()) return false;
  try {
    if (typeof PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === "function") {
      return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    }
  } catch { /* */ }
  return true;
}

export function bufferToBase64Url(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function base64UrlToUint8Array(value: string): Uint8Array {
  const pad = "=".repeat((4 - (value.length % 4)) % 4);
  const b64 = (value + pad).replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/** @deprecated Prefer base64UrlToUint8Array — kept for callers expecting ArrayBuffer. */
export function base64UrlToBuffer(value: string): ArrayBuffer {
  return toUint8Array(base64UrlToUint8Array(value)).buffer;
}

export type WebAuthnErrorCode =
  | "UNSUPPORTED"
  | "INSECURE_CONTEXT"
  | "LAN_HTTP"
  | "CANCELLED"
  | "RATE_LIMITED"
  | "FAILED"
  | "DUPLICATE"
  | "NO_CREDENTIAL";

export class WebAuthnError extends Error {
  code: WebAuthnErrorCode;
  constructor(code: WebAuthnErrorCode, message?: string) {
    super(message || code);
    this.name = "WebAuthnError";
    this.code = code;
  }
}

function mapDomError(err: unknown): WebAuthnError {
  if (err instanceof WebAuthnError) return err;
  const name = err && typeof err === "object" && "name" in err ? String((err as { name: string }).name) : "";
  const message = err instanceof Error ? err.message : String(err);
  if (name === "NotAllowedError" || name === "AbortError") {
    return new WebAuthnError("CANCELLED");
  }
  if (name === "InvalidStateError") {
    return new WebAuthnError("DUPLICATE", message || "Authenticator already has a credential for this account.");
  }
  if (name === "NotSupportedError" || name === "SecurityError") {
    return new WebAuthnError("UNSUPPORTED", message);
  }
  return new WebAuthnError("FAILED", message || name || "Unlock failed");
}

function assertCanUseWebAuthn() {
  const reason = getDeviceUnlockBlockReason();
  if (reason === "LAN_HTTP") throw new WebAuthnError("LAN_HTTP");
  if (reason === "INSECURE_CONTEXT") throw new WebAuthnError("INSECURE_CONTEXT");
  if (reason === "UNSUPPORTED") throw new WebAuthnError("UNSUPPORTED");
}

/**
 * Register a platform credential for password-reset unlock.
 * Returns base64url credential id to store in device-local creds map.
 */
export async function registerPlatformCredential(opts: {
  userId: string;
  userName: string;
  displayName: string;
  /** Existing credential id to exclude (re-enroll). */
  excludeCredentialId?: string;
}): Promise<string> {
  assertCanUseWebAuthn();

  const userIdBytes = toUint8Array(new TextEncoder().encode(opts.userId));
  const rpId = relyingPartyId();

  const publicKey: PublicKeyCredentialCreationOptions = {
    challenge: randomChallenge(),
    rp: rpId ? { name: RP_NAME, id: rpId } : { name: RP_NAME },
    user: {
      id: userIdBytes,
      name: opts.userName,
      displayName: opts.displayName,
    },
    pubKeyCredParams: [
      { type: "public-key", alg: -7 },
      { type: "public-key", alg: -257 },
    ],
    authenticatorSelection: {
      authenticatorAttachment: "platform",
      userVerification: "required",
      residentKey: "preferred",
      requireResidentKey: false,
    },
    timeout: TIMEOUT_MS,
    attestation: "none",
  };

  if (opts.excludeCredentialId) {
    publicKey.excludeCredentials = [
      { type: "public-key", id: base64UrlToUint8Array(opts.excludeCredentialId) },
    ];
  }

  try {
    const cred = (await navigator.credentials.create({ publicKey })) as PublicKeyCredential | null;
    if (!cred) throw new WebAuthnError("FAILED", "No credential returned");
    failedAsserts = 0;
    return bufferToBase64Url(cred.rawId);
  } catch (err) {
    throw mapDomError(err);
  }
}

/** Assert an existing platform credential (device unlock). */
export async function assertPlatformCredential(credentialId: string): Promise<void> {
  assertCanUseWebAuthn();
  if (!credentialId) throw new WebAuthnError("NO_CREDENTIAL");
  if (failedAsserts >= MAX_FAILED_ASSERTS) throw new WebAuthnError("RATE_LIMITED");

  const rpId = relyingPartyId();
  const publicKey: PublicKeyCredentialRequestOptions = {
    challenge: randomChallenge(),
    allowCredentials: [
      {
        type: "public-key",
        id: base64UrlToUint8Array(credentialId),
      },
    ],
    userVerification: "required",
    timeout: TIMEOUT_MS,
  };
  if (rpId) publicKey.rpId = rpId;

  try {
    const assertion = await navigator.credentials.get({ publicKey });
    if (!assertion) {
      failedAsserts += 1;
      throw new WebAuthnError("FAILED", "No assertion returned");
    }
    failedAsserts = 0;
  } catch (err) {
    if (err instanceof WebAuthnError) {
      if (err.code !== "CANCELLED") failedAsserts += 1;
      throw err;
    }
    const mapped = mapDomError(err);
    if (mapped.code !== "CANCELLED") failedAsserts += 1;
    throw mapped;
  }
}

/**
 * Prove the user can unlock this device (any OS platform authenticator).
 * Always runs create with UV required so Forgot password needs no prior enroll.
 * If a credential already exists for this user, falls back to assert when we have
 * a cached id; otherwise retries create with a fresh ≤64-byte user handle.
 * Returns the credential id to cache device-locally (silent).
 */
export async function proveDeviceOwnership(opts: {
  userId: string;
  userName: string;
  displayName: string;
  existingCredentialId?: string;
}): Promise<string> {
  assertCanUseWebAuthn();
  try {
    return await registerPlatformCredential({
      userId: opts.userId,
      userName: opts.userName,
      displayName: opts.displayName,
    });
  } catch (err) {
    const mapped = err instanceof WebAuthnError ? err : mapDomError(err);
    if (mapped.code === "DUPLICATE" && opts.existingCredentialId) {
      await assertPlatformCredential(opts.existingCredentialId);
      return opts.existingCredentialId;
    }
    if (mapped.code === "DUPLICATE") {
      // Fresh handle only — must stay ≤ 64 bytes (WebAuthn user.id limit).
      // 32 random bytes → 43-char base64url when UTF-8 encoded.
      const ephemeralId = bufferToBase64Url(crypto.getRandomValues(new Uint8Array(32)));
      return await registerPlatformCredential({
        userId: ephemeralId,
        userName: opts.userName,
        displayName: opts.displayName,
      });
    }
    throw mapped;
  }
}
