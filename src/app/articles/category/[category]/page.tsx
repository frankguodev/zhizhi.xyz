import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, FolderOpen } from "lucide-react";
import { ArticleSummaryCard } from "@/components/content/article-summary-card";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { decodeTaxonomySegment, encodeTaxonomySegment, normalizeArticleCategory } from "@/lib/article-taxonomy";
import { getPublicArticles } from "@/lib/public-articles";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ category: string }> }) {
  const { category } = await params;
  const categoryName = normalizeArticleCategory(decodeTaxonomySegment(category), "zh");
  const englishCategoryName = normalizeArticleCategory(categoryName, "en");
  const path = `/articles/category/${encodeTaxonomySegment(categoryName)}`;

  return {
    title: `分类：${categoryName}`,
    description: `浏览“${categoryName}”分类下的文章。`,
    alternates: {
      canonical: path,
      languages: {
        "zh-CN": path,
        en: `/en/articles/category/${encodeTaxonomySegment(englishCategoryName)}`,
      },
    },
  };
}

export default async function ArticleCategoryPage({ params }: { params: Promise<{ category: string }> }) {
  const { category } = await params;
  const categoryName = normalizeArticleCategory(decodeTaxonomySegment(category), "zh");
  const articles = await getPublicArticles("zh");
  const matchedArticles = articles.filter((article) => normalizeArticleCategory(article.category, "zh") === categoryName);

  if (matchedArticles.length === 0) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-background">
      <SiteHeader currentPath={`/articles/category/${category}`} />
      <section className="border-b border-line bg-surface">
        <div className="mx-auto max-w-6xl px-6 py-12">
          <Link href="/articles" className="inline-flex items-center gap-2 text-sm font-semibold text-muted hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            返回文章
          </Link>
          <p className="mt-8 flex items-center gap-2 text-sm font-semibold text-accent">
            <FolderOpen className="h-4 w-4" />
            Category
          </p>
          <h1 className="mt-3 text-4xl font-semibold text-foreground md:text-5xl">{categoryName}</h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-muted">这个分类下共有 {matchedArticles.length} 篇文章。</p>
        </div>
      </section>
      <section className="mx-auto max-w-6xl px-6 py-12">
        <div className="grid gap-5">
          {matchedArticles.map((article) => (
            <ArticleSummaryCard key={`${article.locale}-${article.slug}`} article={article} />
          ))}
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
