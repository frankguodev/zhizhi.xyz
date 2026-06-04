import { cache } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AiTermDetailPage, aiTermHasBeginnerNotes } from "@/components/content/ai-term-detail-page";
import { isDbAvailable } from "@/db/client";
import { buildFallbackAiTermDetail } from "@/lib/ai-term-fallback";
import { getPublicAiTerm } from "@/lib/ai-terms";
import { buildAiTermJsonLd } from "@/lib/ai-term-structured-data";
import { parseAiTermMarkdown } from "@/lib/markdown";
import { siteConfig } from "@/lib/site";

export const dynamic = "force-dynamic";

type AiTermDetailRouteProps = {
  params: Promise<{
    slug: string;
  }>;
};

// 请求内去重 generateMetadata 与页面组件的加载；fallback 仅在无 D1（本地调试/未配置）时启用，
// 生产环境缺词条或 D1 报错时返回 null → 404，避免 demo 内容被收录。
const loadAiTerm = cache(async (slug: string) => {
  const real = await getPublicAiTerm("zh", slug);
  if (real) {
    return real;
  }
  if (!(await isDbAvailable())) {
    return buildFallbackAiTermDetail("zh", slug);
  }
  return null;
});

function metadataRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function metadataString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

export async function generateMetadata({ params }: AiTermDetailRouteProps): Promise<Metadata> {
  const { slug } = await params;
  const term = await loadAiTerm(slug);

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
  const term = await loadAiTerm(slug);

  if (!term) {
    notFound();
  }

  const { blocks, fable, referencesHtml, beginnerNotesHtml } = await parseAiTermMarkdown(term.contentMd, "zh", {
    stripLeadingTitle: true,
    stripSummary: true,
    extractBeginnerNotes: aiTermHasBeginnerNotes(term.beginnerNotes),
    stripRelations: term.relations.length > 0,
    extractReferences: true,
  });
  const jsonLd = JSON.stringify(buildAiTermJsonLd(term)).replace(/</g, "\\u003c");

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />
      <AiTermDetailPage blocks={blocks} beginnerNotesHtml={beginnerNotesHtml} fable={fable} locale="zh" referencesHtml={referencesHtml} term={term} />
    </>
  );
}
