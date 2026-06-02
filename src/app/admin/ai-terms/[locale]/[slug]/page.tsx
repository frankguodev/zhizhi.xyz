import { notFound } from "next/navigation";
import { AdminPageShell } from "@/components/admin/admin-page-shell";
import { AiTermEditorWorkbench } from "@/components/admin/ai-term-editor-workbench";
import { requireAdminPage } from "@/lib/admin-auth";
import { listAiTermOperationLogs } from "@/lib/admin-operation-logs";
import { aiTermToMarkdown, getAdminAiTerm } from "@/lib/ai-terms";
import { checkAiTermQuality } from "@/lib/ai-term-quality";
import { buildAiTermBodyDedup, parseAiTermMarkdown, scanAiTermFable } from "@/lib/markdown";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "AI 词条编辑",
  description: "编辑、检查、发布、归档或删除 AI 词条。",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AdminAiTermEditorPage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  await requireAdminPage(`/admin/ai-terms/${locale}/${slug}`);

  if (locale !== "zh") {
    notFound();
  }

  const aiTerm = await getAdminAiTerm(locale, slug).catch(() => null);

  if (!aiTerm) {
    notFound();
  }

  const quality = checkAiTermQuality({
    ...aiTerm,
    contentMd: aiTerm.contentMd,
    categories: aiTerm.categories,
    relations: aiTerm.relations.map((relation) => ({
      slug: relation.slug,
      relationType: relation.relationType,
      description: relation.description,
      sortOrder: relation.sortOrder,
    })),
  });
  const logs = await listAiTermOperationLogs(aiTerm.id, 12).catch(() => []);
  const markdown = aiTermToMarkdown(aiTerm);
  const fable = scanAiTermFable(aiTerm.contentMd);
  const rendered = await parseAiTermMarkdown(aiTerm.contentMd, "zh", buildAiTermBodyDedup(aiTerm));

  return (
    <AdminPageShell
      active="aiTermsAll"
      eyebrow="AI 词条库"
      title={`编辑：${aiTerm.term}`}
      description="编辑 AI 词条 Markdown，检查发布质量，并执行发布、归档、恢复或删除操作。"
    >
      <AiTermEditorWorkbench
        initialData={{ aiTerm, fable, markdown, quality, logs, renderedBlocks: rendered.blocks, renderedFable: rendered.fable }}
      />
    </AdminPageShell>
  );
}
