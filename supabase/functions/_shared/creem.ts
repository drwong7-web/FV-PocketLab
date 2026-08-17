export type PlanId = "free" | "pro_monthly" | "pro_yearly" | "lifetime";
export type CheckoutPlan = "pro_monthly" | "pro_yearly" | "lifetime";
export type PlanStatus =
  | "active"
  | "trialing"
  | "past_due"
  | "canceled"
  | "expired";

export function creemApiKey(): string {
  const key = Deno.env.get("CREEM_API_KEY") ?? "";
  if (!key) throw new Error("CREEM_API_KEY is not set");
  return key;
}

export function creemApiBase(): string {
  const key = Deno.env.get("CREEM_API_KEY") ?? "";
  const explicit = Deno.env.get("CREEM_TEST_MODE");
  const test =
    explicit != null
      ? explicit === "true" || explicit === "1"
      : key.startsWith("creem_test_");
  return test ? "https://test-api.creem.io" : "https://api.creem.io";
}

export function productIdFor(plan: CheckoutPlan): string {
  const envKey =
    plan === "pro_monthly"
      ? "CREEM_PRODUCT_PRO_MONTHLY"
      : plan === "pro_yearly"
        ? "CREEM_PRODUCT_PRO_YEARLY"
        : "CREEM_PRODUCT_LIFETIME";
  const id = Deno.env.get(envKey);
  if (!id) throw new Error(`Missing product id for ${plan}`);
  return id;
}

export function planForProduct(productId: string | null): PlanId | null {
  if (!productId) return null;
  if (productId === Deno.env.get("CREEM_PRODUCT_PRO_MONTHLY")) return "pro_monthly";
  if (productId === Deno.env.get("CREEM_PRODUCT_PRO_YEARLY")) return "pro_yearly";
  if (productId === Deno.env.get("CREEM_PRODUCT_LIFETIME")) return "lifetime";
  return null;
}

export function asCheckoutPlan(value: string | null | undefined): CheckoutPlan | null {
  if (value === "pro_monthly" || value === "pro_yearly" || value === "lifetime") return value;
  return null;
}

export async function creemFetch(
  path: string,
  init: { method?: string; body?: unknown } = {}
): Promise<Response> {
  return await fetch(`${creemApiBase()}${path}`, {
    method: init.method ?? "GET",
    headers: {
      "x-api-key": creemApiKey(),
      "Content-Type": "application/json",
    },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });
}

export async function verifyCreemSignature(
  payload: string,
  signature: string | null,
  secret: string
): Promise<boolean> {
  if (!signature || !secret) return false;
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const mac = await crypto.subtle.sign("HMAC", key, enc.encode(payload));
  const computed = [...new Uint8Array(mac)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  if (computed.length !== signature.length) return false;
  let mismatch = 0;
  for (let i = 0; i < computed.length; i++) {
    mismatch |= computed.charCodeAt(i) ^ signature.charCodeAt(i);
  }
  return mismatch === 0;
}

export function asRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

export function asString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

export function idOf(value: unknown): string | null {
  if (typeof value === "string" && value.length > 0) return value;
  const rec = asRecord(value);
  return rec ? asString(rec.id) : null;
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function asUuid(value: unknown): string | null {
  const s = asString(value);
  return s && UUID_RE.test(s) ? s : null;
}

export function metadataOf(obj: Record<string, unknown> | null): Record<string, unknown> {
  return asRecord(obj?.metadata) ?? {};
}

export function userIdFromMetadata(meta: Record<string, unknown>): string | null {
  return (
    asUuid(meta.userId) ||
    asUuid(meta.user_id) ||
    asUuid(meta.referenceId) ||
    asUuid(meta.reference_id)
  );
}

export function productIdFrom(obj: Record<string, unknown> | null): string | null {
  if (!obj) return null;
  return (
    idOf(obj.product) ||
    idOf(asRecord(obj.order)?.product) ||
    idOf(asRecord(obj.subscription)?.product)
  );
}

export function customerIdFrom(obj: Record<string, unknown> | null): string | null {
  if (!obj) return null;
  return (
    idOf(obj.customer) ||
    asString(obj.customer_id) ||
    idOf(asRecord(obj.order)?.customer)
  );
}

export function customerEmailFrom(obj: Record<string, unknown> | null): string | null {
  const customer = asRecord(obj?.customer);
  const email = asString(customer?.email);
  return email ? email.toLowerCase() : null;
}

export function subscriptionIdFrom(obj: Record<string, unknown> | null): string | null {
  if (!obj) return null;
  return idOf(obj.subscription) || asString(obj.id);
}

export function periodEndFrom(obj: Record<string, unknown> | null): string | null {
  if (!obj) return null;
  return (
    asString(obj.current_period_end_date) ||
    asString(obj.current_period_end) ||
    null
  );
}

export function successUrlFromOrigin(origin: string): string {
  if (!origin) throw new Error("success URL origin is required");
  const url = new URL(origin);
  const host = url.hostname;
  const local = host === "localhost" || host === "127.0.0.1";
  if (url.protocol !== "https:" && !local) {
    throw new Error("success URL origin must be https");
  }
  return `${url.origin}/app?billing=success`;
}
