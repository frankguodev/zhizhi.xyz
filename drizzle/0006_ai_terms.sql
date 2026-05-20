PRAGMA foreign_keys = ON;--> statement-breakpoint
CREATE TABLE `ai_terms` (
  `id` text PRIMARY KEY NOT NULL,
  `locale` text DEFAULT 'zh' NOT NULL,
  `translation_key` text NOT NULL,
  `term` text NOT NULL,
  `term_zh` text,
  `full_name` text,
  `slug` text NOT NULL,
  `short_concept` text NOT NULL,
  `short_desc` text NOT NULL,
  `tagline` text,
  `beginner_notes_json` text,
  `type` text DEFAULT 'concept' NOT NULL,
  `difficulty` text DEFAULT 'beginner' NOT NULL,
  `status` text DEFAULT 'draft' NOT NULL,
  `visibility` text DEFAULT 'public' NOT NULL,
  `heat_score` integer DEFAULT 0 NOT NULL,
  `quality_score` integer DEFAULT 0 NOT NULL,
  `trending` integer DEFAULT false NOT NULL,
  `sort_order` integer DEFAULT 0 NOT NULL,
  `content_md` text NOT NULL,
  `content_format` text DEFAULT 'markdown' NOT NULL,
  `content_version` text DEFAULT 'ai-term-md-v1' NOT NULL,
  `seo_title` text,
  `seo_description` text,
  `seo_keywords` text,
  `canonical_url` text,
  `robots` text,
  `share_image` text,
  `share_image_alt` text,
  `metadata_json` text,
  `source_note` text,
  `ai_assisted` integer DEFAULT true NOT NULL,
  `human_reviewed` integer DEFAULT false NOT NULL,
  `view_count` integer DEFAULT 0 NOT NULL,
  `published_at` integer,
  `last_verified_at` integer,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL,
  CHECK (`locale` IN ('zh', 'en')),
  CHECK (`type` IN ('concept', 'protocol', 'framework', 'product', 'model', 'workflow', 'infra', 'slang', 'company', 'method')),
  CHECK (`difficulty` IN ('beginner', 'intermediate', 'advanced')),
  CHECK (`status` IN ('draft', 'published', 'archived')),
  CHECK (`visibility` IN ('public', 'login', 'hidden')),
  CHECK (`heat_score` >= 0 AND `heat_score` <= 100),
  CHECK (`quality_score` >= 0 AND `quality_score` <= 100),
  CHECK (`trending` IN (0, 1)),
  CHECK (`content_format` IN ('markdown')),
  CHECK (`ai_assisted` IN (0, 1)),
  CHECK (`human_reviewed` IN (0, 1))
);--> statement-breakpoint
CREATE UNIQUE INDEX `ai_terms_locale_slug_unique` ON `ai_terms` (`locale`, `slug`);--> statement-breakpoint
CREATE INDEX `ai_terms_locale_status_visibility_idx` ON `ai_terms` (`locale`, `status`, `visibility`);--> statement-breakpoint
CREATE INDEX `ai_terms_locale_trending_idx` ON `ai_terms` (`locale`, `trending`, `heat_score`);--> statement-breakpoint
CREATE INDEX `ai_terms_locale_heat_idx` ON `ai_terms` (`locale`, `heat_score`);--> statement-breakpoint
CREATE INDEX `ai_terms_locale_quality_idx` ON `ai_terms` (`locale`, `quality_score`);--> statement-breakpoint
CREATE INDEX `ai_terms_locale_published_idx` ON `ai_terms` (`locale`, `published_at`);--> statement-breakpoint
CREATE INDEX `ai_terms_locale_verified_idx` ON `ai_terms` (`locale`, `last_verified_at`);--> statement-breakpoint
CREATE INDEX `ai_terms_locale_sort_idx` ON `ai_terms` (`locale`, `sort_order`, `term`);--> statement-breakpoint
CREATE INDEX `ai_terms_public_published_idx` ON `ai_terms` (`locale`, `status`, `visibility`, `published_at`);--> statement-breakpoint
CREATE INDEX `ai_terms_public_heat_idx` ON `ai_terms` (`locale`, `status`, `visibility`, `heat_score`);--> statement-breakpoint
CREATE INDEX `ai_terms_public_quality_idx` ON `ai_terms` (`locale`, `status`, `visibility`, `quality_score`);--> statement-breakpoint
CREATE INDEX `ai_terms_public_sort_idx` ON `ai_terms` (`locale`, `status`, `visibility`, `sort_order`, `term`);--> statement-breakpoint
CREATE INDEX `ai_terms_translation_key_idx` ON `ai_terms` (`translation_key`);--> statement-breakpoint
CREATE TABLE `ai_term_categories` (
  `id` text PRIMARY KEY NOT NULL,
  `locale` text DEFAULT 'zh' NOT NULL,
  `translation_key` text NOT NULL,
  `name` text NOT NULL,
  `slug` text NOT NULL,
  `description` text,
  `icon` text,
  `sort_order` integer DEFAULT 0 NOT NULL,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL,
  CHECK (`locale` IN ('zh', 'en'))
);--> statement-breakpoint
CREATE UNIQUE INDEX `ai_term_categories_locale_slug_unique` ON `ai_term_categories` (`locale`, `slug`);--> statement-breakpoint
CREATE INDEX `ai_term_categories_locale_sort_idx` ON `ai_term_categories` (`locale`, `sort_order`, `name`);--> statement-breakpoint
CREATE INDEX `ai_term_categories_translation_key_idx` ON `ai_term_categories` (`translation_key`);--> statement-breakpoint
CREATE TABLE `ai_term_category_relations` (
  `term_id` text NOT NULL,
  `category_id` text NOT NULL,
  `sort_order` integer DEFAULT 0 NOT NULL,
  PRIMARY KEY (`term_id`, `category_id`),
  FOREIGN KEY (`term_id`) REFERENCES `ai_terms`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`category_id`) REFERENCES `ai_term_categories`(`id`) ON UPDATE no action ON DELETE cascade
);--> statement-breakpoint
CREATE INDEX `ai_term_category_relations_category_idx` ON `ai_term_category_relations` (`category_id`, `sort_order`);--> statement-breakpoint
CREATE TABLE `ai_term_tags` (
  `id` text PRIMARY KEY NOT NULL,
  `locale` text DEFAULT 'zh' NOT NULL,
  `translation_key` text NOT NULL,
  `name` text NOT NULL,
  `slug` text NOT NULL,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL,
  CHECK (`locale` IN ('zh', 'en'))
);--> statement-breakpoint
CREATE UNIQUE INDEX `ai_term_tags_locale_slug_unique` ON `ai_term_tags` (`locale`, `slug`);--> statement-breakpoint
CREATE INDEX `ai_term_tags_translation_key_idx` ON `ai_term_tags` (`translation_key`);--> statement-breakpoint
CREATE TABLE `ai_term_tag_relations` (
  `term_id` text NOT NULL,
  `tag_id` text NOT NULL,
  PRIMARY KEY (`term_id`, `tag_id`),
  FOREIGN KEY (`term_id`) REFERENCES `ai_terms`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`tag_id`) REFERENCES `ai_term_tags`(`id`) ON UPDATE no action ON DELETE cascade
);--> statement-breakpoint
CREATE INDEX `ai_term_tag_relations_tag_idx` ON `ai_term_tag_relations` (`tag_id`);--> statement-breakpoint
CREATE TABLE `ai_term_relations` (
  `id` text PRIMARY KEY NOT NULL,
  `term_id` text NOT NULL,
  `related_term_id` text NOT NULL,
  `relation_type` text DEFAULT 'related' NOT NULL,
  `description` text,
  `sort_order` integer DEFAULT 0 NOT NULL,
  `created_at` integer NOT NULL,
  FOREIGN KEY (`term_id`) REFERENCES `ai_terms`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`related_term_id`) REFERENCES `ai_terms`(`id`) ON UPDATE no action ON DELETE cascade,
  CHECK (`relation_type` IN ('related', 'similar', 'opposite', 'upstream', 'downstream', 'ecosystem')),
  CHECK (`term_id` <> `related_term_id`)
);--> statement-breakpoint
CREATE UNIQUE INDEX `ai_term_relations_unique` ON `ai_term_relations` (`term_id`, `related_term_id`, `relation_type`);--> statement-breakpoint
CREATE INDEX `ai_term_relations_term_idx` ON `ai_term_relations` (`term_id`, `sort_order`);--> statement-breakpoint
CREATE INDEX `ai_term_relations_related_idx` ON `ai_term_relations` (`related_term_id`);--> statement-breakpoint
CREATE VIRTUAL TABLE `ai_term_search` USING fts5(
  term_id UNINDEXED,
  term,
  term_zh,
  full_name,
  short_concept,
  short_desc,
  beginner_notes_json,
  content_md
);--> statement-breakpoint
CREATE TRIGGER `ai_terms_ai`
AFTER INSERT ON `ai_terms`
BEGIN
  INSERT INTO `ai_term_search` (
    rowid,
    term_id,
    term,
    term_zh,
    full_name,
    short_concept,
    short_desc,
    beginner_notes_json,
    content_md
  )
  VALUES (
    new.rowid,
    new.id,
    new.term,
    new.term_zh,
    new.full_name,
    new.short_concept,
    new.short_desc,
    new.beginner_notes_json,
    new.content_md
  );
END;--> statement-breakpoint
CREATE TRIGGER `ai_terms_ad`
AFTER DELETE ON `ai_terms`
BEGIN
  DELETE FROM `ai_term_search`
  WHERE rowid = old.rowid;
END;--> statement-breakpoint
CREATE TRIGGER `ai_terms_au`
AFTER UPDATE ON `ai_terms`
BEGIN
  UPDATE `ai_term_search`
  SET
    term_id = new.id,
    term = new.term,
    term_zh = new.term_zh,
    full_name = new.full_name,
    short_concept = new.short_concept,
    short_desc = new.short_desc,
    beginner_notes_json = new.beginner_notes_json,
    content_md = new.content_md
  WHERE rowid = old.rowid;
END;
