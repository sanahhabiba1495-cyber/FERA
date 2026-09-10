"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { PageShell } from "@/components/PageShell";
import { getSupabaseBrowser } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const supabase = getSupabaseBrowser();
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError || !data.session) {
        throw new Error(signInError?.message ?? "Could not log in");
      }

      const me = await fetch("/api/me", {
        headers: { Authorization: `Bearer ${data.session.access_token}` },
      });
      const payload = await me.json();
      if (!me.ok) {
        throw new Error(payload.error ?? "Could not load account");
      }

      const status = payload.user?.subscription_status;
      if (status === "active") {
        router.push("/plan-pending");
        return;
      }
      if (status === "pending_payment" || status === "none") {
        router.push("/billing");
        return;
      }
      router.push("/billing");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not log in");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <PageShell>
      <h1 className="font-display text-4xl">Log in</h1>
      <p className="mt-3 text-muted">
        Continue to payment if your account is waiting, or view your plan status.
      </p>
      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        <label className="block">
          <span className="mb-1.5 block text-sm text-muted">Email</span>
          <input
            required
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="w-full rounded-xl border border-mist bg-paper px-4 py-3 outline-none ring-terracotta/30 focus:ring-2"
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm text-muted">Password</span>
          <input
            required
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="w-full rounded-xl border border-mist bg-paper px-4 py-3 outline-none ring-terracotta/30 focus:ring-2"
          />
        </label>
        {error ? <p className="text-sm text-terracotta">{error}</p> : null}
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-full bg-terracotta px-5 py-3 text-sm font-medium text-paper disabled:opacity-60"
        >
          {submitting ? "Signing in…" : "Log in"}
        </button>
      </form>
    </PageShell>
  );
}
