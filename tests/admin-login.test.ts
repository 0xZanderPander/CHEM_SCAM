import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const state = vi.hoisted(() => ({ query: vi.fn() }));
vi.mock("@/db", () => ({ query: state.query }));
vi.mock("@/lib/admin", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/admin")>();
  return { ...actual, validAdminPassword: vi.fn(async () => true) };
});
vi.mock("@/lib/rate-limit", () => ({
  RateLimitError: class RateLimitError extends Error {},
  enforceRateLimit: vi.fn(async () => undefined),
}));

import { POST } from "@/app/api/admin/login/route";

describe("admin login session retention", () => {
  beforeEach(() => {
    process.env.ADMIN_SESSION_SECRET = "admin-session-test-secret";
    state.query.mockReset();
    state.query.mockResolvedValue({ rows: [] });
  });

  it("deletes only old expired/revoked sessions before creating a session", async () => {
    const response = await POST(new NextRequest("http://localhost/api/admin/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ password: "correct" }),
    }));
    expect(response.status).toBe(200);
    expect(state.query.mock.calls[0][0]).toContain("expires_at < NOW()");
    expect(state.query.mock.calls[0][0]).toContain("revoked_at IS NOT NULL");
    expect(state.query.mock.calls[0][1]).toEqual([7]);
    expect(state.query.mock.calls[1][0]).toContain("INSERT INTO admin_sessions");
  });
});
