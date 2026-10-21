"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { JourneyPath, JourneyRoadmap } from "@/components/JourneyPath";
import { FieldInput } from "@/components/ui/FieldInput";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import {
  ACTIVITY_OPTIONS,
  CYCLE_OPTIONS,
  DIAGNOSIS_OPTIONS,
  DIET_OPTIONS,
  GOAL_OPTIONS,
  INVESTIGATION_OPTIONS,
  JOURNEY_STEPS,
  MAX_SYMPTOMS,
  SLEEP_OPTIONS,
  STRESS_OPTIONS,
  SYMPTOM_OPTIONS,
} from "@/lib/intake-options";
import type {
  AboutYou,
  DiagnosisStatus,
  ExistingInvestigations,
  LifestyleSnapshot,
  Treatments,
} from "@/lib/types";

const emptyInvestigations: ExistingInvestigations = {
  blood_work: false,
  hormone_panel: false,
  ultrasound: false,
  other: false,
};

type Stage = "roadmap" | "form";

export default function IntakePage() {
  const router = useRouter();
  const [wid, setWid] = useState<string | null>(null);
  const [gate, setGate] = useState<"loading" | "ready" | "invalid" | "used">("loading");
  const [gateMessage, setGateMessage] = useState("");
  const [stage, setStage] = useState<Stage>("roadmap");
  const [step, setStep] = useState(0);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [age, setAge] = useState("");
  const [heightCm, setHeightCm] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [waistCm, setWaistCm] = useState("");
  const [diagnosisStatus, setDiagnosisStatus] = useState<DiagnosisStatus | "">("");
  const [cyclePattern, setCyclePattern] = useState("");
  const [topSymptoms, setTopSymptoms] = useState<string[]>([]);
  const [lifestyle, setLifestyle] = useState<Partial<LifestyleSnapshot>>({});
  const [primaryGoal, setPrimaryGoal] = useState("");
  const [medications, setMedications] = useState("");
  const [supplements, setSupplements] = useState("");
  const [noTreatments, setNoTreatments] = useState(false);
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
          stage?: Stage;
          step?: number;
          age?: string;
          heightCm?: string;
          weightKg?: string;
          waistCm?: string;
          diagnosisStatus?: DiagnosisStatus;
          cyclePattern?: string;
          topSymptoms?: string[];
          lifestyle?: Partial<LifestyleSnapshot>;
          primaryGoal?: string;
          medications?: string;
          supplements?: string;
          noTreatments?: boolean;
          investigations?: ExistingInvestigations;
        };
        if (draft.stage === "roadmap" || draft.stage === "form") setStage(draft.stage);
        if (typeof draft.step === "number") setStep(draft.step);
        if (draft.age) setAge(draft.age);
        if (draft.heightCm) setHeightCm(draft.heightCm);
        if (draft.weightKg) setWeightKg(draft.weightKg);
        if (draft.waistCm) setWaistCm(draft.waistCm);
        if (draft.diagnosisStatus) setDiagnosisStatus(draft.diagnosisStatus);
        if (draft.cyclePattern) setCyclePattern(draft.cyclePattern);
        if (draft.topSymptoms) setTopSymptoms(draft.topSymptoms);
        if (draft.lifestyle) setLifestyle(draft.lifestyle);
        if (draft.primaryGoal) setPrimaryGoal(draft.primaryGoal);
        if (draft.medications) setMedications(draft.medications);
        if (draft.supplements) setSupplements(draft.supplements);
        if (typeof draft.noTreatments === "boolean") setNoTreatments(draft.noTreatments);
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
    sessionStorage.setItem(
      `fera_intake_draft_${wid}`,
      JSON.stringify({
        stage,
        step,
        age,
        heightCm,
        weightKg,
        waistCm,
        diagnosisStatus,
        cyclePattern,
        topSymptoms,
        lifestyle,
        primaryGoal,
        medications,
        supplements,
        noTreatments,
        investigations,
      }),
    );
  }, [
    wid,
    gate,
    stage,
    step,
    age,
    heightCm,
    weightKg,
    waistCm,
    diagnosisStatus,
    cyclePattern,
    topSymptoms,
    lifestyle,
    primaryGoal,
    medications,
    supplements,
    noTreatments,
    investigations,
  ]);

  const canContinue = useMemo(() => {
    if (step === 0) {
      const a = Number(age);
      const h = Number(heightCm);
      const w = Number(weightKg);
      return (
        Number.isFinite(a) &&
        a >= 12 &&
        a <= 80 &&
        Number.isFinite(h) &&
        h >= 100 &&
        Number.isFinite(w) &&
        w >= 30 &&
        Boolean(diagnosisStatus)
      );
    }
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
    if (step === 5) {
      return noTreatments || Boolean(medications.trim() || supplements.trim());
    }
    return true;
  }, [
    step,
    age,
    heightCm,
    weightKg,
    diagnosisStatus,
    cyclePattern,
    topSymptoms,
    lifestyle,
    primaryGoal,
    medications,
    supplements,
    noTreatments,
  ]);

  function toggleSymptom(symptom: string) {
    setTopSymptoms((current) => {
      if (current.includes(symptom)) {
        return current.filter((item) => item !== symptom);
      }
      if (current.length >= MAX_SYMPTOMS) return current;
      return [...current, symptom];
    });
  }

  function goBack() {
    setError("");
    if (stage === "form" && step === 0) {
      setStage("roadmap");
      return;
    }
    if (stage === "form") {
      setStep((current) => current - 1);
    }
  }

  async function submit() {
    if (!wid) return;
    setSubmitting(true);
    setError("");

    const about_you: AboutYou = {
      age: Number(age),
      height_cm: Number(heightCm),
      weight_kg: Number(weightKg),
      waist_cm: waistCm.trim() ? Number(waistCm) : null,
    };
    const treatments: Treatments = {
      medications: noTreatments ? "" : medications.trim(),
      supplements: noTreatments ? "" : supplements.trim(),
      none: noTreatments,
    };

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
          about_you,
          treatments,
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
      <Shell>
        <p className="text-muted">Checking your invite…</p>
      </Shell>
    );
  }

  if (gate === "used") {
    return (
      <Shell>
        <h1 className="font-display text-3xl">This invite was already used.</h1>
        <p className="mt-3 text-muted">
          {gateMessage || "If you already completed intake, log in to continue."}
        </p>
        <a href="/login" className="mt-6 inline-block text-sage underline">
          Log in
        </a>
      </Shell>
    );
  }

  if (gate === "invalid") {
    return (
      <Shell>
        <h1 className="font-display text-3xl">This link is not open.</h1>
        <p className="mt-3 text-muted">
          Intake is only available from a released waitlist invite.
        </p>
        <a href="/" className="mt-6 inline-block text-sage underline">
          Back to Fera
        </a>
      </Shell>
    );
  }

  if (stage === "roadmap") {
    return (
      <Shell>
        <button
          type="button"
          onClick={() => router.push("/")}
          className="mb-4 flex h-10 w-10 items-center justify-center rounded-full"
          aria-label="Back"
        >
          <BackIcon />
        </button>

        <h1 className="font-display text-3xl leading-tight text-charcoal">
          Your Health Journey
        </h1>
        <p className="mt-3 text-[15px] leading-7 text-muted">
          We&apos;ll ask a few questions to understand your health. At every step,
          we&apos;ll explain why we&apos;re asking.
        </p>

        <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-paper px-3 py-1.5 text-xs text-muted ring-1 ring-mist">
          <ClockIcon />
          Takes about 8–10 minutes
        </div>

        <div className="mt-6">
          <JourneyRoadmap activeIndex={0} />
        </div>

        <div className="mt-8">
          <PrimaryButton
            tone="sage"
            onClick={() => {
              setStage("form");
              setStep(0);
            }}
          >
            Continue
          </PrimaryButton>
        </div>
      </Shell>
    );
  }

  const current = JOURNEY_STEPS[step];

  return (
    <Shell>
      <div className="mb-4 flex items-center gap-3">
        <button
          type="button"
          onClick={goBack}
          className="flex h-10 w-10 items-center justify-center rounded-full"
          aria-label="Back"
        >
          <BackIcon />
        </button>
        <p className="text-sm text-muted">
          {step + 1} / {JOURNEY_STEPS.length}
        </p>
      </div>

      <h1 className="font-display text-3xl leading-tight text-charcoal">
        {current.title}
      </h1>
      <p className="mt-2 text-[15px] text-muted">
        {step === 0
          ? "Let’s start with some basics."
          : step === 1
            ? "Tell us about your menstrual health."
            : step === 2
              ? `Choose up to ${MAX_SYMPTOMS} symptoms that are most present.`
              : step === 3
                ? "A quick snapshot of daily life."
                : step === 4
                  ? "What do you most want help with first?"
                  : step === 5
                    ? "Share anything you’re currently taking."
                    : "Status only — you do not need to upload reports."}
      </p>

      <div className="mt-5">
        <JourneyPath currentIndex={step} />
      </div>

      <div className="mt-2 space-y-5">
        {step === 0 && (
          <>
            <FieldInput
              label="Age"
              inputMode="numeric"
              placeholder="e.g. 28"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              icon={<CalendarIcon />}
            />
            <FieldInput
              label="Height"
              inputMode="decimal"
              placeholder="e.g. 165"
              suffix="cm"
              value={heightCm}
              onChange={(e) => setHeightCm(e.target.value)}
            />
            <FieldInput
              label="Current Weight"
              inputMode="decimal"
              placeholder="e.g. 72"
              suffix="kg"
              value={weightKg}
              onChange={(e) => setWeightKg(e.target.value)}
            />
            <FieldInput
              label="Waist Circumference (optional)"
              inputMode="decimal"
              placeholder="e.g. 85"
              suffix="cm"
              value={waistCm}
              onChange={(e) => setWaistCm(e.target.value)}
            />

            <div className="rounded-2xl bg-info px-4 py-3 text-sm text-sage-deep">
              <div className="flex gap-2">
                <InfoIcon />
                <p>We use this to calculate your baseline and personalize your plan.</p>
              </div>
            </div>

            <fieldset>
              <legend className="mb-2 text-sm font-medium text-charcoal">
                Where are you with a PCOS diagnosis?
              </legend>
              <ChoiceList
                options={DIAGNOSIS_OPTIONS.map((item) => ({
                  value: item.value,
                  label: item.label,
                }))}
                value={diagnosisStatus}
                onChange={(value) => setDiagnosisStatus(value as DiagnosisStatus)}
              />
            </fieldset>
          </>
        )}

        {step === 1 && (
          <ChoiceList
            options={CYCLE_OPTIONS.map((item) => ({
              value: item.label,
              label: item.label,
            }))}
            value={cyclePattern}
            onChange={setCyclePattern}
          />
        )}

        {step === 2 && (
          <div className="space-y-2">
            {SYMPTOM_OPTIONS.map((symptom) => {
              const checked = topSymptoms.includes(symptom);
              const blocked = !checked && topSymptoms.length >= MAX_SYMPTOMS;
              return (
                <label
                  key={symptom}
                  className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${
                    checked ? "border-sage bg-paper" : "border-mist bg-paper"
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
        )}

        {step === 3 && (
          <>
            <fieldset>
              <legend className="mb-2 text-sm font-medium">Activity level</legend>
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
            <fieldset>
              <legend className="mb-2 text-sm font-medium">Sleep</legend>
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
            <fieldset>
              <legend className="mb-2 text-sm font-medium">Stress</legend>
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
              <legend className="mb-2 text-sm font-medium">Diet pattern</legend>
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
          </>
        )}

        {step === 4 && (
          <ChoiceList
            options={GOAL_OPTIONS.map((goal) => ({
              value: goal,
              label: goal,
            }))}
            value={primaryGoal}
            onChange={setPrimaryGoal}
          />
        )}

        {step === 5 && (
          <>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium">Medications</span>
              <textarea
                value={medications}
                disabled={noTreatments}
                onChange={(e) => setMedications(e.target.value)}
                placeholder="e.g. metformin, birth control"
                className="min-h-24 w-full rounded-xl border border-mist bg-paper px-4 py-3 outline-none focus:border-sage focus:ring-2 focus:ring-sage/20 disabled:opacity-50"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium">Supplements</span>
              <textarea
                value={supplements}
                disabled={noTreatments}
                onChange={(e) => setSupplements(e.target.value)}
                placeholder="e.g. inositol, vitamin D"
                className="min-h-24 w-full rounded-xl border border-mist bg-paper px-4 py-3 outline-none focus:border-sage focus:ring-2 focus:ring-sage/20 disabled:opacity-50"
              />
            </label>
            <label className="flex items-center gap-3 rounded-xl border border-mist bg-paper px-4 py-3">
              <input
                type="checkbox"
                checked={noTreatments}
                onChange={(e) => {
                  setNoTreatments(e.target.checked);
                  if (e.target.checked) {
                    setMedications("");
                    setSupplements("");
                  }
                }}
              />
              <span>I’m not taking any medications or supplements</span>
            </label>
          </>
        )}

        {step === 6 && (
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
                            ? "bg-sage-deep text-paper"
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
        )}
      </div>

      {error ? <p className="mt-4 text-sm text-terracotta-dark">{error}</p> : null}

      <div className="mt-8">
        {step < JOURNEY_STEPS.length - 1 ? (
          <PrimaryButton
            tone="sage"
            disabled={!canContinue}
            onClick={() => setStep((current) => current + 1)}
          >
            Continue
          </PrimaryButton>
        ) : (
          <PrimaryButton
            tone="sage"
            disabled={submitting}
            showArrow={!submitting}
            onClick={submit}
          >
            {submitting ? "Saving…" : "See your snapshot"}
          </PrimaryButton>
        )}
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-cream">
      <main className="mx-auto w-full max-w-md flex-1 px-6 pb-12 pt-8">{children}</main>
    </div>
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
              selected ? "border-sage bg-paper" : "border-mist bg-paper"
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

function ClockIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M12 8v4l2.5 1.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect
        x="4"
        y="5"
        width="16"
        height="15"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path d="M8 3v4M16 3v4M4 10h16" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden className="mt-0.5 shrink-0">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
      <path d="M12 10v6M12 7.5h.01" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
