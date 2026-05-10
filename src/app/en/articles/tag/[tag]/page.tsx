import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Tag } from "lucide-react";
import { ArticleSummaryCard } from "@/components/content/article-summary-card";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { decodeTaxonomySegment } from "@/lib/article-taxonomy";
import { getPublicArticles } from "@/lib/public-articles";
import { siteConfig } from "@/lib/site";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ tag: string }> }): Promise<Metadata> {
  const { tag } = await params;
  const tagName = decodeTaxonomySegment(tag);
  const path = `/en/articles/tag/${encodeURIComponent(tagName)}`;

  return {
    title: `Tag: ${tagName}`,
    description: `Browse English articles tagged “${tagName}”.`,
    alternates: {
      canonical: path,
      languages: {
        en: path,
        "zh-CN": `/articles/tag/${encodeURIComponent(tagName)}`,
      },
    },
    openGraph: {
      title: `Tag: ${tagName}`,
      description: `Browse English articles tagged “${tagName}”.`,
      url: path,
      siteName: `${siteConfig.name} ${siteConfig.nameEn}`,
      locale: "en_US",
      type: "website",
    },
  };
}

export default async function EnglishArticleTagPage({ params }: { params: Promise<{ tag: string }> }) {
  const { tag } = await params;
  const tagName = decodeTaxonomySegment(tag);
  const articles = await getPublicArticles("en");
  const matchedArticles = articles.filter((article) => article.tags.includes(tagName));

  if (matchedArticles.length === 0) {
    notFound();
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader locale="en" currentPath={`/en/articles/tag/${tag}`} />
      <main className="flex-1 bg-background">
        <section className="border-b border-line bg-surface">
          <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 md:py-12">
            <Link href="/en/articles" className="inline-flex items-center gap-2 text-sm font-semibold text-muted hover:text-foreground">
              <ArrowLeft className="h-4 w-4" />
              Back to articles
            </Link>
            <p className="mt-8 flex items-center gap-2 text-sm font-semibold text-accent">
              <Tag className="h-4 w-4" />
              Tag
            </p>
            <h1 className="mt-3 text-4xl font-semibold text-foreground md:text-5xl">{tagName}</h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-muted">This tag contains {matchedArticles.length} articles.</p>
          </div>
        </section>
        <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6 md:py-12">
          <div className="grid gap-5">
            {matchedArticles.map((article) => (
              <ArticleSummaryCard key={`${article.locale}-${article.slug}`} article={article} />
            ))}
          </div>
        </section>
      </main>
      <SiteFooter locale="en" />
    </div>
  );
}
