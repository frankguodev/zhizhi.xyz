import { NextResponse } from "next/server";
import { parsePublicLocale, parsePublicSlug, publicJsonError, publicSuccessHeadersZh } from "@/lib/public-api";
import { getPublicSeriesDetailPayload } from "@/lib/public-series-detail";

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const locale = parsePublicLocale();

  if (!locale) {
    return publicJsonError("语言参数无效。");
  }

  const { slug: rawSlug } = await params;
  const slug = parsePublicSlug(rawSlug);

  if (!slug) {
    return publicJsonError("Invalid series slug.");
  }

  try {
    const payload = await getPublicSeriesDetailPayload(locale, slug);

    if (!payload) {
      return publicJsonError("Series not found.", 404);
    }

    return NextResponse.json(payload, { headers: publicSuccessHeadersZh });
  } catch {
    return publicJsonError("Series detail is temporarily unavailable.", 503);
  }
}
