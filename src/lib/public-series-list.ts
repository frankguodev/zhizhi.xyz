import { listPublicSeries, type PublicSeriesSummary } from "@/lib/series";
import type { Locale } from "@/lib/site";

export type PublicSeriesSort = "default" | "updated";

export type PublicSeriesListInput = {
  locale: Locale;
  sort: PublicSeriesSort;
  limit: number;
  offset: number;
};

export type PublicSeriesListPayload = {
  locale: Locale;
  sort: PublicSeriesSort;
  pagination: {
    limit: number;
    offset: number;
    total: number;
    hasMore: boolean;
  };
  series: PublicSeriesSummary[];
};

function compareSeries(sort: PublicSeriesSort) {
  return (a: PublicSeriesSummary, b: PublicSeriesSummary) => {
    if (sort === "updated") {
      return b.updatedAt.localeCompare(a.updatedAt) || a.title.localeCompare(b.title);
    }

    return 0;
  };
}

export async function getPublicSeriesListPayload(input: PublicSeriesListInput): Promise<PublicSeriesListPayload> {
  const seriesList = await listPublicSeries(input.locale);
  const sortedSeries = input.sort === "default" ? seriesList : seriesList.slice().sort(compareSeries(input.sort));
  const pagedSeries = sortedSeries.slice(input.offset, input.offset + input.limit);

  return {
    locale: input.locale,
    sort: input.sort,
    pagination: {
      limit: input.limit,
      offset: input.offset,
      total: sortedSeries.length,
      hasMore: input.offset + input.limit < sortedSeries.length,
    },
    series: pagedSeries,
  };
}
