import { NextRequest, NextResponse } from "next/server";
import { query } from "@/db";
import { enforceRateLimit, RateLimitError } from "@/lib/rate-limit";
import { cleanText, limits, PublicInputError, readJsonBody, validateBotFields } from "@/lib/validation";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    await enforceRateLimit(request, "disputes");
    const body = await readJsonBody(request);
    validateBotFields(body);
    const message = cleanText(body.message, limits.disputeMessage, "Message");
    const contactInfo = cleanText(body.contactInfo, limits.contactInfo, "Contact information", false) || null;
    const reportId = cleanText(body.reportId, 100, "Report reference", false) || null;
    if (reportId) {
      const report = await query("SELECT id FROM reports WHERE id = $1 AND publication_state = 'published' AND removed_at IS NULL", [reportId]);
      if (!report.rows[0]) throw new PublicInputError("The report reference was not found.");
    }
    await query(
      "INSERT INTO dispute_requests (report_id, contact_info, message) VALUES ($1, $2, $3)",
      [reportId, contactInfo, message],
    );
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    if (error instanceof RateLimitError) return NextResponse.json({ error: error.message }, { status: 429 });
    if (error instanceof PublicInputError) return NextResponse.json({ error: error.message }, { status: 400 });
    console.error("Dispute request failed", error instanceof Error ? error.message : "unknown error");
    return NextResponse.json({ error: "Request could not be submitted." }, { status: 500 });
  }
}
