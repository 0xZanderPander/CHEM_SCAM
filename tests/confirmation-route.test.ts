import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const state = vi.hoisted(() => ({ clientQuery: vi.fn(), lockCounters: vi.fn(), refreshAggregates: vi.fn() }));
vi.mock("@/lib/rate-limit", () => ({
  RateLimitError: class RateLimitError extends Error {},
  enforceRateLimit: vi.fn(async () => undefined),
}));
vi.mock("@/db", () => ({
  lockReportCounters: state.lockCounters,
  refreshReportAggregates: state.refreshAggregates,
  transaction: vi.fn(async (work: (client: { query: typeof state.clientQuery }) => Promise<unknown>) => work({ query: state.clientQuery })),
}));

import { POST } from "@/app/api/reports/[id]/confirm/route";

function request() {
  return new NextRequest("http://localhost/api/reports/report/confirm", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ browserToken: "opaque-token" }),
  });
}

describe("confirmation target validation", () => {
  beforeEach(() => {
    process.env.CONFIRMATION_SECRET = "confirmation-test-secret";
    state.clientQuery.mockReset();
    state.lockCounters.mockReset();
    state.refreshAggregates.mockReset();
    state.clientQuery.mockImplementation(async (sql: string) => sql.startsWith("SELECT id FROM reports") ? { rows: [{ id: "report" }] } : { rows: [] });
  });

  it("checks the report is published and active before inserting", async () => {
    const response = await POST(request(), { params: Promise.resolve({ id: "report" }) });
    expect(response.status).toBe(200);
    expect(state.clientQuery.mock.calls[0][0]).toContain("publication_state = 'published'");
    expect(state.clientQuery.mock.calls[0][0]).toContain("removed_at IS NULL FOR UPDATE");
    expect(state.clientQuery.mock.calls[1][0]).toContain("INSERT INTO confirmations");
    expect(state.refreshAggregates).toHaveBeenCalledWith("report", expect.anything());
  });

  it("does not confirm removed or unpublished reports", async () => {
    state.clientQuery.mockResolvedValueOnce({ rows: [] });
    const response = await POST(request(), { params: Promise.resolve({ id: "report" }) });
    expect(response.status).toBe(400);
    expect(state.clientQuery).toHaveBeenCalledTimes(1);
    expect(state.refreshAggregates).not.toHaveBeenCalled();
  });
});
