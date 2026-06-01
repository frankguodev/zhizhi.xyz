import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi } from "@/lib/admin-auth";
import { getArticleDraft, publishArticleDraft } from "@/lib/article-drafts";
import { checkArticleQuality } from "@/lib/article-quality";
import { writeAdminArticleOperationLog } from "@/lib/admin-operation-logs";

const paramsSchema = z.object({
  locale: z.literal("zh"),
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
    return json({ error: "草稿路径无效。" }, { status: 400 });
  }

  try {
    const draft = await getArticleDraft(parsed.data.locale, parsed.data.slug);

    if (!draft) {
      return json({ error: "草稿不存在，或已经发布。" }, { status: 404 });
    }

    const quality = checkArticleQuality(draft);
    const qualityErrors = quality.issues.filter((issue) => issue.level === "error");

    if (qualityErrors.length > 0) {
      return json(
        {
          error: `质量报告还有 ${qualityErrors.length} 个错误，已阻止发布。`,
          hint: qualityErrors.map((issue) => `${issue.title}：${issue.detail}`).join("\n"),
          qualityIssues: qualityErrors,
        },
        { status: 409 },
      );
    }

    const published = await publishArticleDraft(parsed.data.locale, parsed.data.slug);

    if (!published) {
      return json({ error: "草稿不存在，或已经发布。" }, { status: 404 });
    }

    await writeAdminArticleOperationLog({
      admin: admin.user,
      action: "article_publish",
      article: {
        id: published.id,
        locale: published.locale,
        slug: published.slug,
        title: draft.title,
      },
      details: {
        previousStatus: "draft",
        nextStatus: "published",
      },
    });

    const articleUrl = `/articles/${published.slug}`;

    return json({ published, articleUrl });
  } catch (error) {
    return databaseError(error);
  }
}
