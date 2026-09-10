"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { JourneyPath } from "@/components/JourneyPath";
import { PageShell } from "@/components/PageShell";
import {
  ACTIVITY_OPTIONS,
  CYCLE_OPTIONS,
  DIAGNOSIS_OPTIONS,
  DIET_OPTIONS,
  GOAL_OPTIONS,
  INVESTIGATION_OPTIONS,
  MAX_SYMPTOMS,
  SLEEP_OPTIONS,
  STRESS_OPTIONS,
  SYMPTOM_OPTIONS,
} from "@/lib/intake-options";
import type {
  DiagnosisStatus,
  ExistingInvestigations,
  LifestyleSnapshot,
} from "@/lib/types";

const emptyInvestigations: ExistingInvestigations = {
  blood_work: false,
  hormone_panel: false,
  ultrasound: false,
  other: false,
};

export default function IntakePage() {
  const router = useRouter();
  const [wid, setWid] = useState<string | null>(null);
  const [gate, setGate] = useState<"loading" | "ready" | "invalid" | "used">("loading");
  const [gateMessage, setGateMessage] = useState("");
  const [step, setStep] = useState(0);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [diagnosisStatus, setDiagnosisStatus] = useState<DiagnosisStatus | "">("");
  const [cyclePattern, setCyclePattern] = useState("");
  const [topSymptoms, setTopSymptoms] = useState<string[]>([]);
  const [lifestyle, setLifestyle] = useState<Partial<LifestyleSnapshot>>({});
  const [primaryGoal, setPrimaryGoal] = useState("");
  const [investigations, setInvestigations] =
    useState<ExistingInvestigations>(emptyInvestigations);

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("wid");
    if (!id) {
      setGate("invalid");
      return;
    }

    setWid(id);

    const draftKey = `fera_intake_draft_${id}`;
    try {
      const raw = sessionStorage.getItem(draftKey);
      if (raw) {
        const draft = JSON.parse(raw) as {
          step?: number;
          diagnosisStatus?: DiagnosisStatus;
          cyclePattern?: string;
          topSymptoms?: string[];
          lifestyle?: Partial<LifestyleSnapshot>;
          primaryGoal?: string;
          investigations?: ExistingInvestigations;
        };
        if (typeof draft.step === "number") setStep(draft.step);
        if (draft.diagnosisStatus) setDiagnosisStatus(draft.diagnosisStatus);
        if (draft.cyclePattern) setCyclePattern(draft.cyclePattern);
        if (draft.topSymptoms) setTopSymptoms(draft.topSymptoms);
        if (draft.lifestyle) setLifestyle(draft.lifestyle);
        if (draft.primaryGoal) setPrimaryGoal(draft.primaryGoal);
        if (draft.investigations) setInvestigations(draft.investigations);
      }
    } catch {
      // ignore corrupt drafts
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 15000);

    fetch(`/api/intake?wid=${encodeURIComponent(id)}`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          if (String(payload.error || "").toLowerCase().includes("already been used")) {
            setGate("used");
            setGateMessage(payload.error);
          } else {
            setGate("invalid");
          }
          return;
        }
        setGate("ready");
      })
      .catch(() => setGate("invalid"))
      .finally(() => window.clearTimeout(timeout));

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, []);

  useEffect(() => {
    if (!wid || gate !== "ready") return;
    const draftKey = `fera_intake_draft_${wid}`;
    sessionStorage.setItem(
      draftKey,
      JSON.stringify({
        step,
        diagnosisStatus,
        cyclePattern,
        topSymptoms,
        lifestyle,
        primaryGoal,
        investigations,
      }),
    );
  }, [
    wid,
    gate,
    step,
    diagnosisStatus,
    cyclePattern,
    topSymptoms,
    lifestyle,
    primaryGoal,
    investigations,
  ]);

  const journeyIndex = step === 0 ? -1 : step - 1;
  const canContinue = useMemo(() => {
    if (step === 0) return Boolean(diagnosisStatus);
    if (step === 1) return Boolean(cyclePattern);
    if (step === 2) return topSymptoms.length > 0 && topSymptoms.length <= MAX_SYMPTOMS;
    if (step === 3) {
      return Boolean(
        lifestyle.activity_level &&
          lifestyle.sleep &&
          lifestyle.stress &&
          lifestyle.diet_pattern,
      );
    }
    if (step === 4) return Boolean(primaryGoal);
    return true;
  }, [step, diagnosisStatus, cyclePattern, topSymptoms, lifestyle, primaryGoal]);

  function toggleSymptom(symptom: string) {
    setTopSymptoms((current) => {
      if (current.includes(symptom)) {
        return current.filter((item) => item !== symptom);
      }
      if (current.length >= MAX_SYMPTOMS) return current;
      return [...current, symptom];
    });
  }

  async function submit() {
    if (!wid) return;
    setSubmitting(true);
    setError("");

    try {
      const response = await fetch("/api/intake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          waitlist_entry_id: wid,
          diagnosis_status: diagnosisStatus,
          cycle_pattern: cyclePattern,
          top_symptoms: topSymptoms,
          lifestyle_snapshot: lifestyle,
          primary_goal: primaryGoal,
          existing_investigations: investigations,
        }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Could not save intake");
      }

      sessionStorage.removeItem(`fera_intake_draft_${wid}`);
      sessionStorage.setItem(`fera_intake_token_${payload.id}`, payload.access_token);
      router.push(
        `/snapshot/${payload.id}?token=${encodeURIComponent(payload.access_token)}`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save intake");
      setSubmitting(false);
    }
  }

  if (gate === "loading") {
    return (
      <PageShell>
        <p className="text-muted">Checking your invite…</p>
      </PageShell>
    );
  }

  if (gate === "used") {
    return (
      <PageShell>
        <h1 className="font-display text-3xl">This invite was already used.</h1>
        <p className="mt-3 text-muted">
          {gateMessage || "If you already completed intake, log in to continue."}
        </p>
        <a href="/login" className="mt-6 inline-block text-terracotta underline">
          Log in
        </a>
      </PageShell>
    );
  }

  if (gate === "invalid") {
    return (
      <PageShell>
        <h1 className="font-display text-3xl">This link is not open.</h1>
        <p className="mt-3 text-muted">
          Intake is only available from a released waitlist invite.
        </p>
        <a href="/" className="mt-6 inline-block text-terracotta underline">
          Back to Fera
        </a>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <JourneyPath currentIndex={journeyIndex} />

      {step === 0 && (
        <Question title="Where are you with a PCOS diagnosis?">
          <ChoiceList
            options={DIAGNOSIS_OPTIONS.map((item) => ({
              value: item.value,
              label: item.label,
            }))}
            value={diagnosisStatus}
            onChange={(value) => setDiagnosisStatus(value as DiagnosisStatus)}
          />
        </Question>
      )}

      {step === 1 && (
        <Question title="How would you describe your cycle?">
          <ChoiceList
            options={CYCLE_OPTIONS.map((item) => ({
              value: item.label,
              label: item.label,
            }))}
            value={cyclePattern}
            onChange={setCyclePattern}
          />
        </Question>
      )}

      {step === 2 && (
        <Question
          title="Which symptoms are most present right now?"
          hint={`Choose up to ${MAX_SYMPTOMS}.`}
        >
          <div className="space-y-2">
            {SYMPTOM_OPTIONS.map((symptom) => {
              const checked = topSymptoms.includes(symptom);
              const blocked = !checked && topSymptoms.length >= MAX_SYMPTOMS;
              return (
                <label
                  key={symptom}
                  className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${
                    checked ? "border-terracotta bg-paper" : "border-mist bg-paper"
                  } ${blocked ? "opacity-50" : ""}`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={blocked}
                    onChange={() => toggleSymptom(symptom)}
                  />
                  <span className="capitalize">{symptom}</span>
                </label>
              );
            })}
          </div>
        </Question>
      )}

      {step === 3 && (
        <Question title="A quick snapshot of daily life">
          <fieldset className="mb-6">
            <legend className="mb-2 text-sm text-muted">Activity level</legend>
            <ChoiceList
              options={ACTIVITY_OPTIONS}
              value={lifestyle.activity_level ?? ""}
              onChange={(value) =>
                setLifestyle((current) => ({
                  ...current,
                  activity_level: value as LifestyleSnapshot["activity_level"],
                }))
              }
            />
          </fieldset>
          <fieldset className="mb-6">
            <legend className="mb-2 text-sm text-muted">Sleep</legend>
            <ChoiceList
              options={SLEEP_OPTIONS}
              value={lifestyle.sleep ?? ""}
              onChange={(value) =>
                setLifestyle((current) => ({
                  ...current,
                  sleep: value as LifestyleSnapshot["sleep"],
                }))
              }
            />
          </fieldset>
          <fieldset className="mb-6">
            <legend className="mb-2 text-sm text-muted">Stress</legend>
            <ChoiceList
              options={STRESS_OPTIONS}
              value={lifestyle.stress ?? ""}
              onChange={(value) =>
                setLifestyle((current) => ({
                  ...current,
                  stress: value as LifestyleSnapshot["stress"],
                }))
              }
            />
          </fieldset>
          <fieldset>
            <legend className="mb-2 text-sm text-muted">Diet pattern</legend>
            <ChoiceList
              options={DIET_OPTIONS}
              value={lifestyle.diet_pattern ?? ""}
              onChange={(value) =>
                setLifestyle((current) => ({
                  ...current,
                  diet_pattern: value as LifestyleSnapshot["diet_pattern"],
                }))
              }
            />
          </fieldset>
        </Question>
      )}

      {step === 4 && (
        <Question title="What do you most want help with first?">
          <ChoiceList
            options={GOAL_OPTIONS.map((goal) => ({
              value: goal,
              label: goal,
            }))}
            value={primaryGoal}
            onChange={setPrimaryGoal}
          />
        </Question>
      )}

      {step === 5 && (
        <Question
          title="Have you already done any of these investigations?"
          hint="Status only — you do not need to upload reports."
        >
          <div className="space-y-4">
            {INVESTIGATION_OPTIONS.map((item) => (
              <div key={item.key} className="rounded-xl border border-mist bg-paper p-4">
                <p className="mb-2 font-medium">{item.label}</p>
                <div className="flex gap-3">
                  {[true, false].map((yes) => {
                    const selected = investigations[item.key] === yes;
                    return (
                      <button
                        key={String(yes)}
                        type="button"
                        onClick={() =>
                          setInvestigations((current) => ({
                            ...current,
                            [item.key]: yes,
                          }))
                        }
                        className={`rounded-full px-4 py-1.5 text-sm ${
                          selected
                            ? "bg-terracotta text-paper"
                            : "bg-mist text-charcoal"
                        }`}
                      >
                        {yes ? "Yes" : "No"}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </Question>
      )}

      {error ? <p className="mt-4 text-sm text-terracotta">{error}</p> : null}

      <div className="mt-8 flex gap-3">
        {step > 0 ? (
          <button
            type="button"
            onClick={() => setStep((current) => current - 1)}
            className="rounded-full border border-mist px-5 py-3 text-sm"
          >
            Back
          </button>
        ) : null}
        {step < 5 ? (
          <button
            type="button"
            disabled={!canContinue}
            onClick={() => setStep((current) => current + 1)}
            className="flex-1 rounded-full bg-terracotta px-5 py-3 text-sm font-medium text-paper disabled:opacity-50"
          >
            Continue
          </button>
        ) : (
          <button
            type="button"
            disabled={submitting}
            onClick={submit}
            className="flex-1 rounded-full bg-terracotta px-5 py-3 text-sm font-medium text-paper disabled:opacity-60"
          >
            {submitting ? "Saving…" : "See your snapshot"}
          </button>
        )}
      </div>
    </PageShell>
  );
}

function Question({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h1 className="font-display text-3xl leading-tight">{title}</h1>
      {hint ? <p className="mt-2 text-sm text-muted">{hint}</p> : null}
      <div className="mt-6">{children}</div>
    </section>
  );
}

function ChoiceList({
  options,
  value,
  onChange,
}: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      {options.map((option) => {
        const selected = value === option.value;
        return (
          <label
            key={option.value}
            className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 ${
              selected ? "border-terracotta bg-paper" : "border-mist bg-paper"
            }`}
          >
            <input
              type="radio"
              name={options.map((item) => item.value).join("-")}
              checked={selected}
              onChange={() => onChange(option.value)}
            />
            <span className="capitalize">{option.label}</span>
          </label>
        );
      })}
    </div>
  );
}
