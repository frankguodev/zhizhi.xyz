import { and, desc, eq } from "drizzle-orm";
import type { ArticleRecord } from "@/data/articles";
import { getDb } from "@/db/client";
import { articleTags, articles, categories, favorites, tags } from "@/db/schema";

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

export async function isArticleFavorited(userId: string, locale: ArticleRecord["locale"], slug: string) {
  const db = await getDb();
  const articleId = await publishedArticleId(locale, slug);

  if (!articleId) {
    return false;
  }

  const rows = await db
    .select({ id: favorites.id })
    .from(favorites)
    .where(and(eq(favorites.userId, userId), eq(favorites.articleId, articleId)))
    .limit(1);

  return Boolean(rows[0]);
}

export async function setArticleFavorite(userId: string, locale: ArticleRecord["locale"], slug: string, favorited: boolean) {
  const db = await getDb();
  const articleId = await publishedArticleId(locale, slug);

  if (!articleId) {
    return null;
  }

  if (favorited) {
    await db
      .insert(favorites)
      .values({
        id: crypto.randomUUID(),
        userId,
        articleId,
        createdAt: new Date(),
      })
      .onConflictDoNothing();
  } else {
    await db.delete(favorites).where(and(eq(favorites.userId, userId), eq(favorites.articleId, articleId)));
  }

  return { favorited };
}

export async function listFavoriteArticles(userId: string, locale: ArticleRecord["locale"] = "zh") {
  const db = await getDb();
  const rows = await db
    .select({
      favoriteId: favorites.id,
      favoritedAt: favorites.createdAt,
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
    .from(favorites)
    .innerJoin(articles, eq(favorites.articleId, articles.id))
    .leftJoin(categories, eq(articles.categoryId, categories.id))
    .where(and(eq(favorites.userId, userId), eq(articles.locale, locale), eq(articles.status, "published")))
    .orderBy(desc(favorites.createdAt))
    .limit(100);

  return Promise.all(
    rows.map(async (row) => ({
      favoritedAt: dateString(row.favoritedAt),
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
