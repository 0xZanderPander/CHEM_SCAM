import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const state = vi.hoisted(() => ({
  authenticated: true,
  csrf: true,
  query: vi.fn(),
  clientQuery: vi.fn(),
  refreshStatus: vi.fn(),
}));

vi.mock("@/lib/admin", () => ({ isAdminRequest: vi.fn(async () => state.authenticated) }));
vi.mock("@/lib/security", () => ({ csrfValid: vi.fn(() => state.csrf) }));
vi.mock("@/db", () => ({
  query: state.query,
  refreshStatus: state.refreshStatus,
  transaction: vi.fn(async (work: (client: { query: typeof state.clientQuery }) => Promise<unknown>) => work({ query: state.clientQuery })),
}));

import { POST } from "@/app/api/admin/moderate/route";

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
    state.refreshStatus.mockReset();
    state.clientQuery.mockResolvedValue({ rows: [] });
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

  it("merges supporting data and recalculates the target", async () => {
    state.clientQuery.mockImplementation(async (sql: string) => {
      if (sql.startsWith("SELECT * FROM reports")) return { rows: [{ id: "source", nickname: "Goose", description: "Account", website: null, created_at: new Date() }] };
      return { rows: [] };
    });
    const response = await POST(request({ action: "merge", id: "source", targetId: "target" }));
    expect(response.status).toBe(200);
    expect(state.clientQuery.mock.calls.some(([sql]) => String(sql).includes("INSERT INTO confirmations") && String(sql).includes("ON CONFLICT DO NOTHING"))).toBe(true);
    expect(state.refreshStatus).toHaveBeenCalledWith("target", expect.anything());
  });
});
