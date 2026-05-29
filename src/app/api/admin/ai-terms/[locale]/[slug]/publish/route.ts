import { NextResponse } from "next/server";
import { z } from "zod";
import { applyAiTermAdminAction, getAdminAiTerm } from "@/lib/ai-terms";
import { checkAiTermQuality } from "@/lib/ai-term-quality";
import { writeAdminAiTermOperationLog } from "@/lib/admin-operation-logs";
import { requireAdminApi } from "@/lib/admin-auth";

const paramsSchema = z.object({
  locale: z.enum(["zh", "en"]),
  slug: z.string().min(1),
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

  return json(
    {
      error: message,
      hint: "请确认本地 D1 已应用 migration，或使用 npm run cf:preview 通过 Wrangler 预览。",
    },
    { status: 503 },
  );
}

export async function POST(_request: Request, { params }: { params: Promise<{ locale: string; slug: string }> }) {
  const admin = await requireAdminApi();
  if (admin.response) {
    return admin.response;
  }

  const parsed = paramsSchema.safeParse(await params);

  if (!parsed.success) {
    return json({ error: "AI 词条路径无效。" }, { status: 400 });
  }

  try {
    const existing = await getAdminAiTerm(parsed.data.locale, parsed.data.slug);

    if (!existing) {
      return json({ error: "AI 词条不存在。" }, { status: 404 });
    }

    const quality = checkAiTermQuality({
      ...existing,
      contentMd: existing.contentMd,
      categories: existing.categories,
      relations: existing.relations.map((relation) => ({
        slug: relation.slug,
        relationType: relation.relationType,
        description: relation.description,
        sortOrder: relation.sortOrder,
      })),
    });
    const qualityErrors = quality.issues.filter((issue) => issue.level === "error");

    if (qualityErrors.length > 0) {
      return json(
        {
          error: `质量报告还有 ${qualityErrors.length} 个错误，已阻止发布。`,
          hint: qualityErrors.map((issue) => `${issue.title}：${issue.detail}`).join("\n"),
          quality,
        },
        { status: 409 },
      );
    }

    const result = await applyAiTermAdminAction(parsed.data.locale, parsed.data.slug, "publish");

    if (!result) {
      return json({ error: "AI 词条不存在。" }, { status: 404 });
    }

    const aiTerm = await getAdminAiTerm(parsed.data.locale, parsed.data.slug);
    await writeAdminAiTermOperationLog({
      admin: admin.user,
      action: "ai_term_publish",
      aiTerm: {
        id: existing.id,
        locale: existing.locale,
        slug: existing.slug,
        term: existing.term,
      },
      details: {
        previousStatus: existing.status,
        previousVisibility: existing.visibility,
        nextStatus: result.status,
        nextVisibility: result.visibility,
      },
    });
    const aiTermUrl = parsed.data.locale === "en" ? `/en/ai-terms/${parsed.data.slug}` : `/ai-terms/${parsed.data.slug}`;

    return json({ aiTerm, aiTermUrl });
  } catch (error) {
    return databaseError(error);
  }
}
