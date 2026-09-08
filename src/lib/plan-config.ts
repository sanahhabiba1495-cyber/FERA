import type { ActivityLevel, SupplementItem } from "@/lib/types";

/**
 * PLACEHOLDER VALUES — pending clinician review.
 * Edit this object only. Do not scatter numeric targets or supplement
 * doses through the rest of the codebase.
 */
export const PLAN_CONFIG = {
  DEFAULT_PROTEIN_TARGET_G: 80,
  DEFAULT_FIBER_TARGET_G: 25,
  DEFAULT_WATER_TARGET_L: 2.5,
  WATER_TARGET_ACTIVE_BONUS_L: 0.3,

  STEPS_TARGET_BY_ACTIVITY_LEVEL: {
    sedentary: 6000,
    light: 7500,
    moderate: 8000,
    active: 10000,
  } satisfies Record<ActivityLevel, number>,

  PROTEIN_TARGET_BY_GOAL: {
    "lose weight": 90,
    "reduce waist circumference": 90,
    "improve metabolic health": 85,
    default: 80,
  },

  MOVEMENT_GUIDANCE_BY_ACTIVITY: {
    sedentary:
      "Start with two 15-minute walks most days. Build up slowly rather than pushing into long workouts.",
    light:
      "Keep your current movement and add one extra 20-minute walk on three days this week.",
    moderate:
      "Maintain your regular activity and add two short strength sessions using bodyweight or light weights.",
    active:
      "Keep your routine and protect rest days. Swap one high-intensity session for a lower-intensity walk if energy dips.",
  } satisfies Record<ActivityLevel, string>,

  // Placeholder supplement templates — not medical advice and not a prescription.
  SUPPLEMENT_REGIMEN: {
    base: [
      { name: "Myo-inositol", dose: "2 g", timing: "morning with food" },
      { name: "Vitamin D3", dose: "1000 IU", timing: "morning with food" },
    ] satisfies SupplementItem[],
    metabolic: [
      { name: "Magnesium glycinate", dose: "200 mg", timing: "evening" },
    ] satisfies SupplementItem[],
    hormonal: [
      { name: "Omega-3", dose: "1000 mg", timing: "with a meal" },
    ] satisfies SupplementItem[],
  },
} as const;

/**
 * PLACEHOLDER PRICING — edit in one place.
 * Displayed as ₹/month; quarterly and yearly are billed as a single period.
 */
export const BILLING_PLANS = {
  monthly: {
    tier: "monthly" as const,
    label: "Monthly",
    pricePerMonthInr: 2999,
    billedAmountInr: 2999,
    cadenceLabel: "billed monthly",
    envPlanIdKey: "RAZORPAY_PLAN_ID_MONTHLY",
  },
  quarterly: {
    tier: "quarterly" as const,
    label: "Quarterly",
    pricePerMonthInr: 2499,
    billedAmountInr: 7497,
    cadenceLabel: "billed quarterly",
    envPlanIdKey: "RAZORPAY_PLAN_ID_QUARTERLY",
  },
  yearly: {
    tier: "yearly" as const,
    label: "Yearly",
    pricePerMonthInr: 2000,
    billedAmountInr: 24000,
    cadenceLabel: "billed yearly",
    envPlanIdKey: "RAZORPAY_PLAN_ID_YEARLY",
  },
} as const;

export type BillingTier = keyof typeof BILLING_PLANS;
