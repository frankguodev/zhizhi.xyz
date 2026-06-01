import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi } from "@/lib/admin-auth";
import { deleteSeries, listAdminSeries, listSeriesArticleChoices, updateSeries, validateSeriesArticleIds } from "@/lib/series";

const paramsSchema = z.object({
  id: z.string().min(1).max(160),
});

const seriesSchema = z.object({
  locale: z.literal("zh"),
  title: z.string().trim().min(1).max(120),
  slug: z.string().trim().min(1).max(120).regex(/^[a-z0-9\u4e00-\u9fa5-]+$/),
  description: z.string().trim().min(1).max(800),
  coverImage: z.string().trim().max(500).nullable(),
  status: z.enum(["draft", "published", "archived"]),
  sortOrder: z.number().int().min(0).max(9999),
  articleIds: z.array(z.string().min(1)).max(100),
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

function invalidArticleResponse(validation: Awaited<ReturnType<typeof validateSeriesArticleIds>>) {
  if (validation.ok) {
    return null;
  }

  if (validation.reason === "duplicate") {
    return json({ error: "专题文章不能重复选择。", invalidArticleIds: validation.articleIds }, { status: 400 });
  }

  return json(
    {
      error: "专题只能加入同语言、已发布且未隐藏的文章。",
      invalidArticleIds: validation.articleIds,
    },
    { status: 400 },
  );
}

async function adminSeriesPayload() {
  const [seriesList, articleChoices] = await Promise.all([
    listAdminSeries(),
    listSeriesArticleChoices("zh"),
  ]);
  return { seriesList, articleChoices };
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdminApi();
  if (admin.response) {
    return admin.response;
  }

  const parsedParams = paramsSchema.safeParse(await params);
  if (!parsedParams.success) {
    return json({ error: "专题路径无效。" }, { status: 400 });
  }

  const body = await request.json().catch(() => null);
  const parsedBody = seriesSchema.safeParse(body);
  if (!parsedBody.success) {
    return json({ error: "请填写完整且有效的专题信息，slug 仅支持小写字母、数字、中文和连字符。" }, { status: 400 });
  }

  try {
    const invalidArticles = invalidArticleResponse(await validateSeriesArticleIds(parsedBody.data.locale, parsedBody.data.articleIds));
    if (invalidArticles) {
      return invalidArticles;
    }

    const updated = await updateSeries(parsedParams.data.id, parsedBody.data);

    if (!updated) {
      return json({ error: "专题不存在。" }, { status: 404 });
    }

    return json(await adminSeriesPayload());
  } catch (error) {
    return databaseError(error);
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdminApi();
  if (admin.response) {
    return admin.response;
  }

  const parsedParams = paramsSchema.safeParse(await params);
  if (!parsedParams.success) {
    return json({ error: "专题路径无效。" }, { status: 400 });
  }

  try {
    const deleted = await deleteSeries(parsedParams.data.id);

    if (!deleted) {
      return json({ error: "专题不存在。" }, { status: 404 });
    }

    return json(await adminSeriesPayload());
  } catch (error) {
    return databaseError(error);
  }
}
