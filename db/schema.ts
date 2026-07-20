import { index, integer, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const reports = sqliteTable(
  "reports",
  {
    id: text("id").primaryKey(),
    scammerName: text("scammer_name").notNull(),
    website: text("website"),
    domain: text("domain"),
    description: text("description").notNull(),
    nickname: text("nickname").notNull(),
    createdAt: text("created_at").notNull(),
    confirmations: integer("confirmations").notNull().default(0),
    duplicateCount: integer("duplicate_count").notNull().default(0),
    status: text("status").notNull().default("Unverified"),
    removed: integer("removed").notNull().default(0),
  },
  (table) => [index("reports_created_at_idx").on(table.createdAt), index("reports_domain_idx").on(table.domain)],
);

export const duplicateReports = sqliteTable("duplicate_reports", {
  id: text("id").primaryKey(),
  reportId: text("report_id").notNull().references(() => reports.id, { onDelete: "cascade" }),
  nickname: text("nickname").notNull(),
  description: text("description").notNull(),
  website: text("website"),
  createdAt: text("created_at").notNull(),
});

export const comments = sqliteTable("comments", {
  id: text("id").primaryKey(),
  reportId: text("report_id").notNull().references(() => reports.id, { onDelete: "cascade" }),
  nickname: text("nickname").notNull(),
  comment: text("comment").notNull(),
  createdAt: text("created_at").notNull(),
  flagged: integer("flagged").notNull().default(0),
  removed: integer("removed").notNull().default(0),
});

export const confirmations = sqliteTable(
  "confirmations",
  {
    reportId: text("report_id").notNull().references(() => reports.id, { onDelete: "cascade" }),
    fingerprint: text("fingerprint").notNull(),
    createdAt: text("created_at").notNull(),
  },
  (table) => [primaryKey({ columns: [table.reportId, table.fingerprint] })],
);

export const schemaStatements = [
  `CREATE TABLE IF NOT EXISTS reports (
    id TEXT PRIMARY KEY,
    scammer_name TEXT NOT NULL,
    website TEXT,
    domain TEXT,
    description TEXT NOT NULL,
    nickname TEXT NOT NULL,
    created_at TEXT NOT NULL,
    confirmations INTEGER NOT NULL DEFAULT 0,
    duplicate_count INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'Unverified',
    removed INTEGER NOT NULL DEFAULT 0
  )`,
  `CREATE INDEX IF NOT EXISTS reports_created_at_idx ON reports(created_at DESC)`,
  `CREATE INDEX IF NOT EXISTS reports_domain_idx ON reports(domain)`,
  `CREATE TABLE IF NOT EXISTS duplicate_reports (
    id TEXT PRIMARY KEY,
    report_id TEXT NOT NULL,
    nickname TEXT NOT NULL,
    description TEXT NOT NULL,
    website TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS comments (
    id TEXT PRIMARY KEY,
    report_id TEXT NOT NULL,
    nickname TEXT NOT NULL,
    comment TEXT NOT NULL,
    created_at TEXT NOT NULL,
    flagged INTEGER NOT NULL DEFAULT 0,
    removed INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS confirmations (
    report_id TEXT NOT NULL,
    fingerprint TEXT NOT NULL,
    created_at TEXT NOT NULL,
    PRIMARY KEY (report_id, fingerprint),
    FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE CASCADE
  )`,
] as const;
