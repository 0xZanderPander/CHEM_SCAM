import { drizzle } from "drizzle-orm/node-postgres";
import { Pool, type PoolClient, type QueryResultRow } from "pg";
import * as schema from "./schema";
import { automaticStatus, calculatedStatus } from "@/lib/status";

declare global { var __chemScamPool: Pool | undefined; }

function databaseUrl() {
  const value = process.env.DATABASE_URL?.trim();
  if (!value) throw new Error("DATABASE_URL is required.");
  return value;
}

export function getPool() {
  if (!globalThis.__chemScamPool) {
    globalThis.__chemScamPool = new Pool({
      connectionString: databaseUrl(),
      max: Number(process.env.DATABASE_POOL_MAX || 10),
      idleTimeoutMillis: 30_000,
    });
  }
  return globalThis.__chemScamPool;
}

export function getDb() {
  return drizzle(getPool(), { schema });
}

export async function query<T extends QueryResultRow>(text: string, values: unknown[] = []) {
  return getPool().query<T>(text, values);
}

export async function transaction<T>(work: (client: PoolClient) => Promise<T>) {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const result = await work(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export type ReportStatus = schema.ReportStatus;
export type PublicationState = schema.PublicationState;

export type Report = {
  id: string;
  scammer_name: string;
  website: string | null;
  normalized_domain: string | null;
  domain: string | null;
  description: string;
  nickname: string;
  created_at: string;
  confirmation_count: number;
  confirmations: number;
  duplicate_count: number;
  status: ReportStatus;
  publication_state: PublicationState;
  possible_duplicate_of: string | null;
  removed_at: string | null;
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
  flag_count: number;
  publication_state: PublicationState;
};

export { calculatedStatus };

export async function refreshStatus(reportId: string, client: Pick<PoolClient, "query"> = getPool()) {
  const result = await client.query<{ confirmation_count: number; duplicate_count: number; status: ReportStatus }>(
    "SELECT confirmation_count, duplicate_count, status FROM reports WHERE id = $1",
    [reportId],
  );
  const row = result.rows[0];
  // Disputed is deliberately sticky. Counts still change, but only an explicit
  // admin action may move the report out of this manually selected state.
  if (!row || row.status === "Disputed") return;
  await client.query("UPDATE reports SET status = $1 WHERE id = $2", [automaticStatus(row.status, row.confirmation_count, row.duplicate_count), reportId]);
}
