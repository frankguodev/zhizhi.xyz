import type { ArticleRecord } from "@/data/articles";
import type { PublishedArticleListSource } from "@/lib/article-drafts";
import { countPublicAiTerms, listPublicAiTerms, type AiTermSummary } from "@/lib/ai-terms";
import { normalizeArticleCategory } from "@/lib/article-taxonomy";
import { listExternalLinks, type PublicExternalLink } from "@/lib/external-links";
import { getPublicArticleListSource } from "@/lib/public-articles";
import { listPublicSeries, type PublicSeriesSummary } from "@/lib/series";
import type { Locale } from "@/lib/site";

export type PublicHomeArticle = Pick<
  ArticleRecord,
  "slug" | "locale" | "title" | "summary" | "category" | "readingMinutes" | "viewCount" | "publishedAt" | "updatedAt"
>;

export type PublicHomeAiTerm = Pick<AiTermSummary, "slug" | "term" | "termZh" | "shortConcept" | "difficulty" | "categories">;

export type PublicHomePayload = {
  locale: Locale;
  stats: {
    articleCount: number;
    seriesCount: number;
    aiTermCount: number;
  };
  latestArticles: PublicHomeArticle[];
  featuredSeries: PublicSeriesSummary[];
  aiTerms: PublicHomeAiTerm[];
  externalLinks: PublicExternalLink[];
};

function toHomeArticle(article: PublishedArticleListSource): PublicHomeArticle {
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

function toHomeAiTerm(term: AiTermSummary): PublicHomeAiTerm {
  return {
    slug: term.slug,
    term: term.term,
    termZh: term.termZh,
    shortConcept: term.shortConcept,
    difficulty: term.difficulty,
    categories: term.categories,
  };
}

export async function getPublicHomePayload(locale: Locale): Promise<PublicHomePayload> {
  const [externalLinks, articles, seriesList, aiTermList, aiTermCount] = await Promise.all([
    listExternalLinks("home", locale),
    getPublicArticleListSource(locale),
    listPublicSeries(locale),
    listPublicAiTerms({ locale, sort: "latest", limit: 6 }),
    countPublicAiTerms({ locale }),
  ]);
  const latestArticles = articles
    .slice()
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
    .slice(0, 3)
    .map(toHomeArticle);
  const aiTerms = aiTermList.slice(0, 6).map(toHomeAiTerm);

  return {
    locale,
    stats: {
      articleCount: articles.length,
      seriesCount: seriesList.length,
      aiTermCount,
    },
    latestArticles,
    featuredSeries: seriesList.slice(0, 3),
    aiTerms,
    externalLinks,
  };
}
