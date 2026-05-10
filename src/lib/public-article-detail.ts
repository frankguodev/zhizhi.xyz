import type { ArticleContentBlock } from "@/components/content/types";
import type { ArticleRecord } from "@/data/articles";
import { and, asc, eq, ne } from "drizzle-orm";
import { canReadFullArticle } from "@/lib/article-access";
import { normalizeArticleCategory } from "@/lib/article-taxonomy";
import { getDb } from "@/db/client";
import { articles, categories, series, seriesArticles } from "@/db/schema";
import { listExternalLinks, type PublicExternalLink } from "@/lib/external-links";
import { parseLayeredMarkdown } from "@/lib/markdown";
import { getPublicArticle, getPublicArticles } from "@/lib/public-articles";
import type { Locale } from "@/lib/site";

const publicViewer = { isAuthenticated: false, user: null };

export type PublicArticleDetail = Pick<
  ArticleRecord,
  | "slug"
  | "locale"
  | "title"
  | "summary"
  | "category"
  | "tags"
  | "readingMinutes"
  | "viewCount"
  | "publishedAt"
  | "updatedAt"
  | "supportsReadingMode"
  | "defaultReadingMode"
  | "coverImage"
  | "coverImageAlt"
>;

export type PublicArticleDetailPayload = {
  article: PublicArticleDetail;
  content: {
    format: "layered-html";
    blocks: ArticleContentBlock[];
  };
  navigation: {
    previous: PublicArticleNavigationItem | null;
    next: PublicArticleNavigationItem | null;
  };
  externalLinks: PublicExternalLink[];
};

export type PublicArticleNavigationItem = Pick<
  ArticleRecord,
  "slug" | "locale" | "title" | "summary" | "category" | "readingMinutes" | "publishedAt"
>;

function stripLeadingDuplicateTitle(markdown: string, title: string) {
  const lines = markdown.split(/\r?\n/);
  const firstContentIndex = lines.findIndex((line) => line.trim().length > 0);

  if (firstContentIndex < 0) {
    return markdown;
  }

  const match = lines[firstContentIndex].trim().match(/^#\s+(.+?)\s*#*$/);

  if (!match) {
    return markdown;
  }

  const heading = match[1].trim().replace(/\s+/g, " ");
  const normalizedTitle = title.trim().replace(/\s+/g, " ");

  if (heading !== normalizedTitle) {
    return markdown;
  }

  return [...lines.slice(0, firstContentIndex), ...lines.slice(firstContentIndex + 1)].join("\n").trimStart();
}

function toPublicArticleDetail(article: ArticleRecord): PublicArticleDetail {
  return {
    slug: article.slug,
    locale: article.locale,
    title: article.title,
    summary: article.summary,
    category: normalizeArticleCategory(article.category, article.locale),
    tags: article.tags,
    readingMinutes: article.readingMinutes,
    viewCount: article.viewCount,
    publishedAt: article.publishedAt,
    updatedAt: article.updatedAt,
    supportsReadingMode: article.supportsReadingMode,
    defaultReadingMode: article.defaultReadingMode,
    coverImage: article.coverImage,
    coverImageAlt: article.coverImageAlt,
  };
}

function toNavigationItem(article: ArticleRecord): PublicArticleNavigationItem {
  return {
    slug: article.slug,
    locale: article.locale,
    title: article.title,
    summary: article.summary,
    category: normalizeArticleCategory(article.category, article.locale),
    readingMinutes: article.readingMinutes,
    publishedAt: article.publishedAt,
  };
}

function dateString(value: Date | string | number | null) {
  if (value === null) {
    return "";
  }

  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
}

async function getDateAdjacentArticles(article: ArticleRecord) {
  const articles = await getPublicArticles(article.locale);
  const orderedArticles = articles
    .slice()
    .sort((a, b) => a.publishedAt.localeCompare(b.publishedAt) || a.title.localeCompare(b.title, article.locale === "en" ? "en-US" : "zh-Hans-CN"));
  const currentIndex = orderedArticles.findIndex((item) => item.slug === article.slug);

  if (currentIndex < 0) {
    return { previous: null, next: null };
  }

  return {
    previous: orderedArticles[currentIndex - 1] ? toNavigationItem(orderedArticles[currentIndex - 1]) : null,
    next: orderedArticles[currentIndex + 1] ? toNavigationItem(orderedArticles[currentIndex + 1]) : null,
  };
}

async function getSeriesAdjacentArticles(article: ArticleRecord) {
  const db = await getDb();
  const seriesRows = await db
    .select({
      id: series.id,
    })
    .from(series)
    .innerJoin(seriesArticles, eq(seriesArticles.seriesId, series.id))
    .innerJoin(articles, eq(seriesArticles.articleId, articles.id))
    .where(and(eq(series.locale, article.locale), eq(series.status, "published"), eq(articles.locale, article.locale), eq(articles.slug, article.slug), eq(articles.status, "published"), ne(articles.visibility, "hidden")))
    .orderBy(asc(series.sortOrder), asc(series.title))
    .limit(1);
  const currentSeries = seriesRows[0];

  if (!currentSeries) {
    return null;
  }

  const seriesArticleRows = await db
    .select({
      slug: articles.slug,
      locale: articles.locale,
      title: articles.title,
      summary: articles.summary,
      category: categories.name,
      readingMinutes: articles.readingMinutes,
      publishedAt: articles.publishedAt,
    })
    .from(seriesArticles)
    .innerJoin(articles, eq(seriesArticles.articleId, articles.id))
    .leftJoin(categories, eq(articles.categoryId, categories.id))
    .where(and(eq(seriesArticles.seriesId, currentSeries.id), eq(articles.locale, article.locale), eq(articles.status, "published"), ne(articles.visibility, "hidden")))
    .orderBy(asc(seriesArticles.sortOrder), asc(articles.publishedAt), asc(articles.title));
  const currentIndex = seriesArticleRows.findIndex((item) => item.slug === article.slug);

  if (currentIndex < 0) {
    return null;
  }

  const toSeriesNavigationItem = (item: (typeof seriesArticleRows)[number]): PublicArticleNavigationItem => ({
    slug: item.slug,
    locale: item.locale,
    title: item.title,
    summary: item.summary,
    category: normalizeArticleCategory(item.category, item.locale),
    readingMinutes: item.readingMinutes,
    publishedAt: dateString(item.publishedAt),
  });

  return {
    previous: seriesArticleRows[currentIndex - 1] ? toSeriesNavigationItem(seriesArticleRows[currentIndex - 1]) : null,
    next: seriesArticleRows[currentIndex + 1] ? toSeriesNavigationItem(seriesArticleRows[currentIndex + 1]) : null,
  };
}

async function getAdjacentArticles(article: ArticleRecord) {
  const seriesNavigation = await getSeriesAdjacentArticles(article).catch(() => null);

  if (seriesNavigation) {
    return seriesNavigation;
  }

  return getDateAdjacentArticles(article);
}

export async function getPublicArticleDetailPayload(locale: Locale, slug: string): Promise<PublicArticleDetailPayload | null> {
  const article = await getPublicArticle(slug, locale);

  if (!article || !canReadFullArticle(article, publicViewer)) {
    return null;
  }

  const [blocks, navigation, externalLinks] = await Promise.all([
    parseLayeredMarkdown(stripLeadingDuplicateTitle(article.content, article.title), locale),
    getAdjacentArticles(article),
    listExternalLinks("article_footer", locale),
  ]);

  return {
    article: toPublicArticleDetail(article),
    content: {
      format: "layered-html",
      blocks,
    },
    navigation,
    externalLinks,
  };
}
