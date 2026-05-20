import { AdminPageShell } from "@/components/admin/admin-page-shell";
import { MarkdownImportWorkbench } from "@/components/admin/markdown-import-workbench";
import { requireAdminPage } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "导入 Markdown",
  description: "从 Obsidian final.md 导入文章，解析 Frontmatter，预览内容并运行发布前质量检查。",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function ImportArticlePage() {
  await requireAdminPage("/admin/articles/import");
  return (
    <AdminPageShell
      active="articleImport"
      eyebrow="导入工作台"
      title="Markdown 导入"
      description="把 Obsidian 里的 final.md 粘贴进来，系统会解析 Frontmatter、生成文章预览，并运行发布前质量检查。"
    >
      <MarkdownImportWorkbench />
    </AdminPageShell>
  );
}
