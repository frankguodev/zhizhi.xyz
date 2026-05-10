import { notFound } from "next/navigation";
import { AdminPageShell } from "@/components/admin/admin-page-shell";
import { DraftEditorWorkbench } from "@/components/admin/draft-editor-workbench";
import { articleToMarkdown, getPublishedArticle } from "@/lib/article-drafts";
import { listArticleOperationLogs } from "@/lib/admin-operation-logs";
import { requireAdminPage } from "@/lib/admin-auth";
import { checkArticleQuality } from "@/lib/article-quality";
import { parseLayeredMarkdown } from "@/lib/markdown";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "编辑已发布文章",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function PublishedArticleEditorPage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  await requireAdminPage(`/admin/articles/published/${locale}/${slug}`);

  const normalizedLocale = locale === "en" ? "en" : "zh";
  const article = await getPublishedArticle(normalizedLocale, slug).catch(() => null);

  if (!article) {
    notFound();
  }

  const [blocks, logs] = await Promise.all([
    parseLayeredMarkdown(article.content, article.locale),
    listArticleOperationLogs(`article:${article.locale}:${article.slug}`, 12).catch(() => []),
  ]);
  const quality = checkArticleQuality(article);

  return (
    <AdminPageShell
      active="published"
      eyebrow="已发布文章编辑"
      title={article.title}
      description="这里会直接更新公开文章。每次写入前都会弹窗确认，并在后台记录操作。"
    >
      <DraftEditorWorkbench
        mode="published"
        initialData={{
          article,
          markdown: articleToMarkdown(article),
          blocks,
          quality,
          logs: logs.map((log) => ({
            ...log,
            createdAt: log.createdAt instanceof Date ? log.createdAt.toISOString() : log.createdAt,
          })),
        }}
      />
    </AdminPageShell>
  );
}
