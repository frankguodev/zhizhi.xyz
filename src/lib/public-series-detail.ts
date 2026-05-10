import { getPublicSeries, type PublicSeriesArticle, type PublicSeriesSummary } from "@/lib/series";
import type { Locale } from "@/lib/site";

export type PublicSeriesDetailPayload = {
  series: PublicSeriesSummary;
  stats: {
    totalReadingMinutes: number;
  };
  articles: PublicSeriesArticle[];
};

export async function getPublicSeriesDetailPayload(locale: Locale, slug: string): Promise<PublicSeriesDetailPayload | null> {
  const series = await getPublicSeries(slug, locale);

  if (!series) {
    return null;
  }

  const { articles, ...summary } = series;

  return {
    series: summary,
    stats: {
      totalReadingMinutes: articles.reduce((total, article) => total + article.readingMinutes, 0),
    },
    articles,
  };
}
