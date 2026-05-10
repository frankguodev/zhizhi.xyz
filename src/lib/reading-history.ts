import { and, desc, eq } from "drizzle-orm";
import type { ArticleRecord } from "@/data/articles";
import { getDb } from "@/db/client";
import { articleTags, articles, categories, readingHistories, tags } from "@/db/schema";

function dateString(value: Date | string | number | null) {
  if (value === null) {
    return "";
  }

  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
}

async function tagsForArticle(articleId: string) {
  const db = await getDb();
  const tagRows = await db
    .select({ name: tags.name })
    .from(articleTags)
    .innerJoin(tags, eq(articleTags.tagId, tags.id))
    .where(eq(articleTags.articleId, articleId));

  return tagRows.map((tag) => tag.name);
}

async function publishedArticleId(locale: ArticleRecord["locale"], slug: string) {
  const db = await getDb();
  const rows = await db
    .select({ id: articles.id })
    .from(articles)
    .where(and(eq(articles.locale, locale), eq(articles.slug, slug), eq(articles.status, "published")))
    .limit(1);

  return rows[0]?.id ?? null;
}

function clampProgress(progress: number) {
  if (!Number.isFinite(progress)) {
    return 0;
  }

  return Math.min(100, Math.max(0, Math.round(progress)));
}

export async function getReadingProgress(userId: string, locale: ArticleRecord["locale"], slug: string) {
  const db = await getDb();
  const articleId = await publishedArticleId(locale, slug);

  if (!articleId) {
    return 0;
  }

  const rows = await db
    .select({ progress: readingHistories.progress })
    .from(readingHistories)
    .where(and(eq(readingHistories.userId, userId), eq(readingHistories.articleId, articleId)))
    .limit(1);

  return rows[0]?.progress ?? 0;
}

export async function saveReadingProgress(userId: string, locale: ArticleRecord["locale"], slug: string, progress: number) {
  const db = await getDb();
  const articleId = await publishedArticleId(locale, slug);

  if (!articleId) {
    return null;
  }

  const timestamp = new Date();
  const normalizedProgress = clampProgress(progress);

  await db
    .insert(readingHistories)
    .values({
      id: crypto.randomUUID(),
      userId,
      articleId,
      progress: normalizedProgress,
      completedAt: normalizedProgress >= 95 ? timestamp : null,
      lastReadAt: timestamp,
      createdAt: timestamp,
      updatedAt: timestamp,
    })
    .onConflictDoUpdate({
      target: [readingHistories.userId, readingHistories.articleId],
      set: {
        progress: normalizedProgress,
        completedAt: normalizedProgress >= 95 ? timestamp : null,
        lastReadAt: timestamp,
        updatedAt: timestamp,
      },
    });

  return { progress: normalizedProgress };
}

export async function listReadingHistory(userId: string, locale: ArticleRecord["locale"] = "zh") {
  const db = await getDb();
  const rows = await db
    .select({
      historyId: readingHistories.id,
      progress: readingHistories.progress,
      lastReadAt: readingHistories.lastReadAt,
      completedAt: readingHistories.completedAt,
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
      publishedAt: articles.publishedAt,
      updatedAt: articles.updatedAt,
      category: categories.name,
    })
    .from(readingHistories)
    .innerJoin(articles, eq(readingHistories.articleId, articles.id))
    .leftJoin(categories, eq(articles.categoryId, categories.id))
    .where(and(eq(readingHistories.userId, userId), eq(articles.locale, locale), eq(articles.status, "published")))
    .orderBy(desc(readingHistories.lastReadAt))
    .limit(100);

  return Promise.all(
    rows.map(async (row) => ({
      progress: row.progress,
      lastReadAt: dateString(row.lastReadAt),
      completedAt: dateString(row.completedAt),
      article: {
        slug: row.slug,
        locale: row.locale,
        title: row.title,
        summary: row.summary,
        category: row.category ?? "未分类",
        tags: await tagsForArticle(row.id),
        visibility: row.visibility,
        readingMinutes: row.readingMinutes,
        publishedAt: dateString(row.publishedAt),
        updatedAt: dateString(row.updatedAt),
        supportsReadingMode: row.supportsReadingMode,
        defaultReadingMode: row.defaultReadingMode,
        content: row.content,
      } satisfies ArticleRecord,
    })),
  );
}
