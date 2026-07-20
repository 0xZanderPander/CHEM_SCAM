import { NextResponse } from "next/server";
import { ADMIN_COOKIE, passwordToken, validAdminPassword } from "@/lib/admin";

export async function POST(request: Request) {
  const body = (await request.json()) as { password?: string };
  const password = body.password ?? "";
  if (!(await validAdminPassword(password))) {
    return NextResponse.json({ error: "Incorrect password or ADMIN_PASSWORD is not configured." }, { status: 401 });
  }
  const response = NextResponse.json({ ok: true });
  response.cookies.set(ADMIN_COOKIE, await passwordToken(password), {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 8,
    path: "/",
  });
  return response;
}

