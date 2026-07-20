import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { readFile } from "node:fs/promises";

const state = vi.hoisted(() => ({ query: vi.fn() }));
vi.mock("@/lib/rate-limit", () => ({
  RateLimitError: class RateLimitError extends Error {},
  enforceRateLimit: vi.fn(async () => undefined),
}));
vi.mock("@/db", () => ({ query: state.query }));

import { POST } from "@/app/api/disputes/route";
import { requestCategories } from "@/db/schema";

function request(body: Record<string, unknown>) {
  return new NextRequest("http://localhost/api/disputes", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ message: "Please review this listing.", startedAt: Date.now() - 60_000, ...body }),
  });
}

describe("contact request categories", () => {
  beforeEach(() => {
    state.query.mockReset();
    state.query.mockResolvedValue({ rows: [] });
  });

  it("stores the submitted category", async () => {
    const response = await POST(request({ category: "removal" }));
    expect(response.status).toBe(201);
    const insert = state.query.mock.calls.find(([sql]) => String(sql).includes("INSERT INTO dispute_requests"));
    expect(insert?.[0]).toContain("category");
    expect(insert?.[1]).toContain("removal");
  });

  it("defaults to general when no category is supplied", async () => {
    await POST(request({}));
    const insert = state.query.mock.calls.find(([sql]) => String(sql).includes("INSERT INTO dispute_requests"));
    expect(insert?.[1]).toContain("general");
  });

  it("rejects an unrecognised category rather than silently coercing it", async () => {
    const response = await POST(request({ category: "urgent-please-help" }));
    expect(response.status).toBe(400);
    expect(state.query.mock.calls.some(([sql]) => String(sql).includes("INSERT INTO"))).toBe(false);
  });

  it("accepts every category the schema allows", async () => {
    for (const category of requestCategories) {
      state.query.mockClear();
      const response = await POST(request({ category }));
      expect(response.status, `category ${category} should be accepted`).toBe(201);
    }
  });
});

describe("contact category migration", () => {
  it("adds the column with a default and a matching check constraint", async () => {
    const sql = await readFile(new URL("../drizzle/0002_contact_request_categories.sql", import.meta.url), "utf8");
    expect(sql).toContain('ADD COLUMN "category" text DEFAULT \'general\' NOT NULL');
    expect(sql).toContain("dispute_requests_category_check");
    // The database constraint and the application allow-list must not drift.
    for (const category of requestCategories) expect(sql).toContain(`'${category}'`);
  });
});
