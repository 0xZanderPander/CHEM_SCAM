import { NextRequest, NextResponse } from "next/server";
import { refreshStatus, transaction } from "@/db";
import { enforceRateLimit, RateLimitError } from "@/lib/rate-limit";
import { browserTokenHash } from "@/lib/security";
import { cleanText, PublicInputError, readJsonBody } from "@/lib/validation";

export const runtime = "nodejs";

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  try {
    await enforceRateLimit(request, "confirmations");
    // This independent per-report/IP-hash limit raises the cost of gaming a
    // listing after localStorage is cleared. It does not prove unique humans;
    // multiple IP addresses can still bypass it.
    await enforceRateLimit(request, "confirmationPerReport", id);
    const body = await readJsonBody(request, 4_096);
    const token = cleanText(body.browserToken, 200, "Browser token");
    const confirmationHash = browserTokenHash(token, "confirmation");
    await transaction(async (client) => {
      const report = await client.query("SELECT id FROM reports WHERE id = $1 AND publication_state = 'published' AND removed_at IS NULL", [id]);
      if (!report.rows[0]) throw new PublicInputError("Report not found.");
      await client.query("INSERT INTO confirmations (report_id, confirmation_hash) VALUES ($1, $2)", [id, confirmationHash]);
      await client.query("UPDATE reports SET confirmation_count = confirmation_count + 1 WHERE id = $1", [id]);
      await refreshStatus(id, client);
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof RateLimitError) return NextResponse.json({ error: error.message }, { status: 429 });
    if (error instanceof PublicInputError) return NextResponse.json({ error: error.message }, { status: 400 });
    if ((error as { code?: string }).code === "23505") return NextResponse.json({ error: "This browser already confirmed the report." }, { status: 409 });
    console.error("Confirmation failed", error instanceof Error ? error.message : "unknown error");
    return NextResponse.json({ error: "Confirmation could not be recorded." }, { status: 500 });
  }
}
