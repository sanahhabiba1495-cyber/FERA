"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PageShell } from "@/components/PageShell";
import { BILLING_PLANS, type BillingTier } from "@/lib/plan-config";
import { getSupabaseBrowser } from "@/lib/supabase/client";

type Stage = "account" | "billing";

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

export default function SignupPage() {
  const router = useRouter();
  const [intakeId, setIntakeId] = useState("");
  const [stage, setStage] = useState<Stage>("account");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [accessToken, setAccessToken] = useState("");

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("intake_id") ?? "";
    setIntakeId(id);
  }, []);

  async function onCreateAccount(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      if (!intakeId) {
        throw new Error("Missing intake_id");
      }

      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          full_name: fullName,
          phone,
          intake_id: intakeId,
        }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Could not create account");
      }

      const supabase = getSupabaseBrowser();
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError || !data.session) {
        throw new Error(signInError?.message ?? "Account created, but sign-in failed");
      }

      setAccessToken(data.session.access_token);
      setStage("billing");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create account");
    } finally {
      setSubmitting(false);
    }
  }

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
    <PageShell>
      {stage === "account" ? (
        <>
          <h1 className="font-display text-4xl">Create your account</h1>
          <p className="mt-3 text-muted">
            Then choose a billing cycle to unlock your personalized plan.
          </p>
          <form onSubmit={onCreateAccount} className="mt-8 space-y-4">
            <Field label="Full name" value={fullName} onChange={setFullName} />
            <Field label="Email" type="email" value={email} onChange={setEmail} />
            <Field label="Phone" type="tel" value={phone} onChange={setPhone} />
            <Field
              label="Password"
              type="password"
              value={password}
              onChange={setPassword}
            />
            {error ? <p className="text-sm text-terracotta">{error}</p> : null}
            <button
              type="submit"
              disabled={submitting || !intakeId}
              className="w-full rounded-full bg-terracotta px-5 py-3 text-sm font-medium text-paper disabled:opacity-60"
            >
              {submitting ? "Creating…" : "Continue"}
            </button>
          </form>
        </>
      ) : (
        <>
          <h1 className="font-display text-4xl">Choose your billing cycle</h1>
          <p className="mt-3 text-muted">
            You can start now. Your plan is generated after payment confirms.
          </p>
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
                      ₹{plan.pricePerMonthInr.toLocaleString("en-IN")}/mo
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-muted">{plan.cadenceLabel}</p>
                </button>
              );
            })}
          </div>
          {error ? <p className="mt-4 text-sm text-terracotta">{error}</p> : null}
        </>
      )}
    </PageShell>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm text-muted">{label}</span>
      <input
        required
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-mist bg-paper px-4 py-3 outline-none ring-terracotta/30 focus:ring-2"
      />
    </label>
  );
}
