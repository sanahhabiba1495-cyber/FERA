import {
  adminUnauthorized,
  getAdminPassword,
  isAdminRequest,
  withAdminCookie,
} from "@/lib/admin-auth";
import { jsonError, jsonOk } from "@/lib/http";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  if (!(await isAdminRequest(request))) {
    return adminUnauthorized();
  }

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("waitlist_entries")
      .select("*")
      .order("created_at", { ascending: true });

    if (error) {
      return jsonError(error.message, 500);
    }

    const headerPassword = request.headers.get("x-admin-password");
    const response = jsonOk({ entries: data ?? [] });

    if (headerPassword && headerPassword === getAdminPassword()) {
      return withAdminCookie(response, headerPassword);
    }

    return response;
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Failed to load waitlist",
      500,
    );
  }
}
