"use client";

import { FormEvent, useState } from "react";
import { BotanicalArt } from "@/components/BotanicalArt";
import { InstallHint } from "@/components/InstallHint";
import { FieldInput } from "@/components/ui/FieldInput";
import { PrimaryButton } from "@/components/ui/PrimaryButton";

type View = "welcome" | "waitlist";

export default function LandingPage() {
  const [view, setView] = useState<View>("welcome");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const response = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, phone }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Could not join the waitlist");
      }

      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not join the waitlist");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="relative flex min-h-full flex-1 flex-col overflow-hidden bg-cream">
      <div className="pointer-events-none absolute inset-0 opacity-[0.18] text-sage">
        <BotanicalArt className="absolute -left-8 top-24 h-64 w-64" />
        <BotanicalArt className="absolute -right-16 bottom-32 h-72 w-72 rotate-12" />
      </div>

      <main className="relative z-10 mx-auto flex w-full max-w-md flex-1 flex-col px-6 pb-10 pt-14">
        {view === "welcome" ? (
          <>
            <div className="flex-1">
              <h1 className="font-display text-5xl tracking-tight text-sage-deep sm:text-6xl">
                fera.
              </h1>
              <p className="mt-3 text-lg leading-7 text-charcoal">
                Science-led PCOS care, personalized for you.
              </p>

              <div className="mt-10 flex justify-center text-sage/70">
                <BotanicalArt className="h-40 w-56" />
              </div>

              <p className="mt-8 text-[15px] leading-7 text-muted">
                We combine evidence-based lifestyle protocols with clinician expertise
                to help you feel like yourself again.
              </p>

              <div className="mt-8 flex justify-center gap-2" aria-hidden>
                <span className="h-2 w-2 rounded-full bg-sage" />
                <span className="h-2 w-2 rounded-full bg-mist" />
                <span className="h-2 w-2 rounded-full bg-mist" />
              </div>
            </div>

            <div className="mt-10 space-y-4">
              <PrimaryButton tone="rose" onClick={() => setView("waitlist")}>
                Start My Journey
              </PrimaryButton>
              <p className="flex items-center justify-center gap-2 text-center text-xs text-muted">
                <LockIcon />
                Your data is private &amp; secure. We never sell your health data.
              </p>
              <p className="text-center text-sm text-muted">
                Already have an account?{" "}
                <a href="/login" className="text-sage underline">
                  Log in
                </a>
              </p>
            </div>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => setView("welcome")}
              className="mb-6 flex h-10 w-10 items-center justify-center rounded-full text-charcoal"
              aria-label="Back"
            >
              <BackIcon />
            </button>

            <h1 className="font-display text-3xl text-charcoal">Join the waitlist</h1>
            <p className="mt-2 text-[15px] leading-7 text-muted">
              When a spot opens, we&apos;ll email your personal intake link.
            </p>

            {success ? (
              <div className="mt-8 rounded-3xl bg-paper p-6 ring-1 ring-mist">
                <h2 className="font-display text-2xl">You are on the list.</h2>
                <p className="mt-2 text-muted">
                  We will email you when it is your turn to complete the intake.
                </p>
              </div>
            ) : (
              <form onSubmit={onSubmit} className="mt-8 space-y-4">
                <FieldInput
                  label="Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                  required
                />
                <FieldInput
                  label="Email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                />
                <FieldInput
                  label="Phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  autoComplete="tel"
                  required
                />
                {error ? <p className="text-sm text-terracotta-dark">{error}</p> : null}
                <PrimaryButton
                  type="submit"
                  tone="sage"
                  disabled={submitting}
                  showArrow={!submitting}
                >
                  {submitting ? "Joining…" : "Join the waitlist"}
                </PrimaryButton>
              </form>
            )}

            <InstallHint />
          </>
        )}
      </main>
    </div>
  );
}

function BackIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M15 6 9 12l6 6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M7 11V8a5 5 0 0 1 10 0v3M6 11h12v10H6V11Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
