import { AdminPageShell } from "@/components/admin/admin-page-shell";
import { ExternalLinksWorkbench } from "@/components/admin/external-links-workbench";
import { requireAdminPage } from "@/lib/admin-auth";
import { listAdminExternalLinks } from "@/lib/external-links";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "外部链接管理",
  description: "管理捐赠页、站点底部和其他位置使用的外部链接。",
  robots: {
    index: false,
    follow: false,
  },
};

async function getLinks() {
  try {
    const links = await listAdminExternalLinks();
    return { links, error: "", hint: "" };
  } catch (error) {
    return {
      links: [],
      error: error instanceof Error ? error.message : "数据库读取失败",
      hint: "如果你在本地 next dev 下看到这个错误，请先创建 D1 数据库并应用 migration，或使用 npm run cf:preview 通过 Wrangler 预览。",
    };
  }
}

export default async function AdminLinksPage() {
  await requireAdminPage("/admin/links");
  const { links, error, hint } = await getLinks();

  return (
    <AdminPageShell active="links" eyebrow="链接管理" title="外部链接" description="管理捐赠页、首页、文章底部和站点底部会展示的外部链接。">
      {error ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-5 text-amber-950" role="alert">
          <h2 className="font-semibold">暂时无法读取 D1 外部链接</h2>
          <p className="mt-2 whitespace-pre-line leading-7">{error}</p>
          {hint ? <p className="mt-2 whitespace-pre-line leading-7">{hint}</p> : null}
        </div>
      ) : (
        <ExternalLinksWorkbench initialLinks={links} />
      )}
    </AdminPageShell>
  );
}
