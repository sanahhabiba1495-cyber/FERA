"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BillingCheckout } from "@/components/BillingCheckout";
import { PageShell } from "@/components/PageShell";
import { getSupabaseBrowser } from "@/lib/supabase/client";

export default function BillingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const supabase = getSupabaseBrowser();
        const { data } = await supabase.auth.getSession();
        if (!data.session) {
          router.replace("/login");
          return;
        }

        const token = data.session.access_token;
        const me = await fetch("/api/me", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const payload = await me.json();
        if (!me.ok) {
          throw new Error(payload.error ?? "Could not load account");
        }

        if (payload.user?.subscription_status === "active") {
          router.replace("/plan-pending");
          return;
        }

        setAccessToken(token);
        setEmail(payload.user?.email ?? data.session.user.email ?? "");
        setFullName(payload.user?.full_name ?? "");
        setPhone(payload.user?.phone ?? "");
        setLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not load billing");
        setLoading(false);
      }
    }

    void load();
  }, [router]);

  if (loading) {
    return (
      <PageShell>
        <p className="text-muted">Loading billing…</p>
      </PageShell>
    );
  }

  if (error) {
    return (
      <PageShell>
        <p className="text-terracotta">{error}</p>
        <a href="/login" className="mt-4 inline-block text-terracotta underline">
          Back to login
        </a>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <h1 className="font-display text-4xl">Complete your payment</h1>
      <p className="mt-3 text-muted">
        Your account is ready. Choose a plan to unlock your personalized care plan.
      </p>
      <BillingCheckout
        accessToken={accessToken}
        email={email}
        fullName={fullName}
        phone={phone}
      />
    </PageShell>
  );
}
