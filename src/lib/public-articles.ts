import type { ArticleRecord } from "@/data/articles";
import { getArticleBySlug, getPublishedArticles } from "@/data/articles";
import { canListArticle } from "@/lib/article-access";
import { getPublishedArticle, listPublishedArticles } from "@/lib/article-drafts";

const publicViewer = { isAuthenticated: false, user: null };

export async function getPublicArticles(locale: ArticleRecord["locale"] = "zh") {
  try {
    const databaseArticles = await listPublishedArticles(locale);
    const articles = databaseArticles.length > 0 ? databaseArticles : getPublishedArticles(locale);
    return articles.filter((article) => canListArticle(article, publicViewer));
  } catch {
    return getPublishedArticles(locale).filter((article) => canListArticle(article, publicViewer));
  }
}

export async function getPublicArticle(slug: string, locale: ArticleRecord["locale"] = "zh") {
  try {
    const databaseArticle = await getPublishedArticle(locale, slug);
    return databaseArticle ?? getArticleBySlug(slug, locale) ?? null;
  } catch {
    return getArticleBySlug(slug, locale) ?? null;
  }
}

