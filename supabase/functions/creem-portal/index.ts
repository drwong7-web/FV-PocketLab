import { createClient } from "npm:@supabase/supabase-js@2";
import { json, optionsResponse } from "../_shared/cors.ts";
import { creemFetch } from "../_shared/creem.ts";

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

  const { data: profile, error: profileError } = await userClient
    .from("profiles")
    .select("creem_customer_id")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) return json({ error: profileError.message }, 500);
  const customerId = profile?.creem_customer_id as string | null;
  if (!customerId) {
    return json({ error: "No billing customer yet" }, 404);
  }

  const creemRes = await creemFetch("/v1/customers/billing", {
    method: "POST",
    body: { customer_id: customerId },
  });
  const creemJson = await creemRes.json().catch(() => ({}));
  if (!creemRes.ok) {
    const message =
      (creemJson as { message?: unknown }).message ??
      (creemJson as { error?: string }).error ??
      "Creem portal failed";
    return json({ error: message }, creemRes.status);
  }

  const url = (creemJson as { customer_portal_link?: string }).customer_portal_link;
  if (!url) return json({ error: "Creem did not return a portal URL" }, 502);

  return json({ url });
});
