import type { NextRequest } from "next/server";
import { createHash, timingSafeEqual } from "node:crypto";
import { query } from "@/db";
import { ADMIN_COOKIE, adminSessionHash } from "./security";

export async function validAdminPassword(password: string) {
  const configured = process.env.ADMIN_PASSWORD || "";
  if (!configured) return false;
  const left = createHash("sha256").update(password).digest();
  const right = createHash("sha256").update(configured).digest();
  return timingSafeEqual(left, right);
}

export function sessionIsActive(expiresAt: Date, revokedAt: Date | null, now = new Date()) {
  return !revokedAt && expiresAt.getTime() > now.getTime();
}

export const ADMIN_SESSION_RETENTION_DAYS = 7;

export function sessionShouldBeCleaned(expiresAt: Date, revokedAt: Date | null, now = new Date(), retentionDays = ADMIN_SESSION_RETENTION_DAYS) {
  const cutoff = now.getTime() - retentionDays * 24 * 60 * 60 * 1_000;
  return expiresAt.getTime() < cutoff || Boolean(revokedAt && revokedAt.getTime() < cutoff);
}

export async function isAdminRequest(request: NextRequest) {
  const token = request.cookies.get(ADMIN_COOKIE)?.value;
  if (!token) return false;
  const result = await query<{ id: string }>(
    "SELECT id FROM admin_sessions WHERE token_hash = $1 AND revoked_at IS NULL AND expires_at > NOW() LIMIT 1",
    [adminSessionHash(token)],
  );
  return Boolean(result.rows[0]);
}
