import { NextRequest, NextResponse } from "next/server";
import { ensureDatabase } from "@/db";

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const body = (await request.json()) as Record<string, unknown>;
  const nickname = String(body.nickname ?? "").trim().slice(0, 50);
  const comment = String(body.comment ?? "").trim().slice(0, 1000);
  if (!nickname || !comment) {
    return NextResponse.json({ error: "Nickname and comment are required." }, { status: 400 });
  }
  const db = await ensureDatabase();
  const report = await db.prepare("SELECT id FROM reports WHERE id = ? AND removed = 0").bind(id).first();
  if (!report) return NextResponse.json({ error: "Report not found." }, { status: 404 });
  await db
    .prepare("INSERT INTO comments (id, report_id, nickname, comment, created_at) VALUES (?, ?, ?, ?, ?)")
    .bind(crypto.randomUUID(), id, nickname, comment, new Date().toISOString())
    .run();
  return NextResponse.json({ ok: true }, { status: 201 });
}

