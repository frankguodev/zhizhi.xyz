import { notFound } from "next/navigation";
import { AdminPageShell } from "@/components/admin/admin-page-shell";
import { DraftEditorWorkbench } from "@/components/admin/draft-editor-workbench";
import { articleToMarkdown, getArticleDraft } from "@/lib/article-drafts";
import { requireAdminPage } from "@/lib/admin-auth";
import { checkArticleQuality } from "@/lib/article-quality";
import { parseLayeredMarkdown } from "@/lib/markdown";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "编辑草稿",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function DraftEditorPage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  await requireAdminPage(`/admin/articles/drafts/${locale}/${slug}`);

  const article = await getArticleDraft("zh", slug).catch(() => null);

  if (!article) {
    notFound();
  }

  const blocks = await parseLayeredMarkdown(article.content, article.locale);
  const quality = checkArticleQuality(article);

  return (
    <AdminPageShell
      active="articleDrafts"
      eyebrow="草稿编辑"
      title={article.title}
      description={article.summary || "编辑 Markdown、刷新预览并发布文章。"}
    >
      <DraftEditorWorkbench
        initialData={{
          article,
          markdown: articleToMarkdown(article),
          blocks,
          quality,
        }}
      />
    </AdminPageShell>
  );
}
