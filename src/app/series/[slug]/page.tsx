import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SeriesDetailContent } from "@/components/content/series-pages";
import { getPublicSeries } from "@/lib/series";
import { buildSeriesDetailMetadata } from "@/lib/series-metadata";

export const revalidate = 300;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const item = await getPublicSeries(slug, "zh");

  if (!item) {
    return {
      title: "专题",
    };
  }

  return buildSeriesDetailMetadata(item);
}

export default async function SeriesDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const item = await getPublicSeries(slug, "zh");

  if (!item) {
    notFound();
  }

  return <SeriesDetailContent item={item} />;
}
