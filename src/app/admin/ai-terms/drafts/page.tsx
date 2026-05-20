import Link from "next/link";
import { FileInput } from "lucide-react";
import { AdminPageShell } from "@/components/admin/admin-page-shell";
import { AiTermsWorkbench } from "@/components/admin/ai-terms-workbench";
import { requireAdminPage } from "@/lib/admin-auth";
import { listAdminAiTerms } from "@/lib/ai-terms";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "AI 词条草稿",
  description: "查看和管理尚未发布的 AI 词条草稿。",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AdminAiTermDraftsPage() {
  await requireAdminPage("/admin/ai-terms/drafts");
  const aiTerms = await listAdminAiTerms({ status: "draft", limit: 100 }).catch(() => []);

  return (
    <AdminPageShell
      active="aiTermsDrafts"
      eyebrow="AI 词条库"
      title="AI 词条草稿"
      description="查看尚未发布的 AI 词条，完成审核后可在这里快速调整为发布状态。"
      actions={
        <Link href="/admin/ai-terms/import" className="admin-btn admin-btn-primary inline-flex h-11 items-center gap-2 px-4 text-sm font-semibold">
          <FileInput className="h-4 w-4" />
          导入词条
        </Link>
      }
    >
      <AiTermsWorkbench
        initialAiTerms={aiTerms}
        initialFilters={{ status: "draft" }}
        emptyMessage="暂无 AI 词条草稿。可以先从右上角导入一份发布稿。"
      />
    </AdminPageShell>
  );
}
