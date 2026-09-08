import { jsonError, jsonOk } from "@/lib/http";
import { generateAndSavePlan } from "@/lib/plan";

export async function POST(request: Request) {
  const expected = process.env.INTERNAL_API_SECRET;
  const provided = request.headers.get("x-internal-secret");

  if (!expected || provided !== expected) {
    return jsonError("Forbidden", 403);
  }

  let body: { user_id?: string };

  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON body");
  }

  if (!body.user_id) {
    return jsonError("user_id is required");
  }

  try {
    const plan = await generateAndSavePlan(body.user_id);
    return jsonOk({ plan });
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Could not generate plan",
      500,
    );
  }
}
