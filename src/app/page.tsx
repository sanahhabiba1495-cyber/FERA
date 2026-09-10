"use client";

import { FormEvent, useState } from "react";
import { InstallHint } from "@/components/InstallHint";
import { PageShell } from "@/components/PageShell";

export default function LandingPage() {
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
    <PageShell>
      <p className="mb-3 text-sm uppercase tracking-[0.18em] text-sage">
        PCOS care, made personal
      </p>
      <h1 className="font-display text-4xl leading-tight text-charcoal sm:text-5xl">
        Start with a clearer picture of where you are.
      </h1>
      <p className="mt-4 text-base leading-7 text-muted">
        Join the waitlist. When a spot opens, we will send you a short intake —
        then a snapshot of the areas that may need attention.
      </p>

      {success ? (
        <div className="mt-10 rounded-2xl bg-paper p-6 shadow-sm ring-1 ring-mist">
          <h2 className="font-display text-2xl">You are on the list.</h2>
          <p className="mt-2 text-muted">
            We will email you when it is your turn to complete the intake.
          </p>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="mt-10 space-y-4">
          <Field label="Name" value={name} onChange={setName} autoComplete="name" />
          <Field
            label="Email"
            type="email"
            value={email}
            onChange={setEmail}
            autoComplete="email"
          />
          <Field
            label="Phone"
            type="tel"
            value={phone}
            onChange={setPhone}
            autoComplete="tel"
          />
          {error ? <p className="text-sm text-terracotta">{error}</p> : null}
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-full bg-terracotta px-5 py-3 text-sm font-medium text-paper transition hover:bg-terracotta-dark disabled:opacity-60"
          >
            {submitting ? "Joining…" : "Join the waitlist"}
          </button>
          <p className="text-center text-sm text-muted">
            Already have an account?{" "}
            <a href="/login" className="text-terracotta underline">
              Log in
            </a>
          </p>
        </form>
      )}

      <InstallHint />
    </PageShell>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  autoComplete?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm text-muted">{label}</span>
      <input
        required
        type={type}
        value={value}
        autoComplete={autoComplete}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-mist bg-paper px-4 py-3 text-charcoal outline-none ring-terracotta/30 focus:ring-2"
      />
    </label>
  );
}
