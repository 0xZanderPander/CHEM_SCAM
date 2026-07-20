import { NextResponse } from "next/server";
import { query, type Comment, type DuplicateReport, type Report } from "@/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const reportResult = await query<Report>(
    `SELECT id, scammer_name, website, normalized_domain, normalized_domain AS domain,
      description, nickname, created_at, confirmation_count, confirmation_count AS confirmations,
      duplicate_count, status, publication_state, possible_duplicate_of, removed_at
     FROM reports WHERE id = $1 AND publication_state = 'published' AND removed_at IS NULL`,
    [id],
  );
  const report = reportResult.rows[0];
  if (!report) return NextResponse.json({ error: "Report not found." }, { status: 404 });
  const [duplicates, comments] = await Promise.all([
    query<DuplicateReport>(
      "SELECT id, report_id, nickname, description, website, created_at FROM duplicate_reports WHERE report_id = $1 AND publication_state = 'published' AND removed_at IS NULL ORDER BY created_at DESC LIMIT 100",
      [id],
    ),
    query<Comment>(
      `SELECT * FROM (
         SELECT id, report_id, nickname, comment, created_at, flag_count, publication_state
         FROM comments
         WHERE report_id = $1 AND publication_state = 'published' AND removed_at IS NULL
         ORDER BY created_at DESC LIMIT 200
       ) AS recent_comments ORDER BY created_at ASC`,
      [id],
    ),
  ]);
  return NextResponse.json({ report, duplicates: duplicates.rows, comments: comments.rows });
}
