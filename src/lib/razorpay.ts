import Razorpay from "razorpay";
import crypto from "crypto";
import { BILLING_PLANS, type BillingTier } from "@/lib/plan-config";

export function getRazorpay() {
  const key_id = process.env.RAZORPAY_KEY_ID;
  const key_secret = process.env.RAZORPAY_KEY_SECRET;

  if (!key_id || !key_secret) {
    throw new Error("Missing RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET");
  }

  return new Razorpay({ key_id, key_secret });
}

export function getRazorpayPlanId(tier: BillingTier) {
  const envKey = BILLING_PLANS[tier].envPlanIdKey;
  const planId = process.env[envKey];
  if (!planId) {
    throw new Error(`Missing ${envKey}`);
  }
  return planId;
}

export function verifyRazorpayWebhookSignature(body: string, signature: string) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) {
    throw new Error("Missing RAZORPAY_WEBHOOK_SECRET");
  }

  const expected = crypto.createHmac("sha256", secret).update(body).digest("hex");

  const expectedBuf = Buffer.from(expected);
  const signatureBuf = Buffer.from(signature);

  if (expectedBuf.length !== signatureBuf.length) {
    return false;
  }

  return crypto.timingSafeEqual(expectedBuf, signatureBuf);
}
