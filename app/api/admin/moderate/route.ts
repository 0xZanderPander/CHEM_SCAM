import { NextRequest, NextResponse } from "next/server";
import {
  lockReportCounters,
  query,
  refreshReportAggregates,
  transaction,
  type Comment,
  type DisputeResolutionType,
  type Report,
  type ReportStatus,
  type QueryClient,
} from "@/db";
import { isAdminRequest } from "@/lib/admin";
import { boundedPage, boundedPageSize, disputeResolutionTypes, summarizeModerationMetadata } from "@/lib/moderation";
import { csrfValid } from "@/lib/security";
import { cleanText, PublicInputError, readJsonBody } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CountRow = { count: number };
type DisputeRow = { id: string; report_id: string | null; resolved: boolean };
type DuplicateRow = { report_id: string };
type ModerationEventRow = {
  id: string;
  action: string;
  target_type: string;
  target_id: string;
  created_at: string;
  metadata: unknown;
};

const reportFilters = {
  all: "TRUE",
  pending: "publication_state = 'pending_review'",
  disputed: "status = 'Disputed'",
  possible_duplicates: "possible_duplicate_of IS NOT NULL",
} as const;

const commentFilters = {
  all: "TRUE",
  pending: "publication_state = 'pending_review'",
  flagged: "flag_count > 0",
} as const;

function selectedFilter<T extends Record<string, string>>(value: string | null, options: T): keyof T {
  return value && Object.hasOwn(options, value) ? value as keyof T : "all";
}

export async function GET(request: NextRequest) {
  if (!(await isAdminRequest(request))) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const reportPage = boundedPage(request.nextUrl.searchParams.get("reportPage"));
  const commentPage = boundedPage(request.nextUrl.searchParams.get("commentPage"));
  const pageSize = boundedPageSize(request.nextUrl.searchParams.get("pageSize"));
  const reportFilter = selectedFilter(request.nextUrl.searchParams.get("reportFilter"), reportFilters);
  const commentFilter = selectedFilter(request.nextUrl.searchParams.get("commentFilter"), commentFilters);
  const reportWhere = `removed_at IS NULL AND ${reportFilters[reportFilter]}`;
  const commentWhere = `removed_at IS NULL AND ${commentFilters[commentFilter]}`;

  const [reports, reportCount, comments, commentCount, disputes, supportingAccounts, events, mergeTargets] = await Promise.all([
    query<Report>(
      `SELECT id, scammer_name, website, normalized_domain, normalized_domain AS domain, description,
       nickname, created_at, confirmation_count, confirmation_count AS confirmations, duplicate_count,
       status, publication_state, possible_duplicate_of, removed_at
       FROM reports WHERE ${reportWhere}
       ORDER BY publication_state <> 'pending_review', created_at DESC LIMIT $1 OFFSET $2`,
      [pageSize, (reportPage - 1) * pageSize],
    ),
    query<CountRow>(`SELECT COUNT(*)::int AS count FROM reports WHERE ${reportWhere}`),
    query<Comment>(
      `SELECT id, report_id, nickname, comment, created_at, flag_count, publication_state
       FROM comments WHERE ${commentWhere}
       ORDER BY publication_state <> 'pending_review', flag_count DESC, created_at DESC LIMIT $1 OFFSET $2`,
      [pageSize, (commentPage - 1) * pageSize],
    ),
    query<CountRow>(`SELECT COUNT(*)::int AS count FROM comments WHERE ${commentWhere}`),
    // Security and conduct reports are surfaced above routine correction
    // requests; within a bucket the oldest request is still triaged first.
    query(`SELECT id, report_id, category, contact_info, message, created_at
           FROM dispute_requests
           WHERE resolved = FALSE
           ORDER BY CASE category WHEN 'security' THEN 0 WHEN 'conduct' THEN 1 ELSE 2 END, created_at ASC
           LIMIT 50`),
    query("SELECT id, report_id, nickname, description, website, created_at, publication_state FROM duplicate_reports WHERE removed_at IS NULL ORDER BY publication_state <> 'pending_review', created_at DESC LIMIT 50"),
    query<ModerationEventRow>("SELECT id, action, target_type, target_id, created_at, metadata FROM moderation_events ORDER BY created_at DESC LIMIT 50"),
    query<{ id: string; scammer_name: string }>("SELECT id, scammer_name FROM reports WHERE removed_at IS NULL ORDER BY created_at DESC LIMIT 100"),
  ]);

  return NextResponse.json({
    reports: reports.rows,
    comments: comments.rows,
    disputes: disputes.rows,
    supportingAccounts: supportingAccounts.rows,
    mergeTargets: mergeTargets.rows,
    moderationEvents: events.rows.map(({ metadata, ...event }) => ({ ...event, metadata_summary: summarizeModerationMetadata(metadata) })),
    pagination: {
      reportPage,
      reportTotal: reportCount.rows[0]?.count || 0,
      commentPage,
      commentTotal: commentCount.rows[0]?.count || 0,
      pageSize,
      reportFilter,
      commentFilter,
    },
  });
}

const statuses: ReportStatus[] = ["Unverified", "Community Confirmed", "Repeatedly Reported", "Disputed"];

async function audit(client: QueryClient, action: string, targetType: string, targetId: string, metadata: Record<string, unknown> = {}) {
  await client.query(
    "INSERT INTO moderation_events (action, target_type, target_id, metadata) VALUES ($1, $2, $3, $4)",
    [action, targetType, targetId, JSON.stringify(metadata)],
  );
}

export async function POST(request: NextRequest) {
  if (!(await isAdminRequest(request)) || !csrfValid(request)) return NextResponse.json({ error: "Unauthorized." }, { status: 403 });
  try {
    const body = await readJsonBody(request, 16_384);
    const action = cleanText(body.action, 60, "Action");
    const id = cleanText(body.id, 100, "Item");
    const targetId = String(body.targetId ?? "").trim() || null;
    const status = String(body.status ?? "") as ReportStatus;

    await transaction(async (client) => {
      switch (action) {
        case "remove-report": {
          const removed = await client.query("UPDATE reports SET publication_state = 'removed', removed_at = NOW() WHERE id = $1 AND removed_at IS NULL RETURNING id", [id]);
          if (!removed.rows[0]) throw new PublicInputError("Report not found.");
          await audit(client, action, "report", id);
          break;
        }
        case "remove-comment": {
          const removed = await client.query("UPDATE comments SET publication_state = 'removed', removed_at = NOW() WHERE id = $1 AND removed_at IS NULL RETURNING id", [id]);
          if (!removed.rows[0]) throw new PublicInputError("Comment not found.");
          await audit(client, action, "comment", id);
          break;
        }
        case "publish-report": {
          const published = await client.query("UPDATE reports SET publication_state = 'published' WHERE id = $1 AND removed_at IS NULL RETURNING id", [id]);
          if (!published.rows[0]) throw new PublicInputError("Report not found.");
          await audit(client, action, "report", id);
          break;
        }
        case "publish-comment": {
          const published = await client.query("UPDATE comments SET publication_state = 'published' WHERE id = $1 AND removed_at IS NULL RETURNING id", [id]);
          if (!published.rows[0]) throw new PublicInputError("Comment not found.");
          await audit(client, action, "comment", id);
          break;
        }
        case "publish-duplicate":
        case "remove-duplicate": {
          const selected = await client.query<DuplicateRow>("SELECT report_id FROM duplicate_reports WHERE id = $1 AND removed_at IS NULL", [id]);
          if (!selected.rows[0]) throw new PublicInputError("Supporting account not found.");
          await lockReportCounters(selected.rows[0].report_id, client);
          const changed = action === "publish-duplicate"
            ? await client.query<DuplicateRow>("UPDATE duplicate_reports SET publication_state = 'published' WHERE id = $1 AND removed_at IS NULL RETURNING report_id", [id])
            : await client.query<DuplicateRow>("UPDATE duplicate_reports SET publication_state = 'removed', removed_at = NOW() WHERE id = $1 AND removed_at IS NULL RETURNING report_id", [id]);
          if (!changed.rows[0]) throw new PublicInputError("Supporting account not found.");
          if (changed.rows[0].report_id !== selected.rows[0].report_id) await lockReportCounters(changed.rows[0].report_id, client);
          await refreshReportAggregates(changed.rows[0].report_id, client);
          if (changed.rows[0].report_id !== selected.rows[0].report_id) await refreshReportAggregates(selected.rows[0].report_id, client);
          await audit(client, action, "duplicate_report", id, { reportId: changed.rows[0].report_id });
          break;
        }
        case "set-status": {
          if (!statuses.includes(status)) throw new PublicInputError("Invalid status.");
          const changed = await client.query("UPDATE reports SET status = $1 WHERE id = $2 AND removed_at IS NULL RETURNING id", [status, id]);
          if (!changed.rows[0]) throw new PublicInputError("Report not found.");
          await audit(client, action, "report", id, { status });
          break;
        }
        case "merge": {
          if (!targetId || targetId === id) throw new PublicInputError("Choose a different target report.");
          for (const reportId of [id, targetId].sort()) await lockReportCounters(reportId, client);
          const locked = new Map<string, Report>();
          for (const reportId of [id, targetId].sort()) {
            const result = await client.query<Report>("SELECT * FROM reports WHERE id = $1 AND removed_at IS NULL FOR UPDATE", [reportId]);
            if (result.rows[0]) locked.set(reportId, result.rows[0]);
          }
          const source = locked.get(id);
          const target = locked.get(targetId);
          if (!source || !target) throw new PublicInputError("Source or target report not found.");
          await client.query(
            "INSERT INTO duplicate_reports (report_id, nickname, description, website, created_at, publication_state) VALUES ($1, $2, $3, $4, $5, $6)",
            [targetId, source.nickname, source.description, source.website, source.created_at, source.publication_state],
          );
          await client.query("UPDATE duplicate_reports SET report_id = $1 WHERE report_id = $2", [targetId, id]);
          await client.query("UPDATE comments SET report_id = $1 WHERE report_id = $2", [targetId, id]);
          await client.query("INSERT INTO confirmations (report_id, confirmation_hash, created_at) SELECT $1, confirmation_hash, created_at FROM confirmations WHERE report_id = $2 ON CONFLICT DO NOTHING", [targetId, id]);
          await client.query("DELETE FROM confirmations WHERE report_id = $1", [id]);
          await client.query("UPDATE dispute_requests SET report_id = $1 WHERE report_id = $2", [targetId, id]);
          await client.query("UPDATE reports SET possible_duplicate_of = $1 WHERE possible_duplicate_of = $2 AND id <> $1", [targetId, id]);
          await client.query("UPDATE reports SET publication_state = 'removed', removed_at = NOW() WHERE id = $1", [id]);
          await refreshReportAggregates(targetId, client);
          await audit(client, action, "report", id, { targetId });
          break;
        }
        case "resolve-dispute": {
          const resolutionType = String(body.resolutionType ?? "") as DisputeResolutionType;
          if (!disputeResolutionTypes.includes(resolutionType)) throw new PublicInputError("Choose a valid resolution type.");
          const note = cleanText(body.note, 1_000, "Resolution note");
          const dispute = await client.query<DisputeRow>("SELECT id, report_id, resolved FROM dispute_requests WHERE id = $1 FOR UPDATE", [id]);
          const row = dispute.rows[0];
          if (!row || row.resolved) throw new PublicInputError("Open dispute request not found.");
          if (["report_marked_disputed", "report_removed"].includes(resolutionType) && !row.report_id) {
            throw new PublicInputError("This resolution requires a linked report.");
          }
          if (resolutionType === "report_marked_disputed") {
            const changed = await client.query("UPDATE reports SET status = 'Disputed' WHERE id = $1 AND removed_at IS NULL RETURNING id", [row.report_id]);
            if (!changed.rows[0]) throw new PublicInputError("Linked report not found.");
            await audit(client, "dispute-report-marked-disputed", "report", row.report_id!, { disputeRequestId: id });
          }
          if (resolutionType === "report_removed") {
            const changed = await client.query("UPDATE reports SET publication_state = 'removed', removed_at = NOW() WHERE id = $1 AND removed_at IS NULL RETURNING id", [row.report_id]);
            if (!changed.rows[0]) throw new PublicInputError("Linked report not found.");
            await audit(client, "dispute-report-removed", "report", row.report_id!, { disputeRequestId: id });
          }
          await client.query(
            "UPDATE dispute_requests SET resolved = TRUE, resolved_at = NOW(), resolution_type = $1, resolved_note = $2 WHERE id = $3",
            [resolutionType, note, id],
          );
          await audit(client, action, "dispute_request", id, { resolutionType, note, reportId: row.report_id });
          break;
        }
        default:
          throw new PublicInputError("Unknown moderation action.");
      }
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof PublicInputError) return NextResponse.json({ error: error.message }, { status: 400 });
    console.error("Moderation failed", error instanceof Error ? error.message : "unknown error");
    return NextResponse.json({ error: "Moderation action failed." }, { status: 500 });
  }
}
