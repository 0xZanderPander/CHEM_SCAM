import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";

export const ADMIN_COOKIE = "placard_admin_session";
export const CSRF_COOKIE = "placard_csrf";

export function requiredSecret(name: "ADMIN_SESSION_SECRET" | "CONFIRMATION_SECRET" | "RATE_LIMIT_SECRET") {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required.`);
  if (process.env.NODE_ENV === "production" && value.length < 32) {
    throw new Error(`${name} must be at least 32 characters in production.`);
  }
  return value;
}

export function hmacHex(secret: string, value: string) {
  return createHmac("sha256", secret).update(value, "utf8").digest("hex");
}

export function browserTokenHash(token: string, purpose: "confirmation" | "comment-flag") {
  return hmacHex(requiredSecret("CONFIRMATION_SECRET"), `${purpose}:${token}`);
}

export function adminSessionHash(token: string) {
  return hmacHex(requiredSecret("ADMIN_SESSION_SECRET"), `admin-session:${token}`);
}

export function randomToken(bytes = 32) {
  return randomBytes(bytes).toString("base64url");
}

export function safeEqual(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function requesterIp(request: NextRequest) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || request.headers.get("x-real-ip")?.trim() || "unknown";
}

export function requesterHash(request: NextRequest, now = new Date()) {
  const dateScope = now.toISOString().slice(0, 10);
  return hmacHex(requiredSecret("RATE_LIMIT_SECRET"), `ip:${dateScope}:${requesterIp(request)}`);
}

export function csrfValid(request: NextRequest) {
  const cookie = request.cookies.get(CSRF_COOKIE)?.value || "";
  const header = request.headers.get("x-csrf-token") || "";
  return Boolean(cookie && header && safeEqual(cookie, header));
}
