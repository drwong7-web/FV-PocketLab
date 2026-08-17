import { createClient } from "npm:@supabase/supabase-js@2";
import {
  asCheckoutPlan,
  asRecord,
  asString,
  asUuid,
  creemApiKey,
  customerEmailFrom,
  customerIdFrom,
  metadataOf,
  periodEndFrom,
  planForProduct,
  productIdFrom,
  subscriptionIdFrom,
  userIdFromMetadata,
  verifyCreemSignature,
  type PlanId,
  type PlanStatus,
} from "../_shared/creem.ts";

interface Intent {
  plan: PlanId;
  status: PlanStatus;
  periodEnd: string | null;
  cancelAt: string | null;
  customerId: string | null;
  subscriptionId: string | null;
}

function intentForEvent(
  eventType: string,
  obj: Record<string, unknown>
): Intent | null {
  const productId = productIdFrom(obj);
  const mapped = planForProduct(productId);
  const customerId = customerIdFrom(obj);
  const subscription = asRecord(obj.subscription) ?? (asString(obj.object) === "subscription" ? obj : null);
  const subscriptionId = subscriptionIdFrom(subscription) || subscriptionIdFrom(obj);
  const periodEnd = periodEndFrom(subscription) || periodEndFrom(obj);
  const metaPlan = asCheckoutPlan(asString(metadataOf(obj).plan));
  const plan: PlanId | null = mapped || metaPlan;

  switch (eventType) {
    case "checkout.completed": {
      const billingType =
        asString(asRecord(obj.product)?.billing_type) ||
        asString(asRecord(obj.order)?.type);
      const resolved: PlanId =
        plan || (billingType === "onetime" || billingType === "one-time" ? "lifetime" : "pro_monthly");
      return {
        plan: resolved,
        status: "active",
        periodEnd: resolved === "lifetime" ? null : periodEnd,
        cancelAt: null,
        customerId,
        subscriptionId: resolved === "lifetime" ? null : subscriptionId,
      };
    }
    case "subscription.paid":
    case "subscription.active":
      return {
        plan: plan ?? "pro_monthly",
        status: "active",
        periodEnd,
        cancelAt: null,
        customerId,
        subscriptionId,
      };
    case "subscription.trialing":
      return {
        plan: plan ?? "pro_monthly",
        status: "trialing",
        periodEnd,
        cancelAt: null,
        customerId,
        subscriptionId,
      };
    case "subscription.scheduled_cancel":
      return {
        plan: plan ?? "pro_monthly",
        status: "active",
        periodEnd,
        cancelAt: periodEnd,
        customerId,
        subscriptionId,
      };
    case "subscription.past_due":
    case "subscription.unpaid":
      return {
        plan: plan ?? "pro_monthly",
        status: "past_due",
        periodEnd,
        cancelAt: null,
        customerId,
        subscriptionId,
      };
    case "subscription.paused":
    case "subscription.expired":
      return {
        plan: "free",
        status: "expired",
        periodEnd,
        cancelAt: null,
        customerId,
        subscriptionId: null,
      };
    case "subscription.canceled": {
      const remaining = periodEnd && Date.parse(periodEnd) > Date.now();
      if (remaining) {
        return {
          plan: plan ?? "pro_monthly",
          status: "active",
          periodEnd,
          cancelAt: periodEnd,
          customerId,
          subscriptionId,
        };
      }
      return {
        plan: "free",
        status: "canceled",
        periodEnd,
        cancelAt: null,
        customerId,
        subscriptionId: null,
      };
    }
    case "refund.created":
    case "dispute.created": {
      const refundPlan = plan || planForProduct(productIdFrom(asRecord(obj.order)));
      if (refundPlan === "lifetime") {
        return {
          plan: "free",
          status: "active",
          periodEnd: null,
          cancelAt: null,
          customerId,
          subscriptionId: null,
        };
      }
      return {
        plan: "free",
        status: "canceled",
        periodEnd,
        cancelAt: null,
        customerId,
        subscriptionId: null,
      };
    }
    default:
      return null;
  }
}

function userIdFromObject(obj: Record<string, unknown>): string | null {
  return (
    userIdFromMetadata(metadataOf(obj)) ||
    userIdFromMetadata(metadataOf(asRecord(obj.subscription))) ||
    userIdFromMetadata(metadataOf(asRecord(obj.checkout))) ||
    asUuid(obj.request_id) ||
    asUuid(asRecord(obj.checkout)?.request_id)
  );
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const secret = Deno.env.get("CREEM_WEBHOOK_SECRET") ?? "";
  const raw = await req.text();
  const signature =
    req.headers.get("creem-signature") || req.headers.get("Creem-Signature");

  // Touch the API key so a missing secret still fails closed in test/live.
  try {
    creemApiKey();
  } catch {
    return new Response("Creem is not configured", { status: 500 });
  }

  const ok = await verifyCreemSignature(raw, signature, secret);
  if (!ok) return new Response("Invalid signature", { status: 401 });

  let event: Record<string, unknown>;
  try {
    event = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const eventId = asString(event.id);
  const eventType = asString(event.eventType) || asString(event.event_type);
  const obj = asRecord(event.object);
  if (!eventId || !eventType || !obj) {
    return new Response("Malformed event", { status: 400 });
  }

  const intent = intentForEvent(eventType, obj);
  if (!intent) {
    return new Response(JSON.stringify({ ignored: eventType }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false, autoRefreshToken: false } }
  );

  let userId = userIdFromObject(obj);
  if (!userId && intent.customerId) {
    const { data } = await admin
      .from("profiles")
      .select("id")
      .eq("creem_customer_id", intent.customerId)
      .maybeSingle();
    userId = data?.id ?? null;
  }
  if (!userId) {
    const email = customerEmailFrom(obj);
    if (email) {
      const { data } = await admin
        .from("profiles")
        .select("id")
        .eq("email", email)
        .maybeSingle();
      userId = data?.id ?? null;
    }
  }

  if (!userId) {
    console.error("[creem-webhook] no user for", eventType, eventId);
    // 200 so Creem does not retry forever for unmatched test events.
    return new Response(JSON.stringify({ ignored: "no_user" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { error } = await admin.rpc("apply_creem_event", {
    p_event_id: eventId,
    p_event_type: eventType,
    p_user_id: userId,
    p_plan: intent.plan,
    p_status: intent.status,
    p_period_end: intent.periodEnd,
    p_cancel_at: intent.cancelAt,
    p_customer_id: intent.customerId,
    p_subscription_id: intent.subscriptionId,
    p_payload: event,
    p_allow_lifetime_downgrade:
      (eventType === "refund.created" || eventType === "dispute.created") &&
      intent.plan === "free" &&
      planForProduct(productIdFrom(obj)) === "lifetime",
  });

  if (error) {
    console.error("[creem-webhook]", error.message);
    return new Response(error.message, { status: 500 });
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
