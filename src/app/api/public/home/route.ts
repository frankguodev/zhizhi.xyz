import { NextResponse } from "next/server";
import { parsePublicLocale, publicJsonError, publicSuccessHeaders } from "@/lib/public-api";
import { getPublicHomePayload } from "@/lib/public-home";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const locale = parsePublicLocale(request);

  if (!locale) {
    return publicJsonError("Invalid locale. Use zh or en.");
  }

  try {
    const payload = await getPublicHomePayload(locale);
    return NextResponse.json(payload, { headers: publicSuccessHeaders(locale) });
  } catch {
    return publicJsonError("Home content is temporarily unavailable.", 503);
  }
}
