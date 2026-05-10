import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SeriesDetailContent } from "@/components/content/series-pages";
import { getPublicSeries } from "@/lib/series";
import { buildSeriesDetailMetadata } from "@/lib/series-metadata";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const item = await getPublicSeries(slug, "en");

  if (!item) {
    return {
      title: "Series",
    };
  }

  return buildSeriesDetailMetadata(item, "en");
}

export default async function EnglishSeriesDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const item = await getPublicSeries(slug, "en");

  if (!item) {
    notFound();
  }

  return <SeriesDetailContent locale="en" item={item} />;
}
