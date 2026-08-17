import { createClient } from "npm:@supabase/supabase-js@2";
import { json, optionsResponse } from "../_shared/cors.ts";
import {
  asCheckoutPlan,
  creemFetch,
  productIdFor,
  successUrlFromOrigin,
} from "../_shared/creem.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return optionsResponse();
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ error: "Missing authorization" }, 401);

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const {
    data: { user },
    error: userError,
  } = await userClient.auth.getUser();
  if (userError || !user) return json({ error: "Not signed in" }, 401);

  let body: { product?: string; origin?: string } = {};
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const product = asCheckoutPlan(body.product ?? null);
  if (!product) {
    return json({ error: "product must be pro_monthly, pro_yearly, or lifetime" }, 400);
  }

  if (product === "lifetime") {
    const { data: profile } = await userClient
      .from("profiles")
      .select("plan, plan_status")
      .eq("id", user.id)
      .maybeSingle();
    if (profile?.plan === "lifetime" && profile.plan_status === "active") {
      return json({ error: "Already on lifetime" }, 409);
    }
  }

  let successUrl: string;
  try {
    successUrl = successUrlFromOrigin(body.origin || req.headers.get("origin") || "");
  } catch (err) {
    return json({ error: (err as Error).message }, 400);
  }

  let productId: string;
  try {
    productId = productIdFor(product);
  } catch (err) {
    return json({ error: (err as Error).message }, 500);
  }

  let creemRes: Response;
  try {
    creemRes = await creemFetch("/v1/checkouts", {
      method: "POST",
      body: {
        product_id: productId,
        request_id: user.id,
        success_url: successUrl,
        customer: user.email ? { email: user.email } : undefined,
        metadata: {
          userId: user.id,
          plan: product,
        },
      },
    });
  } catch (err) {
    return json({ error: (err as Error).message }, 500);
  }

  const creemJson = await creemRes.json().catch(() => ({}));
  if (!creemRes.ok) {
    const rawMessage =
      (creemJson as { message?: unknown }).message ??
      (creemJson as { error?: string }).error ??
      "Creem checkout failed";
    const message = Array.isArray(rawMessage) ? rawMessage.map(String).join("; ") : String(rawMessage);
    return json({ error: message }, creemRes.status);
  }

  const url =
    (creemJson as { checkout_url?: string; checkoutUrl?: string }).checkout_url ||
    (creemJson as { checkoutUrl?: string }).checkoutUrl;
  if (!url) return json({ error: "Creem did not return a checkout URL" }, 502);

  return json({ url });
});
