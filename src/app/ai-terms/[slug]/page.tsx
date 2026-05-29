import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AiTermDetailPage } from "@/components/content/ai-term-detail-page";
import { fallbackAiTerms } from "@/components/content/ai-terms-page";
import { getPublicAiTerm, type AiTermDetail } from "@/lib/ai-terms";
import { parseAiTermMarkdown } from "@/lib/markdown";
import { siteConfig } from "@/lib/site";

export const dynamic = "force-dynamic";

type AiTermDetailRouteProps = {
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
    id: `fallback:${term.slug}`,
    locale: "zh",
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
    contentMd: [`## 这是什么`, term.shortDesc, `## 为什么值得了解`, `${term.term} 属于 AI 词条知识地图中的基础概念。先理解它的普通解释，再进入具体工具、协议或实践场景，会更容易判断它和自己任务的关系。`, `## 可以从哪里继续`, `可以回到词条列表，继续查看同一分类下的相关概念。`].join("\n\n"),
    contentVersion: "fallback-ai-term-v1",
    seoTitle: `${term.term}｜AI 词条`,
    seoDescription: term.shortDesc,
    seoKeywords: [term.term, term.termZh, term.fullName].filter((value): value is string => Boolean(value)),
    canonicalUrl: `/ai-terms/${term.slug}`,
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

export async function generateMetadata({ params }: AiTermDetailRouteProps): Promise<Metadata> {
  const { slug } = await params;
  const term = (await getPublicAiTerm("zh", slug)) ?? fallbackDetail(slug);

  if (!term) {
    return {};
  }

  const metadata = metadataRecord(term.metadata);
  const openGraph = metadataRecord(metadata.openGraph);
  const twitter = metadataRecord(metadata.twitter);
  const title = metadataString(openGraph.title) || term.seoTitle || `${term.term}｜AI 词条｜${siteConfig.name}`;
  const description = metadataString(openGraph.description) || term.seoDescription || term.shortDesc;
  const twitterTitle = metadataString(twitter.title) || title;
  const twitterDescription = metadataString(twitter.description) || description;
  const url = term.canonicalUrl || `/ai-terms/${term.slug}`;
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
      locale: "zh_CN",
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

export default async function AiTermDetailRoute({ params }: AiTermDetailRouteProps) {
  const { slug } = await params;
  const term = (await getPublicAiTerm("zh", slug)) ?? fallbackDetail(slug);

  if (!term) {
    notFound();
  }

  const { blocks, fable } = await parseAiTermMarkdown(term.contentMd, "zh");

  return <AiTermDetailPage blocks={blocks} fable={fable} locale="zh" term={term} />;
}
