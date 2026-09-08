import { PLAN_CONFIG } from "@/lib/plan-config";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type {
  ActivityLevel,
  LifestyleSnapshot,
  SupplementItem,
} from "@/lib/types";

type IntakeRow = {
  id: string;
  user_id: string | null;
  top_symptoms: string[];
  lifestyle_snapshot: LifestyleSnapshot;
  primary_goal: string;
};

function isActivityLevel(value: string): value is ActivityLevel {
  return ["sedentary", "light", "moderate", "active"].includes(value);
}

function uniqueSupplements(items: SupplementItem[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = item.name.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function buildPlanFromIntake(intake: IntakeRow) {
  const lifestyle = intake.lifestyle_snapshot;
  const activity = isActivityLevel(lifestyle.activity_level)
    ? lifestyle.activity_level
    : "light";
  const goal = intake.primary_goal.toLowerCase();
  const symptoms = intake.top_symptoms ?? [];

  const proteinTarget =
    goal in PLAN_CONFIG.PROTEIN_TARGET_BY_GOAL
      ? PLAN_CONFIG.PROTEIN_TARGET_BY_GOAL[
          goal as keyof typeof PLAN_CONFIG.PROTEIN_TARGET_BY_GOAL
        ]
      : PLAN_CONFIG.PROTEIN_TARGET_BY_GOAL.default;

  const waterTarget =
    PLAN_CONFIG.DEFAULT_WATER_TARGET_L +
    (activity === "active" || activity === "moderate"
      ? PLAN_CONFIG.WATER_TARGET_ACTIVE_BONUS_L
      : 0);

  const supplements: SupplementItem[] = [...PLAN_CONFIG.SUPPLEMENT_REGIMEN.base];

  if (
    symptoms.includes("weight gain") ||
    symptoms.includes("difficulty losing weight") ||
    symptoms.includes("cravings") ||
    goal === "lose weight" ||
    goal === "improve metabolic health"
  ) {
    supplements.push(...PLAN_CONFIG.SUPPLEMENT_REGIMEN.metabolic);
  }

  if (
    symptoms.includes("scalp hair loss") ||
    symptoms.includes("hair thinning") ||
    symptoms.includes("unwanted facial/body hair") ||
    symptoms.includes("acne")
  ) {
    supplements.push(...PLAN_CONFIG.SUPPLEMENT_REGIMEN.hormonal);
  }

  return {
    steps_target: PLAN_CONFIG.STEPS_TARGET_BY_ACTIVITY_LEVEL[activity],
    water_target_l: waterTarget,
    protein_target_g: proteinTarget,
    fiber_target_g: PLAN_CONFIG.DEFAULT_FIBER_TARGET_G,
    movement_guidance: PLAN_CONFIG.MOVEMENT_GUIDANCE_BY_ACTIVITY[activity],
    supplement_regimen: uniqueSupplements(supplements),
  };
}

export async function generateAndSavePlan(userId: string) {
  const supabase = getSupabaseAdmin();

  const { data: existing } = await supabase
    .from("plans")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing) {
    return existing;
  }

  const { data: intake, error: intakeError } = await supabase
    .from("intake_responses")
    .select("id, user_id, top_symptoms, lifestyle_snapshot, primary_goal")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (intakeError || !intake) {
    throw new Error("No intake response found for this user");
  }

  const generated = buildPlanFromIntake(intake as IntakeRow);

  const { data: plan, error } = await supabase
    .from("plans")
    .insert({
      user_id: userId,
      generated_from_intake_id: intake.id,
      ...generated,
      status: "pending_review",
    })
    .select("*")
    .single();

  if (error || !plan) {
    throw new Error(error?.message ?? "Failed to save plan");
  }

  return plan;
}
