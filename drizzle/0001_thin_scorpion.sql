ALTER TABLE "dispute_requests" ADD COLUMN "resolution_type" text;--> statement-breakpoint
ALTER TABLE "dispute_requests" ADD CONSTRAINT "dispute_requests_resolution_type_check" CHECK ("dispute_requests"."resolution_type" IS NULL OR "dispute_requests"."resolution_type" IN ('no_action', 'report_marked_disputed', 'report_removed', 'report_corrected', 'other'));--> statement-breakpoint
-- One-time aggregate backfill for existing MVP data. Published, non-removed
-- supporting accounts are the only duplicate rows that affect public status.
UPDATE "reports" AS report
SET "confirmation_count" = (
      SELECT COUNT(*)::int FROM "confirmations" WHERE "report_id" = report."id"
    ),
    "duplicate_count" = (
      SELECT COUNT(*)::int
      FROM "duplicate_reports"
      WHERE "report_id" = report."id"
        AND "publication_state" = 'published'
        AND "removed_at" IS NULL
    );--> statement-breakpoint
UPDATE "reports"
SET "status" = CASE
  WHEN "duplicate_count" >= 2 THEN 'Repeatedly Reported'
  WHEN "confirmation_count" >= 3 THEN 'Community Confirmed'
  ELSE 'Unverified'
END
WHERE "status" <> 'Disputed';--> statement-breakpoint
-- Repair cached comment flag counts from their unique source rows as well.
UPDATE "comments" AS comment
SET "flag_count" = (
  SELECT COUNT(*)::int FROM "comment_flags" WHERE "comment_id" = comment."id"
);
