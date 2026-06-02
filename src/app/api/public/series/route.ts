import { NextResponse } from "next/server";
import { defaultPublicLimit, maxPublicLimit, parsePublicLocale, publicJsonError, publicSuccessHeadersZh, readUnsignedInteger } from "@/lib/public-api";
import { getPublicSeriesListPayload, type PublicSeriesListInput, type PublicSeriesSort } from "@/lib/public-series-list";

export const dynamic = "force-dynamic";

const allowedSorts = new Set<PublicSeriesSort>(["default", "updated"]);

type ParseResult = { ok: true; input: PublicSeriesListInput } | { ok: false; error: string };

function parseRequest(request: Request): ParseResult {
  const { searchParams } = new URL(request.url);
  const locale = parsePublicLocale();

  if (!locale) {
    return { ok: false, error: "语言参数无效。" };
  }

  const sortParam = searchParams.get("sort") ?? "default";
  if (!allowedSorts.has(sortParam as PublicSeriesSort)) {
    return { ok: false, error: "Invalid sort. Use default or updated." };
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
      sort: sortParam as PublicSeriesSort,
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
    const payload = await getPublicSeriesListPayload(parsed.input);
    return NextResponse.json(payload, { headers: publicSuccessHeadersZh });
  } catch {
    return publicJsonError("Series list is temporarily unavailable.", 503);
  }
}
