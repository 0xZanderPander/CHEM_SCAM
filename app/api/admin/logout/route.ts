import { NextRequest, NextResponse } from "next/server";
import { query } from "@/db";
import { isAdminRequest } from "@/lib/admin";
import { ADMIN_COOKIE, adminSessionHash, csrfValid, CSRF_COOKIE } from "@/lib/security";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  if (!(await isAdminRequest(request)) || !csrfValid(request)) return NextResponse.json({ error: "Unauthorized." }, { status: 403 });
  const token = request.cookies.get(ADMIN_COOKIE)?.value;
  if (token) await query("UPDATE admin_sessions SET revoked_at = NOW() WHERE token_hash = $1", [adminSessionHash(token)]);
  const response = NextResponse.json({ ok: true });
  response.cookies.delete(ADMIN_COOKIE);
  response.cookies.delete(CSRF_COOKIE);
  return response;
}

