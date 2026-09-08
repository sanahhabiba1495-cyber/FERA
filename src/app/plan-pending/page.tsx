"use client";

import { PageShell } from "@/components/PageShell";

export default function PlanPendingPage() {
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
