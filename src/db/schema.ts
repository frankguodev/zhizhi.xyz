import {
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

export const users = sqliteTable(
  "users",
  {
    id: text("id").primaryKey(),
    email: text("email").notNull(),
    passwordHash: text("password_hash").notNull(),
    displayName: text("display_name"),
    avatarUrl: text("avatar_url"),
    role: text("role", { enum: ["user", "admin"] }).notNull().default("user"),
    status: text("status", { enum: ["active", "disabled"] }).notNull().default("active"),
    preferredLocale: text("preferred_locale", { enum: ["zh", "en"] }).notNull().default("zh"),
    preferredReadingMode: text("preferred_reading_mode", { enum: ["full", "quick"] }).notNull().default("full"),
    emailVerifiedAt: integer("email_verified_at", { mode: "timestamp_ms" }),
    lastLoginAt: integer("last_login_at", { mode: "timestamp_ms" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => [uniqueIndex("users_email_unique").on(table.email)],
);

export const categories = sqliteTable(
  "categories",
  {
    id: text("id").primaryKey(),
    locale: text("locale", { enum: ["zh", "en"] }).notNull().default("zh"),
    translationKey: text("translation_key").notNull(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    description: text("description"),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => [uniqueIndex("categories_locale_slug_unique").on(table.locale, table.slug)],
);

export const tags = sqliteTable(
  "tags",
  {
    id: text("id").primaryKey(),
    locale: text("locale", { enum: ["zh", "en"] }).notNull().default("zh"),
    translationKey: text("translation_key").notNull(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => [uniqueIndex("tags_locale_slug_unique").on(table.locale, table.slug)],
);

export const articles = sqliteTable(
  "articles",
  {
    id: text("id").primaryKey(),
    locale: text("locale", { enum: ["zh", "en"] }).notNull().default("zh"),
    translationKey: text("translation_key").notNull(),
    title: text("title").notNull(),
    slug: text("slug").notNull(),
    summary: text("summary").notNull(),
    content: text("content").notNull(),
    coverImage: text("cover_image"),
    categoryId: text("category_id").references(() => categories.id),
    visibility: text("visibility", { enum: ["public", "login", "hidden"] }).notNull().default("public"),
    status: text("status", { enum: ["draft", "published", "archived"] }).notNull().default("draft"),
    workflowStatus: text("workflow_status", {
      enum: ["collecting", "ai_draft", "editing", "ready", "published"],
    }).notNull().default("editing"),
    sourceType: text("source_type", {
      enum: ["original", "ai_assisted", "curated", "mixed"],
    }).notNull().default("mixed"),
    sourceNote: text("source_note"),
    obsidianPath: text("obsidian_path"),
    aiAssisted: integer("ai_assisted", { mode: "boolean" }).notNull().default(true),
    humanReviewed: integer("human_reviewed", { mode: "boolean" }).notNull().default(false),
    supportsReadingMode: integer("supports_reading_mode", { mode: "boolean" }).notNull().default(true),
    defaultReadingMode: text("default_reading_mode", { enum: ["full", "quick"] }).notNull().default("full"),
    isFeatured: integer("is_featured", { mode: "boolean" }).notNull().default(false),
    viewCount: integer("view_count").notNull().default(0),
    readingMinutes: integer("reading_minutes").notNull().default(5),
    seoTitle: text("seo_title"),
    seoDescription: text("seo_description"),
    seoKeywords: text("seo_keywords"),
    canonicalUrl: text("canonical_url"),
    robots: text("robots"),
    coverImageAlt: text("cover_image_alt"),
    ogTitle: text("og_title"),
    ogDescription: text("og_description"),
    ogImage: text("og_image"),
    ogImageAlt: text("og_image_alt"),
    twitterTitle: text("twitter_title"),
    twitterDescription: text("twitter_description"),
    twitterImage: text("twitter_image"),
    articleType: text("article_type"),
    difficulty: text("difficulty"),
    primaryTopic: text("primary_topic"),
    seoMetadata: text("seo_metadata", { mode: "json" }),
    publishedAt: integer("published_at", { mode: "timestamp_ms" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => [uniqueIndex("articles_locale_slug_unique").on(table.locale, table.slug)],
);

export const articleTags = sqliteTable(
  "article_tags",
  {
    articleId: text("article_id").notNull().references(() => articles.id, { onDelete: "cascade" }),
    tagId: text("tag_id").notNull().references(() => tags.id, { onDelete: "cascade" }),
  },
  (table) => [primaryKey({ columns: [table.articleId, table.tagId] })],
);

export const series = sqliteTable(
  "series",
  {
    id: text("id").primaryKey(),
    locale: text("locale", { enum: ["zh", "en"] }).notNull().default("zh"),
    translationKey: text("translation_key").notNull(),
    title: text("title").notNull(),
    slug: text("slug").notNull(),
    description: text("description").notNull(),
    coverImage: text("cover_image"),
    status: text("status", { enum: ["draft", "published", "archived"] }).notNull().default("draft"),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => [uniqueIndex("series_locale_slug_unique").on(table.locale, table.slug)],
);

export const seriesArticles = sqliteTable(
  "series_articles",
  {
    seriesId: text("series_id").notNull().references(() => series.id, { onDelete: "cascade" }),
    articleId: text("article_id").notNull().references(() => articles.id, { onDelete: "cascade" }),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (table) => [primaryKey({ columns: [table.seriesId, table.articleId] })],
);

export const favorites = sqliteTable(
  "favorites",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    articleId: text("article_id").notNull().references(() => articles.id, { onDelete: "cascade" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => [uniqueIndex("favorites_user_article_unique").on(table.userId, table.articleId)],
);

export const readingHistories = sqliteTable(
  "reading_histories",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    articleId: text("article_id").notNull().references(() => articles.id, { onDelete: "cascade" }),
    progress: integer("progress").notNull().default(0),
    completedAt: integer("completed_at", { mode: "timestamp_ms" }),
    lastReadAt: integer("last_read_at", { mode: "timestamp_ms" }).notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => [uniqueIndex("reading_histories_user_article_unique").on(table.userId, table.articleId)],
);

export const articleLikes = sqliteTable(
  "article_likes",
  {
    id: text("id").primaryKey(),
    locale: text("locale", { enum: ["zh", "en"] }).notNull().default("zh"),
    articleSlug: text("article_slug").notNull(),
    anonymousIdHash: text("anonymous_id_hash").notNull(),
    isLiked: integer("is_liked", { mode: "boolean" }).notNull().default(true),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => [
    uniqueIndex("article_likes_locale_slug_device_unique").on(table.locale, table.articleSlug, table.anonymousIdHash),
    index("article_likes_locale_slug_liked_idx").on(table.locale, table.articleSlug, table.isLiked),
  ],
);

export const articleViews = sqliteTable(
  "article_views",
  {
    id: text("id").primaryKey(),
    locale: text("locale", { enum: ["zh", "en"] }).notNull().default("zh"),
    articleSlug: text("article_slug").notNull(),
    anonymousIdHash: text("anonymous_id_hash").notNull(),
    viewCount: integer("view_count").notNull().default(1),
    lastViewedAt: integer("last_viewed_at", { mode: "timestamp_ms" }).notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => [
    uniqueIndex("article_views_locale_slug_device_unique").on(table.locale, table.articleSlug, table.anonymousIdHash),
    index("article_views_locale_slug_last_viewed_idx").on(table.locale, table.articleSlug, table.lastViewedAt),
  ],
);

export const anonymousFeedback = sqliteTable(
  "anonymous_feedback",
  {
    id: text("id").primaryKey(),
    locale: text("locale", { enum: ["zh", "en"] }).notNull().default("zh"),
    pageUrl: text("page_url").notNull(),
    articleSlug: text("article_slug"),
    articleTitle: text("article_title"),
    feedbackType: text("feedback_type", { enum: ["article", "site"] }).notNull().default("article"),
    content: text("content").notNull(),
    contact: text("contact"),
    anonymousIdHash: text("anonymous_id_hash").notNull(),
    status: text("status", { enum: ["new", "reviewed", "archived"] }).notNull().default("new"),
    userAgent: text("user_agent"),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => [
    index("anonymous_feedback_status_created_idx").on(table.status, table.createdAt),
    index("anonymous_feedback_article_idx").on(table.locale, table.articleSlug, table.createdAt),
    index("anonymous_feedback_device_created_idx").on(table.anonymousIdHash, table.createdAt),
  ],
);

export const externalLinks = sqliteTable("external_links", {
  id: text("id").primaryKey(),
  locale: text("locale", { enum: ["zh", "en"] }).notNull().default("zh"),
  title: text("title").notNull(),
  description: text("description"),
  url: text("url").notNull(),
  position: text("position", {
    enum: ["home", "article_footer", "profile", "donate", "site_footer"],
  }).notNull(),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
});

export const adminOperationLogs = sqliteTable(
  "admin_operation_logs",
  {
    id: text("id").primaryKey(),
    adminUserId: text("admin_user_id").references(() => users.id, { onDelete: "set null" }),
    adminEmail: text("admin_email"),
    action: text("action", {
      enum: ["article_publish", "article_update", "article_archive", "article_restore", "article_delete"],
    }).notNull(),
    targetType: text("target_type", { enum: ["article"] }).notNull(),
    targetId: text("target_id"),
    targetLocale: text("target_locale", { enum: ["zh", "en"] }),
    targetSlug: text("target_slug"),
    targetTitle: text("target_title"),
    details: text("details", { mode: "json" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => [
    index("admin_operation_logs_target_idx").on(table.targetType, table.targetId, table.createdAt),
    index("admin_operation_logs_action_idx").on(table.action, table.createdAt),
  ],
);
