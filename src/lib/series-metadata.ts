import type { Metadata } from "next";
import type { PublicSeriesDetail } from "@/lib/series";
import { siteConfig } from "@/lib/site";

function cleanString(value: string | null | undefined) {
  const normalized = value?.trim();
  return normalized || undefined;
}

function imageMetadata(url: string | null | undefined) {
  const normalizedUrl = cleanString(url);

  if (!normalizedUrl) {
    return undefined;
  }

  return [{ url: normalizedUrl }];
}

export function buildSeriesIndexMetadata(): Metadata {
  return {
    title: "专题",
    description: "按主题组织的知识路线，把零散文章串成可持续学习的路径。",
    alternates: {
      canonical: "/series",
    },
    openGraph: {
      title: "专题",
      description: "按主题组织的知识路线，把零散文章串成可持续学习的路径。",
      url: "/series",
      siteName: `${siteConfig.name} ${siteConfig.nameEn}`,
      locale: "zh_CN",
      type: "website",
    },
    twitter: {
      card: "summary",
      title: "专题",
      description: "按主题组织的知识路线，把零散文章串成可持续学习的路径。",
    },
  };
}

export function buildSeriesDetailMetadata(item: PublicSeriesDetail): Metadata {
  const canonical = `/series/${item.slug}`;
  const images = imageMetadata(item.coverImage);
  const indexed = item.articleCount > 0;

  return {
    title: item.title,
    description: item.description,
    alternates: {
      canonical,
    },
    robots: indexed ? "index, follow" : "noindex, follow",
    openGraph: {
      title: item.title,
      description: item.description,
      url: canonical,
      siteName: `${siteConfig.name} ${siteConfig.nameEn}`,
      locale: "zh_CN",
      type: "website",
      images,
    },
    twitter: {
      card: images ? "summary_large_image" : "summary",
      title: item.title,
      description: item.description,
      images,
    },
  };
}
