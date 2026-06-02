import type { ArticleRecord } from "@/data/articles";
import { fallbackAiTermSummaries } from "@/lib/ai-term-fallback";
import { countPublicAiTerms, listPublicAiTerms, type AiTermSummary } from "@/lib/ai-terms";
import { normalizeArticleCategory } from "@/lib/article-taxonomy";
import { listExternalLinks, type PublicExternalLink } from "@/lib/external-links";
import { getPublicArticles } from "@/lib/public-articles";
import { listPublicSeries, type PublicSeriesSummary } from "@/lib/series";
import type { Locale } from "@/lib/site";

const focusTopicsByLocale: Record<Locale, string[]> = {
  zh: ["AI 探索与应用", "项目开发实践"]
};

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
  focusTopics: string[];
  latestArticles: PublicHomeArticle[];
  featuredSeries: PublicSeriesSummary[];
  aiTerms: PublicHomeAiTerm[];
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

function padArticlesForDebug(list: PublicHomeArticle[], target: number): PublicHomeArticle[] {
  if (list.length === 0 || list.length >= target) {
    return list;
  }
  const padded = [...list];
  for (let index = 0; padded.length < target; index += 1) {
    padded.push(list[index % list.length]);
  }
  return padded;
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
  const [externalLinks, articles, seriesList, aiTermList, aiTermCountRaw] = await Promise.all([
    listExternalLinks("home", locale),
    getPublicArticles(locale),
    listPublicSeries(locale),
    listPublicAiTerms({ locale, sort: "latest", limit: 9 }),
    countPublicAiTerms({ locale }),
  ]);
  const focusTopics = focusTopicsByLocale[locale];
  // 调试回退：真实文章不足 6 篇时复制补足，便于测试首页"最新文章"两行布局；真实数据≥6篇后自动覆盖。
  const latestArticles = padArticlesForDebug(
    articles
      .slice()
      .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
      .slice(0, 6)
      .map(toHomeArticle),
    6,
  );

  // 调试回退：未接入真实词条数据时，用 fallback MCP 词条填充首页"最新词条"区块，便于测试展示效果。
  const aiTerms = aiTermList.length > 0 ? aiTermList.slice(0, 9).map(toHomeAiTerm) : fallbackAiTermSummaries.slice(0, 9).map(toHomeAiTerm);
  const aiTermCount = aiTermCountRaw > 0 ? aiTermCountRaw : fallbackAiTermSummaries.length;

  return {
    locale,
    stats: {
      articleCount: articles.length,
      seriesCount: seriesList.length,
      aiTermCount,
    },
    focusTopics,
    latestArticles,
    featuredSeries: seriesList.slice(0, 3),
    aiTerms,
    externalLinks,
  };
}
