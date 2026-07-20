import { NextRequest, NextResponse } from "next/server";
import { lockReportCounters, query, refreshReportAggregates, transaction, type Report } from "@/db";
import { enforceRateLimit, RateLimitError } from "@/lib/rate-limit";
import {
  cleanText,
  limits,
  normalizedName,
  PublicInputError,
  readJsonBody,
  safeWebsite,
  screenSensitiveContent,
  validateBotFields,
} from "@/lib/validation";
import { findDuplicateCandidates } from "@/lib/duplicates";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const publicReportSelect = `
  SELECT id, scammer_name, website, normalized_domain, normalized_domain AS domain,
    description, nickname, created_at, confirmation_count,
    confirmation_count AS confirmations, duplicate_count, status,
    publication_state, possible_duplicate_of, removed_at
  FROM reports`;

export async function GET(request: NextRequest) {
  const search = request.nextUrl.searchParams.get("q")?.trim().slice(0, 200) || "";
  const values: unknown[] = [];
  let filter = "publication_state = 'published' AND removed_at IS NULL";
  if (search) {
    values.push(`%${search.toLowerCase()}%`);
    filter += " AND (LOWER(scammer_name) LIKE $1 OR LOWER(COALESCE(normalized_domain, '')) LIKE $1)";
  }
  const result = await query<Report>(`${publicReportSelect} WHERE ${filter} ORDER BY created_at DESC LIMIT 200`, values);
  return NextResponse.json({ reports: result.rows });
}

export async function POST(request: NextRequest) {
  try {
    await enforceRateLimit(request, "reports");
    const body = await readJsonBody(request);
    validateBotFields(body);
    const scammerName = cleanText(body.scammerName, limits.scammerName, "Scammer or website name");
    const description = cleanText(body.description, limits.description, "Explanation");
    const nickname = cleanText(body.nickname, limits.nickname, "Nickname");
    const { website, normalizedDomain } = safeWebsite(body.website);
    const sensitiveReasons = screenSensitiveContent(scammerName, description, nickname);
    const publicationState = sensitiveReasons.length ? "pending_review" : "published";

    const active = await query<Report>(
      `${publicReportSelect}
       WHERE publication_state = 'published' AND removed_at IS NULL
         AND (($1::text IS NOT NULL AND normalized_domain = $1)
           OR regexp_replace(lower(scammer_name), '[^[:alnum:]]+', ' ', 'g') = $2)
       ORDER BY CASE WHEN normalized_domain = $1 THEN 0 ELSE 1 END, created_at ASC LIMIT 50`,
      [normalizedDomain, normalizedName(scammerName)],
    );
    const { domainMatch, nameMatch } = findDuplicateCandidates(active.rows, scammerName, normalizedDomain);

    if (domainMatch) {
      await transaction(async (client) => {
        await lockReportCounters(domainMatch.id, client);
        const parent = await client.query(
          "SELECT id FROM reports WHERE id = $1 AND publication_state = 'published' AND removed_at IS NULL FOR UPDATE",
          [domainMatch.id],
        );
        if (!parent.rows[0]) throw new PublicInputError("Report not found.");
        const duplicate = await client.query<{ id: string }>(
          `INSERT INTO duplicate_reports (report_id, nickname, description, website, publication_state)
           VALUES ($1, $2, $3, $4, $5) RETURNING id`,
          [domainMatch.id, nickname, description, website, publicationState],
        );
        if (sensitiveReasons.length) {
          await client.query(
            "INSERT INTO moderation_events (action, target_type, target_id, metadata) VALUES ('auto_pending_review', 'duplicate_report', $1, $2)",
            [duplicate.rows[0].id, JSON.stringify({ reasons: sensitiveReasons, reportId: domainMatch.id })],
          );
        }
        await refreshReportAggregates(domainMatch.id, client);
      });
      return NextResponse.json({ id: domainMatch.id, duplicate: true, pendingReview: Boolean(sensitiveReasons.length) }, { status: 201 });
    }

    const created = await query<{ id: string }>(
      `INSERT INTO reports
       (scammer_name, website, normalized_domain, description, nickname, publication_state, possible_duplicate_of)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
      [scammerName, website, normalizedDomain, description, nickname, publicationState, nameMatch?.id || null],
    );
    const id = created.rows[0].id;
    if (sensitiveReasons.length || nameMatch) {
      await query(
        "INSERT INTO moderation_events (action, target_type, target_id, metadata) VALUES ($1, 'report', $2, $3)",
        [sensitiveReasons.length ? "auto_pending_review" : "possible_duplicate", id, JSON.stringify({ reasons: sensitiveReasons, possibleDuplicateOf: nameMatch?.id })],
      );
    }
    return NextResponse.json({ id, duplicate: false, pendingReview: Boolean(sensitiveReasons.length), possibleMatch: nameMatch?.id || null }, { status: 201 });
  } catch (error) {
    if (error instanceof RateLimitError) return NextResponse.json({ error: error.message }, { status: 429 });
    if (error instanceof PublicInputError) return NextResponse.json({ error: error.message }, { status: 400 });
    console.error("Report submission failed", error instanceof Error ? error.message : "unknown error");
    return NextResponse.json({ error: "Report could not be submitted." }, { status: 500 });
  }
}
