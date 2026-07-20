import { NextResponse } from "next/server";
import { ensureDatabase, type Comment, type DuplicateReport, type Report } from "@/db";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const db = await ensureDatabase();
  const report = await db
    .prepare("SELECT * FROM reports WHERE id = ? AND removed = 0")
    .bind(id)
    .first<Report>();
  if (!report) return NextResponse.json({ error: "Report not found." }, { status: 404 });

  const [duplicates, comments] = await Promise.all([
    db
      .prepare("SELECT * FROM duplicate_reports WHERE report_id = ? ORDER BY created_at DESC")
      .bind(id)
      .all<DuplicateReport>(),
    db
      .prepare("SELECT * FROM comments WHERE report_id = ? AND removed = 0 ORDER BY created_at ASC")
      .bind(id)
      .all<Comment>(),
  ]);
  return NextResponse.json({ report, duplicates: duplicates.results, comments: comments.results });
}

