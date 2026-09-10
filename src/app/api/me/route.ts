import { getUserFromBearer } from "@/lib/auth-request";
import { jsonError, jsonOk } from "@/lib/http";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  const user = await getUserFromBearer(request);
  if (!user) {
    return jsonError("Unauthorized", 401);
  }

  const supabase = getSupabaseAdmin();
  const { data: profile, error } = await supabase
    .from("users")
    .select("id, email, full_name, phone, subscription_status, billing_cycle")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    return jsonError(error.message, 500);
  }

  const { data: plan } = await supabase
    .from("plans")
    .select("id, status, created_at")
    .eq("user_id", user.id)
    .maybeSingle();

  const { data: intake } = await supabase
    .from("intake_responses")
    .select("id")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return jsonOk({
    user: profile ?? {
      id: user.id,
      email: user.email,
      subscription_status: "none",
    },
    plan,
    intake_id: intake?.id ?? null,
  });
}
