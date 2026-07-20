import { describe, expect, it } from "vitest";
import { refreshReportAggregates } from "@/db";

describe("report aggregate refresh", () => {
  it("counts only published, non-removed supporting accounts and preserves Disputed", async () => {
    const calls: Array<[string, unknown[]]> = [];
    const query = async (sql: string, values: unknown[] = []) => { calls.push([sql, values]); return { rows: [] }; };
    await refreshReportAggregates("report", { query } as never);
    const sql = calls[0][0];
    expect(sql).toContain("publication_state = 'published'");
    expect(sql).toContain("removed_at IS NULL");
    expect(sql).toContain("WHEN report.status = 'Disputed' THEN 'Disputed'");
    expect(sql).toContain("WHEN counts.duplicate_count >= 2 THEN 'Repeatedly Reported'");
    expect(calls[0][1]).toEqual(["report"]);
  });
});
