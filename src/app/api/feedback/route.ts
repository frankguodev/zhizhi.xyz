import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  AnonymousFeedbackRateLimitError,
  AnonymousFeedbackValidationError,
  createAnonymousFeedback,
  type AnonymousFeedbackType,
} from "@/lib/anonymous-feedback";
import { isLocale, type Locale } from "@/lib/site";

export const dynamic = "force-dynamic";

const anonymousFeedbackCookieName = "zz_feedback_device";
const anonymousFeedbackCookieMaxAgeSeconds = 60 * 60 * 24 * 400;
const anonymousIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const noStoreHeaders = {
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
};

function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: anonymousFeedbackCookieMaxAgeSeconds,
  };
}

async function getAnonymousFeedbackId() {
  const cookieStore = await cookies();
  const currentId = cookieStore.get(anonymousFeedbackCookieName)?.value;

  if (currentId && anonymousIdPattern.test(currentId)) {
    return { id: currentId, shouldSetCookie: false };
  }

  return { id: crypto.randomUUID(), shouldSetCookie: true };
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

function readString(payload: unknown, key: string) {
  if (typeof payload !== "object" || payload === null || !(key in payload)) {
    return "";
  }

  const value = (payload as Record<string, unknown>)[key];
  return typeof value === "string" ? value : "";
}

function parseLocale(value: string): Locale {
  return isLocale(value) ? value : "zh";
}

function parseFeedbackType(value: string): AnonymousFeedbackType {
  return value === "site" ? "site" : "article";
}

export async function POST(request: Request) {
  if (!isSameOriginMutation(request)) {
    return NextResponse.json({ error: "Cross-site feedback requests are not allowed." }, { status: 403, headers: noStoreHeaders });
  }

  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400, headers: noStoreHeaders });
  }

  const anonymous = await getAnonymousFeedbackId();

  try {
    const result = await createAnonymousFeedback({
      locale: parseLocale(readString(payload, "locale")),
      pageUrl: readString(payload, "pageUrl"),
      articleSlug: readString(payload, "articleSlug") || null,
      articleTitle: readString(payload, "articleTitle") || null,
      feedbackType: parseFeedbackType(readString(payload, "feedbackType")),
      content: readString(payload, "content"),
      contact: readString(payload, "contact") || null,
      anonymousId: anonymous.id,
      userAgent: request.headers.get("user-agent"),
    });
    const response = NextResponse.json({ ok: true, id: result.id }, { headers: noStoreHeaders });

    if (anonymous.shouldSetCookie) {
      response.cookies.set(anonymousFeedbackCookieName, anonymous.id, cookieOptions());
    }

    return response;
  } catch (error) {
    if (error instanceof AnonymousFeedbackRateLimitError) {
      return NextResponse.json({ error: "Please wait before submitting feedback again." }, { status: 429, headers: noStoreHeaders });
    }

    if (error instanceof AnonymousFeedbackValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400, headers: noStoreHeaders });
    }

    return NextResponse.json(
      {
        error: "Feedback is temporarily unavailable.",
        hint: "请确认 D1 已应用 anonymous_feedback migration，并在 Cloudflare preview/Worker 环境下验证。",
      },
      { status: 503, headers: noStoreHeaders },
    );
  }
}
