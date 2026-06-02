import { NextResponse } from "next/server";
import { parsePublicLocale, parsePublicSlug, publicJsonError, publicSuccessHeadersZh } from "@/lib/public-api";
import { getPublicArticleDetailPayload } from "@/lib/public-article-detail";

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const locale = parsePublicLocale();

  if (!locale) {
    return publicJsonError("语言参数无效。");
  }

  const { slug: rawSlug } = await params;
  const slug = parsePublicSlug(rawSlug);

  if (!slug) {
    return publicJsonError("Invalid article slug.");
  }

  try {
    const payload = await getPublicArticleDetailPayload(locale, slug);

    if (!payload) {
      return publicJsonError("Article not found.", 404);
    }

    return NextResponse.json(payload, { headers: publicSuccessHeadersZh });
  } catch {
    return publicJsonError("Article detail is temporarily unavailable.", 503);
  }
}
