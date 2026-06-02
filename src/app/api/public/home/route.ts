import { NextResponse } from "next/server";
import { parsePublicLocale, publicJsonError, publicSuccessHeadersZh } from "@/lib/public-api";
import { getPublicHomePayload } from "@/lib/public-home";

export const dynamic = "force-dynamic";

export async function GET() {
  const locale = parsePublicLocale();

  if (!locale) {
    return publicJsonError("语言参数无效。");
  }

  try {
    const payload = await getPublicHomePayload(locale);
    return NextResponse.json(payload, { headers: publicSuccessHeadersZh });
  } catch {
    return publicJsonError("Home content is temporarily unavailable.", 503);
  }
}
