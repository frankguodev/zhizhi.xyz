import { cookies } from "next/headers";
import { NextResponse } from "next/server";

// 匿名设备标识：阅读量 / 点赞 / 反馈共用同一套生成、校验和写入逻辑。
export const anonymousDeviceCookieMaxAgeSeconds = 60 * 60 * 24 * 400;

const anonymousIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const noStoreHeaders = {
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
};

export type AnonymousDevice = { id: string; shouldSetCookie: boolean };

export async function getAnonymousDeviceId(cookieName: string): Promise<AnonymousDevice> {
  const cookieStore = await cookies();
  const currentId = cookieStore.get(cookieName)?.value;

  if (currentId && anonymousIdPattern.test(currentId)) {
    return { id: currentId, shouldSetCookie: false };
  }

  return { id: crypto.randomUUID(), shouldSetCookie: true };
}

function anonymousDeviceCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: anonymousDeviceCookieMaxAgeSeconds,
  };
}

export function withAnonymousDeviceCookie<T>(response: NextResponse<T>, cookieName: string, device: AnonymousDevice): NextResponse<T> {
  if (device.shouldSetCookie) {
    response.cookies.set(cookieName, device.id, anonymousDeviceCookieOptions());
  }

  return response;
}

// 同源写请求校验：拦截跨站发起的 POST（CSRF 防护）。
export function isSameOriginMutation(request: Request): boolean {
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
