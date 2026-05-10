CREATE TABLE `article_tags` (
	`article_id` text NOT NULL,
	`tag_id` text NOT NULL,
	PRIMARY KEY(`article_id`, `tag_id`),
	FOREIGN KEY (`article_id`) REFERENCES `articles`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`tag_id`) REFERENCES `tags`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `articles` (
	`id` text PRIMARY KEY NOT NULL,
	`locale` text DEFAULT 'zh' NOT NULL,
	`translation_key` text NOT NULL,
	`title` text NOT NULL,
	`slug` text NOT NULL,
	`summary` text NOT NULL,
	`content` text NOT NULL,
	`cover_image` text,
	`category_id` text,
	`visibility` text DEFAULT 'public' NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`workflow_status` text DEFAULT 'editing' NOT NULL,
	`source_type` text DEFAULT 'mixed' NOT NULL,
	`source_note` text,
	`obsidian_path` text,
	`ai_assisted` integer DEFAULT true NOT NULL,
	`human_reviewed` integer DEFAULT false NOT NULL,
	`supports_reading_mode` integer DEFAULT true NOT NULL,
	`default_reading_mode` text DEFAULT 'full' NOT NULL,
	`is_featured` integer DEFAULT false NOT NULL,
	`view_count` integer DEFAULT 0 NOT NULL,
	`reading_minutes` integer DEFAULT 5 NOT NULL,
	`seo_title` text,
	`seo_description` text,
	`published_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `articles_locale_slug_unique` ON `articles` (`locale`,`slug`);--> statement-breakpoint
CREATE TABLE `categories` (
	`id` text PRIMARY KEY NOT NULL,
	`locale` text DEFAULT 'zh' NOT NULL,
	`translation_key` text NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`description` text,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `categories_locale_slug_unique` ON `categories` (`locale`,`slug`);--> statement-breakpoint
CREATE TABLE `external_links` (
	`id` text PRIMARY KEY NOT NULL,
	`locale` text DEFAULT 'zh' NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`url` text NOT NULL,
	`position` text NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `favorites` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`article_id` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`article_id`) REFERENCES `articles`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `favorites_user_article_unique` ON `favorites` (`user_id`,`article_id`);--> statement-breakpoint
CREATE TABLE `reading_histories` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`article_id` text NOT NULL,
	`progress` integer DEFAULT 0 NOT NULL,
	`completed_at` integer,
	`last_read_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`article_id`) REFERENCES `articles`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `reading_histories_user_article_unique` ON `reading_histories` (`user_id`,`article_id`);--> statement-breakpoint
CREATE TABLE `series` (
	`id` text PRIMARY KEY NOT NULL,
	`locale` text DEFAULT 'zh' NOT NULL,
	`translation_key` text NOT NULL,
	`title` text NOT NULL,
	`slug` text NOT NULL,
	`description` text NOT NULL,
	`cover_image` text,
	`status` text DEFAULT 'draft' NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `series_locale_slug_unique` ON `series` (`locale`,`slug`);--> statement-breakpoint
CREATE TABLE `series_articles` (
	`series_id` text NOT NULL,
	`article_id` text NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	PRIMARY KEY(`series_id`, `article_id`),
	FOREIGN KEY (`series_id`) REFERENCES `series`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`article_id`) REFERENCES `articles`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `tags` (
	`id` text PRIMARY KEY NOT NULL,
	`locale` text DEFAULT 'zh' NOT NULL,
	`translation_key` text NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tags_locale_slug_unique` ON `tags` (`locale`,`slug`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`password_hash` text NOT NULL,
	`display_name` text,
	`avatar_url` text,
	`role` text DEFAULT 'user' NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`preferred_locale` text DEFAULT 'zh' NOT NULL,
	`preferred_reading_mode` text DEFAULT 'full' NOT NULL,
	`email_verified_at` integer,
	`last_login_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);