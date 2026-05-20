import { AdminPageShell } from "@/components/admin/admin-page-shell";
import { AiTermImportWorkbench } from "@/components/admin/ai-term-import-workbench";
import { requireAdminPage } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "导入 AI 词条",
  description: "导入 AI 词条 Markdown 发布稿，解析 Frontmatter 并保存到 AI 词条库。",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function ImportAiTermPage() {
  await requireAdminPage("/admin/ai-terms/import");

  return (
    <AdminPageShell
      active="aiTermsImport"
      eyebrow="AI 词条库"
      title="AI 词条导入"
      description="把 AI 词条发布稿粘贴进来，系统会解析 Frontmatter、检查字段映射，并保存为词条草稿。"
    >
      <AiTermImportWorkbench />
    </AdminPageShell>
  );
}
