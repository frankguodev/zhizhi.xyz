import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi } from "@/lib/admin-auth";
import type { ArticleRecord } from "@/data/articles";
import {
  archivePublishedArticle,
  articleToMarkdown,
  deletePublishedArticle,
  getPublishedArticle,
  restoreArchivedArticle,
  updatePublishedArticle,
} from "@/lib/article-drafts";
import { checkArticleQuality } from "@/lib/article-quality";
import { parseArticleImport } from "@/lib/article-import";
import { listArticleOperationLogs, writeAdminArticleOperationLog } from "@/lib/admin-operation-logs";
import { parseLayeredMarkdown } from "@/lib/markdown";

const paramsSchema = z.object({
  locale: z.enum(["zh", "en"]),
  slug: z.string().min(1),
});

const requestSchema = z.object({
  markdown: z.string().trim().min(1).max(800_000),
});

const patchRequestSchema = z.object({
  action: z.enum(["archive", "restore"]).default("archive"),
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

async function publishedPayload(article: ArticleRecord) {
  const markdown = articleToMarkdown(article);
  const blocks = await parseLayeredMarkdown(article.content, article.locale);
  const quality = checkArticleQuality(article);
  const logs = await listArticleOperationLogs(`article:${article.locale}:${article.slug}`, 12);

  return { article, markdown, blocks, quality, logs };
}

export async function GET(_request: Request, { params }: { params: Promise<{ locale: string; slug: string }> }) {
  const admin = await requireAdminApi();
  if (admin.response) {
    return admin.response;
  }

  const parsed = paramsSchema.safeParse(await params);

  if (!parsed.success) {
    return json({ error: "文章路径无效。" }, { status: 400 });
  }

  try {
    const article = await getPublishedArticle(parsed.data.locale, parsed.data.slug);

    if (!article) {
      return json({ error: "已发布文章不存在。" }, { status: 404 });
    }

    return json(await publishedPayload(article));
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
    return json({ error: "文章路径无效。" }, { status: 400 });
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

  try {
    const previous = await getPublishedArticle(parsedParams.data.locale, parsedParams.data.slug);

    if (!previous) {
      return json({ error: "已发布文章不存在。" }, { status: 404 });
    }

    if (result.article.locale !== parsedParams.data.locale || result.article.slug !== parsedParams.data.slug) {
      return json(
        {
          error: "Frontmatter 中的 locale/slug 与当前文章路径不一致。",
          hint: "为避免公开 URL 意外变更，已发布文章暂不支持在编辑页直接改 slug。",
        },
        { status: 409 },
      );
    }

    await updatePublishedArticle({
      ...result.article,
      viewCount: previous.viewCount,
      publishedAt: previous.publishedAt || result.article.publishedAt,
    });
    const article = await getPublishedArticle(parsedParams.data.locale, parsedParams.data.slug);

    if (!article) {
      return json({ error: "文章更新后未能读取。" }, { status: 500 });
    }

    await writeAdminArticleOperationLog({
      admin: admin.user,
      action: "article_update",
      article: {
        id: `article:${article.locale}:${article.slug}`,
        locale: article.locale,
        slug: article.slug,
        title: article.title,
      },
      details: {
        previousTitle: previous.title,
        warnings: result.warnings,
      },
    });

    return json({ ...(await publishedPayload(article)), importWarnings: result.warnings });
  } catch (error) {
    return databaseError(error);
  }
}

export async function PATCH(_request: Request, { params }: { params: Promise<{ locale: string; slug: string }> }) {
  const admin = await requireAdminApi();
  if (admin.response) {
    return admin.response;
  }

  const parsed = paramsSchema.safeParse(await params);

  if (!parsed.success) {
    return json({ error: "文章路径无效。" }, { status: 400 });
  }

  const body = await _request.json().catch(() => ({}));
  const parsedBody = patchRequestSchema.safeParse(body);

  if (!parsedBody.success) {
    return json({ error: "文章操作无效。" }, { status: 400 });
  }

  try {
    if (parsedBody.data.action === "restore") {
      const article = await restoreArchivedArticle(parsed.data.locale, parsed.data.slug);

      if (!article) {
        return json({ error: "已下架文章不存在，或已经上架。" }, { status: 404 });
      }

      await writeAdminArticleOperationLog({
        admin: admin.user,
        action: "article_restore",
        article: {
          id: article.id,
          locale: article.locale,
          slug: article.slug,
          title: article.title,
        },
        details: {
          previousStatus: "archived",
          previousVisibility: "hidden",
          nextStatus: "published",
          nextVisibility: "public",
        },
      });

      return json({ article });
    }

    const article = await archivePublishedArticle(parsed.data.locale, parsed.data.slug);

    if (!article) {
      return json({ error: "已发布文章不存在，或已经下架。" }, { status: 404 });
    }

    await writeAdminArticleOperationLog({
      admin: admin.user,
      action: "article_archive",
      article: {
        id: article.id,
        locale: article.locale,
        slug: article.slug,
        title: article.title,
      },
      details: {
        previousStatus: article.status,
        previousVisibility: article.visibility,
        nextStatus: "archived",
        nextVisibility: "hidden",
      },
    });

    return json({ article });
  } catch (error) {
    return databaseError(error);
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ locale: string; slug: string }> }) {
  const admin = await requireAdminApi();
  if (admin.response) {
    return admin.response;
  }

  const parsed = paramsSchema.safeParse(await params);

  if (!parsed.success) {
    return json({ error: "文章路径无效。" }, { status: 400 });
  }

  try {
    const article = await deletePublishedArticle(parsed.data.locale, parsed.data.slug);

    if (!article) {
      return json({ error: "已发布文章不存在，或已经不在已发布列表。" }, { status: 404 });
    }

    await writeAdminArticleOperationLog({
      admin: admin.user,
      action: "article_delete",
      article: {
        id: article.id,
        locale: article.locale,
        slug: article.slug,
        title: article.title,
      },
      details: {
        previousStatus: article.status,
        previousVisibility: article.visibility,
        deleteMode: "physical",
      },
    });

    return json({ article });
  } catch (error) {
    return databaseError(error);
  }
}
