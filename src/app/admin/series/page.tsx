import { AdminPageShell } from "@/components/admin/admin-page-shell";
import { SeriesWorkbench } from "@/components/admin/series-workbench";
import { requireAdminPage } from "@/lib/admin-auth";
import { listAdminSeries, listSeriesArticleChoices } from "@/lib/series";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "专题管理",
  description: "创建、编辑和发布专题路线，并把文章加入专题。",
  robots: {
    index: false,
    follow: false,
  },
};

async function getSeriesPayload() {
  try {
    const [seriesList, articleChoices] = await Promise.all([
      listAdminSeries(),
      listSeriesArticleChoices("zh"),
    ]);
    return { seriesList, articleChoices, error: "", hint: "" };
  } catch (error) {
    return {
      seriesList: [],
      articleChoices: [],
      error: error instanceof Error ? error.message : "数据库读取失败",
      hint: "如果你在本地 next dev 下看到这个错误，请先创建 D1 数据库并应用 migration，或使用 npm run cf:preview 通过 Wrangler 预览。",
    };
  }
}

export default async function AdminSeriesPage() {
  await requireAdminPage("/admin/series");
  const { seriesList, articleChoices, error, hint } = await getSeriesPayload();

  return (
    <AdminPageShell
      active="series"
      eyebrow="专题管理"
      title="专题路线"
      description="创建专题路线，选择已发布文章并调整顺序。专题发布后会出现在前台 /series 和对应专题详情页。"
    >
      {error ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-5 text-amber-950" role="alert">
          <h2 className="font-semibold">暂时无法读取 D1 专题数据</h2>
          <p className="mt-2 whitespace-pre-line leading-7">{error}</p>
          {hint ? <p className="mt-2 whitespace-pre-line leading-7">{hint}</p> : null}
        </div>
      ) : (
        <SeriesWorkbench initialSeries={seriesList} articleChoices={articleChoices} />
      )}
    </AdminPageShell>
  );
}
