import { NextRequest, NextResponse } from "next/server";
import { query, refreshStatus, transaction, type Comment, type Report, type ReportStatus } from "@/db";
import { isAdminRequest } from "@/lib/admin";
import { csrfValid } from "@/lib/security";
import { cleanText, PublicInputError, readJsonBody } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (!(await isAdminRequest(request))) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const [reports, comments, disputes, duplicates] = await Promise.all([
    query<Report>(
      `SELECT id, scammer_name, website, normalized_domain, normalized_domain AS domain, description,
       nickname, created_at, confirmation_count, confirmation_count AS confirmations, duplicate_count,
       status, publication_state, possible_duplicate_of, removed_at
       FROM reports WHERE removed_at IS NULL ORDER BY publication_state <> 'pending_review', created_at DESC`,
    ),
    query<Comment>(
      "SELECT id, report_id, nickname, comment, created_at, flag_count, publication_state FROM comments WHERE removed_at IS NULL ORDER BY publication_state <> 'pending_review', flag_count DESC, created_at DESC",
    ),
    query("SELECT * FROM dispute_requests WHERE resolved = FALSE ORDER BY created_at ASC"),
    query("SELECT id, report_id, nickname, description, website, created_at, publication_state FROM duplicate_reports WHERE removed_at IS NULL AND publication_state = 'pending_review' ORDER BY created_at ASC"),
  ]);
  return NextResponse.json({ reports: reports.rows, comments: comments.rows, disputes: disputes.rows, pendingDuplicates: duplicates.rows });
}

const statuses: ReportStatus[] = ["Unverified", "Community Confirmed", "Repeatedly Reported", "Disputed"];

export async function POST(request: NextRequest) {
  if (!(await isAdminRequest(request)) || !csrfValid(request)) return NextResponse.json({ error: "Unauthorized." }, { status: 403 });
  try {
    const body = await readJsonBody(request, 16_384);
    const action = cleanText(body.action, 60, "Action");
    const id = cleanText(body.id, 100, "Item");
    const targetId = String(body.targetId ?? "").trim() || null;
    const status = String(body.status ?? "") as ReportStatus;
    const note = cleanText(body.note, 1_000, "Note", false) || null;

    await transaction(async (client) => {
      switch (action) {
        case "remove-report":
          await client.query("UPDATE reports SET publication_state = 'removed', removed_at = NOW() WHERE id = $1", [id]);
          break;
        case "remove-comment":
          await client.query("UPDATE comments SET publication_state = 'removed', removed_at = NOW() WHERE id = $1", [id]);
          break;
        case "publish-report":
          await client.query("UPDATE reports SET publication_state = 'published' WHERE id = $1 AND removed_at IS NULL", [id]);
          break;
        case "publish-comment":
          await client.query("UPDATE comments SET publication_state = 'published' WHERE id = $1 AND removed_at IS NULL", [id]);
          break;
        case "publish-duplicate":
          await client.query("UPDATE duplicate_reports SET publication_state = 'published' WHERE id = $1 AND removed_at IS NULL", [id]);
          break;
        case "set-status":
          if (!statuses.includes(status)) throw new PublicInputError("Invalid status.");
          await client.query("UPDATE reports SET status = $1 WHERE id = $2", [status, id]);
          break;
        case "merge": {
          if (!targetId || targetId === id) throw new PublicInputError("Choose a different target report.");
          const source = await client.query<Report>("SELECT * FROM reports WHERE id = $1 AND removed_at IS NULL", [id]);
          if (!source.rows[0]) throw new PublicInputError("Source report not found.");
          const row = source.rows[0];
          await client.query(
            "INSERT INTO duplicate_reports (report_id, nickname, description, website, created_at) VALUES ($1, $2, $3, $4, $5)",
            [targetId, row.nickname, row.description, row.website, row.created_at],
          );
          await client.query("UPDATE duplicate_reports SET report_id = $1 WHERE report_id = $2", [targetId, id]);
          await client.query("UPDATE comments SET report_id = $1 WHERE report_id = $2", [targetId, id]);
          await client.query("INSERT INTO confirmations (report_id, confirmation_hash, created_at) SELECT $1, confirmation_hash, created_at FROM confirmations WHERE report_id = $2 ON CONFLICT DO NOTHING", [targetId, id]);
          await client.query("DELETE FROM confirmations WHERE report_id = $1", [id]);
          await client.query("UPDATE reports SET publication_state = 'removed', removed_at = NOW() WHERE id = $1", [id]);
          await client.query(
            `UPDATE reports SET
              confirmation_count = (SELECT COUNT(*)::int FROM confirmations WHERE report_id = $1),
              duplicate_count = (SELECT COUNT(*)::int FROM duplicate_reports WHERE report_id = $1 AND removed_at IS NULL)
             WHERE id = $1`,
            [targetId],
          );
          await refreshStatus(targetId, client);
          break;
        }
        case "resolve-dispute":
          await client.query("UPDATE dispute_requests SET resolved = TRUE, resolved_at = NOW(), resolved_note = $1 WHERE id = $2", [note, id]);
          break;
        default:
          throw new PublicInputError("Unknown moderation action.");
      }
      await client.query(
        "INSERT INTO moderation_events (action, target_type, target_id, metadata) VALUES ($1, $2, $3, $4)",
        [action, action.includes("comment") ? "comment" : action.includes("dispute") ? "dispute_request" : "report", id, JSON.stringify({ targetId, status, note })],
      );
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof PublicInputError) return NextResponse.json({ error: error.message }, { status: 400 });
    console.error("Moderation failed", error instanceof Error ? error.message : "unknown error");
    return NextResponse.json({ error: "Moderation action failed." }, { status: 500 });
  }
}

