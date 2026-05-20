import Link from "next/link";
import { Plus } from "lucide-react";
import { AdminPageShell } from "@/components/admin/admin-page-shell";
import { PublishedArticlesWorkbench, type PublishedArticleListItem } from "@/components/admin/published-articles-workbench";
import { listPublishedArticleSummaries } from "@/lib/article-drafts";
import { requireAdminPage } from "@/lib/admin-auth";

type PublishedItem = Omit<PublishedArticleListItem, "publishedAt" | "updatedAt"> & {
  publishedAt: string | number | Date | null;
  updatedAt: string | number | Date;
};

function normalizeArticle(article: PublishedItem): PublishedArticleListItem {
  const publishedAt = article.publishedAt ? new Date(article.publishedAt) : null;
  const updatedAt = new Date(article.updatedAt);

  return {
    ...article,
    publishedAt: publishedAt && !Number.isNaN(publishedAt.getTime()) ? publishedAt.toISOString() : "",
    updatedAt: Number.isNaN(updatedAt.getTime()) ? String(article.updatedAt) : updatedAt.toISOString(),
  };
}

async function getPublishedArticles(): Promise<{ articles: PublishedItem[]; error?: string; hint?: string }> {
  try {
    return { articles: await listPublishedArticleSummaries() };
  } catch (error) {
    return {
      articles: [],
      error: error instanceof Error ? error.message : "数据库读取失败",
      hint: "如果你在本地 next dev 下看到这个错误，请确认 D1 migration 已应用，或使用 npm run cf:preview 预览。",
    };
  }
}

export const dynamic = "force-dynamic";

export const metadata = {
  title: "已发布文章管理",
  description: "编辑、下架、上架或物理删除发布管理中的文章。",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function PublishedArticlesPage() {
  await requireAdminPage("/admin/articles/published");
  const { articles, error, hint } = await getPublishedArticles();

  return (
    <AdminPageShell
      active="articlePublished"
      eyebrow="发布管理"
      title="发布文章管理"
      description="这里管理已发布和已下架的文章。编辑、逻辑下架、重新上架和物理删除都会先弹窗确认，并写入后台操作记录。"
      maxWidth="6xl"
      actions={
        <Link className="admin-btn admin-btn-primary inline-flex h-11 items-center justify-center gap-2 px-5 font-semibold" href="/admin/articles/import">
          <Plus className="h-4 w-4" />
          导入新文章
        </Link>
      }
    >
      {error ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-5 text-amber-950" role="alert">
          <h2 className="font-semibold">暂时无法读取 D1 已发布文章</h2>
          <p className="mt-2 whitespace-pre-line leading-7">{error}</p>
          {hint ? <p className="mt-2 whitespace-pre-line leading-7">{hint}</p> : null}
        </div>
      ) : articles.length === 0 ? (
        <div className="admin-surface p-8 text-muted">
          <h2 className="text-xl font-semibold text-foreground">还没有发布管理中的文章</h2>
          <p className="mt-2 leading-7">可以先从导入工作台保存草稿，再进入草稿页检查并发布。</p>
          <Link className="admin-btn admin-btn-primary mt-5 inline-flex h-11 items-center justify-center gap-2 px-5 font-semibold" href="/admin/articles/import">
            <Plus className="h-4 w-4" />
            导入新文章
          </Link>
        </div>
      ) : (
        <PublishedArticlesWorkbench articles={articles.map(normalizeArticle)} />
      )}
    </AdminPageShell>
  );
}
