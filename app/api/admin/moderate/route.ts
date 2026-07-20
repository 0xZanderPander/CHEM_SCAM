import { NextResponse } from "next/server";
import { ensureDatabase, refreshStatus, type Report } from "@/db";
import { isAdmin } from "@/lib/admin";

export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const db = await ensureDatabase();
  const [reports, comments] = await Promise.all([
    db.prepare("SELECT * FROM reports WHERE removed = 0 ORDER BY created_at DESC").all<Report>(),
    db.prepare("SELECT * FROM comments WHERE removed = 0 ORDER BY flagged DESC, created_at DESC").all(),
  ]);
  return NextResponse.json({ reports: reports.results, comments: comments.results });
}

export async function POST(request: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const body = (await request.json()) as { action?: string; id?: string; targetId?: string };
  const db = await ensureDatabase();
  if (!body.id) return NextResponse.json({ error: "Missing item." }, { status: 400 });

  switch (body.action) {
    case "remove-report":
      await db.prepare("UPDATE reports SET removed = 1 WHERE id = ?").bind(body.id).run();
      break;
    case "remove-comment":
      await db.prepare("UPDATE comments SET removed = 1 WHERE id = ?").bind(body.id).run();
      break;
    case "dispute":
      await db.prepare("UPDATE reports SET status = 'Disputed' WHERE id = ?").bind(body.id).run();
      break;
    case "merge": {
      if (!body.targetId || body.targetId === body.id) {
        return NextResponse.json({ error: "Choose a different target report." }, { status: 400 });
      }
      const source = await db.prepare("SELECT * FROM reports WHERE id = ? AND removed = 0").bind(body.id).first<Report>();
      if (!source) return NextResponse.json({ error: "Source report not found." }, { status: 404 });
      await db.batch([
        db
          .prepare("INSERT INTO duplicate_reports (id, report_id, nickname, description, website, created_at) VALUES (?, ?, ?, ?, ?, ?)")
          .bind(crypto.randomUUID(), body.targetId, source.nickname, source.description, source.website, source.created_at),
        db
          .prepare("UPDATE duplicate_reports SET report_id = ? WHERE report_id = ?")
          .bind(body.targetId, body.id),
        db.prepare("UPDATE comments SET report_id = ? WHERE report_id = ?").bind(body.targetId, body.id),
        db
          .prepare("UPDATE reports SET duplicate_count = duplicate_count + ? + 1, confirmations = confirmations + ? WHERE id = ?")
          .bind(source.duplicate_count, source.confirmations, body.targetId),
        db.prepare("UPDATE reports SET removed = 1 WHERE id = ?").bind(body.id),
      ]);
      await refreshStatus(body.targetId);
      break;
    }
    default:
      return NextResponse.json({ error: "Unknown moderation action." }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}

