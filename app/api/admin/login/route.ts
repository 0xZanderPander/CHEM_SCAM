import { NextRequest, NextResponse } from "next/server";
import { query } from "@/db";
import { validAdminPassword } from "@/lib/admin";
import { enforceRateLimit, RateLimitError } from "@/lib/rate-limit";
import { ADMIN_COOKIE, adminSessionHash, CSRF_COOKIE, randomToken } from "@/lib/security";
import { validateProductionEnvironment } from "@/lib/env";
import { readJsonBody } from "@/lib/validation";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    validateProductionEnvironment();
    await enforceRateLimit(request, "adminLogin");
    const body = await readJsonBody(request, 4_096);
    const password = String(body.password ?? "");
    if (!(await validAdminPassword(password))) {
      return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });
    }
    const token = randomToken();
    const csrf = randomToken(24);
    const maxAge = 60 * 60 * 8;
    await query(
      "INSERT INTO admin_sessions (token_hash, expires_at) VALUES ($1, NOW() + INTERVAL '8 hours')",
      [adminSessionHash(token)],
    );
    const response = NextResponse.json({ ok: true });
    response.cookies.set(ADMIN_COOKIE, token, { httpOnly: true, sameSite: "strict", secure: process.env.NODE_ENV === "production", maxAge, path: "/" });
    response.cookies.set(CSRF_COOKIE, csrf, { httpOnly: false, sameSite: "strict", secure: process.env.NODE_ENV === "production", maxAge, path: "/" });
    return response;
  } catch (error) {
    if (error instanceof RateLimitError) return NextResponse.json({ error: "Too many login attempts. Please try later." }, { status: 429 });
    console.error("Admin login failed", error instanceof Error ? error.message : "unknown error");
    return NextResponse.json({ error: "Unable to sign in." }, { status: 500 });
  }
}
