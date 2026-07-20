CREATE TABLE `comments` (
	`id` text PRIMARY KEY NOT NULL,
	`report_id` text NOT NULL,
	`nickname` text NOT NULL,
	`comment` text NOT NULL,
	`created_at` text NOT NULL,
	`flagged` integer DEFAULT 0 NOT NULL,
	`removed` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`report_id`) REFERENCES `reports`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `confirmations` (
	`report_id` text NOT NULL,
	`fingerprint` text NOT NULL,
	`created_at` text NOT NULL,
	PRIMARY KEY(`report_id`, `fingerprint`),
	FOREIGN KEY (`report_id`) REFERENCES `reports`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `duplicate_reports` (
	`id` text PRIMARY KEY NOT NULL,
	`report_id` text NOT NULL,
	`nickname` text NOT NULL,
	`description` text NOT NULL,
	`website` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`report_id`) REFERENCES `reports`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `reports` (
	`id` text PRIMARY KEY NOT NULL,
	`scammer_name` text NOT NULL,
	`website` text,
	`domain` text,
	`description` text NOT NULL,
	`nickname` text NOT NULL,
	`created_at` text NOT NULL,
	`confirmations` integer DEFAULT 0 NOT NULL,
	`duplicate_count` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'Unverified' NOT NULL,
	`removed` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE INDEX `reports_created_at_idx` ON `reports` (`created_at`);--> statement-breakpoint
CREATE INDEX `reports_domain_idx` ON `reports` (`domain`);