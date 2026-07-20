import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const state = vi.hoisted(() => ({
  authenticated: true,
  csrf: true,
  query: vi.fn(),
  clientQuery: vi.fn(),
  refreshAggregates: vi.fn(),
  lockCounters: vi.fn(),
}));

vi.mock("@/lib/admin", () => ({ isAdminRequest: vi.fn(async () => state.authenticated) }));
vi.mock("@/lib/security", () => ({ csrfValid: vi.fn(() => state.csrf) }));
vi.mock("@/db", () => ({
  query: state.query,
  refreshReportAggregates: state.refreshAggregates,
  lockReportCounters: state.lockCounters,
  transaction: vi.fn(async (work: (client: { query: typeof state.clientQuery }) => Promise<unknown>) => work({ query: state.clientQuery })),
}));

import { GET, POST } from "@/app/api/admin/moderate/route";

function request(body: object) {
  return new NextRequest("http://localhost/api/admin/moderate", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("admin moderation actions", () => {
  beforeEach(() => {
    state.authenticated = true;
    state.csrf = true;
    state.query.mockReset();
    state.clientQuery.mockReset();
    state.refreshAggregates.mockReset();
    state.lockCounters.mockReset();
    state.clientQuery.mockImplementation(async (sql: string, values?: unknown[]) => {
      if (sql.startsWith("SELECT * FROM reports")) {
        const id = values?.[0] as string;
        return { rows: [{ id, nickname: "Goose", description: "Account", website: null, created_at: new Date(), publication_state: "published" }] };
      }
      if (sql.startsWith("SELECT report_id FROM duplicate_reports")) return { rows: [{ report_id: "parent" }] };
      if (sql.includes("UPDATE duplicate_reports") && sql.includes("RETURNING report_id")) return { rows: [{ report_id: "parent" }] };
      if (sql.startsWith("SELECT id, report_id, resolved FROM dispute_requests")) return { rows: [{ id: "d1", report_id: "r1", resolved: false }] };
      if (sql.includes("RETURNING id")) return { rows: [{ id: values?.at(-1) || values?.[0] || "changed" }] };
      return { rows: [] };
    });
  });

  it("rejects unauthenticated and missing-CSRF destructive actions", async () => {
    state.authenticated = false;
    expect((await POST(request({ action: "remove-report", id: "r1" }))).status).toBe(403);
    state.authenticated = true;
    state.csrf = false;
    expect((await POST(request({ action: "remove-report", id: "r1" }))).status).toBe(403);
    expect(state.clientQuery).not.toHaveBeenCalled();
  });

  it("soft-removes reports and comments", async () => {
    expect((await POST(request({ action: "remove-report", id: "r1" }))).status).toBe(200);
    expect(state.clientQuery.mock.calls.some(([sql]) => String(sql).includes("UPDATE reports SET publication_state = 'removed'"))).toBe(true);
    state.clientQuery.mockClear();
    expect((await POST(request({ action: "remove-comment", id: "c1" }))).status).toBe(200);
    expect(state.clientQuery.mock.calls.some(([sql]) => String(sql).includes("UPDATE comments SET publication_state = 'removed'"))).toBe(true);
  });

  it("publishes and removes supporting accounts with aggregate refresh", async () => {
    expect((await POST(request({ action: "publish-duplicate", id: "d1" }))).status).toBe(200);
    expect(state.lockCounters).toHaveBeenCalledWith("parent", expect.anything());
    expect(state.refreshAggregates).toHaveBeenCalledWith("parent", expect.anything());
    state.refreshAggregates.mockClear();
    expect((await POST(request({ action: "remove-duplicate", id: "d1" }))).status).toBe(200);
    expect(state.refreshAggregates).toHaveBeenCalledWith("parent", expect.anything());
    expect(state.clientQuery.mock.calls.some(([sql]) => String(sql).includes("removed_at = NOW()") && String(sql).includes("duplicate_reports"))).toBe(true);
  });

  it("merges supporting data and recalculates only the target", async () => {
    const response = await POST(request({ action: "merge", id: "source", targetId: "target" }));
    expect(response.status).toBe(200);
    expect(state.clientQuery.mock.calls.some(([sql]) => String(sql).includes("INSERT INTO confirmations") && String(sql).includes("ON CONFLICT DO NOTHING"))).toBe(true);
    expect(state.clientQuery.mock.calls.some(([sql]) => String(sql).includes("publication_state") && String(sql).includes("INSERT INTO duplicate_reports"))).toBe(true);
    expect(state.refreshAggregates).toHaveBeenCalledWith("target", expect.anything());
  });

  it("requires a resolution type and note", async () => {
    expect((await POST(request({ action: "resolve-dispute", id: "d1", resolutionType: "no_action", note: "" }))).status).toBe(400);
    expect((await POST(request({ action: "resolve-dispute", id: "d1", resolutionType: "invalid", note: "Reviewed" }))).status).toBe(400);
  });

  it("marks a linked report disputed in the same dispute transaction", async () => {
    const response = await POST(request({ action: "resolve-dispute", id: "d1", resolutionType: "report_marked_disputed", note: "Identity evidence reviewed." }));
    expect(response.status).toBe(200);
    expect(state.clientQuery.mock.calls.some(([sql]) => String(sql).includes("SET status = 'Disputed'"))).toBe(true);
    expect(state.clientQuery.mock.calls.some(([sql]) => String(sql).includes("resolution_type = $1"))).toBe(true);
    expect(state.clientQuery.mock.calls.filter(([sql]) => String(sql).includes("INSERT INTO moderation_events")).length).toBeGreaterThanOrEqual(2);
  });

  it("soft-removes a linked report for a report-removed resolution", async () => {
    const response = await POST(request({ action: "resolve-dispute", id: "d1", resolutionType: "report_removed", note: "Removal policy applied." }));
    expect(response.status).toBe(200);
    expect(state.clientQuery.mock.calls.some(([sql]) => String(sql).includes("publication_state = 'removed'") && String(sql).includes("UPDATE reports"))).toBe(true);
  });
});

describe("admin bounded reads", () => {
  beforeEach(() => {
    state.authenticated = true;
    state.query.mockReset();
    state.query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ count: 101 }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ count: 3 }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ id: "e1", action: "remove-report", target_type: "report", target_id: "r1", created_at: new Date().toISOString(), metadata: { note: "Reviewed", requesterHash: "must-not-leak" } }] })
      .mockResolvedValueOnce({ rows: [] });
  });

  it("paginates and filters reports/comments while bounding audit history", async () => {
    const response = await GET(new NextRequest("http://localhost/api/admin/moderate?reportPage=2&commentPage=1&pageSize=1000&reportFilter=disputed&commentFilter=flagged"));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.pagination).toMatchObject({ reportPage: 2, pageSize: 100, reportFilter: "disputed", commentFilter: "flagged" });
    expect(body.moderationEvents[0].metadata_summary).toBe("note: Reviewed");
    expect(JSON.stringify(body)).not.toContain("must-not-leak");
    expect(state.query.mock.calls[0][0]).toContain("status = 'Disputed'");
    expect(state.query.mock.calls[0][0]).toContain("LIMIT $1 OFFSET $2");
    expect(state.query.mock.calls[0][1]).toEqual([100, 100]);
    expect(state.query.mock.calls[2][0]).toContain("flag_count > 0");
    expect(state.query.mock.calls[6][0]).toContain("LIMIT 50");
  });
});
