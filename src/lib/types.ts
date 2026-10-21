export type DiagnosisStatus = "diagnosed" | "suspected" | "has_recent_labs";
export type SubscriptionStatus = "none" | "pending_payment" | "active" | "cancelled";
export type BillingCycle = "monthly" | "quarterly" | "yearly" | "testing";
export type WaitlistStatus = "waiting" | "released" | "expired";
export type PlanStatus = "pending_review" | "approved" | "active";
export type SubscriptionRecordStatus = "created" | "active" | "past_due" | "cancelled";

export type ActivityLevel = "sedentary" | "light" | "moderate" | "active";
export type SleepBand = "under_6" | "6_to_7" | "7_to_8" | "over_8";
export type StressLevel = "low" | "moderate" | "high";
export type DietPattern = "regular_home" | "mixed" | "mostly_processed" | "inconsistent";

export type LifestyleSnapshot = {
  activity_level: ActivityLevel;
  sleep: SleepBand;
  stress: StressLevel;
  diet_pattern: DietPattern;
};

export type ExistingInvestigations = {
  blood_work: boolean;
  hormone_panel: boolean;
  ultrasound: boolean;
  other: boolean;
};

export type AboutYou = {
  age: number;
  height_cm: number;
  weight_kg: number;
  waist_cm?: number | null;
};

export type Treatments = {
  medications: string;
  supplements: string;
  none: boolean;
};

export type PainPoint = {
  area: string;
  summary_text: string;
};

export type SupplementItem = {
  name: string;
  dose: string;
  timing: string;
};

export type IntakePayload = {
  waitlist_entry_id: string;
  diagnosis_status: DiagnosisStatus;
  cycle_pattern: string;
  top_symptoms: string[];
  lifestyle_snapshot: LifestyleSnapshot;
  primary_goal: string;
  existing_investigations: ExistingInvestigations;
  about_you: AboutYou;
  treatments: Treatments;
};
