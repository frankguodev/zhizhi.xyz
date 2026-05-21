import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AiTermDetailPage } from "@/components/content/ai-term-detail-page";
import { fallbackAiTerms } from "@/components/content/ai-terms-page";
import { buildArticleToc } from "@/lib/article-toc";
import { getPublicAiTerm, type AiTermDetail } from "@/lib/ai-terms";
import { parseLayeredMarkdown } from "@/lib/markdown";
import { siteConfig } from "@/lib/site";

export const dynamic = "force-dynamic";

type EnglishAiTermDetailRouteProps = {
  params: Promise<{
    slug: string;
  }>;
};

function fallbackDetail(slug: string): AiTermDetail | null {
  const term = fallbackAiTerms.find((item) => item.slug === slug);

  if (!term) {
    return null;
  }

  return {
    ...term,
    id: `fallback:en:${term.slug}`,
    locale: "en",
    difficulty: term.difficulty as AiTermDetail["difficulty"],
    type: "concept",
    qualityScore: 0,
    tagline: null,
    shareImage: null,
    shareImageAlt: null,
    publishedAt: term.updatedAt,
    lastVerifiedAt: term.updatedAt,
    translationKey: term.slug,
    beginnerNotes: null,
    contentMd: [`## What it means`, term.shortDesc, `## Why it matters`, `${term.term} is part of the AI terms map. Start with the plain-language definition, then connect it to tools, protocols, and workflows when the full published entry is available.`, `## Where to go next`, `Return to the terms list and browse related concepts in the same category.`].join("\n\n"),
    contentVersion: "fallback-ai-term-v1",
    seoTitle: `${term.term} | AI Terms`,
    seoDescription: term.shortDesc,
    seoKeywords: [term.term, term.termZh, term.fullName].filter((value): value is string => Boolean(value)),
    canonicalUrl: `/en/ai-terms/${term.slug}`,
    robots: "index, follow",
    metadata: null,
    sourceNote: null,
    aiAssisted: true,
    humanReviewed: false,
    viewCount: 0,
    relations: [],
  };
}

export async function generateMetadata({ params }: EnglishAiTermDetailRouteProps): Promise<Metadata> {
  const { slug } = await params;
  const term = (await getPublicAiTerm("en", slug)) ?? fallbackDetail(slug);

  if (!term) {
    return {};
  }

  const title = term.seoTitle || `${term.term} | AI Terms | ${siteConfig.nameEn}`;
  const description = term.seoDescription || term.shortDesc;
  const url = `/en/ai-terms/${term.slug}`;

  return {
    title,
    description,
    alternates: {
      canonical: url,
    },
    openGraph: {
      title,
      description,
      url,
      siteName: `${siteConfig.name} ${siteConfig.nameEn}`,
      locale: "en_US",
      type: "article",
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
  };
}

export default async function EnglishAiTermDetailRoute({ params }: EnglishAiTermDetailRouteProps) {
  const { slug } = await params;
  const term = (await getPublicAiTerm("en", slug)) ?? fallbackDetail(slug);

  if (!term) {
    notFound();
  }

  const blocks = await parseLayeredMarkdown(term.contentMd, "en");
  const tocItems = buildArticleToc(blocks);

  return <AiTermDetailPage blocks={blocks} locale="en" term={term} tocItems={tocItems} />;
}
