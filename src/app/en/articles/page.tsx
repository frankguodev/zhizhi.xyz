import type { Metadata } from "next";
import { ArticleIndexPage } from "@/components/content/article-index-page";
import { siteConfig } from "@/lib/site";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Articles",
  description: "Knowledge articles in English, with keyword search, category filters, popular sorting, latest sorting, and clear reading paths.",
  alternates: {
    canonical: "/en/articles",
    languages: {
      "zh-CN": "/articles",
      en: "/en/articles",
    },
  },
  openGraph: {
    title: "Articles",
    description: "Knowledge articles in English, with keyword search, category filters, popular sorting, latest sorting, and clear reading paths.",
    url: "/en/articles",
    siteName: `${siteConfig.name} ${siteConfig.nameEn}`,
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Articles",
    description: "Knowledge articles in English, with keyword search, category filters, popular sorting, latest sorting, and clear reading paths.",
  },
};

type ArticlesSearchParams = Promise<{
  q?: string | string[];
  category?: string | string[];
  sort?: string | string[];
}>;

export default async function EnglishArticlesPage({ searchParams }: { searchParams: ArticlesSearchParams }) {
  return <ArticleIndexPage locale="en" searchParams={await searchParams} />;
}
