import { afterEach, describe, expect, it, vi } from "vitest";
import { validateProductionEnvironment } from "@/lib/env";

describe("test environment isolation", () => {
  it("never runs the suite as production, whatever the shell exports", () => {
    // Regression guard: an exported NODE_ENV=production leaked into the suite
    // and tripped the production secret checks inside unrelated route tests,
    // failing eight suites for reasons unconnected to the code under test.
    expect(process.env.NODE_ENV).toBe("test");
  });
});

describe("production environment validation", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("rejects placeholder production secrets at startup", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("DATABASE_URL", "postgresql://user:password@postgres/db");
    vi.stubEnv("ADMIN_PASSWORD", "replace-with-a-password");
    vi.stubEnv("ADMIN_SESSION_SECRET", "replace-with-a-secret");
    vi.stubEnv("CONFIRMATION_SECRET", "replace-with-a-secret");
    vi.stubEnv("RATE_LIMIT_SECRET", "replace-with-a-secret");
    vi.stubEnv("SITE_URL", "https://example.com");
    expect(() => validateProductionEnvironment()).toThrow(/securely configured/);
  });

  it("accepts a complete production configuration", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("DATABASE_URL", "postgresql://user:strong-secret@postgres/db");
    vi.stubEnv("ADMIN_PASSWORD", "a long independent administrator password");
    vi.stubEnv("ADMIN_SESSION_SECRET", "a".repeat(40));
    vi.stubEnv("CONFIRMATION_SECRET", "b".repeat(40));
    vi.stubEnv("RATE_LIMIT_SECRET", "c".repeat(40));
    vi.stubEnv("SITE_URL", "https://reports.example");
    expect(() => validateProductionEnvironment()).not.toThrow();
  });
});
