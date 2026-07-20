import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const state = vi.hoisted(() => ({ clientQuery: vi.fn() }));
vi.mock("@/db", () => ({
  transaction: vi.fn(async (work: (client: { query: typeof state.clientQuery }) => Promise<unknown>) => work({ query: state.clientQuery })),
}));
vi.mock("@/lib/security", () => ({ requesterHash: vi.fn(() => "temporary-requester-hash") }));

import { enforceRateLimit, rateLimitLockKey, RateLimitError } from "@/lib/rate-limit";

describe("atomic PostgreSQL rate limiting", () => {
  beforeEach(() => {
    state.clientQuery.mockReset();
    state.clientQuery.mockImplementation(async (sql: string) => sql.startsWith("SELECT COUNT") ? { rows: [{ count: "0" }] } : { rows: [] });
  });

  it("uses distinct advisory-lock buckets", () => {
    expect(rateLimitLockKey("reports", "hash", "global")).not.toBe(rateLimitLockKey("comments", "hash", "global"));
    expect(rateLimitLockKey("confirmations", "hash", "report-a")).not.toBe(rateLimitLockKey("confirmations", "hash", "report-b"));
  });

  it("takes the transaction advisory lock before count and insert", async () => {
    await enforceRateLimit(new NextRequest("http://localhost/api/reports"), "reports", "global", new Date("2026-01-01T00:00:00Z"));
    const statements = state.clientQuery.mock.calls.map(([sql]) => String(sql));
    const lockIndex = statements.findIndex((sql) => sql.includes("pg_advisory_xact_lock"));
    const countIndex = statements.findIndex((sql) => sql.startsWith("SELECT COUNT"));
    const insertIndex = statements.findIndex((sql) => sql.startsWith("INSERT INTO rate_limits"));
    expect(lockIndex).toBeGreaterThanOrEqual(0);
    expect(lockIndex).toBeLessThan(countIndex);
    expect(countIndex).toBeLessThan(insertIndex);
    expect(state.clientQuery.mock.calls[lockIndex][1]).toEqual(["rate-limit:reports:temporary-requester-hash:global"]);
  });

  it("does not insert when the serialized bucket is already full", async () => {
    state.clientQuery.mockImplementation(async (sql: string) => sql.startsWith("SELECT COUNT") ? { rows: [{ count: "5" }] } : { rows: [] });
    await expect(enforceRateLimit(new NextRequest("http://localhost/api/reports"), "reports")).rejects.toBeInstanceOf(RateLimitError);
    expect(state.clientQuery.mock.calls.some(([sql]) => String(sql).startsWith("INSERT INTO rate_limits"))).toBe(false);
  });
});
