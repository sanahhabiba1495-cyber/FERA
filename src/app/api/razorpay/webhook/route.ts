import { jsonError, jsonOk } from "@/lib/http";
import { BILLING_PLANS, type BillingTier } from "@/lib/plan-config";
import { generateAndSavePlan } from "@/lib/plan";
import { verifyRazorpayWebhookSignature } from "@/lib/razorpay";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

const SUCCESS_EVENTS = new Set([
  "subscription.activated",
  "subscription.charged",
  "invoice.paid",
]);

type RazorpayWebhookPayload = {
  event?: string;
  payload?: {
    subscription?: {
      entity?: {
        id?: string;
        notes?: Record<string, string>;
        current_end?: number;
        plan_id?: string;
      };
    };
    payment?: {
      entity?: {
        notes?: Record<string, string>;
      };
    };
  };
};

function resolveTier(notes?: Record<string, string>): BillingTier {
  const value = notes?.billing_cycle;
  if (value === "monthly" || value === "quarterly" || value === "yearly") {
    return value;
  }
  return "monthly";
}

export async function POST(request: Request) {
  const signature = request.headers.get("x-razorpay-signature");
  const body = await request.text();

  if (!signature) {
    return jsonError("Missing webhook signature", 400);
  }

  try {
    if (!verifyRazorpayWebhookSignature(body, signature)) {
      return jsonError("Invalid webhook signature", 400);
    }
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Webhook verification failed",
      500,
    );
  }

  let event: RazorpayWebhookPayload;
  try {
    event = JSON.parse(body) as RazorpayWebhookPayload;
  } catch {
    return jsonError("Invalid webhook payload");
  }

  if (!event.event || !SUCCESS_EVENTS.has(event.event)) {
    return jsonOk({ received: true, ignored: true });
  }

  const subscription = event.payload?.subscription?.entity;
  const userId =
    subscription?.notes?.user_id ?? event.payload?.payment?.entity?.notes?.user_id;
  const razorpaySubscriptionId = subscription?.id;

  if (!userId || !razorpaySubscriptionId) {
    return jsonError("Webhook missing user or subscription id", 400);
  }

  const billingCycle = resolveTier(subscription?.notes);
  const periodEnd = subscription?.current_end
    ? new Date(subscription.current_end * 1000).toISOString()
    : null;

  try {
    const supabase = getSupabaseAdmin();

    const { data: existing } = await supabase
      .from("subscriptions")
      .select("id")
      .eq("razorpay_subscription_id", razorpaySubscriptionId)
      .maybeSingle();

    if (!existing) {
      const { error: insertError } = await supabase.from("subscriptions").insert({
        user_id: userId,
        razorpay_subscription_id: razorpaySubscriptionId,
        plan_tier: billingCycle,
        price_paid: BILLING_PLANS[billingCycle].billedAmountInr,
        status: "active",
        current_period_end: periodEnd,
      });

      if (insertError) {
        return jsonError(insertError.message, 500);
      }
    }

    const { error: userError } = await supabase
      .from("users")
      .update({
        subscription_status: "active",
        billing_cycle: billingCycle,
      })
      .eq("id", userId);

    if (userError) {
      return jsonError(userError.message, 500);
    }

    await generateAndSavePlan(userId);

    return jsonOk({ received: true });
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Webhook handler failed",
      500,
    );
  }
}
