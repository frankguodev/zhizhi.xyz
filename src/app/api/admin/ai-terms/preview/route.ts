import { NextResponse } from "next/server";
import { z } from "zod";
import { parseAiTermImport } from "@/lib/ai-term-import";
import { checkAiTermQuality } from "@/lib/ai-term-quality";
import { requireAdminApi } from "@/lib/admin-auth";
import { parseAiTermMarkdown, scanAiTermFable } from "@/lib/markdown";

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
    return json({ error: "请粘贴一份 800,000 字符以内的 AI 词条 Markdown 发布稿。" }, { status: 400 });
  }

  try {
    const result = parseAiTermImport(parsed.data.markdown);
    const quality = checkAiTermQuality(result.aiTerm);
    const fable = scanAiTermFable(result.aiTerm.contentMd, result.aiTerm.locale);
    const rendered = await parseAiTermMarkdown(result.aiTerm.contentMd, result.aiTerm.locale);

    return json({
      aiTerm: result.aiTerm,
      fable,
      importWarnings: result.warnings,
      frontmatter: result.frontmatter,
      quality,
      renderedBlocks: rendered.blocks,
      renderedFable: rendered.fable,
    });
  } catch (error) {
    return json(
      {
        error: error instanceof Error ? error.message : "AI 词条 Markdown 解析失败。",
        hint: "请检查 Frontmatter YAML 缩进、引号、数组、relations/categories 格式，以及正文是否保留了一级标题。",
      },
      { status: 400 },
    );
  }
}
