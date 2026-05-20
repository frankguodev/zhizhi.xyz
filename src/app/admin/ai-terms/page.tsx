import Link from "next/link";
import { FileInput } from "lucide-react";
import { AdminPageShell } from "@/components/admin/admin-page-shell";
import { AiTermsWorkbench } from "@/components/admin/ai-terms-workbench";
import { requireAdminPage } from "@/lib/admin-auth";
import { listAdminAiTerms } from "@/lib/ai-terms";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "AI 词条管理",
  description: "管理 AI 词条草稿、发布状态、可见性和运营排序。",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AdminAiTermsPage() {
  await requireAdminPage("/admin/ai-terms");
  const aiTerms = await listAdminAiTerms({ limit: 100 }).catch(() => []);

  return (
    <AdminPageShell
      active="aiTermsAll"
      eyebrow="AI 词条库"
      title="AI 词条管理"
      description="查看和管理已导入的 AI 词条，调整状态、可见性、热度、质量分和排序。"
      actions={
        <Link href="/admin/ai-terms/import" className="admin-btn admin-btn-primary inline-flex h-11 items-center gap-2 px-4 text-sm font-semibold">
          <FileInput className="h-4 w-4" />
          导入词条
        </Link>
      }
    >
      <AiTermsWorkbench initialAiTerms={aiTerms} />
    </AdminPageShell>
  );
}
