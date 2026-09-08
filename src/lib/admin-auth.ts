import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const ADMIN_COOKIE = "fera_admin";

export function getAdminPassword() {
  return process.env.ADMIN_PASSWORD ?? "";
}

export async function isAdminRequest(request: Request) {
  const expected = getAdminPassword();
  if (!expected) return false;

  const headerPassword = request.headers.get("x-admin-password");
  if (headerPassword && headerPassword === expected) return true;

  const cookieStore = await cookies();
  return cookieStore.get(ADMIN_COOKIE)?.value === expected;
}

export function withAdminCookie(response: NextResponse, password: string) {
  response.cookies.set({
    name: ADMIN_COOKIE,
    value: password,
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
  return response;
}

export function adminUnauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
