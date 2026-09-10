"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { PageShell } from "@/components/PageShell";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import type { PainPoint } from "@/lib/types";

export default function SnapshotPage() {
  const params = useParams<{ intake_id: string }>();
  const intakeId = params.intake_id;
  const [painPoints, setPainPoints] = useState<PainPoint[] | null>(null);
  const [error, setError] = useState("");
  const [accessToken, setAccessToken] = useState("");

  useEffect(() => {
    if (!intakeId) return;

    const paramsToken = new URLSearchParams(window.location.search).get("token");
    const stored = sessionStorage.getItem(`fera_intake_token_${intakeId}`);
    const token = paramsToken || stored || "";
    setAccessToken(token);
    if (token) {
      sessionStorage.setItem(`fera_intake_token_${intakeId}`, token);
    }

    async function load() {
      try {
        const headers: HeadersInit = {};
        const supabase = getSupabaseBrowser();
        const { data } = await supabase.auth.getSession();
        if (data.session?.access_token) {
          headers.Authorization = `Bearer ${data.session.access_token}`;
        }

        const url = token
          ? `/api/snapshot/${intakeId}?token=${encodeURIComponent(token)}`
          : `/api/snapshot/${intakeId}`;
        const response = await fetch(url, { headers });
        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload.error ?? "Could not load snapshot");
        }
        setPainPoints(payload.snapshot.pain_points);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not load snapshot");
      }
    }

    void load();
  }, [intakeId]);

  const signupHref = accessToken
    ? `/signup?intake_id=${intakeId}&token=${encodeURIComponent(accessToken)}`
    : `/signup?intake_id=${intakeId}`;

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
          href={signupHref}
          className="mt-10 block rounded-full bg-terracotta px-5 py-3 text-center text-sm font-medium text-paper hover:bg-terracotta-dark"
        >
          Create your account to unlock your personalized plan
        </a>
      ) : null}
    </PageShell>
  );
}
