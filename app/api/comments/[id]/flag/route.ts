import { NextRequest, NextResponse } from "next/server";
import { transaction } from "@/db";
import { enforceRateLimit, RateLimitError } from "@/lib/rate-limit";
import { browserTokenHash } from "@/lib/security";
import { cleanText, PublicInputError, readJsonBody } from "@/lib/validation";

export const runtime = "nodejs";

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  try {
    await enforceRateLimit(request, "flags");
    const body = await readJsonBody(request, 4_096);
    const token = cleanText(body.browserToken, 200, "Browser token");
    const flaggerHash = browserTokenHash(token, "comment-flag");
    await transaction(async (client) => {
      await client.query("INSERT INTO comment_flags (comment_id, flagger_hash) VALUES ($1, $2)", [id, flaggerHash]);
      await client.query("UPDATE comments SET flag_count = flag_count + 1 WHERE id = $1", [id]);
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof RateLimitError) return NextResponse.json({ error: error.message }, { status: 429 });
    if ((error as { code?: string }).code === "23505") return NextResponse.json({ error: "This browser already reported the comment." }, { status: 409 });
    if (error instanceof PublicInputError) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ error: "Comment could not be reported." }, { status: 500 });
  }
}

