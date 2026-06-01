import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi } from "@/lib/admin-auth";
import type { ArticleRecord } from "@/data/articles";
import { articleToMarkdown, getArticleDraft, saveArticleDraft } from "@/lib/article-drafts";
import { checkArticleQuality } from "@/lib/article-quality";
import { parseArticleImport } from "@/lib/article-import";
import { parseLayeredMarkdown } from "@/lib/markdown";

const paramsSchema = z.object({
  locale: z.literal("zh"),
  slug: z.string().min(1),
});

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
      hint: "请确认本地 D1 已应用 migration，或使用 npm run cf:preview 通过 Wrangler 预览。",
    },
    { status: 503 },
  );
}

async function draftPayload(article: ArticleRecord) {
  const markdown = articleToMarkdown(article);
  const blocks = await parseLayeredMarkdown(article.content, article.locale);
  const quality = checkArticleQuality(article);

  return { article, markdown, blocks, quality };
}

export async function GET(_request: Request, { params }: { params: Promise<{ locale: string; slug: string }> }) {
  const admin = await requireAdminApi();
  if (admin.response) {
    return admin.response;
  }

  const parsed = paramsSchema.safeParse(await params);

  if (!parsed.success) {
    return json({ error: "草稿路径无效。" }, { status: 400 });
  }

  try {
    const article = await getArticleDraft(parsed.data.locale, parsed.data.slug);

    if (!article) {
      return json({ error: "草稿不存在。" }, { status: 404 });
    }

    return json(await draftPayload(article));
  } catch (error) {
    return databaseError(error);
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ locale: string; slug: string }> }) {
  const admin = await requireAdminApi();
  if (admin.response) {
    return admin.response;
  }

  const parsedParams = paramsSchema.safeParse(await params);

  if (!parsedParams.success) {
    return json({ error: "草稿路径无效。" }, { status: 400 });
  }

  const body = await request.json().catch(() => null);
  const parsedBody = requestSchema.safeParse(body);

  if (!parsedBody.success) {
    return json({ error: "请提交 800,000 字符以内的 Markdown 内容。" }, { status: 400 });
  }

  let result: ReturnType<typeof parseArticleImport>;

  try {
    result = parseArticleImport(parsedBody.data.markdown);
  } catch (error) {
    return json(
      {
        error: error instanceof Error ? error.message : "Markdown 解析失败。",
        hint: "请检查 Frontmatter YAML 缩进、引号、列表格式，以及分层阅读块是否闭合。",
      },
      { status: 400 },
    );
  }

  if (result.article.locale !== parsedParams.data.locale || result.article.slug !== parsedParams.data.slug) {
    return json(
      {
        error: "Frontmatter 中的 locale/slug 与当前草稿路径不一致。",
        hint: "如果想改 slug，后续会提供重命名流程；当前编辑页先保持路径稳定。",
      },
      { status: 409 },
    );
  }

  try {
    await saveArticleDraft(result.article);
    const article = await getArticleDraft(parsedParams.data.locale, parsedParams.data.slug);

    if (!article) {
      return json({ error: "草稿保存后未能读取。" }, { status: 500 });
    }

    return json({ ...(await draftPayload(article)), importWarnings: result.warnings });
  } catch (error) {
    return databaseError(error);
  }
}
