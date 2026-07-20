import { drizzle } from "drizzle-orm/node-postgres";
import { Pool, type PoolClient, type QueryResultRow } from "pg";
import * as schema from "./schema";
import { calculatedStatus } from "@/lib/status";

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
export type DisputeResolutionType = schema.DisputeResolutionType;

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

export type QueryClient = Pick<PoolClient, "query">;

export async function lockReportCounters(reportId: string, client: QueryClient) {
  // All transactions that mutate confirmations or supporting accounts take
  // the same per-report lock before changing source rows or cached counts.
  await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1, 0))", [`report-counters:${reportId}`]);
}

export async function refreshReportAggregates(reportId: string, client: QueryClient = getPool()) {
  await client.query(
    `WITH aggregate_counts AS (
       SELECT
         (SELECT COUNT(*)::int FROM confirmations WHERE report_id = $1) AS confirmation_count,
         (SELECT COUNT(*)::int FROM duplicate_reports
          WHERE report_id = $1 AND publication_state = 'published' AND removed_at IS NULL) AS duplicate_count
     )
     UPDATE reports AS report
     SET confirmation_count = counts.confirmation_count,
         duplicate_count = counts.duplicate_count,
         status = CASE
           WHEN report.status = 'Disputed' THEN 'Disputed'
           WHEN counts.duplicate_count >= 2 THEN 'Repeatedly Reported'
           WHEN counts.confirmation_count >= 3 THEN 'Community Confirmed'
           ELSE 'Unverified'
         END
     FROM aggregate_counts AS counts
     WHERE report.id = $1`,
    [reportId],
  );
}
