import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi } from "@/lib/admin-auth";
import { listArticleDrafts, saveArticleDraft } from "@/lib/article-drafts";
import { parseArticleImport } from "@/lib/article-import";

const requestSchema = z.object({
  markdown: z.string().trim().min(1).max(800_000),
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
      hint: "如果你在本地 next dev 下看到这个错误，请先创建 D1 数据库并应用 migration，或使用 npm run cf:preview 通过 Wrangler 预览。",
    },
    { status: 503 },
  );
}

export async function GET() {
  const admin = await requireAdminApi();
  if (admin.response) {
    return admin.response;
  }

  try {
    const drafts = await listArticleDrafts();
    return json({ drafts });
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
    return json({ error: "请粘贴一篇 800,000 字符以内的 Markdown 文章。" }, { status: 400 });
  }

  let result: ReturnType<typeof parseArticleImport>;

  try {
    result = parseArticleImport(parsed.data.markdown);
  } catch (error) {
    return json(
      {
        error: error instanceof Error ? error.message : "Markdown 解析失败。",
        hint: "请检查 Frontmatter YAML 缩进、引号、列表格式，以及分层阅读块是否闭合。",
      },
      { status: 400 },
    );
  }

  try {
    const draft = await saveArticleDraft(result.article);

    return json({ draft, importWarnings: result.warnings });
  } catch (error) {
    return databaseError(error);
  }
}
