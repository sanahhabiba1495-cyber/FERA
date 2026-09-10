import { verifyIntakeAccessToken, isUuid } from "@/lib/access-token";
import { jsonError, jsonOk } from "@/lib/http";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  let body: {
    email?: string;
    password?: string;
    full_name?: string;
    phone?: string;
    intake_id?: string;
    access_token?: string;
  };

  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON body");
  }

  const email = body.email?.trim().toLowerCase() ?? "";
  const password = body.password ?? "";
  const fullName = body.full_name?.trim() ?? "";
  const phone = body.phone?.trim() ?? "";
  const intakeId = body.intake_id?.trim();
  const accessToken = body.access_token?.trim();

  if (!email || !password || !fullName || !phone) {
    return jsonError("Email, password, full name, and phone are required");
  }

  if (password.length < 8) {
    return jsonError("Password must be at least 8 characters");
  }

  if (!intakeId || !isUuid(intakeId)) {
    return jsonError("intake_id is required");
  }

  if (!verifyIntakeAccessToken(accessToken, intakeId)) {
    return jsonError("Invalid or expired signup link. Restart from your snapshot.", 403);
  }

  try {
    const supabase = getSupabaseAdmin();

    const { data: intake, error: intakeError } = await supabase
      .from("intake_responses")
      .select("id, user_id")
      .eq("id", intakeId)
      .maybeSingle();

    if (intakeError) {
      return jsonError(intakeError.message, 500);
    }

    if (!intake) {
      return jsonError("Intake response not found", 404);
    }

    if (intake.user_id) {
      return jsonError(
        "An account is already linked to this intake. Please log in instead.",
        409,
      );
    }

    const { data: created, error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName, phone },
    });

    if (createError || !created.user) {
      return jsonError(createError?.message ?? "Could not create account", 400);
    }

    const userId = created.user.id;

    const { error: profileError } = await supabase.from("users").upsert({
      id: userId,
      full_name: fullName,
      phone,
      email,
      subscription_status: "none",
    });

    if (profileError) {
      return jsonError(profileError.message, 500);
    }

    const { data: linked, error: linkError } = await supabase
      .from("intake_responses")
      .update({ user_id: userId })
      .eq("id", intakeId)
      .is("user_id", null)
      .select("id")
      .maybeSingle();

    if (linkError) {
      return jsonError(linkError.message, 500);
    }

    if (!linked) {
      return jsonError(
        "An account is already linked to this intake. Please log in instead.",
        409,
      );
    }

    return jsonOk({ user_id: userId, email }, 201);
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Could not create account",
      500,
    );
  }
}
