import { NextResponse } from "next/server";
import { z } from "zod";
import { parseAiTermImport } from "@/lib/ai-term-import";
import { checkAiTermQuality } from "@/lib/ai-term-quality";
import { getAdminAiTermById, listAdminAiTerms, saveAiTerm, updateAiTermAdminFields } from "@/lib/ai-terms";
import { writeAdminAiTermOperationLog } from "@/lib/admin-operation-logs";
import { requireAdminApi } from "@/lib/admin-auth";

const requestSchema = z.object({
  markdown: z.string().trim().min(1).max(800_000),
});

const updateSchema = z.object({
  id: z.string().min(1),
  status: z.enum(["draft", "published", "archived"]).optional(),
  visibility: z.enum(["public", "login", "hidden"]).optional(),
  heatScore: z.number().int().min(0).max(100).optional(),
  qualityScore: z.number().int().min(0).max(100).optional(),
  trending: z.boolean().optional(),
  sortOrder: z.number().int().min(0).max(9999).optional(),
  humanReviewed: z.boolean().optional(),
  listLocale: z.enum(["all", "zh", "en"]).optional(),
  listStatus: z.enum(["all", "draft", "published", "archived"]).optional(),
  listVisibility: z.enum(["all", "public", "login", "hidden"]).optional(),
  listQ: z.string().max(200).optional(),
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
      hint: "如果你在本地 next dev 下看到这个错误，请先应用 D1 migration，或使用 npm run cf:preview 通过 Wrangler 预览。",
    },
    { status: 503 },
  );
}

export async function GET(request: Request) {
  const admin = await requireAdminApi();
  if (admin.response) {
    return admin.response;
  }

  const url = new URL(request.url);
  const locale = url.searchParams.get("locale") || "all";
  const status = url.searchParams.get("status") || "all";
  const visibility = url.searchParams.get("visibility") || "all";
  const q = url.searchParams.get("q") || "";

  try {
    const aiTerms = await listAdminAiTerms({
      locale: locale === "zh" || locale === "en" ? locale : "all",
      status: status === "draft" || status === "published" || status === "archived" ? status : "all",
      visibility: visibility === "public" || visibility === "login" || visibility === "hidden" ? visibility : "all",
      q,
      limit: 100,
    });

    return json({ aiTerms });
  } catch (error) {
    return databaseError(error);
  }
}

export async function POST(request: Request) {
  const admin = await requireAdminApi();
  if (admin.response) {
    return admin.response;
  }

  const body = await request.json().catch(() => null);
  const parsed = requestSchema.safeParse(body);

  if (!parsed.success) {
    return json({ error: "请粘贴一份 800,000 字符以内的 AI 词条 Markdown 发布稿。" }, { status: 400 });
  }

  let result: ReturnType<typeof parseAiTermImport>;

  try {
    result = parseAiTermImport(parsed.data.markdown);
  } catch (error) {
    return json(
      {
        error: error instanceof Error ? error.message : "AI 词条 Markdown 解析失败。",
        hint: "请检查 Frontmatter YAML 缩进、引号、数组、relations/categories 格式，以及正文是否保留了一级标题。",
      },
      { status: 400 },
    );
  }

  try {
    const aiTerm = await saveAiTerm(result.aiTerm);
    await writeAdminAiTermOperationLog({
      admin: admin.user,
      action: "ai_term_import",
      aiTerm: {
        id: aiTerm.id,
        locale: aiTerm.locale,
        slug: aiTerm.slug,
        term: result.aiTerm.term,
      },
      details: {
        warnings: result.warnings,
        skippedRelations: aiTerm.skippedRelations,
      },
    });

    return json({
      aiTerm,
      importWarnings: [
        ...result.warnings,
        ...aiTerm.skippedRelations.map((relation) =>
          relation.reason === "self"
            ? `关联词条 ${relation.slug} 指向自身，已跳过。`
            : `关联词条 ${relation.slug} 未匹配到已存在词条，MVP 阶段已跳过。`,
        ),
      ],
    });
  } catch (error) {
    return databaseError(error);
  }
}

export async function PATCH(request: Request) {
  const admin = await requireAdminApi();
  if (admin.response) {
    return admin.response;
  }

  const body = await request.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);

  if (!parsed.success) {
    return json({ error: "请提供有效的词条更新字段。" }, { status: 400 });
  }

  try {
    const previous = await getAdminAiTermById(parsed.data.id);

    if (!previous) {
      return json({ error: "未找到要更新的 AI 词条。" }, { status: 404 });
    }

    if (parsed.data.status === "published") {
      const quality = checkAiTermQuality({
        ...previous,
        contentMd: previous.contentMd,
        categories: previous.categories,
        relations: previous.relations.map((relation) => ({
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
    }

    const aiTerm = await updateAiTermAdminFields(parsed.data);

    if (!aiTerm) {
      return json({ error: "未找到要更新的 AI 词条。" }, { status: 404 });
    }

    await writeAdminAiTermOperationLog({
      admin: admin.user,
      action: parsed.data.status === "published" ? "ai_term_publish" : "ai_term_update",
      aiTerm: {
        id: previous.id,
        locale: previous.locale,
        slug: previous.slug,
        term: previous.term,
      },
      details: {
        previousStatus: previous.status,
        nextStatus: parsed.data.status ?? previous.status,
        previousVisibility: previous.visibility,
        nextVisibility: parsed.data.visibility ?? previous.visibility,
        quickEdit: true,
      },
    });

    const aiTerms = await listAdminAiTerms({
      locale: parsed.data.listLocale ?? "all",
      status: parsed.data.listStatus ?? "all",
      visibility: parsed.data.listVisibility ?? "all",
      q: parsed.data.listQ ?? "",
      limit: 100,
    });
    return json({ aiTerm, aiTerms });
  } catch (error) {
    return databaseError(error);
  }
}
