import { jsonError, jsonOk } from "@/lib/http";
import { BILLING_PLANS, type BillingTier } from "@/lib/plan-config";
import { getUserFromBearer } from "@/lib/auth-request";
import { getRazorpay, getRazorpayPlanId } from "@/lib/razorpay";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

const TIERS = new Set<BillingTier>([
  "testing",
  "monthly",
  "quarterly",
  "yearly",
]);

export async function POST(request: Request) {
  const user = await getUserFromBearer(request);
  if (!user) {
    return jsonError("Unauthorized", 401);
  }

  let body: { billing_cycle?: string };

  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON body");
  }

  const billingCycle = body.billing_cycle as BillingTier | undefined;
  if (!billingCycle || !TIERS.has(billingCycle)) {
    return jsonError("Choose a valid billing plan");
  }

  try {
    const supabase = getSupabaseAdmin();
    const plan = BILLING_PLANS[billingCycle];

    const { data: profile } = await supabase
      .from("users")
      .select("subscription_status, full_name, email, phone")
      .eq("id", user.id)
      .maybeSingle();

    if (profile?.subscription_status === "active") {
      return jsonError("You already have an active subscription", 409);
    }

    const { data: openSub } = await supabase
      .from("subscriptions")
      .select("razorpay_subscription_id, plan_tier")
      .eq("user_id", user.id)
      .eq("status", "created")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (openSub?.razorpay_subscription_id) {
      return jsonOk({
        subscription_id: openSub.razorpay_subscription_id,
        key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ?? process.env.RAZORPAY_KEY_ID,
        billing_cycle: openSub.plan_tier,
        amount_inr:
          BILLING_PLANS[(openSub.plan_tier as BillingTier) ?? billingCycle]
            ?.billedAmountInr ?? plan.billedAmountInr,
        reused: true,
      });
    }

    const razorpay = getRazorpay();
    const planId = getRazorpayPlanId(billingCycle);

    const subscription = await razorpay.subscriptions.create({
      plan_id: planId,
      total_count: plan.totalCount,
      customer_notify: 1,
      notes: {
        user_id: user.id,
        billing_cycle: billingCycle,
      },
    });

    const { error: insertError } = await supabase.from("subscriptions").insert({
      user_id: user.id,
      razorpay_subscription_id: subscription.id,
      plan_tier: billingCycle,
      price_paid: plan.billedAmountInr,
      status: "created",
      current_period_end: null,
    });

    if (insertError) {
      // Another in-flight request may have won the unique open-created index.
      const { data: raced } = await supabase
        .from("subscriptions")
        .select("razorpay_subscription_id, plan_tier")
        .eq("user_id", user.id)
        .eq("status", "created")
        .maybeSingle();
      if (raced?.razorpay_subscription_id) {
        return jsonOk({
          subscription_id: raced.razorpay_subscription_id,
          key_id:
            process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ?? process.env.RAZORPAY_KEY_ID,
          billing_cycle: raced.plan_tier,
          amount_inr: plan.billedAmountInr,
          reused: true,
        });
      }
      return jsonError(insertError.message, 500);
    }

    const { error: userError } = await supabase
      .from("users")
      .update({
        subscription_status: "pending_payment",
        billing_cycle: billingCycle,
      })
      .eq("id", user.id);

    if (userError) {
      return jsonError(userError.message, 500);
    }

    return jsonOk({
      subscription_id: subscription.id,
      key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ?? process.env.RAZORPAY_KEY_ID,
      billing_cycle: billingCycle,
      amount_inr: plan.billedAmountInr,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not start checkout";
    return jsonError(message, 500);
  }
}
