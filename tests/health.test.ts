import { beforeEach, describe, expect, it, vi } from "vitest";

const database = vi.hoisted(() => ({ query: vi.fn() }));
vi.mock("@/db", () => database);

import { GET } from "@/app/api/health/route";

describe("health endpoint", () => {
  beforeEach(() => database.query.mockReset());

  it("reports healthy only when PostgreSQL is reachable", async () => {
    database.query.mockResolvedValueOnce({ rows: [{ ok: 1 }] });
    const response = await GET();
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ status: "ok" });
    expect(database.query).toHaveBeenCalledWith("SELECT 1");
  });

  it("returns 503 without leaking the database error", async () => {
    database.query.mockRejectedValueOnce(new Error("password secret"));
    const response = await GET();
    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({ status: "unavailable" });
  });
});
