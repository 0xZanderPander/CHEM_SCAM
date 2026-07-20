import { beforeEach, describe, expect, it } from "vitest";
import { automaticStatus, calculatedStatus, countActiveDuplicates } from "@/lib/status";
import { findDuplicateCandidates } from "@/lib/duplicates";
import { browserTokenHash, csrfValid, hmacHex } from "@/lib/security";
import { sessionIsActive, sessionShouldBeCleaned, validAdminPassword } from "@/lib/admin";
import { rateLimitExceeded } from "@/lib/rate-limit";
import { publicWebsiteHref } from "@/lib/urls";
import {
  PublicInputError,
  normalizedDomain,
  safeWebsite,
  screenSensitiveContent,
  validateBotFields,
} from "@/lib/validation";

beforeEach(() => {
  process.env.ADMIN_PASSWORD = "correct horse battery staple";
  process.env.ADMIN_SESSION_SECRET = "admin-test-secret";
  process.env.CONFIRMATION_SECRET = "confirmation-test-secret";
  process.env.RATE_LIMIT_SECRET = "rate-test-secret";
});

describe("report input and duplicate decisions", () => {
  it("normalizes URL hosts without ports, paths, queries, fragments, case, or www", () => {
    expect(normalizedDomain("HTTPS://WWW.Example.COM:8443/a?b=1#c")).toBe("example.com");
    expect(normalizedDomain("münich.example/path")).toBe("xn--mnich-kva.example");
  });

  it("rejects malformed and dangerous website schemes", () => {
    expect(() => safeWebsite("javascript:alert(1)")).toThrow(PublicInputError);
    expect(() => safeWebsite("http://[not-valid")).toThrow(PublicInputError);
    expect(() => safeWebsite("https://user:secret@example.com")).toThrow(PublicInputError);
  });

  it("accepts an HTTP website and returns a normalized domain", () => {
    expect(safeWebsite("example.com/path")).toEqual({ website: "https://example.com/path", normalizedDomain: "example.com" });
  });

  it("never renders non-HTTP stored URLs", () => {
    expect(publicWebsiteHref("https://example.com/path")).toBe("https://example.com/path");
    expect(publicWebsiteHref("javascript:alert(1)")).toBeNull();
    expect(publicWebsiteHref("https://user:secret@example.com")).toBeNull();
    expect(publicWebsiteHref("not a URL")).toBeNull();
  });

  it("selects an exact domain for automatic attachment", () => {
    const reports = [{ id: "domain", scammer_name: "Different name", normalized_domain: "example.com" }];
    expect(findDuplicateCandidates(reports, "New name", "example.com").domainMatch?.id).toBe("domain");
  });

  it("keeps a name-only match separate for review", () => {
    const reports = [{ id: "name", scammer_name: "Generic Supplier", normalized_domain: "one.example" }];
    const match = findDuplicateCandidates(reports, " generic supplier ", "two.example");
    expect(match.domainMatch).toBeUndefined();
    expect(match.nameMatch?.id).toBe("name");
  });

  it("rejects honeypots and implausibly fast forms", () => {
    expect(() => validateBotFields({ company: "bot", startedAt: Date.now() - 10_000 }, 1_000)).toThrow(PublicInputError);
    expect(() => validateBotFields({ company: "", startedAt: Date.now() }, 1_000)).toThrow(PublicInputError);
    expect(() => validateBotFields({ company: "", startedAt: Date.now() - 2_000 }, 1_000)).not.toThrow();
  });

  it("queues likely sensitive data for moderation", () => {
    expect(screenSensitiveContent("Contact jane@example.com", "I will hurt them")).toEqual(expect.arrayContaining(["possible email address", "possible threat"]));
    expect(screenSensitiveContent("Ordinary supplier experience")).toEqual([]);
  });
});

describe("privacy tokens and uniqueness inputs", () => {
  it("hashes confirmation tokens consistently without storing the raw token", () => {
    const first = browserTokenHash("opaque-browser-token", "confirmation");
    expect(first).toBe(browserTokenHash("opaque-browser-token", "confirmation"));
    expect(first).not.toContain("opaque-browser-token");
    expect(first).toHaveLength(64);
  });

  it("domain-separates confirmation and flag hashes", () => {
    expect(browserTokenHash("same-token", "confirmation")).not.toBe(browserTokenHash("same-token", "comment-flag"));
  });

  it("changes keyed identifiers when the secret changes", () => {
    expect(hmacHex("one", "value")).not.toBe(hmacHex("two", "value"));
  });
});

describe("status, sessions, admin protection, and limits", () => {
  it("applies confirmation and duplicate thresholds", () => {
    expect(calculatedStatus(3, 0)).toBe("Community Confirmed");
    expect(calculatedStatus(10, 2)).toBe("Repeatedly Reported");
  });

  it("keeps Disputed sticky as confirmations and duplicates arrive", () => {
    expect(automaticStatus("Disputed", 100, 100)).toBe("Disputed");
    expect(automaticStatus("Unverified", 3, 0)).toBe("Community Confirmed");
  });

  it("does not count pending duplicates or promote their report", () => {
    const onePending = [{ publicationState: "pending_review", removedAt: null }];
    const twoPending = [...onePending, ...onePending];
    expect(countActiveDuplicates(onePending)).toBe(0);
    expect(countActiveDuplicates(twoPending)).toBe(0);
    expect(automaticStatus("Unverified", 0, countActiveDuplicates(twoPending))).toBe("Unverified");
  });

  it("updates counts and status as duplicates are published and removed", () => {
    const rows: Array<{ publicationState: string; removedAt: Date | null }> = [
      { publicationState: "published", removedAt: null },
      { publicationState: "published", removedAt: null },
    ];
    expect(countActiveDuplicates(rows)).toBe(2);
    expect(automaticStatus("Unverified", 0, countActiveDuplicates(rows))).toBe("Repeatedly Reported");
    rows[1] = { publicationState: "removed", removedAt: new Date() };
    expect(countActiveDuplicates(rows)).toBe(1);
    expect(automaticStatus("Repeatedly Reported", 0, countActiveDuplicates(rows))).toBe("Unverified");
    expect(automaticStatus("Disputed", 0, countActiveDuplicates(rows))).toBe("Disputed");
  });

  it("compares the configured admin password", async () => {
    await expect(validAdminPassword("correct horse battery staple")).resolves.toBe(true);
    await expect(validAdminPassword("wrong")).resolves.toBe(false);
  });

  it("rejects expired and revoked sessions", () => {
    const now = new Date("2026-01-01T00:00:00Z");
    expect(sessionIsActive(new Date("2026-01-01T01:00:00Z"), null, now)).toBe(true);
    expect(sessionIsActive(new Date("2025-12-31T23:00:00Z"), null, now)).toBe(false);
    expect(sessionIsActive(new Date("2026-01-01T01:00:00Z"), now, now)).toBe(false);
  });

  it("cleans only sessions older than the retention window", () => {
    const now = new Date("2026-01-10T00:00:00Z");
    expect(sessionShouldBeCleaned(new Date("2026-01-02T00:00:00Z"), null, now, 7)).toBe(true);
    expect(sessionShouldBeCleaned(new Date("2026-01-10T01:00:00Z"), new Date("2026-01-02T00:00:00Z"), now, 7)).toBe(true);
    expect(sessionShouldBeCleaned(new Date("2026-01-09T00:00:00Z"), null, now, 7)).toBe(false);
    expect(sessionShouldBeCleaned(new Date("2026-01-10T01:00:00Z"), new Date("2026-01-09T00:00:00Z"), now, 7)).toBe(false);
  });

  it("enforces the configured limit boundary", () => {
    expect(rateLimitExceeded(4, 5)).toBe(false);
    expect(rateLimitExceeded(5, 5)).toBe(true);
  });

  it("requires matching CSRF cookie and header", () => {
    const request = { cookies: { get: () => ({ value: "token" }) }, headers: new Headers({ "x-csrf-token": "token" }) };
    expect(csrfValid(request as never)).toBe(true);
    request.headers.set("x-csrf-token", "wrong");
    expect(csrfValid(request as never)).toBe(false);
  });
});
