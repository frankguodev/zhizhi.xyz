import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AiTermDetailPage, aiTermHasBeginnerNotes } from "@/components/content/ai-term-detail-page";
import { buildFallbackAiTermDetail } from "@/lib/ai-term-fallback";
import { getPublicAiTerm } from "@/lib/ai-terms";
import { buildAiTermJsonLd } from "@/lib/ai-term-structured-data";
import { parseAiTermMarkdown } from "@/lib/markdown";
import { siteConfig } from "@/lib/site";

export const dynamic = "force-dynamic";

type EnglishAiTermDetailRouteProps = {
  params: Promise<{
    slug: string;
  }>;
};

function metadataRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function metadataString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

export async function generateMetadata({ params }: EnglishAiTermDetailRouteProps): Promise<Metadata> {
  const { slug } = await params;
  const term = (await getPublicAiTerm("en", slug)) ?? buildFallbackAiTermDetail("en", slug);

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
  const realTerm = await getPublicAiTerm("en", slug);
  const term = realTerm ?? buildFallbackAiTermDetail("en", slug);

  if (!term) {
    notFound();
  }

  const { blocks, fable, referencesHtml } = await parseAiTermMarkdown(term.contentMd, "en", {
    stripLeadingTitle: true,
    stripSummary: true,
    stripBeginnerNotes: aiTermHasBeginnerNotes(term.beginnerNotes, "en"),
    stripRelations: term.relations.length > 0,
    extractReferences: true,
  });
  const jsonLd = JSON.stringify(buildAiTermJsonLd(term, "en")).replace(/</g, "\\u003c");

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />
      <AiTermDetailPage blocks={blocks} fable={fable} locale="en" referencesHtml={referencesHtml} term={term} />
    </>
  );
}
