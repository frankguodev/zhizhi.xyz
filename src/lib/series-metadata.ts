import type { Metadata } from "next";
import type { PublicSeriesDetail } from "@/lib/series";
import { siteConfig, type Locale } from "@/lib/site";

const indexCopy = {
  zh: {
    title: "专题",
    description: "按主题组织的知识路线，把零散文章串成可持续学习的路径。",
    path: "/series",
    ogLocale: "zh_CN",
  },
  en: {
    title: "Series",
    description: "Topic routes in English, mapped as structured learning paths.",
    path: "/en/series",
    ogLocale: "en_US",
  },
} satisfies Record<Locale, { title: string; description: string; path: string; ogLocale: string }>;

function cleanString(value: string | null | undefined) {
  const normalized = value?.trim();
  return normalized || undefined;
}

function seriesPath(locale: Locale, slug: string) {
  return locale === "en" ? `/en/series/${slug}` : `/series/${slug}`;
}

function imageMetadata(url: string | null | undefined) {
  const normalizedUrl = cleanString(url);

  if (!normalizedUrl) {
    return undefined;
  }

  return [{ url: normalizedUrl }];
}

export function buildSeriesIndexMetadata(locale: Locale): Metadata {
  const copy = indexCopy[locale];

  return {
    title: copy.title,
    description: copy.description,
    alternates: {
      canonical: copy.path,
      languages: {
        "zh-CN": "/series",
        en: "/en/series",
      },
    },
    openGraph: {
      title: copy.title,
      description: copy.description,
      url: copy.path,
      siteName: `${siteConfig.name} ${siteConfig.nameEn}`,
      locale: copy.ogLocale,
      type: "website",
    },
    twitter: {
      card: "summary",
      title: copy.title,
      description: copy.description,
    },
  };
}

export function buildSeriesDetailMetadata(item: PublicSeriesDetail, locale: Locale): Metadata {
  const canonical = seriesPath(locale, item.slug);
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
      locale: locale === "en" ? "en_US" : "zh_CN",
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
