CREATE TABLE `deal_alerts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`deal_id` integer NOT NULL,
	`alert_type` text NOT NULL,
	`deadline_days` integer,
	`baseline_value_label` text,
	`enabled` integer DEFAULT true NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`deal_id`) REFERENCES `deals`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `deal_alerts_user_deal_type_unique` ON `deal_alerts` (`user_id`,`deal_id`,`alert_type`);--> statement-breakpoint
CREATE INDEX `deal_alerts_enabled_idx` ON `deal_alerts` (`enabled`,`alert_type`);--> statement-breakpoint
CREATE TABLE `deal_evidence` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`deal_id` integer NOT NULL,
	`source_url` text NOT NULL,
	`source_name` text NOT NULL,
	`source_type` text NOT NULL,
	`source_account` text,
	`source_subreddit` text,
	`source_official` integer DEFAULT false NOT NULL,
	`verification_status` text DEFAULT 'pending' NOT NULL,
	`excerpt` text DEFAULT '' NOT NULL,
	`content_hash` text NOT NULL,
	`observed_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`deal_id`) REFERENCES `deals`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `deal_evidence_deal_url_unique` ON `deal_evidence` (`deal_id`,`source_url`);--> statement-breakpoint
CREATE INDEX `deal_evidence_deal_idx` ON `deal_evidence` (`deal_id`);--> statement-breakpoint
CREATE INDEX `deal_evidence_status_idx` ON `deal_evidence` (`verification_status`);--> statement-breakpoint
CREATE TABLE `deal_versions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`deal_id` integer NOT NULL,
	`content_hash` text NOT NULL,
	`snapshot_json` text NOT NULL,
	`changed_fields_json` text DEFAULT '[]' NOT NULL,
	`verification_status` text NOT NULL,
	`verified_at` text NOT NULL,
	FOREIGN KEY (`deal_id`) REFERENCES `deals`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `deal_versions_deal_hash_unique` ON `deal_versions` (`deal_id`,`content_hash`);--> statement-breakpoint
CREATE INDEX `deal_versions_deal_verified_idx` ON `deal_versions` (`deal_id`,`verified_at`);--> statement-breakpoint
CREATE TABLE `notification_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`event_key` text NOT NULL,
	`user_id` text NOT NULL,
	`deal_id` integer,
	`alert_id` integer,
	`event_type` text NOT NULL,
	`payload_json` text DEFAULT '{}' NOT NULL,
	`delivery_status` text DEFAULT 'queued' NOT NULL,
	`created_at` text NOT NULL,
	`delivered_at` text,
	FOREIGN KEY (`deal_id`) REFERENCES `deals`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`alert_id`) REFERENCES `deal_alerts`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `notification_events_key_unique` ON `notification_events` (`event_key`);--> statement-breakpoint
CREATE INDEX `notification_events_delivery_idx` ON `notification_events` (`delivery_status`,`created_at`);--> statement-breakpoint
CREATE TABLE `review_candidates` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`candidate_key` text NOT NULL,
	`source_id` text NOT NULL,
	`source_name` text NOT NULL,
	`source_url` text NOT NULL,
	`title` text NOT NULL,
	`summary` text DEFAULT '' NOT NULL,
	`relevance_score` integer DEFAULT 0 NOT NULL,
	`risk_score` integer DEFAULT 0 NOT NULL,
	`risk_flags_json` text DEFAULT '[]' NOT NULL,
	`review_status` text DEFAULT 'queued' NOT NULL,
	`review_notes` text DEFAULT '' NOT NULL,
	`first_seen_at` text NOT NULL,
	`last_seen_at` text NOT NULL,
	`reviewed_at` text,
	`reviewed_by` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `review_candidates_key_unique` ON `review_candidates` (`candidate_key`);--> statement-breakpoint
CREATE INDEX `review_candidates_status_idx` ON `review_candidates` (`review_status`,`relevance_score`);--> statement-breakpoint
CREATE TABLE `source_health` (
	`source_id` text PRIMARY KEY NOT NULL,
	`source_name` text NOT NULL,
	`status` text NOT NULL,
	`consecutive_failures` integer DEFAULT 0 NOT NULL,
	`last_attempt_at` text NOT NULL,
	`last_success_at` text,
	`last_error` text,
	`items_found` integer DEFAULT 0 NOT NULL,
	`response_ms` integer DEFAULT 0 NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `source_health_status_idx` ON `source_health` (`status`,`consecutive_failures`);--> statement-breakpoint
CREATE TABLE `user_favorites` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`deal_id` integer NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`deal_id`) REFERENCES `deals`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_favorites_user_deal_unique` ON `user_favorites` (`user_id`,`deal_id`);--> statement-breakpoint
CREATE INDEX `user_favorites_user_idx` ON `user_favorites` (`user_id`);--> statement-breakpoint
CREATE TABLE `user_preferences` (
	`user_id` text PRIMARY KEY NOT NULL,
	`regions_json` text DEFAULT '[]' NOT NULL,
	`eligibility_json` text DEFAULT '[]' NOT NULL,
	`deadline_days` integer DEFAULT 3 NOT NULL,
	`notify_deal_changes` integer DEFAULT true NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
