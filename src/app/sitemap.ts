import type { MetadataRoute } from "next";
import { countPublicAiTerms, listPublicAiTerms } from "@/lib/ai-terms";
import { getPublicArticles } from "@/lib/public-articles";
import { listPublicSeries } from "@/lib/series";
import { siteConfig } from "@/lib/site";

function siteUrl(path = "") {
  return `${siteConfig.url}${path}`;
}

async function getAllPublicAiTerms() {
  const total = await countPublicAiTerms({ locale: "zh" });
  const pageSize = 100;
  const terms: Awaited<ReturnType<typeof listPublicAiTerms>> = [];

  for (let offset = 0; offset < total; offset += pageSize) {
    const batch = await listPublicAiTerms({ locale: "zh", limit: pageSize, offset });
    if (batch.length === 0) {
      break;
    }
    terms.push(...batch);
  }

  return terms;
}

function safeDate(value: string | number | Date | null | undefined) {
  if (!value) {
    return new Date();
  }

  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [articles, seriesList, aiTerms] = await Promise.all([
    getPublicArticles("zh"),
    listPublicSeries("zh"),
    getAllPublicAiTerms(),
  ]);

  const staticRoutes: Array<{
    path: string;
    priority: number;
    changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
  }> = [
    { path: "", priority: 1, changeFrequency: "weekly" },
    { path: "/articles", priority: 0.85, changeFrequency: "weekly" },
    { path: "/ai-terms", priority: 0.8, changeFrequency: "weekly" },
    { path: "/series", priority: 0.75, changeFrequency: "weekly" },
    { path: "/about", priority: 0.55, changeFrequency: "monthly" },
    { path: "/donate", priority: 0.45, changeFrequency: "monthly" },
    { path: "/changelog", priority: 0.5, changeFrequency: "weekly" },
    { path: "/privacy", priority: 0.25, changeFrequency: "yearly" },
    { path: "/terms", priority: 0.25, changeFrequency: "yearly" },
    { path: "/cookies", priority: 0.25, changeFrequency: "yearly" },
    { path: "/disclaimer", priority: 0.25, changeFrequency: "yearly" },
  ];

  return [
    ...staticRoutes.map((route) => ({
      url: siteUrl(route.path),
      lastModified: new Date(),
      changeFrequency: route.changeFrequency,
      priority: route.priority,
    })),
    ...articles.map((article) => ({
      url: siteUrl(`/articles/${article.slug}`),
      lastModified: safeDate(article.updatedAt || article.publishedAt),
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
    ...seriesList.map((series) => ({
      url: siteUrl(`/series/${series.slug}`),
      lastModified: safeDate(series.updatedAt),
      changeFrequency: "monthly" as const,
      priority: 0.72,
    })),
    ...aiTerms.map((term) => ({
      url: siteUrl(`/ai-terms/${term.slug}`),
      lastModified: safeDate(term.updatedAt || term.publishedAt),
      changeFrequency: "monthly" as const,
      priority: 0.78,
    })),
  ];
}
