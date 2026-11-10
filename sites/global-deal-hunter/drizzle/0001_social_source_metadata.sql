ALTER TABLE `deals` ADD `source_account` text;
--> statement-breakpoint
ALTER TABLE `deals` ADD `source_official` integer DEFAULT false NOT NULL;
