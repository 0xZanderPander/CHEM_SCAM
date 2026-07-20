import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const state = vi.hoisted(() => ({ clientQuery: vi.fn() }));
vi.mock("@/lib/rate-limit", () => ({
  RateLimitError: class RateLimitError extends Error {},
  enforceRateLimit: vi.fn(async () => undefined),
}));
vi.mock("@/db", () => ({
  transaction: vi.fn(async (work: (client: { query: typeof state.clientQuery }) => Promise<unknown>) => work({ query: state.clientQuery })),
}));

import { POST as createComment } from "@/app/api/reports/[id]/comments/route";
import { POST as flagComment } from "@/app/api/comments/[id]/flag/route";

function request(body: object) {
  return new NextRequest("http://localhost/api/test", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": "192.0.2.8" },
    body: JSON.stringify(body),
  });
}

describe("comment APIs", () => {
  beforeEach(() => {
    process.env.CONFIRMATION_SECRET = "confirmation-test-secret";
    state.clientQuery.mockReset();
    state.clientQuery.mockImplementation(async (sql: string) => {
      if (sql.startsWith("SELECT id FROM reports")) return { rows: [{ id: "report" }] };
      if (sql.startsWith("SELECT id FROM comments")) return { rows: [{ id: "comment" }] };
      if (sql.includes("INSERT INTO comments")) return { rows: [{ id: "comment" }] };
      return { rows: [] };
    });
  });

  it("creates a validated comment only after locking an active published report", async () => {
    const response = await createComment(
      request({ nickname: "Sleepy Ferret", comment: "This was also my experience.", company: "", startedAt: Date.now() - 5_000 }),
      { params: Promise.resolve({ id: "report" }) },
    );
    expect(response.status).toBe(201);
    expect(state.clientQuery.mock.calls[0][0]).toContain("publication_state = 'published'");
    expect(state.clientQuery.mock.calls[0][0]).toContain("removed_at IS NULL FOR UPDATE");
    expect(state.clientQuery.mock.calls[1][0]).toContain("INSERT INTO comments");
  });

  it("queues a sensitive comment", async () => {
    const response = await createComment(
      request({ nickname: "Ferret", comment: "Email private.person@example.com", company: "", startedAt: Date.now() - 5_000 }),
      { params: Promise.resolve({ id: "report" }) },
    );
    await expect(response.json()).resolves.toMatchObject({ pendingReview: true });
    expect(state.clientQuery.mock.calls[1][1]).toEqual(expect.arrayContaining(["pending_review"]));
  });

  it("rejects comments when the report is unpublished or removed", async () => {
    state.clientQuery.mockResolvedValueOnce({ rows: [] });
    const response = await createComment(
      request({ nickname: "Ferret", comment: "Context", company: "", startedAt: Date.now() - 5_000 }),
      { params: Promise.resolve({ id: "report" }) },
    );
    expect(response.status).toBe(400);
    expect(state.clientQuery.mock.calls.some(([sql]) => String(sql).includes("INSERT INTO comments"))).toBe(false);
  });

  it("checks comment publication state before recording a flag", async () => {
    const response = await flagComment(request({ browserToken: "opaque-token" }), { params: Promise.resolve({ id: "comment" }) });
    expect(response.status).toBe(200);
    expect(state.clientQuery.mock.calls[0][0]).toContain("publication_state = 'published'");
    expect(state.clientQuery.mock.calls[0][0]).toContain("removed_at IS NULL FOR UPDATE");
    expect(state.clientQuery.mock.calls[2][0]).toContain("SELECT COUNT(*)::int FROM comment_flags");
  });

  it("rejects flags against unpublished or removed comments", async () => {
    state.clientQuery.mockResolvedValueOnce({ rows: [] });
    const response = await flagComment(request({ browserToken: "opaque-token" }), { params: Promise.resolve({ id: "comment" }) });
    expect(response.status).toBe(400);
    expect(state.clientQuery).toHaveBeenCalledTimes(1);
  });

  it("returns a conflict for a duplicate browser flag", async () => {
    state.clientQuery
      .mockResolvedValueOnce({ rows: [{ id: "comment" }] })
      .mockRejectedValueOnce(Object.assign(new Error("unique"), { code: "23505" }));
    const response = await flagComment(request({ browserToken: "opaque-token" }), { params: Promise.resolve({ id: "comment" }) });
    expect(response.status).toBe(409);
  });
});
