import { NextResponse } from "next/server";
import { ensureDatabase } from "@/db";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const db = await ensureDatabase();
  await db.prepare("UPDATE comments SET flagged = 1 WHERE id = ?").bind(id).run();
  return NextResponse.json({ ok: true });
}

