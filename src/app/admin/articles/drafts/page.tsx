import Link from "next/link";
import { Plus } from "lucide-react";
import { AdminPageShell } from "@/components/admin/admin-page-shell";
import { DraftsListWorkbench, type DraftListItem } from "@/components/admin/drafts-list-workbench";
import { getArticleDraft, listArticleDrafts } from "@/lib/article-drafts";
import { checkArticleQuality } from "@/lib/article-quality";
import { requireAdminPage } from "@/lib/admin-auth";

type DraftItem = Omit<DraftListItem, "updatedAt"> & {
  updatedAt: string | number | Date;
};

async function getDrafts(): Promise<{ drafts: DraftItem[]; error?: string; hint?: string }> {
  try {
    const drafts = await listArticleDrafts();
    const draftsWithQuality = await Promise.all(
      drafts.map(async (draft) => {
        const article = await getArticleDraft(draft.locale, draft.slug);
        const quality = article ? checkArticleQuality(article) : null;

        return {
          ...draft,
          publishedAt: article?.publishedAt ?? "",
          qualityErrors: quality?.issues.filter((issue) => issue.level === "error").length ?? 0,
          qualityWarnings: quality?.issues.filter((issue) => issue.level === "warning").length ?? 0,
          qualitySuggestions: quality?.issues.filter((issue) => issue.level === "suggestion").length ?? 0,
        };
      }),
    );

    return { drafts: draftsWithQuality };
  } catch (error) {
    return {
      drafts: [],
      error: error instanceof Error ? error.message : "数据库读取失败",
      hint: "如果你在本地 next dev 下看到这个错误，请先创建 D1 数据库并应用 migration，或使用 npm run cf:preview 通过 Wrangler 预览。",
    };
  }
}

function normalizeDraft(draft: DraftItem): DraftListItem {
  const date = new Date(draft.updatedAt);
  return {
    ...draft,
    updatedAt: Number.isNaN(date.getTime()) ? String(draft.updatedAt) : date.toISOString(),
  };
}

export const dynamic = "force-dynamic";

export const metadata = {
  title: "文章草稿",
  description: "查看通过 Markdown 导入工作台保存的文章草稿。",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function DraftsPage() {
  await requireAdminPage("/admin/articles/drafts");
  const { drafts, error, hint } = await getDrafts();

  return (
    <AdminPageShell
      active="articleDrafts"
      eyebrow="草稿管理"
      title="文章草稿"
      description="这里展示已经保存到 D1 的 Markdown 草稿，可继续编辑、检查和发布。"
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
          <h2 className="font-semibold">暂时无法读取 D1 草稿</h2>
          <p className="mt-2 whitespace-pre-line leading-7">{error}</p>
          {hint ? <p className="mt-2 whitespace-pre-line leading-7">{hint}</p> : null}
        </div>
      ) : drafts.length === 0 ? (
        <div className="admin-surface p-8 text-muted">
          <h2 className="text-xl font-semibold text-foreground">还没有保存草稿</h2>
          <p className="mt-2 leading-7">先去导入工作台粘贴一篇 Markdown，完成解析检查后保存到 D1。</p>
          <Link className="admin-btn admin-btn-primary mt-5 inline-flex h-11 items-center justify-center gap-2 px-5 font-semibold" href="/admin/articles/import">
            <Plus className="h-4 w-4" />
            导入新文章
          </Link>
        </div>
      ) : (
        <DraftsListWorkbench drafts={drafts.map(normalizeDraft)} />
      )}
    </AdminPageShell>
  );
}
