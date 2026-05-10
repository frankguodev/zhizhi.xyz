import type { MetadataRoute } from "next";
import { getPublicArticles } from "@/lib/public-articles";
import { listPublicSeries } from "@/lib/series";
import { siteConfig } from "@/lib/site";

function siteUrl(path = "") {
  return `${siteConfig.url}${path}`;
}

function safeDate(value: string | Date | null | undefined) {
  if (!value) {
    return new Date();
  }

  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [zhArticles, enArticles, zhSeries, enSeries] = await Promise.all([
    getPublicArticles("zh"),
    getPublicArticles("en"),
    listPublicSeries("zh"),
    listPublicSeries("en"),
  ]);

  const staticRoutes: Array<{
    path: string;
    priority: number;
    changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
  }> = [
    { path: "", priority: 1, changeFrequency: "weekly" },
    { path: "/articles", priority: 0.85, changeFrequency: "weekly" },
    { path: "/series", priority: 0.75, changeFrequency: "weekly" },
    { path: "/about", priority: 0.55, changeFrequency: "monthly" },
    { path: "/tools", priority: 0.6, changeFrequency: "monthly" },
    { path: "/donate", priority: 0.45, changeFrequency: "monthly" },
    { path: "/privacy", priority: 0.25, changeFrequency: "yearly" },
    { path: "/terms", priority: 0.25, changeFrequency: "yearly" },
    { path: "/cookies", priority: 0.25, changeFrequency: "yearly" },
    { path: "/disclaimer", priority: 0.25, changeFrequency: "yearly" },
    { path: "/en", priority: 0.75, changeFrequency: "weekly" },
    { path: "/en/articles", priority: 0.65, changeFrequency: "weekly" },
    { path: "/en/series", priority: 0.55, changeFrequency: "weekly" },
    { path: "/en/about", priority: 0.4, changeFrequency: "monthly" },
    { path: "/en/tools", priority: 0.45, changeFrequency: "monthly" },
    { path: "/en/donate", priority: 0.35, changeFrequency: "monthly" },
    { path: "/en/privacy", priority: 0.2, changeFrequency: "yearly" },
    { path: "/en/terms", priority: 0.2, changeFrequency: "yearly" },
    { path: "/en/cookies", priority: 0.2, changeFrequency: "yearly" },
    { path: "/en/disclaimer", priority: 0.2, changeFrequency: "yearly" },
  ];

  return [
    ...staticRoutes.map((route) => ({
      url: siteUrl(route.path),
      lastModified: new Date(),
      changeFrequency: route.changeFrequency,
      priority: route.priority,
    })),
    ...zhArticles.map((article) => ({
      url: siteUrl(`/articles/${article.slug}`),
      lastModified: safeDate(article.updatedAt || article.publishedAt),
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
    ...enArticles.map((article) => ({
      url: siteUrl(`/en/articles/${article.slug}`),
      lastModified: safeDate(article.updatedAt || article.publishedAt),
      changeFrequency: "monthly" as const,
      priority: 0.65,
    })),
    ...zhSeries.map((series) => ({
      url: siteUrl(`/series/${series.slug}`),
      lastModified: safeDate(series.updatedAt),
      changeFrequency: "monthly" as const,
      priority: 0.72,
    })),
    ...enSeries.map((series) => ({
      url: siteUrl(`/en/series/${series.slug}`),
      lastModified: safeDate(series.updatedAt),
      changeFrequency: "monthly" as const,
      priority: 0.55,
    })),
  ];
}
