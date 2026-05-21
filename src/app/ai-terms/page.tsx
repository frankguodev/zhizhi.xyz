import type { Metadata } from "next";
import { AiTermsPage } from "@/components/content/ai-terms-page";
import { listAiTermCategories, listPublicAiTerms } from "@/lib/ai-terms";
import { siteConfig } from "@/lib/site";

const description = "用普通人能读懂的方式整理 AI 术语、概念、工具和新兴说法。";

export const metadata: Metadata = {
  title: `AI 词条｜${siteConfig.name}`,
  description,
  alternates: {
    canonical: "/ai-terms",
    languages: {
      "zh-CN": "/ai-terms",
      en: "/en/ai-terms",
    },
  },
  openGraph: {
    title: `AI 词条｜${siteConfig.name}`,
    description,
    url: "/ai-terms",
    siteName: `${siteConfig.name} ${siteConfig.nameEn}`,
    locale: "zh_CN",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: `AI 词条｜${siteConfig.name}`,
    description,
  },
};

export const dynamic = "force-dynamic";

type AiTermsRouteProps = {
  searchParams?: Promise<{
    category?: string;
    q?: string;
  }>;
};

export default async function AiTermsRoute({ searchParams }: AiTermsRouteProps) {
  const params = await searchParams;
  const query = params?.q?.trim() || undefined;
  const categorySlug = params?.category?.trim() || undefined;
  const [terms, categories] = await Promise.all([
    listPublicAiTerms({ locale: "zh", q: query, categorySlug, sort: query ? "latest" : "featured", limit: 48 }),
    listAiTermCategories("zh"),
  ]);

  return <AiTermsPage categories={categories} categorySlug={categorySlug} locale="zh" query={query} terms={terms} />;
}
