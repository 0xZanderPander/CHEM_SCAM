import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const state = vi.hoisted(() => ({ query: vi.fn(), clientQuery: vi.fn() }));
vi.mock("@/lib/rate-limit", () => ({
  RateLimitError: class RateLimitError extends Error {},
  enforceRateLimit: vi.fn(async () => undefined),
}));
vi.mock("@/db", () => ({
  query: state.query,
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
    state.query.mockReset();
    state.clientQuery.mockReset();
    state.clientQuery.mockResolvedValue({ rows: [] });
  });

  it("creates a validated comment", async () => {
    state.query.mockResolvedValueOnce({ rows: [{ id: "report" }] }).mockResolvedValueOnce({ rows: [{ id: "comment" }] });
    const response = await createComment(
      request({ nickname: "Sleepy Ferret", comment: "This was also my experience.", company: "", startedAt: Date.now() - 5_000 }),
      { params: Promise.resolve({ id: "report" }) },
    );
    expect(response.status).toBe(201);
    expect(state.query.mock.calls[1][0]).toContain("INSERT INTO comments");
  });

  it("queues a sensitive comment", async () => {
    state.query.mockResolvedValueOnce({ rows: [{ id: "report" }] }).mockResolvedValueOnce({ rows: [{ id: "comment" }] }).mockResolvedValueOnce({ rows: [] });
    const response = await createComment(
      request({ nickname: "Ferret", comment: "Email private.person@example.com", company: "", startedAt: Date.now() - 5_000 }),
      { params: Promise.resolve({ id: "report" }) },
    );
    await expect(response.json()).resolves.toMatchObject({ pendingReview: true });
    expect(state.query.mock.calls[1][1]).toEqual(expect.arrayContaining(["pending_review"]));
  });

  it("returns a conflict for a duplicate browser flag", async () => {
    state.clientQuery.mockRejectedValueOnce(Object.assign(new Error("unique"), { code: "23505" }));
    const response = await flagComment(request({ browserToken: "opaque-token" }), { params: Promise.resolve({ id: "comment" }) });
    expect(response.status).toBe(409);
  });
});
