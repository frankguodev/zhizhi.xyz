import type { Metadata } from "next";
import { ArticleIndexPage } from "@/components/content/article-index-page";
import { siteConfig } from "@/lib/site";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "文章",
  description: "知之的高质量知识文章，支持完整阅读、关键词搜索、分类筛选和热门/最新排序。",
  alternates: {
    canonical: "/articles",
    languages: {
      "zh-CN": "/articles",
      en: "/en/articles",
    },
  },
  openGraph: {
    title: "文章",
    description: "知之的高质量知识文章，支持完整阅读、关键词搜索、分类筛选和热门/最新排序。",
    url: "/articles",
    siteName: `${siteConfig.name} ${siteConfig.nameEn}`,
    locale: "zh_CN",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "文章",
    description: "知之的高质量知识文章，支持完整阅读、关键词搜索、分类筛选和热门/最新排序。",
  },
};

type ArticlesSearchParams = Promise<{
  q?: string | string[];
  category?: string | string[];
  sort?: string | string[];
}>;

export default async function ArticlesPage({ searchParams }: { searchParams: ArticlesSearchParams }) {
  return <ArticleIndexPage locale="zh" searchParams={await searchParams} />;
}
