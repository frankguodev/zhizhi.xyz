import { NextResponse } from "next/server";
import { ArticleLikeRateLimitError, getArticleLikeState, toggleArticleLike } from "@/lib/article-likes";
import { canReadFullArticle } from "@/lib/article-access";
import { type AnonymousDevice, getAnonymousDeviceId, isSameOriginMutation, noStoreHeaders, withAnonymousDeviceCookie } from "@/lib/anonymous-device";
import { parsePublicLocale, parsePublicSlug, publicJsonError } from "@/lib/public-api";
import { getPublicArticle } from "@/lib/public-articles";

export const dynamic = "force-dynamic";

const anonymousLikeCookieName = "zz_like_device";
const publicViewer = { isAuthenticated: false, user: null };

function successJson(payload: { liked: boolean; count: number }, device: AnonymousDevice) {
  return withAnonymousDeviceCookie(NextResponse.json(payload, { headers: noStoreHeaders }), anonymousLikeCookieName, device);
}

async function parseArticleRequest(rawSlug: string) {
  const locale = parsePublicLocale();

  if (!locale) {
    return { ok: false as const, response: publicJsonError("语言参数无效。") };
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

  const anonymous = await getAnonymousDeviceId(anonymousLikeCookieName);

  try {
    const payload = await getArticleLikeState(parsed.locale, parsed.slug, anonymous.id);
    return successJson(payload, anonymous);
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

  const anonymous = await getAnonymousDeviceId(anonymousLikeCookieName);

  try {
    const payload = await toggleArticleLike(parsed.locale, parsed.slug, anonymous.id);
    return successJson(payload, anonymous);
  } catch (error) {
    if (error instanceof ArticleLikeRateLimitError) {
      return NextResponse.json({ error: "Please wait before changing this like again." }, { status: 429, headers: noStoreHeaders });
    }

    return databaseError();
  }
}
