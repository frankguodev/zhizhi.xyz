import { notFound } from "next/navigation";
import { ArticleDetailPage } from "@/components/content/article-detail-page";
import { articles } from "@/data/articles";
import { buildArticleMetadata } from "@/lib/article-metadata";
import { buildArticleToc } from "@/lib/article-toc";
import { getPublicArticleDetailPayload } from "@/lib/public-article-detail";
import { getPublicArticle } from "@/lib/public-articles";

export const revalidate = 300;

export function generateStaticParams() {
  return articles.filter((article) => article.locale === "zh").map((article) => ({ slug: article.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = await getPublicArticle(slug, "zh");

  if (!article) {
    return {};
  }

  return buildArticleMetadata(article);
}

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const payload = await getPublicArticleDetailPayload("zh", slug);

  if (!payload) {
    notFound();
  }

  const tocItems = buildArticleToc(payload.content.blocks);

  return <ArticleDetailPage article={payload.article} blocks={payload.content.blocks} tocItems={tocItems} navigation={payload.navigation} externalLinks={payload.externalLinks} locale="zh" />;
}
