import { NextResponse } from "next/server";
import { isLocale, type Locale } from "@/lib/site";

export const defaultPublicLimit = 20;
export const maxPublicLimit = 50;
export const maxPublicFilterLength = 80;
export const maxPublicSlugLength = 160;

const publicSlugPattern = /^[\p{L}\p{N}](?:[\p{L}\p{N}-]{0,158}[\p{L}\p{N}])?$/u;

export const publicErrorHeaders = {
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
};

export const publicSuccessHeadersZh = {
  "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
  "Content-Language": "zh-CN",
  "X-Content-Type-Options": "nosniff",
};

/** @deprecated 使用 publicSuccessHeadersZh */
export function publicSuccessHeaders(_locale: Locale) {
  return publicSuccessHeadersZh;
}

export function publicJsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status, headers: publicErrorHeaders });
}

export function parsePublicLocale(request: Request): Locale | null {
  const { searchParams } = new URL(request.url);
  const locale = searchParams.get("locale") ?? "zh";

  return isLocale(locale) ? locale : null;
}

export function readBoundedText(searchParams: URLSearchParams, name: string, maxLength = maxPublicFilterLength) {
  return (searchParams.get(name) ?? "").trim().slice(0, maxLength);
}

export function readUnsignedInteger(searchParams: URLSearchParams, name: string, fallback: number) {
  const value = searchParams.get(name);

  if (!value) {
    return fallback;
  }

  if (!/^\d+$/.test(value)) {
    return null;
  }

  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

export function parsePublicSlug(value: string) {
  const slug = value.trim();

  if (slug.length < 1 || slug.length > maxPublicSlugLength || !publicSlugPattern.test(slug)) {
    return null;
  }

  return slug;
}
