CREATE TABLE `article_views` (
	`id` text PRIMARY KEY NOT NULL,
	`locale` text DEFAULT 'zh' NOT NULL,
	`article_slug` text NOT NULL,
	`anonymous_id_hash` text NOT NULL,
	`view_count` integer DEFAULT 1 NOT NULL,
	`last_viewed_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `article_views_locale_slug_device_unique` ON `article_views` (`locale`,`article_slug`,`anonymous_id_hash`);--> statement-breakpoint
CREATE INDEX `article_views_locale_slug_last_viewed_idx` ON `article_views` (`locale`,`article_slug`,`last_viewed_at`);
