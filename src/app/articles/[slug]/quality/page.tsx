import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, FileCheck2 } from "lucide-react";
import { QualityReport } from "@/components/content/quality-report";
import { SiteFooter } from "@/components/layout/site-footer";
import { articles, getArticleBySlug } from "@/data/articles";
import { checkArticleQuality } from "@/lib/article-quality";

export function generateStaticParams() {
  return articles.map((article) => ({ slug: article.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = getArticleBySlug(slug, "zh");

  if (!article) {
    return {};
  }

  return {
    title: `${article.title} - 质量检查`,
    description: `发布前检查：${article.summary}`,
  };
}

export default async function ArticleQualityPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = getArticleBySlug(slug, "zh");

  if (!article) {
    notFound();
  }

  const report = checkArticleQuality(article);

  return (
    <main className="min-h-screen bg-background">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto max-w-5xl px-6 py-10">
          <Link href={`/articles/${article.slug}`} className="inline-flex items-center gap-2 text-sm font-semibold text-muted hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            返回文章
          </Link>
          <p className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-accent">
            <FileCheck2 className="h-4 w-4" />
            发布前质量检查
          </p>
          <h1 className="mt-3 text-4xl font-semibold leading-tight text-foreground">{article.title}</h1>
          <p className="mt-4 max-w-3xl leading-7 text-muted">
            这页先用于开发和自检。后续 Markdown 导入后台时，会把同一套规则放进发布流程里。
          </p>
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-6 py-10">
        <QualityReport report={report} />
      </section>
      <SiteFooter />
    </main>
  );
}
