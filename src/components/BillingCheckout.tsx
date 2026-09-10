"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BILLING_PLANS, type BillingTier } from "@/lib/plan-config";

function loadRazorpay() {
  return new Promise<void>((resolve, reject) => {
    if (window.Razorpay) {
      resolve();
      return;
    }

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Could not load Razorpay"));
    document.body.appendChild(script);
  });
}

export function BillingCheckout({
  accessToken,
  email,
  fullName,
  phone,
}: {
  accessToken: string;
  email: string;
  fullName?: string;
  phone?: string;
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function startCheckout(tier: BillingTier) {
    setSubmitting(true);
    setError("");

    try {
      const response = await fetch("/api/razorpay/create-subscription", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ billing_cycle: tier }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Could not start checkout");
      }

      await loadRazorpay();

      if (!window.Razorpay) {
        throw new Error("Could not load Razorpay");
      }

      const checkout = new window.Razorpay({
        key: payload.key_id,
        subscription_id: payload.subscription_id,
        name: "Fera",
        description: `${BILLING_PLANS[tier].label} plan`,
        prefill: { email, name: fullName, contact: phone },
        handler() {
          router.push("/plan-pending");
        },
      });

      checkout.open();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start checkout");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <div className="mt-8 space-y-3">
        {(Object.keys(BILLING_PLANS) as BillingTier[]).map((tier) => {
          const plan = BILLING_PLANS[tier];
          return (
            <button
              key={tier}
              type="button"
              disabled={submitting}
              onClick={() => startCheckout(tier)}
              className="w-full rounded-2xl border border-mist bg-paper p-5 text-left hover:border-terracotta disabled:opacity-60"
            >
              <div className="flex items-baseline justify-between">
                <span className="font-display text-2xl">{plan.label}</span>
                <span className="text-terracotta">
                  {tier === "testing"
                    ? `₹${plan.billedAmountInr.toLocaleString("en-IN")}`
                    : `₹${plan.pricePerMonthInr.toLocaleString("en-IN")}/mo`}
                </span>
              </div>
              <p className="mt-1 text-sm text-muted">{plan.cadenceLabel}</p>
            </button>
          );
        })}
      </div>
      {error ? <p className="mt-4 text-sm text-terracotta">{error}</p> : null}
    </>
  );
}
