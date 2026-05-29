import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AiTermDetailPage } from "@/components/content/ai-term-detail-page";
import { fallbackAiTerms } from "@/components/content/ai-terms-page";
import { getPublicAiTerm, type AiTermDetail } from "@/lib/ai-terms";
import { parseAiTermMarkdown } from "@/lib/markdown";
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
    diagramImage: null,
    diagramImageAlt: null,
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

function metadataRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function metadataString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

export async function generateMetadata({ params }: EnglishAiTermDetailRouteProps): Promise<Metadata> {
  const { slug } = await params;
  const term = (await getPublicAiTerm("en", slug)) ?? fallbackDetail(slug);

  if (!term) {
    return {};
  }

  const metadata = metadataRecord(term.metadata);
  const openGraph = metadataRecord(metadata.openGraph);
  const twitter = metadataRecord(metadata.twitter);
  const title = metadataString(openGraph.title) || term.seoTitle || `${term.term} | AI Terms | ${siteConfig.nameEn}`;
  const description = metadataString(openGraph.description) || term.seoDescription || term.shortDesc;
  const twitterTitle = metadataString(twitter.title) || title;
  const twitterDescription = metadataString(twitter.description) || description;
  const url = term.canonicalUrl || `/en/ai-terms/${term.slug}`;
  const shareImage = metadataString(openGraph.image) || term.shareImage || undefined;
  const shareImageAlt = metadataString(openGraph.image_alt) || term.shareImageAlt || undefined;
  const twitterImage = metadataString(twitter.image) || shareImage;
  const twitterCard = metadataString(twitter.card) === "summary" ? "summary" : "summary_large_image";

  return {
    title,
    description,
    alternates: {
      canonical: url,
    },
    robots: term.robots || undefined,
    openGraph: {
      title,
      description,
      url,
      siteName: `${siteConfig.name} ${siteConfig.nameEn}`,
      locale: "en_US",
      type: "article",
      images: shareImage ? [{ url: shareImage, alt: shareImageAlt }] : undefined,
    },
    twitter: {
      card: twitterCard,
      title: twitterTitle,
      description: twitterDescription,
      images: twitterImage ? [twitterImage] : undefined,
    },
  };
}

export default async function EnglishAiTermDetailRoute({ params }: EnglishAiTermDetailRouteProps) {
  const { slug } = await params;
  const term = (await getPublicAiTerm("en", slug)) ?? fallbackDetail(slug);

  if (!term) {
    notFound();
  }

  const { blocks, fable } = await parseAiTermMarkdown(term.contentMd, "en");

  return <AiTermDetailPage blocks={blocks} fable={fable} locale="en" term={term} />;
}
