import { MAX_SYMPTOMS, SYMPTOM_OPTIONS } from "@/lib/intake-options";
import { createIntakeAccessToken, isUuid } from "@/lib/access-token";
import { jsonError, jsonOk } from "@/lib/http";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { IntakePayload } from "@/lib/types";

const DIAGNOSIS = new Set(["diagnosed", "suspected", "has_recent_labs"]);

export async function GET(request: Request) {
  const wid = new URL(request.url).searchParams.get("wid")?.trim();
  if (!wid) {
    return jsonError("Missing waitlist id");
  }

  if (!isUuid(wid)) {
    return jsonError("This intake link is not valid", 403);
  }

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("waitlist_entries")
      .select("id, status")
      .eq("id", wid)
      .maybeSingle();

    if (error) {
      return jsonError(error.message, 500);
    }

    if (!data) {
      return jsonError("This intake link is not valid", 403);
    }

    if (data.status === "expired") {
      return jsonError("This intake link has already been used", 403);
    }

    if (data.status !== "released") {
      return jsonError("This intake link is not valid", 403);
    }

    return jsonOk({ valid: true, waitlist_entry_id: data.id });
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Could not validate intake link",
      500,
    );
  }
}

export async function POST(request: Request) {
  let body: Partial<IntakePayload>;

  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON body");
  }

  const waitlistEntryId = body.waitlist_entry_id?.trim();
  if (!waitlistEntryId) {
    return jsonError("waitlist_entry_id is required");
  }

  if (!isUuid(waitlistEntryId)) {
    return jsonError("This intake link is not valid", 403);
  }

  if (!body.diagnosis_status || !DIAGNOSIS.has(body.diagnosis_status)) {
    return jsonError("Valid diagnosis_status is required");
  }

  if (!body.cycle_pattern?.trim()) {
    return jsonError("cycle_pattern is required");
  }

  const topSymptoms = Array.isArray(body.top_symptoms) ? body.top_symptoms : [];
  if (topSymptoms.length === 0) {
    return jsonError("Select at least one symptom");
  }
  if (topSymptoms.length > MAX_SYMPTOMS) {
    return jsonError(`Select at most ${MAX_SYMPTOMS} symptoms`);
  }
  if (
    topSymptoms.some(
      (item) => !SYMPTOM_OPTIONS.includes(item as (typeof SYMPTOM_OPTIONS)[number]),
    )
  ) {
    return jsonError("One or more symptoms are not recognized");
  }

  if (
    !body.lifestyle_snapshot?.activity_level ||
    !body.lifestyle_snapshot.sleep ||
    !body.lifestyle_snapshot.stress ||
    !body.lifestyle_snapshot.diet_pattern
  ) {
    return jsonError("Complete the lifestyle snapshot");
  }

  if (!body.primary_goal?.trim()) {
    return jsonError("primary_goal is required");
  }

  const investigations = body.existing_investigations;
  if (
    !investigations ||
    typeof investigations.blood_work !== "boolean" ||
    typeof investigations.hormone_panel !== "boolean" ||
    typeof investigations.ultrasound !== "boolean" ||
    typeof investigations.other !== "boolean"
  ) {
    return jsonError("existing_investigations must include yes/no for each category");
  }

  const about = body.about_you;
  const age = Number(about?.age);
  const heightCm = Number(about?.height_cm);
  const weightKg = Number(about?.weight_kg);
  const waistRaw = about?.waist_cm;
  const waistCm =
    waistRaw === null || waistRaw === undefined || String(waistRaw).trim() === ""
      ? null
      : Number(waistRaw);

  if (!Number.isFinite(age) || age < 12 || age > 80) {
    return jsonError("Enter a valid age");
  }
  if (!Number.isFinite(heightCm) || heightCm < 100 || heightCm > 250) {
    return jsonError("Enter height in cm");
  }
  if (!Number.isFinite(weightKg) || weightKg < 30 || weightKg > 300) {
    return jsonError("Enter weight in kg");
  }
  if (waistCm !== null && (!Number.isFinite(waistCm) || waistCm < 40 || waistCm > 200)) {
    return jsonError("Enter waist circumference in cm, or leave it blank");
  }

  const treatments = body.treatments;
  if (!treatments || typeof treatments.none !== "boolean") {
    return jsonError("Complete the treatments step");
  }
  if (
    !treatments.none &&
    !String(treatments.medications || "").trim() &&
    !String(treatments.supplements || "").trim()
  ) {
    return jsonError("Add your medications/supplements, or choose none");
  }

  try {
    const supabase = getSupabaseAdmin();
    const { data: entry, error: entryError } = await supabase
      .from("waitlist_entries")
      .select("id, status")
      .eq("id", waitlistEntryId)
      .maybeSingle();

    if (entryError) {
      return jsonError(entryError.message, 500);
    }

    if (!entry || entry.status === "expired") {
      return jsonError(
        entry?.status === "expired"
          ? "This intake link has already been used"
          : "This intake link is not valid",
        403,
      );
    }

    if (entry.status !== "released") {
      return jsonError("This intake link is not valid", 403);
    }

    const { data, error } = await supabase
      .from("intake_responses")
      .insert({
        waitlist_entry_id: waitlistEntryId,
        diagnosis_status: body.diagnosis_status,
        cycle_pattern: body.cycle_pattern.trim(),
        top_symptoms: topSymptoms,
        lifestyle_snapshot: body.lifestyle_snapshot,
        primary_goal: body.primary_goal.trim(),
        existing_investigations: investigations,
        about_you: {
          age,
          height_cm: heightCm,
          weight_kg: weightKg,
          waist_cm: waistCm,
        },
        treatments: {
          medications: String(treatments.medications || "").trim(),
          supplements: String(treatments.supplements || "").trim(),
          none: treatments.none,
        },
      })
      .select("id")
      .single();

    if (error || !data) {
      return jsonError(error?.message ?? "Could not save intake", 500);
    }

    const { error: consumeError } = await supabase
      .from("waitlist_entries")
      .update({ status: "expired" })
      .eq("id", waitlistEntryId)
      .eq("status", "released");

    if (consumeError) {
      return jsonError(consumeError.message, 500);
    }

    const accessToken = createIntakeAccessToken(data.id);
    return jsonOk({ id: data.id, access_token: accessToken }, 201);
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Could not save intake",
      500,
    );
  }
}
