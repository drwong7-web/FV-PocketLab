import { supabase } from "@/lib/supabase/client";

export type CheckoutProduct = "pro_monthly" | "pro_yearly" | "lifetime";

function extractErrorMessage(data: unknown): string | null {
  if (!data || typeof data !== "object") return null;
  const err = (data as { error?: unknown }).error;
  if (typeof err === "string" && err.length > 0) return err;
  if (Array.isArray(err) && err.length > 0) return err.map(String).join("; ");
  return null;
}

async function messageFromInvoke(
  data: unknown,
  error: { message: string; context?: Response }
): Promise<string> {
  const fromData = extractErrorMessage(data);
  if (fromData) return fromData;

  const ctx = error.context;
  if (ctx) {
    try {
      const body = await (ctx.clone?.() ?? ctx).json();
      const fromBody = extractErrorMessage(body);
      if (fromBody) return fromBody;
    } catch {
      /* body already consumed or not JSON */
    }
  }

  return error.message;
}

export async function startCheckout(product: CheckoutProduct): Promise<void> {
  const { data, error } = await supabase.functions.invoke<{ url?: string; error?: string }>(
    "creem-checkout",
    { body: { product, origin: window.location.origin } }
  );
  if (error) throw new Error(await messageFromInvoke(data, error));
  if (!data?.url) throw new Error(extractErrorMessage(data) ?? "No checkout URL");
  window.location.assign(data.url);
}

export async function openBillingPortal(): Promise<void> {
  const { data, error } = await supabase.functions.invoke<{ url?: string; error?: string }>(
    "creem-portal",
    { body: {} }
  );
  if (error) throw new Error(await messageFromInvoke(data, error));
  if (!data?.url) throw new Error(extractErrorMessage(data) ?? "No portal URL");
  window.location.assign(data.url);
}
