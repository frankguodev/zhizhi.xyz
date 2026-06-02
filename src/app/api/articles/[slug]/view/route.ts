import { NextResponse } from "next/server";
import { canReadFullArticle } from "@/lib/article-access";
import { type AnonymousDevice, getAnonymousDeviceId, isSameOriginMutation, noStoreHeaders, withAnonymousDeviceCookie } from "@/lib/anonymous-device";
import { getArticleViewCount, recordArticleView } from "@/lib/article-views";
import { parsePublicLocale, parsePublicSlug, publicJsonError } from "@/lib/public-api";
import { getPublicArticle } from "@/lib/public-articles";

export const dynamic = "force-dynamic";

const anonymousViewCookieName = "zz_view_device";
const publicViewer = { isAuthenticated: false, user: null };

function successJson(payload: { counted?: boolean; viewCount: number }, device: AnonymousDevice) {
  return withAnonymousDeviceCookie(NextResponse.json(payload, { headers: noStoreHeaders }), anonymousViewCookieName, device);
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

  return { ok: true as const, locale, slug, fallbackViewCount: article.viewCount ?? 0 };
}

function databaseError() {
  return NextResponse.json(
    {
      error: "Article view count is temporarily unavailable.",
      hint: "请确认 D1 已应用 article_views migration，并在 Cloudflare preview/Worker 环境下验证。",
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

  const anonymous = await getAnonymousDeviceId(anonymousViewCookieName);

  try {
    const viewCount = await getArticleViewCount(parsed.locale, parsed.slug);
    return successJson({ viewCount: viewCount ?? parsed.fallbackViewCount }, anonymous);
  } catch {
    return databaseError();
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  if (!isSameOriginMutation(request)) {
    return NextResponse.json({ error: "Cross-site view requests are not allowed." }, { status: 403, headers: noStoreHeaders });
  }

  const { slug: rawSlug } = await params;
  const parsed = await parseArticleRequest(rawSlug);

  if (!parsed.ok) {
    return parsed.response;
  }

  const anonymous = await getAnonymousDeviceId(anonymousViewCookieName);

  try {
    const payload = await recordArticleView(parsed.locale, parsed.slug, anonymous.id);

    if (!payload) {
      return publicJsonError("Article not found.", 404);
    }

    return successJson(payload, anonymous);
  } catch {
    return databaseError();
  }
}
