CREATE TABLE IF NOT EXISTS `ai_term_relation_candidates` (
  `id` text PRIMARY KEY NOT NULL,
  `term_id` text NOT NULL,
  `candidate_slug` text NOT NULL,
  `candidate_term` text,
  `relation_type` text DEFAULT 'related' NOT NULL,
  `description` text,
  `sort_order` integer DEFAULT 0 NOT NULL,
  `created_at` integer NOT NULL,
  `resolved_at` integer,
  FOREIGN KEY (`term_id`) REFERENCES `ai_terms`(`id`) ON UPDATE no action ON DELETE cascade,
  CHECK (`relation_type` IN ('related', 'similar', 'opposite', 'upstream', 'downstream', 'ecosystem'))
);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `ai_term_relation_candidates_unique` ON `ai_term_relation_candidates` (`term_id`, `candidate_slug`, `relation_type`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `ai_term_relation_candidates_term_idx` ON `ai_term_relation_candidates` (`term_id`, `sort_order`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `ai_term_relation_candidates_slug_idx` ON `ai_term_relation_candidates` (`candidate_slug`);

