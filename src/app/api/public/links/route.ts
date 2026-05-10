import { NextResponse } from "next/server";
import { defaultPublicLimit, maxPublicLimit, parsePublicLocale, publicJsonError, publicSuccessHeaders, readUnsignedInteger } from "@/lib/public-api";
import { getPublicLinkListPayload, isPublicExternalLinkPosition, type PublicLinkListInput } from "@/lib/public-link-list";

export const dynamic = "force-dynamic";

type ParseResult = { ok: true; input: PublicLinkListInput } | { ok: false; error: string };

function parseRequest(request: Request): ParseResult {
  const { searchParams } = new URL(request.url);
  const locale = parsePublicLocale(request);

  if (!locale) {
    return { ok: false, error: "Invalid locale. Use zh or en." };
  }

  const positionParam = searchParams.get("position") ?? "";
  if (!isPublicExternalLinkPosition(positionParam)) {
    return { ok: false, error: "Invalid position. Use home, article_footer, or site_footer." };
  }

  const limit = readUnsignedInteger(searchParams, "limit", defaultPublicLimit);

  if (limit === null || limit < 1 || limit > maxPublicLimit) {
    return { ok: false, error: `Invalid limit. Use an integer from 1 to ${maxPublicLimit}.` };
  }

  return {
    ok: true,
    input: {
      locale,
      position: positionParam,
      limit,
    },
  };
}

export async function GET(request: Request) {
  const parsed = parseRequest(request);

  if (!parsed.ok) {
    return publicJsonError(parsed.error);
  }

  try {
    const payload = await getPublicLinkListPayload(parsed.input);
    return NextResponse.json(payload, { headers: publicSuccessHeaders(parsed.input.locale) });
  } catch {
    return publicJsonError("External links are temporarily unavailable.", 503);
  }
}
