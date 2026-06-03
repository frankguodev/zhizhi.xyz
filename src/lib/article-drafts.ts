import { revalidateTag } from "next/cache";
import { and, desc, eq, inArray } from "drizzle-orm";
import type { ArticleRecord } from "@/data/articles";
import { getDb } from "@/db/client";
import { articleLikes, articleTags, articleViews, articles, categories, seriesArticles, tags } from "@/db/schema";
import { normalizeArticleCategory } from "@/lib/article-taxonomy";

export const PUBLIC_ARTICLES_CACHE_TAG = "public-articles";

export function revalidatePublicArticlesCache() {
  revalidateTag(PUBLIC_ARTICLES_CACHE_TAG, { expire: 0 });
}

function now() {
  return new Date();
}

function toDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function slugify(value: string) {
  return (
    value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-")
      .replace(/^-+|-+$/g, "") || "untitled"
  );
}

function articleIdFor(article: Pick<ArticleRecord, "locale" | "slug">) {
  return `article:${article.locale}:${article.slug}`;
}

function categoryIdFor(locale: ArticleRecord["locale"], category: string) {
  return `category:${locale}:${slugify(category || "未分类")}`;
}

function dateString(value: Date | string | number | null) {
  if (value === null) {
    return "";
  }

  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
}

function yamlString(value: string) {
  return `"${value.replaceAll("\\", "\\\\").replaceAll('"', '\\"')}"`;
}

function optionalString(value: string | undefined) {
  const normalized = value?.trim();
  return normalized || undefined;
}

function serializedStringList(value: string[] | undefined) {
  if (!value || value.length === 0) {
    return null;
  }

  return JSON.stringify(value);
}

function parseStringList(value: string | null) {
  if (!value) {
    return undefined;
  }

  try {
    const parsed = JSON.parse(value);

    if (Array.isArray(parsed)) {
      const items = parsed.map(String).map((item) => item.trim()).filter(Boolean);
      return items.length > 0 ? items : undefined;
    }
  } catch {
    const items = value.split(",").map((item) => item.trim()).filter(Boolean);
    return items.length > 0 ? items : undefined;
  }

  return undefined;
}

function recordFromJson(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }

  return value as Record<string, unknown>;
}

function cloneRecord(value: unknown) {
  const record = recordFromJson(value);
  return record ? { ...record } : {};
}

function setValue(record: Record<string, unknown>, key: string, value: unknown) {
  if (value !== undefined) {
    record[key] = value;
  }
}

function sectionRecord(frontmatter: Record<string, unknown>, metadata: Record<string, unknown>, frontmatterKey: string, metadataKey: string) {
  return {
    ...cloneRecord(metadata[metadataKey]),
    ...cloneRecord(frontmatter[frontmatterKey]),
  };
}

function yamlScalar(value: unknown) {
  if (typeof value === "string") {
    return yamlString(value);
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  if (value === null) {
    return "null";
  }

  return yamlString(String(value));
}

function yamlUnknownLines(key: string, value: unknown, indent = ""): string[] {
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return [`${indent}${key}: []`];
    }

    const lines = [`${indent}${key}:`];
    for (const item of value) {
      if (item && typeof item === "object" && !Array.isArray(item)) {
        lines.push(`${indent}  -`);
        for (const [childKey, childValue] of Object.entries(item as Record<string, unknown>)) {
          lines.push(...yamlUnknownLines(childKey, childValue, `${indent}    `));
        }
      } else {
        lines.push(`${indent}  - ${yamlScalar(item)}`);
      }
    }
    return lines;
  }

  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length === 0) {
      return [`${indent}${key}: {}`];
    }

    return [`${indent}${key}:`, ...entries.flatMap(([childKey, childValue]) => yamlUnknownLines(childKey, childValue, `${indent}  `))];
  }

  return [`${indent}${key}: ${yamlScalar(value)}`];
}

function frontmatterToYaml(frontmatter: Record<string, unknown>) {
  return ["---", ...Object.entries(frontmatter).flatMap(([key, value]) => yamlUnknownLines(key, value)), "---"];
}

function buildArticleFrontmatter(article: ArticleRecord) {
  const metadata = article.seoMetadata ?? {};
  const frontmatter = cloneRecord(metadata.rawFrontmatter);

  setValue(frontmatter, "title", article.title);
  setValue(frontmatter, "slug", article.slug);
  setValue(frontmatter, "summary", article.summary);
  setValue(frontmatter, "category", article.category);
  if (!Array.isArray(frontmatter.tags)) {
    setValue(frontmatter, "tags", article.tags);
  }
  setValue(frontmatter, "visibility", article.visibility);
  setValue(frontmatter, "locale", article.locale);
  setValue(frontmatter, "reading_minutes", article.readingMinutes);
  setValue(frontmatter, "published_at", article.publishedAt);
  setValue(frontmatter, "updated_at", article.updatedAt);
  setValue(frontmatter, "supports_reading_mode", article.supportsReadingMode);
  setValue(frontmatter, "default_reading_mode", article.defaultReadingMode);

  const seo = sectionRecord(frontmatter, metadata, "seo", "seo");
  setValue(seo, "title", article.seoTitle);
  setValue(seo, "description", article.seoDescription);
  setValue(seo, "keywords", article.seoKeywords);
  setValue(seo, "canonical_url", article.canonicalUrl);
  setValue(seo, "robots", article.robots);
  if (Object.keys(seo).length > 0) {
    frontmatter.seo = seo;
  }

  const openGraph = sectionRecord(frontmatter, metadata, "open_graph", "openGraph");
  setValue(openGraph, "title", article.ogTitle);
  setValue(openGraph, "description", article.ogDescription);
  setValue(openGraph, "type", openGraph.type ?? "article");
  setValue(openGraph, "image", article.ogImage ?? article.coverImage);
  setValue(openGraph, "image_alt", article.ogImageAlt ?? article.coverImageAlt);
  if (Object.keys(openGraph).length > 0) {
    frontmatter.open_graph = openGraph;
  }

  const twitter = sectionRecord(frontmatter, metadata, "twitter", "twitter");
  setValue(twitter, "card", twitter.card ?? "summary_large_image");
  setValue(twitter, "title", article.twitterTitle);
  setValue(twitter, "description", article.twitterDescription);
  setValue(twitter, "image", article.twitterImage);
  if (Object.keys(twitter).length > 0) {
    frontmatter.twitter = twitter;
  }

  const content = sectionRecord(frontmatter, metadata, "content", "content");
  setValue(content, "article_type", article.articleType);
  setValue(content, "difficulty", article.difficulty);
  setValue(content, "primary_topic", article.primaryTopic);
  if (Object.keys(content).length > 0) {
    frontmatter.content = content;
  }

  const source = sectionRecord(frontmatter, metadata, "source", "source");
  setValue(source, "source_type", article.sourceType);
  setValue(source, "ai_assisted", article.aiAssisted);
  setValue(source, "human_reviewed", article.humanReviewed);
  setValue(source, "source_note", article.sourceNote);
  if (Object.keys(source).length > 0) {
    frontmatter.source = source;
  }

  const structuredData = sectionRecord(frontmatter, metadata, "structured_data", "structuredData");
  if (Object.keys(structuredData).length > 0) {
    frontmatter.structured_data = structuredData;
  }

  return frontmatter;
}

function articleSeoValues(article: ArticleRecord) {
  return {
    coverImage: optionalString(article.coverImage) ?? null,
    seoTitle: optionalString(article.seoTitle) ?? article.title,
    seoDescription: optionalString(article.seoDescription) ?? article.summary,
    seoKeywords: serializedStringList(article.seoKeywords),
    canonicalUrl: optionalString(article.canonicalUrl) ?? null,
    robots: optionalString(article.robots) ?? null,
    coverImageAlt: optionalString(article.coverImageAlt) ?? null,
    ogTitle: optionalString(article.ogTitle) ?? null,
    ogDescription: optionalString(article.ogDescription) ?? null,
    ogImage: optionalString(article.ogImage) ?? null,
    ogImageAlt: optionalString(article.ogImageAlt) ?? null,
    twitterTitle: optionalString(article.twitterTitle) ?? null,
    twitterDescription: optionalString(article.twitterDescription) ?? null,
    twitterImage: optionalString(article.twitterImage) ?? null,
    articleType: optionalString(article.articleType) ?? null,
    difficulty: optionalString(article.difficulty) ?? null,
    primaryTopic: optionalString(article.primaryTopic) ?? null,
    seoMetadata: article.seoMetadata ?? null,
    sourceType: article.sourceType ?? "mixed",
    sourceNote: optionalString(article.sourceNote) ?? "Imported from Markdown workbench",
    aiAssisted: article.aiAssisted ?? true,
    humanReviewed: article.humanReviewed ?? false,
  };
}

export function articleToMarkdown(article: ArticleRecord) {
  return [...frontmatterToYaml(buildArticleFrontmatter(article)), "", article.content].join("\n");
}

async function articleRecordFromRow(row: {
  id: string;
  locale: ArticleRecord["locale"];
  title: string;
  slug: string;
  summary: string;
  content: string;
  visibility: ArticleRecord["visibility"];
  supportsReadingMode: boolean;
  defaultReadingMode: ArticleRecord["defaultReadingMode"];
  readingMinutes: number;
  viewCount: number;
  publishedAt: Date | string | number | null;
  updatedAt: Date | string | number;
  category: string | null;
  coverImage: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  seoKeywords: string | null;
  canonicalUrl: string | null;
  robots: string | null;
  coverImageAlt: string | null;
  ogTitle: string | null;
  ogDescription: string | null;
  ogImage: string | null;
  ogImageAlt: string | null;
  twitterTitle: string | null;
  twitterDescription: string | null;
  twitterImage: string | null;
  articleType: string | null;
  difficulty: string | null;
  primaryTopic: string | null;
  seoMetadata: unknown;
  sourceType: ArticleRecord["sourceType"] | null;
  sourceNote: string | null;
  aiAssisted: boolean;
  humanReviewed: boolean;
}) {
  const db = await getDb();
  const tagRows = await db
    .select({ name: tags.name })
    .from(articleTags)
    .innerJoin(tags, eq(articleTags.tagId, tags.id))
    .where(eq(articleTags.articleId, row.id));

  return {
    slug: row.slug,
    locale: row.locale,
    title: row.title,
    summary: row.summary,
    category: normalizeArticleCategory(row.category, row.locale),
    tags: tagRows.map((tag) => tag.name),
    visibility: row.visibility,
    readingMinutes: row.readingMinutes,
    viewCount: row.viewCount,
    publishedAt: dateString(row.publishedAt),
    updatedAt: dateString(row.updatedAt),
    supportsReadingMode: row.supportsReadingMode,
    defaultReadingMode: row.defaultReadingMode,
    seoTitle: row.seoTitle ?? undefined,
    seoDescription: row.seoDescription ?? undefined,
    seoKeywords: parseStringList(row.seoKeywords),
    canonicalUrl: row.canonicalUrl ?? undefined,
    robots: row.robots ?? undefined,
    coverImage: row.coverImage ?? undefined,
    coverImageAlt: row.coverImageAlt ?? undefined,
    ogTitle: row.ogTitle ?? undefined,
    ogDescription: row.ogDescription ?? undefined,
    ogImage: row.ogImage ?? undefined,
    ogImageAlt: row.ogImageAlt ?? undefined,
    twitterTitle: row.twitterTitle ?? undefined,
    twitterDescription: row.twitterDescription ?? undefined,
    twitterImage: row.twitterImage ?? undefined,
    articleType: row.articleType ?? undefined,
    difficulty: row.difficulty ?? undefined,
    primaryTopic: row.primaryTopic ?? undefined,
    seoMetadata: recordFromJson(row.seoMetadata),
    sourceType: row.sourceType ?? undefined,
    sourceNote: row.sourceNote ?? undefined,
    aiAssisted: row.aiAssisted,
    humanReviewed: row.humanReviewed,
    content: row.content,
  } satisfies ArticleRecord;
}

async function saveArticleWithStatus(articleInput: ArticleRecord, status: "draft" | "published") {
  const article = {
    ...articleInput,
    category: normalizeArticleCategory(articleInput.category, articleInput.locale),
  };
  const db = await getDb();
  const timestamp = now();
  const articleId = articleIdFor(article);
  const categorySlug = slugify(article.category || "未分类");
  const categoryId = categoryIdFor(article.locale, article.category);
  const seoValues = articleSeoValues(article);
  const isPublished = status === "published";

  await db
    .insert(categories)
    .values({
      id: categoryId,
      locale: article.locale,
      translationKey: categorySlug,
      name: article.category || "未分类",
      slug: categorySlug,
      description: null,
      sortOrder: 0,
      createdAt: timestamp,
      updatedAt: timestamp,
    })
    .onConflictDoUpdate({
      target: [categories.locale, categories.slug],
      set: {
        name: article.category || "未分类",
        updatedAt: timestamp,
      },
    });

  await db
    .insert(articles)
    .values({
      id: articleId,
      locale: article.locale,
      translationKey: article.slug,
      title: article.title,
      slug: article.slug,
      summary: article.summary,
      content: article.content,
      coverImage: seoValues.coverImage,
      categoryId,
      visibility: article.visibility,
      status,
      workflowStatus: isPublished ? "published" : "editing",
      sourceType: seoValues.sourceType,
      sourceNote: seoValues.sourceNote,
      obsidianPath: null,
      aiAssisted: seoValues.aiAssisted,
      humanReviewed: isPublished ? true : seoValues.humanReviewed,
      supportsReadingMode: article.supportsReadingMode,
      defaultReadingMode: article.defaultReadingMode,
      isFeatured: false,
      viewCount: 0,
      readingMinutes: article.readingMinutes,
      seoTitle: seoValues.seoTitle,
      seoDescription: seoValues.seoDescription,
      seoKeywords: seoValues.seoKeywords,
      canonicalUrl: seoValues.canonicalUrl,
      robots: seoValues.robots,
      coverImageAlt: seoValues.coverImageAlt,
      ogTitle: seoValues.ogTitle,
      ogDescription: seoValues.ogDescription,
      ogImage: seoValues.ogImage,
      ogImageAlt: seoValues.ogImageAlt,
      twitterTitle: seoValues.twitterTitle,
      twitterDescription: seoValues.twitterDescription,
      twitterImage: seoValues.twitterImage,
      articleType: seoValues.articleType,
      difficulty: seoValues.difficulty,
      primaryTopic: seoValues.primaryTopic,
      seoMetadata: seoValues.seoMetadata,
      publishedAt: toDate(article.publishedAt),
      createdAt: timestamp,
      updatedAt: timestamp,
    })
    .onConflictDoUpdate({
      target: [articles.locale, articles.slug],
      set: {
        title: article.title,
        summary: article.summary,
        content: article.content,
        coverImage: seoValues.coverImage,
        categoryId,
        visibility: article.visibility,
        status,
        workflowStatus: isPublished ? "published" : "editing",
        sourceType: seoValues.sourceType,
        sourceNote: seoValues.sourceNote,
        aiAssisted: seoValues.aiAssisted,
        humanReviewed: isPublished ? true : seoValues.humanReviewed,
        supportsReadingMode: article.supportsReadingMode,
        defaultReadingMode: article.defaultReadingMode,
        readingMinutes: article.readingMinutes,
        seoTitle: seoValues.seoTitle,
        seoDescription: seoValues.seoDescription,
        seoKeywords: seoValues.seoKeywords,
        canonicalUrl: seoValues.canonicalUrl,
        robots: seoValues.robots,
        coverImageAlt: seoValues.coverImageAlt,
        ogTitle: seoValues.ogTitle,
        ogDescription: seoValues.ogDescription,
        ogImage: seoValues.ogImage,
        ogImageAlt: seoValues.ogImageAlt,
        twitterTitle: seoValues.twitterTitle,
        twitterDescription: seoValues.twitterDescription,
        twitterImage: seoValues.twitterImage,
        articleType: seoValues.articleType,
        difficulty: seoValues.difficulty,
        primaryTopic: seoValues.primaryTopic,
        seoMetadata: seoValues.seoMetadata,
        publishedAt: toDate(article.publishedAt),
        updatedAt: timestamp,
      },
    });

  await db.delete(articleTags).where(eq(articleTags.articleId, articleId));

  for (const tagName of article.tags) {
    const tagSlug = slugify(tagName);
    const tagId = `tag:${article.locale}:${tagSlug}`;

    await db
      .insert(tags)
      .values({
        id: tagId,
        locale: article.locale,
        translationKey: tagSlug,
        name: tagName,
        slug: tagSlug,
        createdAt: timestamp,
        updatedAt: timestamp,
      })
      .onConflictDoUpdate({
        target: [tags.locale, tags.slug],
        set: {
          name: tagName,
          updatedAt: timestamp,
        },
      });

    await db.insert(articleTags).values({ articleId, tagId }).onConflictDoNothing();
  }

  return { id: articleId, slug: article.slug, locale: article.locale };
}

export async function saveArticleDraft(article: ArticleRecord) {
  return saveArticleWithStatus(article, "draft");
}

export async function updatePublishedArticle(article: ArticleRecord) {
  const result = await saveArticleWithStatus(article, "published");
  revalidatePublicArticlesCache();
  return result;
}

async function getArticleByStatus(locale: ArticleRecord["locale"], slug: string, status: "draft" | "published") {
  const db = await getDb();
  const rows = await db
    .select({
      id: articles.id,
      locale: articles.locale,
      title: articles.title,
      slug: articles.slug,
      summary: articles.summary,
      content: articles.content,
      visibility: articles.visibility,
      supportsReadingMode: articles.supportsReadingMode,
      defaultReadingMode: articles.defaultReadingMode,
      readingMinutes: articles.readingMinutes,
      viewCount: articles.viewCount,
      publishedAt: articles.publishedAt,
      updatedAt: articles.updatedAt,
      coverImage: articles.coverImage,
      seoTitle: articles.seoTitle,
      seoDescription: articles.seoDescription,
      seoKeywords: articles.seoKeywords,
      canonicalUrl: articles.canonicalUrl,
      robots: articles.robots,
      coverImageAlt: articles.coverImageAlt,
      ogTitle: articles.ogTitle,
      ogDescription: articles.ogDescription,
      ogImage: articles.ogImage,
      ogImageAlt: articles.ogImageAlt,
      twitterTitle: articles.twitterTitle,
      twitterDescription: articles.twitterDescription,
      twitterImage: articles.twitterImage,
      articleType: articles.articleType,
      difficulty: articles.difficulty,
      primaryTopic: articles.primaryTopic,
      seoMetadata: articles.seoMetadata,
      sourceType: articles.sourceType,
      sourceNote: articles.sourceNote,
      aiAssisted: articles.aiAssisted,
      humanReviewed: articles.humanReviewed,
      category: categories.name,
    })
    .from(articles)
    .leftJoin(categories, eq(articles.categoryId, categories.id))
    .where(and(eq(articles.locale, locale), eq(articles.slug, slug), eq(articles.status, status)))
    .limit(1);

  const row = rows[0];

  if (!row) {
    return null;
  }

  return articleRecordFromRow(row);
}

export async function getArticleDraft(locale: ArticleRecord["locale"], slug: string) {
  return getArticleByStatus(locale, slug, "draft");
}

export async function getPublishedArticle(locale: ArticleRecord["locale"], slug: string) {
  return getArticleByStatus(locale, slug, "published");
}

export async function publishArticleDraft(locale: ArticleRecord["locale"], slug: string) {
  const db = await getDb();
  const timestamp = now();
  const publishedAt = timestamp;
  const result = await db
    .update(articles)
    .set({
      status: "published",
      workflowStatus: "published",
      humanReviewed: true,
      publishedAt,
      updatedAt: timestamp,
    })
    .where(and(eq(articles.locale, locale), eq(articles.slug, slug), eq(articles.status, "draft")))
    .returning({ id: articles.id, slug: articles.slug, locale: articles.locale });

  const published = result[0] ?? null;

  if (published) {
    revalidatePublicArticlesCache();
  }

  return published;
}

export async function listArticleDrafts() {
  const db = await getDb();

  return db
    .select({
      id: articles.id,
      title: articles.title,
      slug: articles.slug,
      locale: articles.locale,
      summary: articles.summary,
      status: articles.status,
      workflowStatus: articles.workflowStatus,
      visibility: articles.visibility,
      readingMinutes: articles.readingMinutes,
      updatedAt: articles.updatedAt,
    })
    .from(articles)
    .where(and(eq(articles.status, "draft")))
    .orderBy(desc(articles.updatedAt))
    .limit(50);
}

export type PublishedArticleListSource = {
  slug: string;
  locale: ArticleRecord["locale"];
  title: string;
  summary: string;
  category: string;
  tags: string[];
  visibility: ArticleRecord["visibility"];
  readingMinutes: number;
  viewCount: number;
  publishedAt: string;
  updatedAt: string;
};

// 列表专用精简查询：只取列表卡片所需字段（不含正文 content 与重 SEO 字段），
// 并用一次聚合查询补齐 tags，避免 listPublishedArticles 的「每篇一次 tag 查询」N+1。
export async function listPublishedArticleListItems(locale: ArticleRecord["locale"] = "zh"): Promise<PublishedArticleListSource[]> {
  const db = await getDb();
  const rows = await db
    .select({
      id: articles.id,
      slug: articles.slug,
      locale: articles.locale,
      title: articles.title,
      summary: articles.summary,
      visibility: articles.visibility,
      readingMinutes: articles.readingMinutes,
      viewCount: articles.viewCount,
      publishedAt: articles.publishedAt,
      updatedAt: articles.updatedAt,
      category: categories.name,
    })
    .from(articles)
    .leftJoin(categories, eq(articles.categoryId, categories.id))
    .where(and(eq(articles.locale, locale), eq(articles.status, "published")))
    .orderBy(desc(articles.publishedAt), desc(articles.updatedAt))
    .limit(100);

  const tagRows = await db
    .select({ articleId: articleTags.articleId, name: tags.name })
    .from(articleTags)
    .innerJoin(tags, eq(articleTags.tagId, tags.id))
    .innerJoin(articles, eq(articleTags.articleId, articles.id))
    .where(and(eq(articles.locale, locale), eq(articles.status, "published")));

  const tagsByArticle = new Map<string, string[]>();
  for (const tagRow of tagRows) {
    const list = tagsByArticle.get(tagRow.articleId) ?? [];
    list.push(tagRow.name);
    tagsByArticle.set(tagRow.articleId, list);
  }

  return rows.map((row) => ({
    slug: row.slug,
    locale: row.locale,
    title: row.title,
    summary: row.summary,
    category: normalizeArticleCategory(row.category, row.locale),
    tags: tagsByArticle.get(row.id) ?? [],
    visibility: row.visibility,
    readingMinutes: row.readingMinutes,
    viewCount: row.viewCount ?? 0,
    publishedAt: dateString(row.publishedAt),
    updatedAt: dateString(row.updatedAt),
  }));
}

export async function listPublishedArticles(locale: ArticleRecord["locale"] = "zh") {
  const db = await getDb();
  const rows = await db
    .select({
      id: articles.id,
      locale: articles.locale,
      title: articles.title,
      slug: articles.slug,
      summary: articles.summary,
      content: articles.content,
      visibility: articles.visibility,
      supportsReadingMode: articles.supportsReadingMode,
      defaultReadingMode: articles.defaultReadingMode,
      readingMinutes: articles.readingMinutes,
      viewCount: articles.viewCount,
      publishedAt: articles.publishedAt,
      updatedAt: articles.updatedAt,
      coverImage: articles.coverImage,
      seoTitle: articles.seoTitle,
      seoDescription: articles.seoDescription,
      seoKeywords: articles.seoKeywords,
      canonicalUrl: articles.canonicalUrl,
      robots: articles.robots,
      coverImageAlt: articles.coverImageAlt,
      ogTitle: articles.ogTitle,
      ogDescription: articles.ogDescription,
      ogImage: articles.ogImage,
      ogImageAlt: articles.ogImageAlt,
      twitterTitle: articles.twitterTitle,
      twitterDescription: articles.twitterDescription,
      twitterImage: articles.twitterImage,
      articleType: articles.articleType,
      difficulty: articles.difficulty,
      primaryTopic: articles.primaryTopic,
      seoMetadata: articles.seoMetadata,
      sourceType: articles.sourceType,
      sourceNote: articles.sourceNote,
      aiAssisted: articles.aiAssisted,
      humanReviewed: articles.humanReviewed,
      category: categories.name,
    })
    .from(articles)
    .leftJoin(categories, eq(articles.categoryId, categories.id))
    .where(and(eq(articles.locale, locale), eq(articles.status, "published")))
    .orderBy(desc(articles.publishedAt), desc(articles.updatedAt))
    .limit(100);

  return Promise.all(rows.map((row) => articleRecordFromRow(row)));
}

export async function listPublishedArticleSummaries() {
  const db = await getDb();

  return db
    .select({
      id: articles.id,
      title: articles.title,
      slug: articles.slug,
      locale: articles.locale,
      summary: articles.summary,
      status: articles.status,
      workflowStatus: articles.workflowStatus,
      visibility: articles.visibility,
      readingMinutes: articles.readingMinutes,
      viewCount: articles.viewCount,
      publishedAt: articles.publishedAt,
      updatedAt: articles.updatedAt,
    })
    .from(articles)
    .where(and(eq(articles.locale, "zh"), inArray(articles.status, ["published", "archived"])))
    .orderBy(desc(articles.publishedAt), desc(articles.updatedAt))
    .limit(100);
}

export async function archivePublishedArticle(locale: ArticleRecord["locale"], slug: string) {
  const db = await getDb();
  const timestamp = now();
  const existing = await db
    .select({
      id: articles.id,
      locale: articles.locale,
      slug: articles.slug,
      title: articles.title,
      visibility: articles.visibility,
      status: articles.status,
    })
    .from(articles)
    .where(and(eq(articles.locale, locale), eq(articles.slug, slug), eq(articles.status, "published")))
    .limit(1);
  const article = existing[0];

  if (!article) {
    return null;
  }

  await db
    .update(articles)
    .set({
      status: "archived",
      visibility: "hidden",
      updatedAt: timestamp,
    })
    .where(eq(articles.id, article.id));

  revalidatePublicArticlesCache();

  return article;
}

export async function restoreArchivedArticle(locale: ArticleRecord["locale"], slug: string) {
  const db = await getDb();
  const timestamp = now();
  const existing = await db
    .select({
      id: articles.id,
      locale: articles.locale,
      slug: articles.slug,
      title: articles.title,
      visibility: articles.visibility,
      status: articles.status,
    })
    .from(articles)
    .where(and(eq(articles.locale, locale), eq(articles.slug, slug), eq(articles.status, "archived")))
    .limit(1);
  const article = existing[0];

  if (!article) {
    return null;
  }

  await db
    .update(articles)
    .set({
      status: "published",
      workflowStatus: "published",
      visibility: "public",
      updatedAt: timestamp,
    })
    .where(eq(articles.id, article.id));

  revalidatePublicArticlesCache();

  return {
    ...article,
    status: "published" as const,
    visibility: "public" as const,
    updatedAt: timestamp,
  };
}

export async function deletePublishedArticle(locale: ArticleRecord["locale"], slug: string) {
  const db = await getDb();
  const existing = await db
    .select({
      id: articles.id,
      locale: articles.locale,
      slug: articles.slug,
      title: articles.title,
      visibility: articles.visibility,
      status: articles.status,
    })
    .from(articles)
    .where(and(eq(articles.locale, locale), eq(articles.slug, slug), inArray(articles.status, ["published", "archived"])))
    .limit(1);
  const article = existing[0];

  if (!article) {
    return null;
  }

  await db.delete(articleTags).where(eq(articleTags.articleId, article.id));
  await db.delete(seriesArticles).where(eq(seriesArticles.articleId, article.id));
  // article_likes / article_views 以 (locale, slug) 关联、无外键，需按 slug 手动清除，避免删除文章后残留孤立计数。
  await db.delete(articleLikes).where(and(eq(articleLikes.locale, locale), eq(articleLikes.articleSlug, slug)));
  await db.delete(articleViews).where(and(eq(articleViews.locale, locale), eq(articleViews.articleSlug, slug)));
  await db.delete(articles).where(eq(articles.id, article.id));

  revalidatePublicArticlesCache();

  return article;
}

