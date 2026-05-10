CREATE TABLE `article_likes` (
	`id` text PRIMARY KEY NOT NULL,
	`locale` text DEFAULT 'zh' NOT NULL,
	`article_slug` text NOT NULL,
	`anonymous_id_hash` text NOT NULL,
	`is_liked` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `article_likes_locale_slug_device_unique` ON `article_likes` (`locale`,`article_slug`,`anonymous_id_hash`);--> statement-breakpoint
CREATE INDEX `article_likes_locale_slug_liked_idx` ON `article_likes` (`locale`,`article_slug`,`is_liked`);
