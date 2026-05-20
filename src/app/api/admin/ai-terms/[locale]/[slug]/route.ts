import { NextResponse } from "next/server";
import { z } from "zod";
import {
  aiTermToMarkdown,
  applyAiTermAdminAction,
  deleteAiTerm,
  getAdminAiTerm,
  updateAiTermFromMarkdown,
} from "@/lib/ai-terms";
import { checkAiTermQuality } from "@/lib/ai-term-quality";
import { parseAiTermImport } from "@/lib/ai-term-import";
import { listAiTermOperationLogs, writeAdminAiTermOperationLog } from "@/lib/admin-operation-logs";
import { requireAdminApi } from "@/lib/admin-auth";

const paramsSchema = z.object({
  locale: z.enum(["zh", "en"]),
  slug: z.string().min(1),
});

const requestSchema = z.object({
  markdown: z.string().trim().min(1).max(800_000),
});

const patchRequestSchema = z.object({
  action: z.enum(["archive", "restore", "publish"]),
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

async function parseParams(params: Promise<{ locale: string; slug: string }>) {
  return paramsSchema.safeParse(await params);
}

export async function GET(_request: Request, { params }: { params: Promise<{ locale: string; slug: string }> }) {
  const admin = await requireAdminApi();
  if (admin.response) {
    return admin.response;
  }

  const parsed = await parseParams(params);

  if (!parsed.success) {
    return json({ error: "AI 词条路径无效。" }, { status: 400 });
  }

  try {
    const aiTerm = await getAdminAiTerm(parsed.data.locale, parsed.data.slug);

    if (!aiTerm) {
      return json({ error: "AI 词条不存在。" }, { status: 404 });
    }

    const quality = checkAiTermQuality({
      ...aiTerm,
      contentMd: aiTerm.contentMd,
      categories: aiTerm.categories,
      tags: aiTerm.tags,
      relations: aiTerm.relations.map((relation) => ({
        slug: relation.slug,
        relationType: relation.relationType,
        description: relation.description,
        sortOrder: relation.sortOrder,
      })),
    });

    const logs = await listAiTermOperationLogs(aiTerm.id, 12);

    return json({ aiTerm, markdown: aiTermToMarkdown(aiTerm), quality, logs });
  } catch (error) {
    return databaseError(error);
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ locale: string; slug: string }> }) {
  const admin = await requireAdminApi();
  if (admin.response) {
    return admin.response;
  }

  const parsedParams = await parseParams(params);

  if (!parsedParams.success) {
    return json({ error: "AI 词条路径无效。" }, { status: 400 });
  }

  const body = await request.json().catch(() => null);
  const parsedBody = requestSchema.safeParse(body);

  if (!parsedBody.success) {
    return json({ error: "请提交 800,000 字符以内的 AI 词条 Markdown 内容。" }, { status: 400 });
  }

  let preview: ReturnType<typeof parseAiTermImport>;

  try {
    preview = parseAiTermImport(parsedBody.data.markdown);
  } catch (error) {
    return json(
      {
        error: error instanceof Error ? error.message : "AI 词条 Markdown 解析失败。",
        hint: "请检查 Frontmatter YAML 缩进、引号、数组、relations/categories/tags 格式，以及正文是否保留了一级标题。",
      },
      { status: 400 },
    );
  }

  try {
    const quality = checkAiTermQuality(preview.aiTerm);
    const result = await updateAiTermFromMarkdown(parsedParams.data.locale, parsedParams.data.slug, parsedBody.data.markdown);

    if ("error" in result) {
      return json({ error: result.error, hint: result.hint }, { status: result.status });
    }

    if (!result.aiTerm) {
      return json({ error: "AI 词条保存后未能读取。" }, { status: 500 });
    }

    await writeAdminAiTermOperationLog({
      admin: admin.user,
      action: "ai_term_update",
      aiTerm: {
        id: result.aiTerm.id,
        locale: result.aiTerm.locale,
        slug: result.aiTerm.slug,
        term: result.aiTerm.term,
      },
      details: {
        warnings: result.importWarnings,
      },
    });

    const logs = await listAiTermOperationLogs(result.aiTerm.id, 12);

    return json({ ...result, quality, logs });
  } catch (error) {
    return databaseError(error);
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ locale: string; slug: string }> }) {
  const admin = await requireAdminApi();
  if (admin.response) {
    return admin.response;
  }

  const parsedParams = await parseParams(params);

  if (!parsedParams.success) {
    return json({ error: "AI 词条路径无效。" }, { status: 400 });
  }

  const body = await request.json().catch(() => ({}));
  const parsedBody = patchRequestSchema.safeParse(body);

  if (!parsedBody.success) {
    return json({ error: "AI 词条操作无效。" }, { status: 400 });
  }

  try {
    if (parsedBody.data.action === "publish") {
      const existing = await getAdminAiTerm(parsedParams.data.locale, parsedParams.data.slug);

      if (!existing) {
        return json({ error: "AI 词条不存在。" }, { status: 404 });
      }

      const quality = checkAiTermQuality({
        ...existing,
        contentMd: existing.contentMd,
        categories: existing.categories,
        tags: existing.tags,
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
    }

    const previous = await getAdminAiTerm(parsedParams.data.locale, parsedParams.data.slug);

    if (!previous) {
      return json({ error: "AI 词条不存在。" }, { status: 404 });
    }

    const result = await applyAiTermAdminAction(parsedParams.data.locale, parsedParams.data.slug, parsedBody.data.action);

    if (!result) {
      return json({ error: "AI 词条不存在。" }, { status: 404 });
    }

    const aiTerm = await getAdminAiTerm(parsedParams.data.locale, parsedParams.data.slug);
    await writeAdminAiTermOperationLog({
      admin: admin.user,
      action:
        parsedBody.data.action === "publish"
          ? "ai_term_publish"
          : parsedBody.data.action === "restore"
            ? "ai_term_restore"
            : "ai_term_archive",
      aiTerm: {
        id: previous.id,
        locale: previous.locale,
        slug: previous.slug,
        term: previous.term,
      },
      details: {
        previousStatus: previous.status,
        previousVisibility: previous.visibility,
        nextStatus: result.status,
        nextVisibility: result.visibility,
      },
    });
    return json({ aiTerm, action: parsedBody.data.action });
  } catch (error) {
    return databaseError(error);
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ locale: string; slug: string }> }) {
  const admin = await requireAdminApi();
  if (admin.response) {
    return admin.response;
  }

  const parsed = await parseParams(params);

  if (!parsed.success) {
    return json({ error: "AI 词条路径无效。" }, { status: 400 });
  }

  try {
    const aiTerm = await deleteAiTerm(parsed.data.locale, parsed.data.slug);

    if (!aiTerm) {
      return json({ error: "AI 词条不存在。" }, { status: 404 });
    }

    await writeAdminAiTermOperationLog({
      admin: admin.user,
      action: "ai_term_delete",
      aiTerm: {
        id: aiTerm.id,
        locale: aiTerm.locale,
        slug: aiTerm.slug,
        term: aiTerm.term,
      },
      details: {
        previousStatus: aiTerm.status,
        previousVisibility: aiTerm.visibility,
        deleteMode: "physical",
      },
    });

    return json({ aiTerm });
  } catch (error) {
    return databaseError(error);
  }
}
