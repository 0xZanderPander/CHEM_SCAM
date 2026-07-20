import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const state = vi.hoisted(() => ({ query: vi.fn(), clientQuery: vi.fn(), refreshStatus: vi.fn() }));
vi.mock("@/lib/rate-limit", () => ({
  RateLimitError: class RateLimitError extends Error {},
  enforceRateLimit: vi.fn(async () => undefined),
}));
vi.mock("@/db", () => ({
  query: state.query,
  refreshStatus: state.refreshStatus,
  transaction: vi.fn(async (work: (client: { query: typeof state.clientQuery }) => Promise<unknown>) => work({ query: state.clientQuery })),
}));

import { POST } from "@/app/api/reports/route";

function request(overrides: Record<string, unknown> = {}) {
  return new NextRequest("http://localhost/api/reports", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": "192.0.2.4" },
    body: JSON.stringify({
      scammerName: "Example Supplier",
      website: "https://example.com/path",
      description: "Goods never arrived after payment.",
      nickname: "Angry Goose",
      company: "",
      startedAt: Date.now() - 5_000,
      ...overrides,
    }),
  });
}

describe("report creation API", () => {
  beforeEach(() => {
    state.query.mockReset();
    state.clientQuery.mockReset();
    state.refreshStatus.mockReset();
    state.clientQuery.mockResolvedValue({ rows: [] });
  });

  it("creates a new published report", async () => {
    state.query.mockResolvedValueOnce({ rows: [] }).mockResolvedValueOnce({ rows: [{ id: "new-report" }] });
    const response = await POST(request());
    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toMatchObject({ id: "new-report", duplicate: false, pendingReview: false });
    expect(state.query.mock.calls[1][1]).toEqual(expect.arrayContaining(["example.com", "published"]));
  });

  it("attaches an exact-domain submission and updates its status", async () => {
    state.query.mockResolvedValueOnce({ rows: [{ id: "existing", scammer_name: "Old name", normalized_domain: "example.com" }] });
    const response = await POST(request({ scammerName: "New trading name" }));
    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toMatchObject({ id: "existing", duplicate: true });
    expect(state.clientQuery.mock.calls.some(([sql]) => String(sql).includes("INSERT INTO duplicate_reports"))).toBe(true);
    expect(state.refreshStatus).toHaveBeenCalledWith("existing", expect.anything());
  });

  it("creates rather than merges a name-only match", async () => {
    state.query
      .mockResolvedValueOnce({ rows: [{ id: "possible", scammer_name: "Example Supplier", normalized_domain: "other.example" }] })
      .mockResolvedValueOnce({ rows: [{ id: "separate" }] })
      .mockResolvedValueOnce({ rows: [] });
    const response = await POST(request());
    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toMatchObject({ id: "separate", duplicate: false, possibleMatch: "possible" });
    expect(state.clientQuery).not.toHaveBeenCalled();
  });

  it("places likely sensitive reports into the review queue", async () => {
    state.query.mockResolvedValueOnce({ rows: [] }).mockResolvedValueOnce({ rows: [{ id: "pending" }] }).mockResolvedValueOnce({ rows: [] });
    const response = await POST(request({ description: "Contact private.person@example.com for details" }));
    await expect(response.json()).resolves.toMatchObject({ pendingReview: true });
    expect(state.query.mock.calls[1][1]).toEqual(expect.arrayContaining(["pending_review"]));
  });
});
