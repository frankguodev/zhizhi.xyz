import { siteConfig } from "@/lib/site";

type HeaderReader = {
  get(name: string): string | null;
};

function cleanHeader(value: string | null) {
  return value?.split(",")[0]?.trim() || null;
}

export function getRequestOrigin(headersList: HeaderReader) {
  const host = cleanHeader(headersList.get("x-forwarded-host")) ?? cleanHeader(headersList.get("host"));
  const proto = cleanHeader(headersList.get("x-forwarded-proto")) ?? (host?.startsWith("localhost") || host?.startsWith("127.0.0.1") ? "http" : "https");

  if (!host || !proto) {
    return siteConfig.url;
  }

  return `${proto}://${host}`;
}

export function absoluteUrl(value: string, origin: string) {
  const normalized = value.trim();

  if (!normalized) {
    return normalized;
  }

  if (/^https?:\/\//i.test(normalized)) {
    return normalized;
  }

  return `${origin}${normalized.startsWith("/") ? normalized : `/${normalized}`}`;
}
