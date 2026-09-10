"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BillingCheckout } from "@/components/BillingCheckout";
import { PageShell } from "@/components/PageShell";
import { getSupabaseBrowser } from "@/lib/supabase/client";

type Stage = "account" | "billing";

export default function SignupPage() {
  const router = useRouter();
  const [intakeId, setIntakeId] = useState("");
  const [accessTokenParam, setAccessTokenParam] = useState("");
  const [stage, setStage] = useState<Stage>("account");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [sessionToken, setSessionToken] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("intake_id") ?? "";
    const token =
      params.get("token") ??
      sessionStorage.getItem(`fera_intake_token_${id}`) ??
      "";
    setIntakeId(id);
    setAccessTokenParam(token);
  }, []);

  async function onCreateAccount(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      if (!intakeId) {
        throw new Error("Missing intake_id");
      }
      if (!accessTokenParam) {
        throw new Error("Missing access token. Open signup from your snapshot link.");
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
          access_token: accessTokenParam,
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

      setSessionToken(data.session.access_token);
      setStage("billing");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create account");
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
          <p className="mt-6 text-sm text-muted">
            Already have an account?{" "}
            <button
              type="button"
              className="text-terracotta underline"
              onClick={() => router.push("/login")}
            >
              Log in
            </button>
          </p>
        </>
      ) : (
        <>
          <h1 className="font-display text-4xl">Choose your billing cycle</h1>
          <p className="mt-3 text-muted">
            You can start now. Your plan is generated after payment confirms.
          </p>
          <BillingCheckout
            accessToken={sessionToken}
            email={email}
            fullName={fullName}
            phone={phone}
          />
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
