import type { Metadata } from "next";
import type { ArticleRecord } from "@/data/articles";
import { absoluteUrl } from "@/lib/request-origin";
import { defaultShareImage, siteConfig } from "@/lib/site";

function cleanString(value: string | undefined) {
  const normalized = value?.trim();
  return normalized || undefined;
}

function uniqueStrings(values: Array<string | undefined>) {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values) {
    const normalized = cleanString(value);

    if (normalized && !seen.has(normalized)) {
      seen.add(normalized);
      result.push(normalized);
    }
  }

  return result;
}

function articlePath(article: ArticleRecord) {
  return `/articles/${article.slug}`;
}

function defaultRobots(article: ArticleRecord) {
  return article.visibility === "hidden" ? "noindex, nofollow" : "index, follow";
}

function imageMetadata(url: string | undefined, alt: string | undefined, origin: string) {
  const normalizedUrl = cleanString(url);

  if (!normalizedUrl) {
    return undefined;
  }

  return [
    {
      url: absoluteUrl(normalizedUrl, origin),
      alt: cleanString(alt),
    },
  ];
}

export function buildArticleMetadata(article: ArticleRecord, origin: string = siteConfig.url): Metadata {
  const title = cleanString(article.seoTitle) ?? article.title;
  const description = cleanString(article.seoDescription) ?? article.summary;
  const canonical = absoluteUrl(cleanString(article.canonicalUrl) ?? articlePath(article), origin);
  const keywords = article.seoKeywords?.length
    ? uniqueStrings(article.seoKeywords)
    : uniqueStrings([article.primaryTopic, article.category, ...article.tags]);
  const ogTitle = cleanString(article.ogTitle) ?? title;
  const ogDescription = cleanString(article.ogDescription) ?? description;
  const ogImage = cleanString(article.ogImage) ?? cleanString(article.coverImage) ?? defaultShareImage.url;
  const ogImages = imageMetadata(ogImage, cleanString(article.ogImageAlt) ?? cleanString(article.coverImageAlt), origin);
  const twitterTitle = cleanString(article.twitterTitle) ?? ogTitle;
  const twitterDescription = cleanString(article.twitterDescription) ?? ogDescription;
  const twitterImage = cleanString(article.twitterImage) ?? ogImage;
  const twitterImages = imageMetadata(twitterImage, cleanString(article.ogImageAlt) ?? cleanString(article.coverImageAlt), origin);

  return {
    title,
    description,
    keywords,
    alternates: {
      canonical,
    },
    robots: cleanString(article.robots) ?? defaultRobots(article),
    openGraph: {
      title: ogTitle,
      description: ogDescription,
      url: canonical,
      siteName: `${siteConfig.name} ${siteConfig.nameEn}`,
      locale: "zh_CN",
      type: "article",
      publishedTime: article.publishedAt || undefined,
      modifiedTime: article.updatedAt || undefined,
      tags: article.tags,
      images: ogImages,
    },
    twitter: {
      card: "summary_large_image",
      title: twitterTitle,
      description: twitterDescription,
      images: twitterImages,
    },
  };
}
