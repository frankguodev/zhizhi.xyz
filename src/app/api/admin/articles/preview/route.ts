import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi } from "@/lib/admin-auth";
import { checkArticleQuality } from "@/lib/article-quality";
import { parseArticleImport } from "@/lib/article-import";
import { parseLayeredMarkdown } from "@/lib/markdown";

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

  try {
    const result = parseArticleImport(parsed.data.markdown);
    const blocks = await parseLayeredMarkdown(result.article.content, result.article.locale);
    const quality = checkArticleQuality(result.article);

    return json({
      article: result.article,
      blocks,
      quality,
      importWarnings: result.warnings,
      frontmatter: result.frontmatter,
    });
  } catch (error) {
    return json(
      {
        error: error instanceof Error ? error.message : "Markdown 解析失败。",
        hint: "请检查 Frontmatter YAML 缩进、引号、列表格式，以及分层阅读块是否闭合。",
      },
      { status: 400 },
    );
  }
}
