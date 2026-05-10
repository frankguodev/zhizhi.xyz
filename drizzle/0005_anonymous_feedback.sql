CREATE TABLE `anonymous_feedback` (
  `id` text PRIMARY KEY NOT NULL,
  `locale` text DEFAULT 'zh' NOT NULL,
  `page_url` text NOT NULL,
  `article_slug` text,
  `article_title` text,
  `feedback_type` text DEFAULT 'article' NOT NULL,
  `content` text NOT NULL,
  `contact` text,
  `anonymous_id_hash` text NOT NULL,
  `status` text DEFAULT 'new' NOT NULL,
  `user_agent` text,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL
);

CREATE INDEX `anonymous_feedback_status_created_idx` ON `anonymous_feedback` (`status`, `created_at`);
CREATE INDEX `anonymous_feedback_article_idx` ON `anonymous_feedback` (`locale`, `article_slug`, `created_at`);
CREATE INDEX `anonymous_feedback_device_created_idx` ON `anonymous_feedback` (`anonymous_id_hash`, `created_at`);
