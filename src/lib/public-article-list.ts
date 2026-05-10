import type { ArticleRecord } from "@/data/articles";
import { getArticleCategories, getArticleTags, normalizeArticleCategory } from "@/lib/article-taxonomy";
import { getPublicArticles } from "@/lib/public-articles";
import type { Locale } from "@/lib/site";

export type PublicArticleSort = "popular" | "latest" | "updated";

export type PublicArticleListItem = Pick<
  ArticleRecord,
  "slug" | "locale" | "title" | "summary" | "category" | "tags" | "readingMinutes" | "viewCount" | "publishedAt" | "updatedAt"
>;

export type PublicArticleListInput = {
  locale: Locale;
  sort: PublicArticleSort;
  q: string;
  category: string;
  tag: string;
  limit: number;
  offset: number;
};

export type PublicArticleListPayload = {
  locale: Locale;
  sort: PublicArticleSort;
  filters: {
    q: string;
    category: string;
    tag: string;
  };
  facets: {
    categories: string[];
    tags: string[];
  };
  pagination: {
    limit: number;
    offset: number;
    total: number;
    hasMore: boolean;
  };
  articles: PublicArticleListItem[];
};

function normalizeFilter(value: string) {
  return value.trim().toLowerCase();
}

function matchesFilters(article: ArticleRecord, input: PublicArticleListInput) {
  const normalizedQuery = normalizeFilter(input.q);
  const articleCategory = normalizeArticleCategory(article.category, input.locale);
  const requestedCategory = input.category ? normalizeArticleCategory(input.category, input.locale) : "";
  const matchesQuery =
    !normalizedQuery || [article.title, article.summary, articleCategory, ...article.tags].some((value) => normalizeFilter(value).includes(normalizedQuery));
  const matchesCategory = !requestedCategory || articleCategory === requestedCategory;
  const matchesTag = !input.tag || article.tags.includes(input.tag);

  return matchesQuery && matchesCategory && matchesTag;
}

function compareArticles(sort: PublicArticleSort) {
  return (a: ArticleRecord, b: ArticleRecord) => {
    if (sort === "latest") {
      return b.publishedAt.localeCompare(a.publishedAt) || (b.viewCount ?? 0) - (a.viewCount ?? 0);
    }

    if (sort === "updated") {
      return b.updatedAt.localeCompare(a.updatedAt) || b.publishedAt.localeCompare(a.publishedAt);
    }

    return (b.viewCount ?? 0) - (a.viewCount ?? 0) || b.publishedAt.localeCompare(a.publishedAt);
  };
}

function toListItem(article: ArticleRecord): PublicArticleListItem {
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
  };
}

export async function getPublicArticleListPayload(input: PublicArticleListInput): Promise<PublicArticleListPayload> {
  const articles = await getPublicArticles(input.locale);
  const filteredArticles = articles.filter((article) => matchesFilters(article, input)).sort(compareArticles(input.sort));
  const pagedArticles = filteredArticles.slice(input.offset, input.offset + input.limit).map(toListItem);

  return {
    locale: input.locale,
    sort: input.sort,
    filters: {
      q: input.q,
      category: input.category ? normalizeArticleCategory(input.category, input.locale) : "",
      tag: input.tag,
    },
    facets: {
      categories: getArticleCategories(articles, input.locale),
      tags: getArticleTags(articles),
    },
    pagination: {
      limit: input.limit,
      offset: input.offset,
      total: filteredArticles.length,
      hasMore: input.offset + input.limit < filteredArticles.length,
    },
    articles: pagedArticles,
  };
}
