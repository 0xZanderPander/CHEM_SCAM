import { env } from "cloudflare:workers";
import { schemaStatements } from "./schema";

export type ReportStatus =
  | "Unverified"
  | "Community Confirmed"
  | "Repeatedly Reported"
  | "Disputed";

export type Report = {
  id: string;
  scammer_name: string;
  website: string | null;
  domain: string | null;
  description: string;
  nickname: string;
  created_at: string;
  confirmations: number;
  duplicate_count: number;
  status: ReportStatus;
};

export type DuplicateReport = {
  id: string;
  report_id: string;
  nickname: string;
  description: string;
  website: string | null;
  created_at: string;
};

export type Comment = {
  id: string;
  report_id: string;
  nickname: string;
  comment: string;
  created_at: string;
  flagged: number;
};

function database() {
  const db = env.DB;
  if (!db) throw new Error("Database binding DB is unavailable.");
  return db;
}

let ready: Promise<void> | null = null;

export function getDb() {
  return database();
}

export async function ensureDatabase() {
  if (!ready) {
    ready = (async () => {
      const db = database();
      await db.batch(schemaStatements.map((sql) => db.prepare(sql)));
    })().catch((error) => {
      ready = null;
      throw error;
    });
  }
  await ready;
  return database();
}

export function normalizedDomain(value?: string | null) {
  if (!value?.trim()) return null;
  try {
    const withProtocol = /^https?:\/\//i.test(value) ? value : `https://${value}`;
    return new URL(withProtocol).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return null;
  }
}

export function normalizedName(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

export function calculatedStatus(confirmations: number, duplicates: number): ReportStatus {
  if (duplicates >= 2) return "Repeatedly Reported";
  if (confirmations >= 3) return "Community Confirmed";
  return "Unverified";
}

export async function refreshStatus(reportId: string) {
  const db = await ensureDatabase();
  const row = await db
    .prepare("SELECT confirmations, duplicate_count, status FROM reports WHERE id = ?")
    .bind(reportId)
    .first<{ confirmations: number; duplicate_count: number; status: ReportStatus }>();
  if (!row || row.status === "Disputed") return;
  const status = calculatedStatus(row.confirmations, row.duplicate_count);
  await db.prepare("UPDATE reports SET status = ? WHERE id = ?").bind(status, reportId).run();
}

