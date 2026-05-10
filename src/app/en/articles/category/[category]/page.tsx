import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, FolderOpen } from "lucide-react";
import { ArticleSummaryCard } from "@/components/content/article-summary-card";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { decodeTaxonomySegment, encodeTaxonomySegment, normalizeArticleCategory } from "@/lib/article-taxonomy";
import { getPublicArticles } from "@/lib/public-articles";
import { siteConfig } from "@/lib/site";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ category: string }> }): Promise<Metadata> {
  const { category } = await params;
  const categoryName = normalizeArticleCategory(decodeTaxonomySegment(category), "en");
  const zhCategoryName = normalizeArticleCategory(categoryName, "zh");
  const path = `/en/articles/category/${encodeTaxonomySegment(categoryName)}`;

  return {
    title: `Category: ${categoryName}`,
    description: `Browse English articles in the “${categoryName}” category.`,
    alternates: {
      canonical: path,
      languages: {
        en: path,
        "zh-CN": `/articles/category/${encodeTaxonomySegment(zhCategoryName)}`,
      },
    },
    openGraph: {
      title: `Category: ${categoryName}`,
      description: `Browse English articles in the “${categoryName}” category.`,
      url: path,
      siteName: `${siteConfig.name} ${siteConfig.nameEn}`,
      locale: "en_US",
      type: "website",
    },
  };
}

export default async function EnglishArticleCategoryPage({ params }: { params: Promise<{ category: string }> }) {
  const { category } = await params;
  const categoryName = normalizeArticleCategory(decodeTaxonomySegment(category), "en");
  const articles = await getPublicArticles("en");
  const matchedArticles = articles.filter((article) => normalizeArticleCategory(article.category, "en") === categoryName);

  if (matchedArticles.length === 0) {
    notFound();
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader locale="en" currentPath={`/en/articles/category/${category}`} />
      <main className="flex-1 bg-background">
        <section className="border-b border-line bg-surface">
          <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 md:py-12">
            <Link href="/en/articles" className="inline-flex items-center gap-2 text-sm font-semibold text-muted hover:text-foreground">
              <ArrowLeft className="h-4 w-4" />
              Back to articles
            </Link>
            <p className="mt-8 flex items-center gap-2 text-sm font-semibold text-accent">
              <FolderOpen className="h-4 w-4" />
              Category
            </p>
            <h1 className="mt-3 text-4xl font-semibold text-foreground md:text-5xl">{categoryName}</h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-muted">This category contains {matchedArticles.length} articles.</p>
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
