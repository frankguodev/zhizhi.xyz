import type { Metadata } from "next";
import { AiTermsPage } from "@/components/content/ai-terms-page";
import { listPublicAiTerms } from "@/lib/ai-terms";
import { siteConfig } from "@/lib/site";

const description = "AI terms, concepts, tools, and emerging ideas explained in a calm knowledge map.";

export const metadata: Metadata = {
  title: `AI Terms | ${siteConfig.nameEn}`,
  description,
  alternates: {
    canonical: "/en/ai-terms",
    languages: {
      "zh-CN": "/ai-terms",
      en: "/en/ai-terms",
    },
  },
  openGraph: {
    title: `AI Terms | ${siteConfig.nameEn}`,
    description,
    url: "/en/ai-terms",
    siteName: `${siteConfig.name} ${siteConfig.nameEn}`,
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: `AI Terms | ${siteConfig.nameEn}`,
    description,
  },
};

export const dynamic = "force-dynamic";

type EnglishAiTermsRouteProps = {
  searchParams?: Promise<{
    category?: string;
    q?: string;
  }>;
};

export default async function EnglishAiTermsRoute({ searchParams }: EnglishAiTermsRouteProps) {
  const params = await searchParams;
  const query = params?.q?.trim() || undefined;
  const categorySlug = params?.category?.trim() || undefined;
  const terms = await listPublicAiTerms({ locale: "en", q: query, categorySlug, sort: query ? "latest" : "featured", limit: 48 });

  return <AiTermsPage categorySlug={categorySlug} locale="en" query={query} terms={terms} />;
}
