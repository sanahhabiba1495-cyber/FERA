"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PageShell } from "@/components/PageShell";
import { getSupabaseBrowser } from "@/lib/supabase/client";

export default function PlanPendingPage() {
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "ready" | "denied">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function verify() {
      try {
        const supabase = getSupabaseBrowser();
        const { data } = await supabase.auth.getSession();
        if (!data.session) {
          setStatus("denied");
          setMessage("Please log in to view your plan status.");
          return;
        }

        const me = await fetch("/api/me", {
          headers: { Authorization: `Bearer ${data.session.access_token}` },
        });
        const payload = await me.json();
        if (!me.ok) {
          throw new Error(payload.error ?? "Could not verify account");
        }

        const subscriptionStatus = payload.user?.subscription_status;
        if (subscriptionStatus === "active" || payload.plan) {
          setStatus("ready");
          return;
        }

        if (subscriptionStatus === "pending_payment") {
          router.replace("/billing");
          return;
        }

        setStatus("denied");
        setMessage("No active plan yet. Complete payment to continue.");
      } catch (err) {
        setStatus("denied");
        setMessage(err instanceof Error ? err.message : "Could not verify plan status");
      }
    }

    void verify();
  }, [router]);

  if (status === "loading") {
    return (
      <PageShell>
        <p className="text-muted">Confirming your plan…</p>
      </PageShell>
    );
  }

  if (status === "denied") {
    return (
      <PageShell>
        <h1 className="font-display text-3xl">Plan not available yet</h1>
        <p className="mt-3 text-muted">{message}</p>
        <div className="mt-6 flex gap-4 text-sm">
          <a href="/login" className="text-terracotta underline">
            Log in
          </a>
          <a href="/billing" className="text-terracotta underline">
            Go to billing
          </a>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <p className="mb-3 text-sm uppercase tracking-[0.18em] text-sage">
        You are in
      </p>
      <h1 className="font-display text-4xl leading-tight">
        Your plan is ready and pending review.
      </h1>
      <p className="mt-4 text-lg leading-8 text-muted">
        You&apos;ll be contacted to schedule your Day-1 walkthrough call.
      </p>
    </PageShell>
  );
}
