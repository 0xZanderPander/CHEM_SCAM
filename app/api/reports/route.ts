import { NextRequest, NextResponse } from "next/server";
import {
  calculatedStatus,
  ensureDatabase,
  normalizedDomain,
  normalizedName,
  refreshStatus,
  type Report,
} from "@/db";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const db = await ensureDatabase();
  const query = request.nextUrl.searchParams.get("q")?.trim().toLowerCase() ?? "";
  const term = `%${query}%`;
  const result = query
    ? await db
        .prepare(
          `SELECT * FROM reports
           WHERE removed = 0 AND (LOWER(scammer_name) LIKE ? OR LOWER(COALESCE(domain, '')) LIKE ?)
           ORDER BY created_at DESC`,
        )
        .bind(term, term)
        .all<Report>()
    : await db
        .prepare("SELECT * FROM reports WHERE removed = 0 ORDER BY created_at DESC")
        .all<Report>();
  return NextResponse.json({ reports: result.results });
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as Record<string, unknown>;
  const scammerName = String(body.scammerName ?? "").trim().slice(0, 120);
  const website = String(body.website ?? "").trim().slice(0, 500) || null;
  const description = String(body.description ?? "").trim().slice(0, 2000);
  const nickname = String(body.nickname ?? "").trim().slice(0, 50);

  if (!scammerName || !description || !nickname) {
    return NextResponse.json({ error: "Name, explanation, and nickname are required." }, { status: 400 });
  }

  const domain = normalizedDomain(website);
  if (website && !domain) {
    return NextResponse.json({ error: "Please enter a valid website address." }, { status: 400 });
  }

  const db = await ensureDatabase();
  const candidates = await db
    .prepare("SELECT * FROM reports WHERE removed = 0 ORDER BY created_at ASC")
    .all<Report>();
  const normalizedScammerName = normalizedName(scammerName);
  const existing = candidates.results.find(
    (report) => (domain && report.domain === domain) || normalizedName(report.scammer_name) === normalizedScammerName,
  );

  const createdAt = new Date().toISOString();

  if (existing) {
    const duplicateId = crypto.randomUUID();
    await db.batch([
      db
        .prepare(
          `INSERT INTO duplicate_reports (id, report_id, nickname, description, website, created_at)
           VALUES (?, ?, ?, ?, ?, ?)`,
        )
        .bind(duplicateId, existing.id, nickname, description, website, createdAt),
      db
        .prepare("UPDATE reports SET duplicate_count = duplicate_count + 1 WHERE id = ?")
        .bind(existing.id),
    ]);
    await refreshStatus(existing.id);
    return NextResponse.json({ id: existing.id, duplicate: true }, { status: 201 });
  }

  const id = crypto.randomUUID();
  const status = calculatedStatus(0, 0);
  await db
    .prepare(
      `INSERT INTO reports
       (id, scammer_name, website, domain, description, nickname, created_at, confirmations, duplicate_count, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0, ?)`,
    )
    .bind(id, scammerName, website, domain, description, nickname, createdAt, status)
    .run();

  return NextResponse.json({ id, duplicate: false }, { status: 201 });
}
