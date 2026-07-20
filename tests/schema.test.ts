import { describe, expect, it } from "vitest";
import { getTableConfig } from "drizzle-orm/pg-core";
import { adminSessions, commentFlags, confirmations, disputeRequests, moderationEvents, rateLimits, reports } from "@/db/schema";

describe("PostgreSQL privacy and moderation schema", () => {
  it("enforces one confirmation per report and browser hash", () => {
    const primary = getTableConfig(confirmations).primaryKeys[0];
    expect(primary.columns.map((column) => column.name)).toEqual(["report_id", "confirmation_hash"]);
  });

  it("enforces one flag per comment and browser hash", () => {
    const primary = getTableConfig(commentFlags).primaryKeys[0];
    expect(primary.columns.map((column) => column.name)).toEqual(["comment_id", "flagger_hash"]);
  });

  it("stores only hashed session and rate-limit identifiers", () => {
    expect(Object.keys(adminSessions)).toContain("tokenHash");
    expect(Object.keys(rateLimits)).toContain("requesterHash");
    expect(Object.keys(adminSessions)).not.toContain("token");
    expect(Object.keys(rateLimits)).not.toContain("ip");
  });

  it("supports soft removal, audit events, and dispute requests", () => {
    expect(Object.keys(reports)).toEqual(expect.arrayContaining(["publicationState", "removedAt", "possibleDuplicateOf"]));
    expect(Object.keys(moderationEvents)).toEqual(expect.arrayContaining(["action", "targetType", "targetId", "metadata"]));
    expect(Object.keys(disputeRequests)).toEqual(expect.arrayContaining(["reportId", "contactInfo", "message", "resolved", "resolvedAt", "resolvedNote", "resolutionType"]));
  });
});
