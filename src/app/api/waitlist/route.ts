import { jsonError, jsonOk } from "@/lib/http";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  let body: { name?: string; email?: string; phone?: string };

  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON body");
  }

  const name = body.name?.trim() ?? "";
  const email = body.email?.trim().toLowerCase() ?? "";
  const phone = body.phone?.trim() ?? "";

  if (!name || !email || !phone) {
    return jsonError("Name, email, and phone are required");
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return jsonError("Enter a valid email address");
  }

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("waitlist_entries")
      .insert({ name, email, phone, status: "waiting" })
      .select("id")
      .single();

    if (error || !data) {
      return jsonError(error?.message ?? "Could not join waitlist", 500);
    }

    return jsonOk({ id: data.id }, 201);
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Could not join waitlist",
      500,
    );
  }
}
