import { jsonError, jsonOk } from "@/lib/http";
import { BILLING_PLANS, type BillingTier } from "@/lib/plan-config";
import { getRazorpay, getRazorpayPlanId } from "@/lib/razorpay";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

const TIERS = new Set<BillingTier>(["monthly", "quarterly", "yearly"]);

async function getUserFromAuthHeader(request: Request) {
  const header = request.headers.get("authorization");
  const token = header?.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return null;

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user;
}

export async function POST(request: Request) {
  const user = await getUserFromAuthHeader(request);
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
    return jsonError("Choose monthly, quarterly, or yearly");
  }

  try {
    const supabase = getSupabaseAdmin();
    const plan = BILLING_PLANS[billingCycle];
    const razorpay = getRazorpay();
    const planId = getRazorpayPlanId(billingCycle);

    const subscription = await razorpay.subscriptions.create({
      plan_id: planId,
      total_count: billingCycle === "yearly" ? 10 : billingCycle === "quarterly" ? 40 : 120,
      customer_notify: 1,
      notes: {
        user_id: user.id,
        billing_cycle: billingCycle,
      },
    });

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
    return jsonError(
      error instanceof Error ? error.message : "Could not start checkout",
      500,
    );
  }
}
