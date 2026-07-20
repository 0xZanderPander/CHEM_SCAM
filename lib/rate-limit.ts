import type { NextRequest } from "next/server";
import { transaction } from "@/db";
import { requesterHash } from "./security";

export class RateLimitError extends Error {}

export function rateLimitExceeded(currentCount: number, limit: number) {
  return currentCount >= limit;
}

type LimitName = "reports" | "comments" | "confirmations" | "confirmationPerReport" | "flags" | "adminLogin" | "disputes";

const defaults: Record<LimitName, { limit: number; windowSeconds: number; env: string }> = {
  reports: { limit: 5, windowSeconds: 3_600, env: "RATE_LIMIT_REPORTS_PER_HOUR" },
  comments: { limit: 20, windowSeconds: 3_600, env: "RATE_LIMIT_COMMENTS_PER_HOUR" },
  confirmations: { limit: 30, windowSeconds: 3_600, env: "RATE_LIMIT_CONFIRMATIONS_PER_HOUR" },
  confirmationPerReport: { limit: 5, windowSeconds: 3_600, env: "RATE_LIMIT_CONFIRMATIONS_PER_REPORT_HOUR" },
  flags: { limit: 20, windowSeconds: 3_600, env: "RATE_LIMIT_FLAGS_PER_HOUR" },
  adminLogin: { limit: 5, windowSeconds: 900, env: "RATE_LIMIT_ADMIN_LOGINS_PER_15_MIN" },
  disputes: { limit: 5, windowSeconds: 3_600, env: "RATE_LIMIT_DISPUTES_PER_HOUR" },
};

export async function enforceRateLimit(request: NextRequest, name: LimitName, scopeKey = "global", now = new Date()) {
  const setting = defaults[name];
  const limit = Number(process.env[setting.env] || setting.limit);
  const requester = requesterHash(request, now);
  const windowStart = new Date(now.getTime() - setting.windowSeconds * 1_000);
  const expiresAt = new Date(now.getTime() + setting.windowSeconds * 1_000);

  await transaction(async (client) => {
    // Lazy expiry keeps the table bounded without an external scheduler. Every
    // limiter read removes expired rows before counting the current window.
    await client.query("DELETE FROM rate_limits WHERE expires_at <= NOW()");
    const count = await client.query<{ count: string }>(
      "SELECT COUNT(*)::text AS count FROM rate_limits WHERE endpoint = $1 AND requester_hash = $2 AND scope_key = $3 AND created_at >= $4",
      [name, requester, scopeKey, windowStart],
    );
    if (rateLimitExceeded(Number(count.rows[0]?.count || 0), limit)) throw new RateLimitError("Too many requests. Please try again later.");
    await client.query(
      "INSERT INTO rate_limits (endpoint, requester_hash, scope_key, expires_at) VALUES ($1, $2, $3, $4)",
      [name, requester, scopeKey, expiresAt],
    );
  });
}
