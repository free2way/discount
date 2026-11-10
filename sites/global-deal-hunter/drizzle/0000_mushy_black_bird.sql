CREATE TABLE `deals` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`canonical_key` text NOT NULL,
	`name` text NOT NULL,
	`category` text NOT NULL,
	`summary` text NOT NULL,
	`value_amount` real,
	`value_currency` text,
	`value_label` text NOT NULL,
	`value_score` integer DEFAULT 0 NOT NULL,
	`requirements` text NOT NULL,
	`regions` text NOT NULL,
	`hidden_conditions` text DEFAULT '' NOT NULL,
	`starts_at` text,
	`ends_at` text,
	`steps` text NOT NULL,
	`official_url` text NOT NULL,
	`source_url` text NOT NULL,
	`source_name` text NOT NULL,
	`source_type` text NOT NULL,
	`source_subreddit` text,
	`verification_status` text DEFAULT 'pending' NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`confidence` integer DEFAULT 0 NOT NULL,
	`risk_notes` text DEFAULT '' NOT NULL,
	`first_seen_at` text NOT NULL,
	`last_verified_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `deals_canonical_key_unique` ON `deals` (`canonical_key`);--> statement-breakpoint
CREATE INDEX `deals_status_idx` ON `deals` (`status`);--> statement-breakpoint
CREATE INDEX `deals_category_idx` ON `deals` (`category`);--> statement-breakpoint
CREATE INDEX `deals_ends_at_idx` ON `deals` (`ends_at`);--> statement-breakpoint
CREATE INDEX `deals_value_score_idx` ON `deals` (`value_score`);--> statement-breakpoint
CREATE TABLE `scan_runs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`started_at` text NOT NULL,
	`finished_at` text NOT NULL,
	`status` text NOT NULL,
	`sources_checked` integer DEFAULT 0 NOT NULL,
	`candidates_found` integer DEFAULT 0 NOT NULL,
	`verified_count` integer DEFAULT 0 NOT NULL,
	`pending_count` integer DEFAULT 0 NOT NULL,
	`archived_count` integer DEFAULT 0 NOT NULL,
	`notes` text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE INDEX `scan_runs_finished_at_idx` ON `scan_runs` (`finished_at`);