import { NextResponse } from "next/server";
import { parsePublicLocale, parsePublicSlug, publicJsonError, publicSuccessHeaders } from "@/lib/public-api";
import { getPublicSeriesDetailPayload } from "@/lib/public-series-detail";

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const locale = parsePublicLocale();

  if (!locale) {
    return publicJsonError("Invalid locale. Use zh or en.");
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

    return NextResponse.json(payload, { headers: publicSuccessHeaders(locale) });
  } catch {
    return publicJsonError("Series detail is temporarily unavailable.", 503);
  }
}
