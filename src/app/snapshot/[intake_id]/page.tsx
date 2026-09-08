"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { PageShell } from "@/components/PageShell";
import type { PainPoint } from "@/lib/types";

export default function SnapshotPage() {
  const params = useParams<{ intake_id: string }>();
  const intakeId = params.intake_id;
  const [painPoints, setPainPoints] = useState<PainPoint[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!intakeId) return;

    fetch(`/api/snapshot/${intakeId}`)
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload.error ?? "Could not load snapshot");
        }
        setPainPoints(payload.snapshot.pain_points);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Could not load snapshot");
      });
  }, [intakeId]);

  return (
    <PageShell>
      <p className="mb-3 text-sm uppercase tracking-[0.18em] text-sage">
        Your snapshot
      </p>
      <h1 className="font-display text-4xl leading-tight">
        Areas that may need attention
      </h1>
      <p className="mt-3 text-muted">
        This is a starting picture from what you shared — not a diagnosis.
      </p>

      {error ? <p className="mt-6 text-terracotta">{error}</p> : null}

      {!painPoints && !error ? (
        <p className="mt-8 text-muted">Preparing your snapshot…</p>
      ) : null}

      <div className="mt-8 space-y-4">
        {painPoints?.map((point) => (
          <article
            key={point.area}
            className="rounded-2xl bg-paper p-5 shadow-sm ring-1 ring-mist"
          >
            <h2 className="font-display text-2xl text-terracotta">{point.area}</h2>
            <p className="mt-2 leading-7 text-muted">{point.summary_text}</p>
          </article>
        ))}
      </div>

      {painPoints ? (
        <a
          href={`/signup?intake_id=${intakeId}`}
          className="mt-10 block rounded-full bg-terracotta px-5 py-3 text-center text-sm font-medium text-paper hover:bg-terracotta-dark"
        >
          Create your account to unlock your personalized plan
        </a>
      ) : null}
    </PageShell>
  );
}
