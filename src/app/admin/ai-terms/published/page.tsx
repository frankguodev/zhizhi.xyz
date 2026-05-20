import Link from "next/link";
import { FileInput } from "lucide-react";
import { AdminPageShell } from "@/components/admin/admin-page-shell";
import { AiTermsWorkbench } from "@/components/admin/ai-terms-workbench";
import { requireAdminPage } from "@/lib/admin-auth";
import { listAdminAiTerms } from "@/lib/ai-terms";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "已发布 AI 词条",
  description: "查看和管理已发布的 AI 词条。",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AdminPublishedAiTermsPage() {
  await requireAdminPage("/admin/ai-terms/published");
  const aiTerms = await listAdminAiTerms({ status: "published", limit: 100 }).catch(() => []);

  return (
    <AdminPageShell
      active="aiTermsPublished"
      eyebrow="AI 词条库"
      title="已发布 AI 词条"
      description="查看已发布的 AI 词条，调整公开状态、运营分数、排序和人工审核标记。"
      actions={
        <Link href="/admin/ai-terms/import" className="admin-btn admin-btn-primary inline-flex h-11 items-center gap-2 px-4 text-sm font-semibold">
          <FileInput className="h-4 w-4" />
          导入词条
        </Link>
      }
    >
      <AiTermsWorkbench
        initialAiTerms={aiTerms}
        initialFilters={{ status: "published" }}
        emptyMessage="暂无已发布 AI 词条。可以先在草稿页完成审核并发布。"
      />
    </AdminPageShell>
  );
}
