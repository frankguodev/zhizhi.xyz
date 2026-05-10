import { and, asc, count, eq, ne } from "drizzle-orm";
import type { ArticleRecord } from "@/data/articles";
import { getDb } from "@/db/client";
import { articles, categories, series, seriesArticles } from "@/db/schema";

export type PublicSeriesSummary = {
  slug: string;
  locale: ArticleRecord["locale"];
  title: string;
  description: string;
  coverImage: string | null;
  articleCount: number;
  updatedAt: string;
};

export type PublicSeriesArticle = {
  slug: string;
  title: string;
  summary: string;
  visibility: ArticleRecord["visibility"];
  readingMinutes: number;
};

export type PublicSeriesDetail = PublicSeriesSummary & {
  articles: PublicSeriesArticle[];
};

export type SeriesStatus = "draft" | "published" | "archived";

export type AdminSeriesArticleChoice = {
  id: string;
  title: string;
  slug: string;
  locale: ArticleRecord["locale"];
  category: string | null;
  readingMinutes: number;
  publishedAt: Date | string | number | null;
};

export type AdminSeriesItem = {
  id: string;
  locale: ArticleRecord["locale"];
  title: string;
  slug: string;
  description: string;
  coverImage: string | null;
  status: SeriesStatus;
  sortOrder: number;
  updatedAt: Date | string | number;
  articleIds: string[];
};

export type AdminSeriesInput = {
  locale: ArticleRecord["locale"];
  title: string;
  slug: string;
  description: string;
  coverImage: string | null;
  status: SeriesStatus;
  sortOrder: number;
  articleIds: string[];
};

export type SeriesArticleValidationResult =
  | { ok: true }
  | { ok: false; reason: "duplicate" | "invalid"; articleIds: string[] };

function now() {
  return new Date();
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

function dateString(value: Date | string | number | null) {
  if (value === null) {
    return "";
  }

  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
}

async function getPublishedSeriesArticles(seriesId: string) {
  const db = await getDb();

  return db
    .select({
      slug: articles.slug,
      title: articles.title,
      summary: articles.summary,
      visibility: articles.visibility,
      readingMinutes: articles.readingMinutes,
    })
    .from(seriesArticles)
    .innerJoin(articles, eq(seriesArticles.articleId, articles.id))
    .where(and(eq(seriesArticles.seriesId, seriesId), eq(articles.status, "published"), ne(articles.visibility, "hidden")))
    .orderBy(asc(seriesArticles.sortOrder), asc(articles.publishedAt));
}

export async function listPublicSeries(locale: ArticleRecord["locale"] = "zh") {
  try {
    const db = await getDb();
    const rows = await db
      .select({
        slug: series.slug,
        locale: series.locale,
        title: series.title,
        description: series.description,
        coverImage: series.coverImage,
        updatedAt: series.updatedAt,
        articleCount: count(articles.id),
      })
      .from(series)
      .innerJoin(seriesArticles, eq(seriesArticles.seriesId, series.id))
      .innerJoin(articles, eq(seriesArticles.articleId, articles.id))
      .where(and(eq(series.locale, locale), eq(series.status, "published"), eq(articles.status, "published"), ne(articles.visibility, "hidden")))
      .groupBy(series.id, series.slug, series.locale, series.title, series.description, series.coverImage, series.updatedAt, series.sortOrder)
      .orderBy(asc(series.sortOrder), asc(series.title));

    return rows.map((row) => ({
      slug: row.slug,
      locale: row.locale,
      title: row.title,
      description: row.description,
      coverImage: row.coverImage,
      articleCount: row.articleCount,
      updatedAt: dateString(row.updatedAt),
    })) satisfies PublicSeriesSummary[];
  } catch {
    return [];
  }
}

export async function getPublicSeries(slug: string, locale: ArticleRecord["locale"] = "zh") {
  try {
    const db = await getDb();
    const rows = await db
      .select({
        id: series.id,
        slug: series.slug,
        locale: series.locale,
        title: series.title,
        description: series.description,
        coverImage: series.coverImage,
        updatedAt: series.updatedAt,
      })
      .from(series)
      .where(and(eq(series.locale, locale), eq(series.slug, slug), eq(series.status, "published")))
      .limit(1);

    const row = rows[0];

    if (!row) {
      return null;
    }

    const articleRows = await getPublishedSeriesArticles(row.id);

    return {
      slug: row.slug,
      locale: row.locale,
      title: row.title,
      description: row.description,
      coverImage: row.coverImage,
      articleCount: articleRows.length,
      updatedAt: dateString(row.updatedAt),
      articles: articleRows,
    } satisfies PublicSeriesDetail;
  } catch {
    return null;
  }
}

async function getSeriesArticleIds(seriesId: string) {
  const db = await getDb();
  const rows = await db
    .select({ articleId: seriesArticles.articleId })
    .from(seriesArticles)
    .where(eq(seriesArticles.seriesId, seriesId))
    .orderBy(asc(seriesArticles.sortOrder));

  return rows.map((row) => row.articleId);
}

async function replaceSeriesArticles(seriesId: string, articleIds: string[]) {
  const db = await getDb();
  await db.delete(seriesArticles).where(eq(seriesArticles.seriesId, seriesId));

  for (const [index, articleId] of articleIds.entries()) {
    await db.insert(seriesArticles).values({
      seriesId,
      articleId,
      sortOrder: index + 1,
    });
  }
}

export async function listAdminSeries() {
  const db = await getDb();
  const rows = await db
    .select({
      id: series.id,
      locale: series.locale,
      title: series.title,
      slug: series.slug,
      description: series.description,
      coverImage: series.coverImage,
      status: series.status,
      sortOrder: series.sortOrder,
      updatedAt: series.updatedAt,
    })
    .from(series)
    .orderBy(asc(series.sortOrder), asc(series.title));

  return Promise.all(
    rows.map(async (row) => ({
      ...row,
      articleIds: await getSeriesArticleIds(row.id),
    })),
  );
}

export async function listSeriesArticleChoices(locale: ArticleRecord["locale"] = "zh") {
  const db = await getDb();

  return db
    .select({
      id: articles.id,
      title: articles.title,
      slug: articles.slug,
      locale: articles.locale,
      category: categories.name,
      readingMinutes: articles.readingMinutes,
      publishedAt: articles.publishedAt,
    })
    .from(articles)
    .leftJoin(categories, eq(articles.categoryId, categories.id))
    .where(and(eq(articles.locale, locale), eq(articles.status, "published"), ne(articles.visibility, "hidden")))
    .orderBy(asc(articles.title));
}

export async function validateSeriesArticleIds(locale: ArticleRecord["locale"], articleIds: string[]): Promise<SeriesArticleValidationResult> {
  const seen = new Set<string>();
  const duplicates = new Set<string>();

  for (const articleId of articleIds) {
    if (seen.has(articleId)) {
      duplicates.add(articleId);
    }
    seen.add(articleId);
  }

  if (duplicates.size > 0) {
    return { ok: false, reason: "duplicate", articleIds: Array.from(duplicates) };
  }

  if (articleIds.length === 0) {
    return { ok: true };
  }

  const choices = await listSeriesArticleChoices(locale);
  const validIds = new Set(choices.map((article) => article.id));
  const invalidIds = articleIds.filter((articleId) => !validIds.has(articleId));

  if (invalidIds.length > 0) {
    return { ok: false, reason: "invalid", articleIds: invalidIds };
  }

  return { ok: true };
}

export async function createSeries(input: AdminSeriesInput) {
  const db = await getDb();
  const timestamp = now();
  const normalizedSlug = slugify(input.slug || input.title);
  const id = `series:${input.locale}:${crypto.randomUUID()}`;

  await db.insert(series).values({
    id,
    locale: input.locale,
    translationKey: normalizedSlug,
    title: input.title,
    slug: normalizedSlug,
    description: input.description,
    coverImage: input.coverImage,
    status: input.status,
    sortOrder: input.sortOrder,
    createdAt: timestamp,
    updatedAt: timestamp,
  });

  await replaceSeriesArticles(id, input.articleIds);

  return { id };
}

export async function updateSeries(id: string, input: AdminSeriesInput) {
  const db = await getDb();
  const normalizedSlug = slugify(input.slug || input.title);
  const result = await db
    .update(series)
    .set({
      locale: input.locale,
      translationKey: normalizedSlug,
      title: input.title,
      slug: normalizedSlug,
      description: input.description,
      coverImage: input.coverImage,
      status: input.status,
      sortOrder: input.sortOrder,
      updatedAt: now(),
    })
    .where(eq(series.id, id))
    .returning({ id: series.id });

  if (!result[0]) {
    return null;
  }

  await replaceSeriesArticles(id, input.articleIds);
  return result[0];
}

export async function deleteSeries(id: string) {
  const db = await getDb();
  const result = await db.delete(series).where(eq(series.id, id)).returning({ id: series.id });

  return result[0] ?? null;
}
