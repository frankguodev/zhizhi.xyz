import { NextResponse } from "next/server";
import {
  defaultPublicLimit,
  maxPublicLimit,
  parsePublicLocale,
  publicJsonError,
  publicSuccessHeaders,
  readBoundedText,
  readUnsignedInteger,
} from "@/lib/public-api";
import { getPublicArticleListPayload, type PublicArticleListInput, type PublicArticleSort } from "@/lib/public-article-list";

export const dynamic = "force-dynamic";

const allowedSorts = new Set<PublicArticleSort>(["popular", "latest", "updated"]);

type ParseResult = { ok: true; input: PublicArticleListInput } | { ok: false; error: string };

function parseRequest(request: Request): ParseResult {
  const { searchParams } = new URL(request.url);
  const locale = parsePublicLocale(request);

  if (!locale) {
    return { ok: false, error: "Invalid locale. Use zh or en." };
  }

  const sortParam = searchParams.get("sort") ?? "popular";
  if (!allowedSorts.has(sortParam as PublicArticleSort)) {
    return { ok: false, error: "Invalid sort. Use popular, latest, or updated." };
  }

  const limit = readUnsignedInteger(searchParams, "limit", defaultPublicLimit);
  const offset = readUnsignedInteger(searchParams, "offset", 0);

  if (limit === null || limit < 1 || limit > maxPublicLimit) {
    return { ok: false, error: `Invalid limit. Use an integer from 1 to ${maxPublicLimit}.` };
  }

  if (offset === null) {
    return { ok: false, error: "Invalid offset. Use a non-negative integer." };
  }

  return {
    ok: true,
    input: {
      locale,
      sort: sortParam as PublicArticleSort,
      q: readBoundedText(searchParams, "q"),
      category: readBoundedText(searchParams, "category"),
      tag: readBoundedText(searchParams, "tag"),
      limit,
      offset,
    },
  };
}

export async function GET(request: Request) {
  const parsed = parseRequest(request);

  if (!parsed.ok) {
    return publicJsonError(parsed.error);
  }

  try {
    const payload = await getPublicArticleListPayload(parsed.input);
    return NextResponse.json(payload, { headers: publicSuccessHeaders(parsed.input.locale) });
  } catch {
    return publicJsonError("Article list is temporarily unavailable.", 503);
  }
}
