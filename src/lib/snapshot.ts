import type {
  DiagnosisStatus,
  IntakePayload,
  LifestyleSnapshot,
  PainPoint,
} from "@/lib/types";

const PAIN_POINT_TEMPLATES = {
  menstrual: {
    area: "Menstrual Health",
    summary_text:
      "Your cycle pattern and the symptoms you marked suggest your menstrual rhythm could use more support. A structured plan can help you work toward more predictable cycles over time.",
  },
  metabolic: {
    area: "Metabolic Health",
    summary_text:
      "Some of what you shared around weight, energy, and skin often shows up together. Small, steady changes to food, movement, and sleep can support how your body handles energy.",
  },
  hormonal: {
    area: "Hormonal Balance",
    summary_text:
      "Hair and skin changes can feel closely tied to hormones. Your plan will focus on daily habits that support balance — without jumping to conclusions about a diagnosis.",
  },
  energy: {
    area: "Energy and Recovery",
    summary_text:
      "Fatigue, stress, or shorter sleep can make everything else harder. We will prioritize rest and sustainable routines so you have the energy to follow through.",
  },
  rhythm: {
    area: "Daily Rhythm",
    summary_text:
      "Your current activity, meals, or stress load may be working against how you want to feel. A simpler daily rhythm is often the most useful place to start.",
  },
} as const satisfies Record<string, PainPoint>;

function hasAny(symptoms: string[], matches: string[]) {
  return matches.some((item) => symptoms.includes(item));
}

export function generateSnapshotPainPoints(input: {
  diagnosis_status: DiagnosisStatus;
  cycle_pattern: string;
  top_symptoms: string[];
  lifestyle_snapshot: LifestyleSnapshot;
  primary_goal?: string;
}): PainPoint[] {
  const symptoms = input.top_symptoms;
  const cycle = input.cycle_pattern.toLowerCase();
  const lifestyle = input.lifestyle_snapshot;
  const goal = (input.primary_goal ?? "").toLowerCase();

  const selected: PainPoint[] = [];

  const irregularCycle =
    cycle.includes("irregular") ||
    cycle.includes("rare") ||
    cycle.includes("absent");

  if (
    hasAny(symptoms, ["irregular periods", "absent periods"]) ||
    irregularCycle
  ) {
    selected.push(PAIN_POINT_TEMPLATES.menstrual);
  }

  const metabolicSymptoms =
    (symptoms.includes("acne") &&
      hasAny(symptoms, ["weight gain", "difficulty losing weight"])) ||
    (symptoms.includes("weight gain") &&
      symptoms.includes("difficulty losing weight")) ||
    hasAny(symptoms, ["cravings"]) ||
    ["lose weight", "reduce waist circumference", "improve metabolic health"].includes(
      goal,
    );

  if (metabolicSymptoms) {
    selected.push(PAIN_POINT_TEMPLATES.metabolic);
  }

  if (
    hasAny(symptoms, [
      "scalp hair loss",
      "hair thinning",
      "unwanted facial/body hair",
    ])
  ) {
    selected.push(PAIN_POINT_TEMPLATES.hormonal);
  }

  if (
    symptoms.includes("fatigue") ||
    lifestyle.sleep === "under_6" ||
    lifestyle.stress === "high"
  ) {
    selected.push(PAIN_POINT_TEMPLATES.energy);
  }

  if (
    lifestyle.activity_level === "sedentary" ||
    lifestyle.diet_pattern === "mostly_processed" ||
    lifestyle.diet_pattern === "inconsistent"
  ) {
    selected.push(PAIN_POINT_TEMPLATES.rhythm);
  }

  if (
    selected.length < 2 &&
    (input.diagnosis_status === "diagnosed" ||
      input.diagnosis_status === "suspected") &&
    !selected.includes(PAIN_POINT_TEMPLATES.menstrual)
  ) {
    selected.push(PAIN_POINT_TEMPLATES.menstrual);
  }

  if (selected.length < 2) {
    selected.push(PAIN_POINT_TEMPLATES.rhythm);
  }

  if (selected.length < 2) {
    selected.push(PAIN_POINT_TEMPLATES.energy);
  }

  return selected.slice(0, 3);
}

export function snapshotFromIntake(intake: IntakePayload): PainPoint[] {
  return generateSnapshotPainPoints(intake);
}
