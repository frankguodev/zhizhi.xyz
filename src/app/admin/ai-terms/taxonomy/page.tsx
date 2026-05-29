import { AdminPageShell } from "@/components/admin/admin-page-shell";
import { AiTermTaxonomyWorkbench } from "@/components/admin/ai-term-taxonomy-workbench";
import { requireAdminPage } from "@/lib/admin-auth";
import { listAdminAiTermTaxonomy } from "@/lib/ai-terms";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "AI 词条分类",
  description: "管理 AI 词条分类，支持重命名、排序、合并和删除未使用项。",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AdminAiTermTaxonomyPage() {
  await requireAdminPage("/admin/ai-terms/taxonomy");
  const taxonomy = await listAdminAiTermTaxonomy().catch(() => []);

  return (
    <AdminPageShell
      active="aiTermsTaxonomy"
      eyebrow="AI 词条库"
      title="词条分类"
      description="管理 AI 词条分类。常见清理动作可以在这里完成：重命名、调整分类排序、合并重复项、删除未使用项。"
    >
      <AiTermTaxonomyWorkbench initialTaxonomy={taxonomy} />
    </AdminPageShell>
  );
}
