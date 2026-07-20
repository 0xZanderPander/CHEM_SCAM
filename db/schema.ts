import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";

export type ReportStatus = "Unverified" | "Community Confirmed" | "Repeatedly Reported" | "Disputed";
export type PublicationState = "published" | "pending_review" | "removed";

export const reports = pgTable("reports", {
  id: uuid("id").primaryKey().defaultRandom(),
  scammerName: text("scammer_name").notNull(),
  website: text("website"),
  normalizedDomain: text("normalized_domain"),
  description: text("description").notNull(),
  nickname: text("nickname").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  confirmationCount: integer("confirmation_count").notNull().default(0),
  duplicateCount: integer("duplicate_count").notNull().default(0),
  status: text("status").$type<ReportStatus>().notNull().default("Unverified"),
  publicationState: text("publication_state").$type<PublicationState>().notNull().default("published"),
  possibleDuplicateOf: uuid("possible_duplicate_of").references((): AnyPgColumn => reports.id, { onDelete: "set null" }),
  removedAt: timestamp("removed_at", { withTimezone: true }),
}, (table) => [
  index("reports_created_at_idx").on(table.createdAt),
  index("reports_normalized_domain_idx").on(table.normalizedDomain),
  index("reports_publication_state_idx").on(table.publicationState),
]);

export const duplicateReports = pgTable("duplicate_reports", {
  id: uuid("id").primaryKey().defaultRandom(),
  reportId: uuid("report_id").notNull().references(() => reports.id, { onDelete: "cascade" }),
  nickname: text("nickname").notNull(),
  description: text("description").notNull(),
  website: text("website"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  publicationState: text("publication_state").$type<PublicationState>().notNull().default("published"),
  removedAt: timestamp("removed_at", { withTimezone: true }),
});

export const comments = pgTable("comments", {
  id: uuid("id").primaryKey().defaultRandom(),
  reportId: uuid("report_id").notNull().references(() => reports.id, { onDelete: "cascade" }),
  nickname: text("nickname").notNull(),
  comment: text("comment").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  flagCount: integer("flag_count").notNull().default(0),
  publicationState: text("publication_state").$type<PublicationState>().notNull().default("published"),
  removedAt: timestamp("removed_at", { withTimezone: true }),
});

export const confirmations = pgTable("confirmations", {
  reportId: uuid("report_id").notNull().references(() => reports.id, { onDelete: "cascade" }),
  confirmationHash: text("confirmation_hash").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [primaryKey({ columns: [table.reportId, table.confirmationHash] })]);

export const commentFlags = pgTable("comment_flags", {
  commentId: uuid("comment_id").notNull().references(() => comments.id, { onDelete: "cascade" }),
  flaggerHash: text("flagger_hash").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [primaryKey({ columns: [table.commentId, table.flaggerHash] })]);

export const adminSessions = pgTable("admin_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  tokenHash: text("token_hash").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
}, (table) => [uniqueIndex("admin_sessions_token_hash_idx").on(table.tokenHash)]);

export const moderationEvents = pgTable("moderation_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  action: text("action").notNull(),
  targetType: text("target_type").notNull(),
  targetId: text("target_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  metadata: jsonb("metadata"),
});

export const rateLimits = pgTable("rate_limits", {
  id: uuid("id").primaryKey().defaultRandom(),
  endpoint: text("endpoint").notNull(),
  requesterHash: text("requester_hash").notNull(),
  scopeKey: text("scope_key").notNull().default("global"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
}, (table) => [
  index("rate_limits_lookup_idx").on(table.endpoint, table.requesterHash, table.scopeKey, table.createdAt),
  index("rate_limits_expiry_idx").on(table.expiresAt),
]);

export const disputeRequests = pgTable("dispute_requests", {
  id: uuid("id").primaryKey().defaultRandom(),
  reportId: uuid("report_id").references(() => reports.id, { onDelete: "set null" }),
  contactInfo: text("contact_info"),
  message: text("message").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  resolved: boolean("resolved").notNull().default(false),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  resolvedNote: text("resolved_note"),
});
