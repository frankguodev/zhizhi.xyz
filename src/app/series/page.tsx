import { SeriesIndexPage } from "@/components/content/series-pages";
import { listPublicSeries } from "@/lib/series";
import { buildSeriesIndexMetadata } from "@/lib/series-metadata";

export const revalidate = 300;

export const metadata = buildSeriesIndexMetadata();

export default async function SeriesPage() {
  const seriesList = await listPublicSeries("zh");

  return <SeriesIndexPage seriesList={seriesList} />;
}
