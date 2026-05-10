import { SeriesIndexPage } from "@/components/content/series-pages";
import { listPublicSeries } from "@/lib/series";
import { buildSeriesIndexMetadata } from "@/lib/series-metadata";

export const dynamic = "force-dynamic";

export const metadata = buildSeriesIndexMetadata("en");

export default async function EnglishSeriesPage() {
  const seriesList = await listPublicSeries("en");

  return <SeriesIndexPage locale="en" seriesList={seriesList} />;
}
