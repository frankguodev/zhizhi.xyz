import { unstable_cache } from "next/cache";
import type { ArticleRecord } from "@/data/articles";
import { getArticleBySlug, getPublishedArticles } from "@/data/articles";
import { canListArticle } from "@/lib/article-access";
import { getPublishedArticle, listPublishedArticles, listPublishedArticleListItems, PUBLIC_ARTICLES_CACHE_TAG, type PublishedArticleListSource } from "@/lib/article-drafts";
import { normalizeArticleCategory } from "@/lib/article-taxonomy";

const publicViewer = { isAuthenticated: false, user: null };

function toListSource(article: ArticleRecord): PublishedArticleListSource {
  return {
    slug: article.slug,
    locale: article.locale,
    title: article.title,
    summary: article.summary,
    category: normalizeArticleCategory(article.category, article.locale),
    tags: article.tags,
    visibility: article.visibility,
    readingMinutes: article.readingMinutes,
    viewCount: article.viewCount ?? 0,
    publishedAt: article.publishedAt,
    updatedAt: article.updatedAt,
  };
}

export async function getPublicArticleListSource(locale: ArticleRecord["locale"] = "zh") {
  return cachedPublicArticleListSource(locale);
}

const cachedPublicArticleListSource = unstable_cache(
  async (locale: ArticleRecord["locale"] = "zh") => {
    try {
      const items = await listPublishedArticleListItems(locale);
      const source = items.length > 0 ? items : getPublishedArticles(locale).map(toListSource);
      // canListArticle 对公开访客等价于 visibility !== "hidden"
      return source.filter((article) => article.visibility !== "hidden");
    } catch {
      return getPublishedArticles(locale).map(toListSource).filter((article) => article.visibility !== "hidden");
    }
  },
  ["public-article-list-source"],
  { revalidate: 120, tags: [PUBLIC_ARTICLES_CACHE_TAG] },
);

export async function getPublicArticles(locale: ArticleRecord["locale"] = "zh") {
  return cachedPublicArticles(locale);
}

const cachedPublicArticles = unstable_cache(
  async (locale: ArticleRecord["locale"] = "zh") => {
    try {
      const databaseArticles = await listPublishedArticles(locale);
      const articles = databaseArticles.length > 0 ? databaseArticles : getPublishedArticles(locale);
      return articles.filter((article) => canListArticle(article, publicViewer));
    } catch {
      return getPublishedArticles(locale).filter((article) => canListArticle(article, publicViewer));
    }
  },
  ["public-articles"],
  { revalidate: 120, tags: [PUBLIC_ARTICLES_CACHE_TAG] },
);

export async function getPublicArticle(slug: string, locale: ArticleRecord["locale"] = "zh") {
  try {
    const databaseArticle = await getPublishedArticle(locale, slug);
    return databaseArticle ?? getArticleBySlug(slug, locale) ?? null;
  } catch {
    return getArticleBySlug(slug, locale) ?? null;
  }
}

