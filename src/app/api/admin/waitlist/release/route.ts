import { adminUnauthorized, isAdminRequest } from "@/lib/admin-auth";
import { sendWaitlistReleaseEmail } from "@/lib/email";
import { jsonError, jsonOk } from "@/lib/http";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  if (!(await isAdminRequest(request))) {
    return adminUnauthorized();
  }

  let body: { id?: string };

  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON body");
  }

  const id = body.id?.trim();
  if (!id) {
    return jsonError("Waitlist entry id is required");
  }

  try {
    const supabase = getSupabaseAdmin();
    const { data: entry, error: fetchError } = await supabase
      .from("waitlist_entries")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (fetchError) {
      return jsonError(fetchError.message, 500);
    }

    if (!entry) {
      return jsonError("Waitlist entry not found", 404);
    }

    if (entry.status !== "waiting") {
      return jsonError("Only waiting entries can be released");
    }

    const releasedAt = new Date().toISOString();
    const { data: updated, error: updateError } = await supabase
      .from("waitlist_entries")
      .update({ status: "released", released_at: releasedAt })
      .eq("id", id)
      .select("*")
      .single();

    if (updateError || !updated) {
      return jsonError(updateError?.message ?? "Failed to release entry", 500);
    }

    await sendWaitlistReleaseEmail({
      to: updated.email,
      name: updated.name,
      waitlistEntryId: updated.id,
    });

    return jsonOk({ entry: updated });
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Failed to release entry",
      500,
    );
  }
}
