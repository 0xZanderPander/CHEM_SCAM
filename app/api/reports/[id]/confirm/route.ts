import { NextRequest, NextResponse } from "next/server";
import { ensureDatabase, refreshStatus } from "@/db";

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const body = (await request.json().catch(() => ({}))) as { fingerprint?: string };
  const fingerprint = String(body.fingerprint ?? "").slice(0, 100);
  if (!fingerprint) return NextResponse.json({ error: "Missing browser confirmation." }, { status: 400 });

  const db = await ensureDatabase();
  try {
    await db.batch([
      db
        .prepare("INSERT INTO confirmations (report_id, fingerprint, created_at) VALUES (?, ?, ?)")
        .bind(id, fingerprint, new Date().toISOString()),
      db.prepare("UPDATE reports SET confirmations = confirmations + 1 WHERE id = ?").bind(id),
    ]);
  } catch {
    return NextResponse.json({ error: "You already confirmed this report from this browser." }, { status: 409 });
  }
  await refreshStatus(id);
  return NextResponse.json({ ok: true });
}

