import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ArticleLikeRateLimitError, getArticleLikeState, toggleArticleLike } from "@/lib/article-likes";
import { canReadFullArticle } from "@/lib/article-access";
import { parsePublicLocale, parsePublicSlug, publicJsonError } from "@/lib/public-api";
import { getPublicArticle } from "@/lib/public-articles";

export const dynamic = "force-dynamic";

const anonymousLikeCookieName = "zz_like_device";
const anonymousLikeCookieMaxAgeSeconds = 60 * 60 * 24 * 400;
const anonymousIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const noStoreHeaders = {
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
};
const publicViewer = { isAuthenticated: false, user: null };

function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: anonymousLikeCookieMaxAgeSeconds,
  };
}

async function getAnonymousLikeId() {
  const cookieStore = await cookies();
  const currentId = cookieStore.get(anonymousLikeCookieName)?.value;

  if (currentId && anonymousIdPattern.test(currentId)) {
    return { id: currentId, shouldSetCookie: false };
  }

  return { id: crypto.randomUUID(), shouldSetCookie: true };
}

function successJson(payload: { liked: boolean; count: number }, anonymousId: string, shouldSetCookie: boolean) {
  const response = NextResponse.json(payload, { headers: noStoreHeaders });

  if (shouldSetCookie) {
    response.cookies.set(anonymousLikeCookieName, anonymousId, cookieOptions());
  }

  return response;
}

function isSameOriginMutation(request: Request) {
  const fetchSite = request.headers.get("sec-fetch-site");

  if (fetchSite === "cross-site") {
    return false;
  }

  if (fetchSite === "same-origin") {
    return true;
  }

  const origin = request.headers.get("origin");

  if (!origin) {
    return true;
  }

  try {
    const originUrl = new URL(origin);
    const requestUrl = new URL(request.url);

    if (originUrl.origin === requestUrl.origin) {
      return true;
    }

    const forwardedHost = request.headers.get("x-forwarded-host");
    const forwardedProto = request.headers.get("x-forwarded-proto") ?? requestUrl.protocol.replace(":", "");
    const host = forwardedHost ?? request.headers.get("host");

    return Boolean(host && originUrl.origin === `${forwardedProto}://${host}`);
  } catch {
    return false;
  }
}

async function parseArticleRequest(rawSlug: string) {
  const locale = parsePublicLocale();

  if (!locale) {
    return { ok: false as const, response: publicJsonError("Invalid locale. Use zh or en.") };
  }

  const slug = parsePublicSlug(rawSlug);

  if (!slug) {
    return { ok: false as const, response: publicJsonError("Invalid article slug.") };
  }

  const article = await getPublicArticle(slug, locale);

  if (!article || !canReadFullArticle(article, publicViewer)) {
    return { ok: false as const, response: publicJsonError("Article not found.", 404) };
  }

  return { ok: true as const, locale, slug };
}

function databaseError() {
  return NextResponse.json(
    {
      error: "Article likes are temporarily unavailable.",
      hint: "请确认 D1 已应用 article_likes migration，并在 Cloudflare preview/Worker 环境下验证。",
    },
    { status: 503, headers: noStoreHeaders },
  );
}

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug: rawSlug } = await params;
  const parsed = await parseArticleRequest(rawSlug);

  if (!parsed.ok) {
    return parsed.response;
  }

  const anonymous = await getAnonymousLikeId();

  try {
    const payload = await getArticleLikeState(parsed.locale, parsed.slug, anonymous.id);
    return successJson(payload, anonymous.id, anonymous.shouldSetCookie);
  } catch {
    return databaseError();
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  if (!isSameOriginMutation(request)) {
    return NextResponse.json({ error: "Cross-site like requests are not allowed." }, { status: 403, headers: noStoreHeaders });
  }

  const { slug: rawSlug } = await params;
  const parsed = await parseArticleRequest(rawSlug);

  if (!parsed.ok) {
    return parsed.response;
  }

  const anonymous = await getAnonymousLikeId();

  try {
    const payload = await toggleArticleLike(parsed.locale, parsed.slug, anonymous.id);
    return successJson(payload, anonymous.id, anonymous.shouldSetCookie);
  } catch (error) {
    if (error instanceof ArticleLikeRateLimitError) {
      return NextResponse.json({ error: "Please wait before changing this like again." }, { status: 429, headers: noStoreHeaders });
    }

    return databaseError();
  }
}
