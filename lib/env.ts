export function validateProductionEnvironment() {
  if (process.env.NODE_ENV !== "production") return;
  for (const name of ["DATABASE_URL", "ADMIN_PASSWORD", "ADMIN_SESSION_SECRET", "CONFIRMATION_SECRET", "RATE_LIMIT_SECRET", "SITE_URL"] as const) {
    const value = process.env[name]?.trim();
    if (!value || /replace-with|change-me|password@/i.test(value)) throw new Error(`${name} must be securely configured in production.`);
    if (["ADMIN_SESSION_SECRET", "CONFIRMATION_SECRET", "RATE_LIMIT_SECRET"].includes(name) && value.length < 32) {
      throw new Error(`${name} must be at least 32 characters in production.`);
    }
  }
}
