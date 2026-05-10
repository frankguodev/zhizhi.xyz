import Link from "next/link";
import { ArrowRight, FileInput, FilePenLine, Link2, MessageSquareText, Newspaper, PanelsTopLeft, ShieldCheck } from "lucide-react";
import { AdminPageShell } from "@/components/admin/admin-page-shell";
import { requireAdminPage } from "@/lib/admin-auth";
import { getAdminDashboardMetrics } from "@/lib/admin-dashboard";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "后台概览",
  description: "查看草稿、已发布文章、外部链接、用户和专题的后台基础数据。",
  robots: {
    index: false,
    follow: false,
  },
};

async function getDashboardPayload() {
  try {
    const metrics = await getAdminDashboardMetrics();
    return { metrics, error: "", hint: "" };
  } catch (error) {
    return {
      metrics: null,
      error: error instanceof Error ? error.message : "Failed to load admin dashboard metrics.",
      hint: "如果你在普通 next dev 下看到这个错误，请在需要 D1 binding 时使用 npm run cf:preview。",
    };
  }
}

export default async function AdminDashboardPage() {
  await requireAdminPage("/admin");
  const { metrics, error, hint } = await getDashboardPayload();
  const activeLinkRatio = metrics && metrics.externalLinkCount > 0 ? `${metrics.activeExternalLinkCount}/${metrics.externalLinkCount}` : "0/0";
  const publishedSeriesRatio = metrics && metrics.seriesCount > 0 ? `${metrics.publishedSeriesCount}/${metrics.seriesCount}` : "0/0";

  return (
    <AdminPageShell
      active="dashboard"
      eyebrow="后台概览"
      title="基础数据"
      description="快速查看草稿、已发布文章、外部链接、用户和专题的当前状态。"
    >
      {error || !metrics ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-5 text-amber-950" role="alert">
          <h2 className="font-semibold">暂时无法读取 D1 后台数据</h2>
          <p className="mt-2 whitespace-pre-line leading-7">{error}</p>
          {hint ? <p className="mt-2 whitespace-pre-line leading-7">{hint}</p> : null}
        </div>
      ) : (
        <>
          <section aria-labelledby="admin-dashboard-metrics-title">
            <h2 id="admin-dashboard-metrics-title" className="sr-only">
              后台基础指标
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <article className="admin-card min-w-0 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-muted">草稿</p>
                    <p className="mt-2 text-3xl font-semibold text-foreground">{metrics.draftCount}</p>
                  </div>
                  <FilePenLine className="h-5 w-5 text-accent" />
                </div>
                <p className="mt-3 text-sm leading-6 text-muted">等待编辑、检查或发布的内容。</p>
                <Link className="motion-inline mt-4 inline-flex items-center gap-2 text-sm font-semibold text-accent" href="/admin/articles/drafts">
                  查看草稿
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </article>

              <article className="admin-card min-w-0 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-muted">文章</p>
                    <p className="mt-2 text-3xl font-semibold text-foreground">{metrics.publishedArticleCount}</p>
                  </div>
                  <Newspaper className="h-5 w-5 text-accent" />
                </div>
                <p className="mt-3 text-sm leading-6 text-muted">已发布文章，另有 {metrics.archivedArticleCount} 篇已下架。</p>
                <Link className="motion-inline mt-4 inline-flex items-center gap-2 text-sm font-semibold text-accent" href="/admin/articles/published">
                  管理文章
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </article>

              <article className="admin-card min-w-0 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-muted">外部链接</p>
                    <p className="mt-2 text-3xl font-semibold text-foreground">{activeLinkRatio}</p>
                  </div>
                  <Link2 className="h-5 w-5 text-accent" />
                </div>
                <p className="mt-3 text-sm leading-6 text-muted">启用 / 全部链接，覆盖首页、页脚和文章底部入口。</p>
                <Link className="motion-inline mt-4 inline-flex items-center gap-2 text-sm font-semibold text-accent" href="/admin/links">
                  管理链接
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </article>

              <article className="admin-card min-w-0 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-muted">专题</p>
                    <p className="mt-2 text-3xl font-semibold text-foreground">{publishedSeriesRatio}</p>
                  </div>
                  <PanelsTopLeft className="h-5 w-5 text-accent" />
                </div>
                <p className="mt-3 text-sm leading-6 text-muted">已发布 / 全部专题，公开列表只展示已有公开文章的专题。</p>
                <Link className="motion-inline mt-4 inline-flex items-center gap-2 text-sm font-semibold text-accent" href="/admin/series">
                  管理专题
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </article>

              <article className="admin-card min-w-0 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-muted">账号</p>
                    <p className="mt-2 text-3xl font-semibold text-foreground">{metrics.adminUserCount}/{metrics.userCount}</p>
                  </div>
                  <ShieldCheck className="h-5 w-5 text-accent" />
                </div>
                <p className="mt-3 text-sm leading-6 text-muted">管理员账号 / users 表全部账号。前台用户系统当前软下线。</p>
              </article>

              <article className="admin-card min-w-0 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-muted">反馈</p>
                    <p className="mt-2 text-3xl font-semibold text-foreground">匿名</p>
                  </div>
                  <MessageSquareText className="h-5 w-5 text-accent" />
                </div>
                <p className="mt-3 text-sm leading-6 text-muted">查看文章底部收集的读者反馈，处理后可标记或归档。</p>
                <Link className="motion-inline mt-4 inline-flex items-center gap-2 text-sm font-semibold text-accent" href="/admin/feedback">
                  查看反馈
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </article>

              <article className="admin-card min-w-0 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-muted">导入入口</p>
                    <p className="mt-2 text-3xl font-semibold text-foreground">MD</p>
                  </div>
                  <FileInput className="h-5 w-5 text-accent" />
                </div>
                <p className="mt-3 text-sm leading-6 text-muted">从 Markdown 预览、质量检查到保存草稿。</p>
                <Link className="motion-inline mt-4 inline-flex items-center gap-2 text-sm font-semibold text-accent" href="/admin/articles/import">
                  导入文章
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </article>
            </div>
          </section>

          <section className="admin-surface mt-8 p-5" aria-labelledby="admin-dashboard-next-title">
            <p id="admin-dashboard-next-title" className="text-sm font-semibold text-foreground">建议下一步</p>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <Link className="admin-btn admin-btn-secondary inline-flex min-h-11 items-center justify-center gap-2 px-4 text-sm font-semibold" href="/admin/articles/drafts">
                <FilePenLine className="h-4 w-4" />
                继续编辑草稿
              </Link>
              <Link className="admin-btn admin-btn-secondary inline-flex min-h-11 items-center justify-center gap-2 px-4 text-sm font-semibold" href="/admin/articles/published">
                <Newspaper className="h-4 w-4" />
                检查已发布文章
              </Link>
              <Link className="admin-btn admin-btn-secondary inline-flex min-h-11 items-center justify-center gap-2 px-4 text-sm font-semibold" href="/admin/feedback">
                <MessageSquareText className="h-4 w-4" />
                查看匿名反馈
              </Link>
              <Link className="admin-btn admin-btn-primary inline-flex min-h-11 items-center justify-center gap-2 px-4 text-sm font-semibold" href="/admin/articles/import">
                <FileInput className="h-4 w-4" />
                导入新文章
              </Link>
            </div>
          </section>

          <section className="admin-surface mt-5 border-amber-200 bg-amber-50/70 p-5 text-amber-950" aria-labelledby="admin-dashboard-security-title">
            <p id="admin-dashboard-security-title" className="text-sm font-semibold">后台安全提示</p>
            <ul className="mt-3 space-y-2 text-sm leading-6">
              <li>后台 session 默认 2 小时有效；如果接口返回 401，前端会跳回后台登录页。</li>
              <li>生产环境建议在 `/admin/*` 前再加 Cloudflare Access，形成外层访问控制。</li>
              <li>媒体上传依赖 R2 的 `MEDIA_BUCKET` binding，本地完整验证请使用 Cloudflare preview。</li>
            </ul>
          </section>
        </>
      )}
    </AdminPageShell>
  );
}
