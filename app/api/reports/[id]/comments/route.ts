import { NextRequest, NextResponse } from "next/server";
import { transaction } from "@/db";
import { enforceRateLimit, RateLimitError } from "@/lib/rate-limit";
import { cleanText, limits, PublicInputError, readJsonBody, screenSensitiveContent, validateBotFields } from "@/lib/validation";

export const runtime = "nodejs";

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  try {
    await enforceRateLimit(request, "comments");
    const body = await readJsonBody(request);
    validateBotFields(body);
    const nickname = cleanText(body.nickname, limits.nickname, "Nickname");
    const comment = cleanText(body.comment, limits.comment, "Comment");
    const reasons = screenSensitiveContent(nickname, comment);
    const state = reasons.length ? "pending_review" : "published";
    await transaction(async (client) => {
      const report = await client.query(
        "SELECT id FROM reports WHERE id = $1 AND publication_state = 'published' AND removed_at IS NULL FOR UPDATE",
        [id],
      );
      if (!report.rows[0]) throw new PublicInputError("Report not found.");
      const created = await client.query<{ id: string }>(
        "INSERT INTO comments (report_id, nickname, comment, publication_state) VALUES ($1, $2, $3, $4) RETURNING id",
        [id, nickname, comment, state],
      );
      if (reasons.length) await client.query(
        "INSERT INTO moderation_events (action, target_type, target_id, metadata) VALUES ('auto_pending_review', 'comment', $1, $2)",
        [created.rows[0].id, JSON.stringify({ reasons, reportId: id })],
      );
    });
    return NextResponse.json({ ok: true, pendingReview: Boolean(reasons.length) }, { status: 201 });
  } catch (error) {
    if (error instanceof RateLimitError) return NextResponse.json({ error: error.message }, { status: 429 });
    if (error instanceof PublicInputError) return NextResponse.json({ error: error.message }, { status: 400 });
    console.error("Comment failed", error instanceof Error ? error.message : "unknown error");
    return NextResponse.json({ error: "Comment could not be submitted." }, { status: 500 });
  }
}
