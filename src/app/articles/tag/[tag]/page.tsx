import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Tag } from "lucide-react";
import { ArticleSummaryCard } from "@/components/content/article-summary-card";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { decodeTaxonomySegment } from "@/lib/article-taxonomy";
import { getPublicArticleListSource } from "@/lib/public-articles";

export const revalidate = 300;

export async function generateMetadata({ params }: { params: Promise<{ tag: string }> }) {
  const { tag } = await params;
  const tagName = decodeTaxonomySegment(tag);

  return {
    title: `标签：${tagName}`,
    description: `浏览“${tagName}”标签下的文章。`,
  };
}

export default async function ArticleTagPage({ params }: { params: Promise<{ tag: string }> }) {
  const { tag } = await params;
  const tagName = decodeTaxonomySegment(tag);
  const articles = await getPublicArticleListSource("zh");
  const matchedArticles = articles.filter((article) => article.tags.includes(tagName));

  if (matchedArticles.length === 0) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-background">
      <SiteHeader currentPath={`/articles/tag/${tag}`} />
      <section className="border-b border-line bg-surface">
        <div className="mx-auto max-w-6xl px-6 py-12">
          <Link href="/articles" className="inline-flex items-center gap-2 text-sm font-semibold text-muted hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            返回文章
          </Link>
          <p className="mt-8 flex items-center gap-2 text-sm font-semibold text-accent">
            <Tag className="h-4 w-4" />
            标签
          </p>
          <h1 className="mt-3 text-4xl font-semibold text-foreground md:text-5xl">{tagName}</h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-muted">这个标签下共有 {matchedArticles.length} 篇文章。</p>
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
