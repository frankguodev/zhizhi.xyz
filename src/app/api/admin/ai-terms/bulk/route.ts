import { NextResponse } from "next/server";
import { z } from "zod";
import { bulkApplyAiTermAction, getAdminAiTermById, listAdminAiTerms } from "@/lib/ai-terms";
import { checkAiTermQuality } from "@/lib/ai-term-quality";
import { writeAdminAiTermOperationLog } from "@/lib/admin-operation-logs";
import { requireAdminApi } from "@/lib/admin-auth";

const requestSchema = z.object({
  ids: z.array(z.string().min(1)).min(1).max(100),
  action: z.enum(["publish", "archive", "restore", "delete", "markReviewed", "unmarkReviewed", "setTrending", "unsetTrending"]),
});

const noStoreHeaders = {
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
};

function json(data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, {
    ...init,
    headers: {
      ...noStoreHeaders,
      ...init?.headers,
    },
  });
}

function databaseError(error: unknown) {
  const message = error instanceof Error ? error.message : "数据库操作失败";
  return json({ error: message, hint: "请确认本地 D1 已应用 migration，或使用 npm run cf:preview 通过 Wrangler 预览。" }, { status: 503 });
}

export async function POST(request: Request) {
  const admin = await requireAdminApi();
  if (admin.response) return admin.response;

  const body = await request.json().catch(() => null);
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) return json({ error: "请提供 1-100 个词条和有效批量操作。" }, { status: 400 });

  try {
    if (parsed.data.action === "publish") {
      const blocked: string[] = [];
      for (const id of parsed.data.ids) {
        const aiTerm = await getAdminAiTermById(id);
        if (!aiTerm) continue;
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
        if (quality.errorCount > 0) blocked.push(`${aiTerm.term}：${quality.errorCount} 个错误`);
      }

      if (blocked.length > 0) {
        return json({ error: "部分词条质量检查未通过，已阻止批量发布。", hint: blocked.join("\n") }, { status: 409 });
      }
    }

    const results = await bulkApplyAiTermAction(parsed.data.ids, parsed.data.action);
    for (const result of results) {
      if (!result.ok || !result.aiTerm) continue;
      const actionMap = {
        publish: "ai_term_publish",
        archive: "ai_term_archive",
        restore: "ai_term_restore",
        delete: "ai_term_delete",
        markReviewed: "ai_term_update",
        unmarkReviewed: "ai_term_update",
        setTrending: "ai_term_update",
        unsetTrending: "ai_term_update",
      } as const;
      await writeAdminAiTermOperationLog({
        admin: admin.user,
        action: actionMap[parsed.data.action],
        aiTerm: {
          id: result.aiTerm.id,
          locale: result.aiTerm.locale,
          slug: result.aiTerm.slug,
          term: result.aiTerm.term,
        },
        details: { bulk: true, action: parsed.data.action },
      });
    }

    const aiTerms = await listAdminAiTerms({ limit: 100 });
    return json({ results, aiTerms });
  } catch (error) {
    return databaseError(error);
  }
}
