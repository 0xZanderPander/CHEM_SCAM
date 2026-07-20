import { cookies } from "next/headers";

export const ADMIN_COOKIE = "chem_scam_admin";

function configuredPassword() {
  return process.env.ADMIN_PASSWORD?.trim() || "";
}

export async function passwordToken(password: string) {
  const bytes = new TextEncoder().encode(`chem-scam:${password}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function validAdminPassword(password: string) {
  const expected = configuredPassword();
  return Boolean(expected) && password === expected;
}

export async function isAdmin() {
  const expected = configuredPassword();
  if (!expected) return false;
  const cookieStore = await cookies();
  return cookieStore.get(ADMIN_COOKIE)?.value === (await passwordToken(expected));
}

