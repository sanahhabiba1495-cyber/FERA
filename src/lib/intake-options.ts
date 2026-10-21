import type {
  ActivityLevel,
  DiagnosisStatus,
  DietPattern,
  SleepBand,
  StressLevel,
} from "@/lib/types";

export const DIAGNOSIS_OPTIONS: { value: DiagnosisStatus; label: string }[] = [
  { value: "diagnosed", label: "I have a PCOS diagnosis" },
  { value: "suspected", label: "I suspect I have PCOS" },
  { value: "has_recent_labs", label: "Not sure" },
];

export const CYCLE_OPTIONS = [
  { value: "regular", label: "Regular, about every month" },
  { value: "irregular", label: "Irregular" },
  { value: "rare_or_absent", label: "Rare or absent periods" },
] as const;

export const SYMPTOM_OPTIONS = [
  "irregular periods",
  "absent periods",
  "acne",
  "scalp hair loss",
  "hair thinning",
  "unwanted facial/body hair",
  "weight gain",
  "difficulty losing weight",
  "fatigue",
  "cravings",
  "bloating",
  "mood changes",
] as const;

export const MAX_SYMPTOMS = 5;

export const ACTIVITY_OPTIONS: { value: ActivityLevel; label: string }[] = [
  { value: "sedentary", label: "Mostly sitting through the day" },
  { value: "light", label: "Light movement a few times a week" },
  { value: "moderate", label: "Regular activity most days" },
  { value: "active", label: "Very active" },
];

export const SLEEP_OPTIONS: { value: SleepBand; label: string }[] = [
  { value: "under_6", label: "Under 6 hours" },
  { value: "6_to_7", label: "6–7 hours" },
  { value: "7_to_8", label: "7–8 hours" },
  { value: "over_8", label: "More than 8 hours" },
];

export const STRESS_OPTIONS: { value: StressLevel; label: string }[] = [
  { value: "low", label: "Low" },
  { value: "moderate", label: "Moderate" },
  { value: "high", label: "High" },
];

export const DIET_OPTIONS: { value: DietPattern; label: string }[] = [
  { value: "regular_home", label: "Regular home-cooked meals" },
  { value: "mixed", label: "A mix of home-cooked and eating out" },
  { value: "mostly_processed", label: "Mostly packaged or processed food" },
  { value: "inconsistent", label: "Inconsistent meals" },
];

export const GOAL_OPTIONS = [
  "regulate periods",
  "lose weight",
  "reduce waist circumference",
  "improve hair growth",
  "reduce hair loss",
  "reduce unwanted hair",
  "improve acne",
  "improve energy",
  "improve fertility",
  "improve metabolic health",
] as const;

export const INVESTIGATION_OPTIONS = [
  { key: "blood_work", label: "Blood work" },
  { key: "hormone_panel", label: "Hormone panel" },
  { key: "ultrasound", label: "Ultrasound" },
  { key: "other", label: "Other" },
] as const;

export const JOURNEY_STEPS = [
  {
    key: "about",
    title: "About You",
    description: "Basic information",
  },
  {
    key: "cycle",
    title: "Your Cycle",
    description: "Menstrual health",
  },
  {
    key: "symptoms",
    title: "Symptoms",
    description: "What’s affecting you",
  },
  {
    key: "lifestyle",
    title: "Lifestyle",
    description: "Daily habits",
  },
  {
    key: "goals",
    title: "Goals",
    description: "What you want to improve",
  },
  {
    key: "treatments",
    title: "Treatments",
    description: "Medications & supplements",
  },
  {
    key: "reports",
    title: "Reports",
    description: "Labs & previous investigations",
  },
] as const;
