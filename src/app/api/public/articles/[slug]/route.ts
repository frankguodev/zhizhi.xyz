import { NextResponse } from "next/server";
import { parsePublicLocale, parsePublicSlug, publicJsonError, publicSuccessHeaders } from "@/lib/public-api";
import { getPublicArticleDetailPayload } from "@/lib/public-article-detail";

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const locale = parsePublicLocale();

  if (!locale) {
    return publicJsonError("Invalid locale. Use zh or en.");
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

    return NextResponse.json(payload, { headers: publicSuccessHeaders(locale) });
  } catch {
    return publicJsonError("Article detail is temporarily unavailable.", 503);
  }
}
