import type { MetadataRoute } from "next";
import { toolRoutes } from "@/lib/tools-meta";

const siteUrl = "https://tools.zhizhi.xyz";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: siteUrl,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 1,
    },
    {
      url: `${siteUrl}/tools`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.9,
    },
    ...toolRoutes.filter((route) => route.id !== "data").map((route) => ({
      url: `${siteUrl}/tools/${route.slug}`,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
  ];
}
