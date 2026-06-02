import { NextResponse } from "next/server";
import { getAnonymousDeviceId, isSameOriginMutation, noStoreHeaders, withAnonymousDeviceCookie } from "@/lib/anonymous-device";
import {
  AnonymousFeedbackRateLimitError,
  AnonymousFeedbackValidationError,
  createAnonymousFeedback,
  type AnonymousFeedbackType,
} from "@/lib/anonymous-feedback";
import { isLocale, type Locale } from "@/lib/site";

export const dynamic = "force-dynamic";

const anonymousFeedbackCookieName = "zz_feedback_device";

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

  const anonymous = await getAnonymousDeviceId(anonymousFeedbackCookieName);

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

    return withAnonymousDeviceCookie(NextResponse.json({ ok: true, id: result.id }, { headers: noStoreHeaders }), anonymousFeedbackCookieName, anonymous);
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
