import type { ArticleRecord } from "@/data/articles";
import { normalizeArticleCategory } from "@/lib/article-taxonomy";
import { listExternalLinks, type PublicExternalLink } from "@/lib/external-links";
import { getPublicArticles } from "@/lib/public-articles";
import { listPublicSeries, type PublicSeriesSummary } from "@/lib/series";
import type { Locale } from "@/lib/site";

const focusTopicsByLocale: Record<Locale, string[]> = {
  zh: ["AI 探索与应用", "内容出海", "项目开发实践", "个人品牌"],
  en: ["AI exploration", "Content globalization", "Project practice", "Personal brand"],
};

export type PublicHomeArticle = Pick<
  ArticleRecord,
  "slug" | "locale" | "title" | "summary" | "category" | "readingMinutes" | "viewCount" | "publishedAt" | "updatedAt"
>;

export type PublicHomePayload = {
  locale: Locale;
  stats: {
    articleCount: number;
    seriesCount: number;
    focusTopicCount: number;
  };
  focusTopics: string[];
  latestArticles: PublicHomeArticle[];
  popularArticles: PublicHomeArticle[];
  featuredSeries: PublicSeriesSummary[];
  externalLinks: PublicExternalLink[];
};

function toHomeArticle(article: ArticleRecord): PublicHomeArticle {
  return {
    slug: article.slug,
    locale: article.locale,
    title: article.title,
    summary: article.summary,
    category: normalizeArticleCategory(article.category, article.locale),
    readingMinutes: article.readingMinutes,
    viewCount: article.viewCount,
    publishedAt: article.publishedAt,
    updatedAt: article.updatedAt,
  };
}

export async function getPublicHomePayload(locale: Locale): Promise<PublicHomePayload> {
  const [externalLinks, articles, seriesList] = await Promise.all([listExternalLinks("home", locale), getPublicArticles(locale), listPublicSeries(locale)]);
  const focusTopics = focusTopicsByLocale[locale];
  const latestArticles = articles
    .slice()
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
    .slice(0, 3)
    .map(toHomeArticle);
  const popularArticles = articles
    .slice()
    .sort((a, b) => (b.viewCount ?? 0) - (a.viewCount ?? 0) || b.publishedAt.localeCompare(a.publishedAt))
    .slice(0, 5)
    .map(toHomeArticle);

  return {
    locale,
    stats: {
      articleCount: articles.length,
      seriesCount: seriesList.length,
      focusTopicCount: focusTopics.length,
    },
    focusTopics,
    latestArticles,
    popularArticles,
    featuredSeries: seriesList.slice(0, 3),
    externalLinks,
  };
}
