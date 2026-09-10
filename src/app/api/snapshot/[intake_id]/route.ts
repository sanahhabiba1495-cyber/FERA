import { verifyIntakeAccessToken, isUuid } from "@/lib/access-token";
import { getUserFromBearer } from "@/lib/auth-request";
import { jsonError, jsonOk } from "@/lib/http";
import { generateSnapshotPainPoints } from "@/lib/snapshot";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { DiagnosisStatus, LifestyleSnapshot } from "@/lib/types";

export async function GET(
  request: Request,
  context: { params: Promise<{ intake_id: string }> },
) {
  const { intake_id } = await context.params;

  if (!isUuid(intake_id)) {
    return jsonError("Snapshot not found", 404);
  }

  const token = new URL(request.url).searchParams.get("token");
  const user = await getUserFromBearer(request);
  const tokenOk = verifyIntakeAccessToken(token, intake_id);

  try {
    const supabase = getSupabaseAdmin();

    const { data: intake, error: intakeError } = await supabase
      .from("intake_responses")
      .select(
        "id, user_id, diagnosis_status, cycle_pattern, top_symptoms, lifestyle_snapshot, primary_goal",
      )
      .eq("id", intake_id)
      .maybeSingle();

    if (intakeError) {
      return jsonError(intakeError.message, 500);
    }

    if (!intake) {
      return jsonError("Snapshot not found", 404);
    }

    const ownsIntake = Boolean(user && intake.user_id && intake.user_id === user.id);
    if (!tokenOk && !ownsIntake) {
      return jsonError("Unauthorized", 401);
    }

    const { data: existing, error: existingError } = await supabase
      .from("snapshots")
      .select("*")
      .eq("intake_response_id", intake_id)
      .maybeSingle();

    if (existingError) {
      return jsonError(existingError.message, 500);
    }

    if (existing) {
      return jsonOk({ snapshot: existing });
    }

    const painPoints = generateSnapshotPainPoints({
      diagnosis_status: intake.diagnosis_status as DiagnosisStatus,
      cycle_pattern: intake.cycle_pattern,
      top_symptoms: intake.top_symptoms as string[],
      lifestyle_snapshot: intake.lifestyle_snapshot as LifestyleSnapshot,
      primary_goal: intake.primary_goal,
    });

    const { data: snapshot, error: insertError } = await supabase
      .from("snapshots")
      .insert({
        intake_response_id: intake.id,
        pain_points: painPoints,
      })
      .select("*")
      .single();

    if (insertError || !snapshot) {
      // Another request may have inserted concurrently — return that row.
      const { data: raced } = await supabase
        .from("snapshots")
        .select("*")
        .eq("intake_response_id", intake_id)
        .maybeSingle();
      if (raced) return jsonOk({ snapshot: raced });
      return jsonError(insertError?.message ?? "Could not create snapshot", 500);
    }

    return jsonOk({ snapshot });
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Could not load snapshot",
      500,
    );
  }
}
