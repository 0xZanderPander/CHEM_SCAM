import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";

describe("forward hardening migration", () => {
  it("adds dispute resolution and safely backfills aggregate counts/status", async () => {
    const sql = await readFile(new URL("../drizzle/0001_thin_scorpion.sql", import.meta.url), "utf8");
    expect(sql).toContain('ADD COLUMN "resolution_type"');
    expect(sql).toContain('FROM "confirmations" WHERE "report_id" = report."id"');
    expect(sql).toContain('"publication_state" = \'published\'');
    expect(sql).toContain('"removed_at" IS NULL');
    expect(sql).toContain('WHERE "status" <> \'Disputed\'');
    expect(sql).toContain('FROM "comment_flags" WHERE "comment_id" = comment."id"');
  });
});
