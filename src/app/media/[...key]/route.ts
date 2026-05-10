import { notFound } from "next/navigation";
import { getMediaBucket, isValidArticleMediaKey } from "@/lib/media";

export const dynamic = "force-dynamic";

type CloudflareCacheStorage = CacheStorage & {
  default?: Cache;
};

function mediaCacheKey(request: Request) {
  const url = new URL(request.url);
  url.search = "";
  return new Request(url.toString(), { method: "GET" });
}

function getDefaultMediaCache() {
  if (typeof caches === "undefined") {
    return null;
  }

  return (caches as CloudflareCacheStorage).default ?? null;
}

async function matchMediaCache(cacheKey: Request) {
  const cache = getDefaultMediaCache();
  if (!cache) {
    return null;
  }

  return cache.match(cacheKey).catch(() => null);
}

async function putMediaCache(cacheKey: Request, response: Response) {
  const cache = getDefaultMediaCache();
  if (!cache || response.status !== 200) {
    return;
  }

  await cache.put(cacheKey, response.clone()).catch(() => null);
}

function headersFromR2Object(object: R2ObjectBody) {
  const headers: Record<string, string> = {
    etag: object.httpEtag,
    "cache-control": "public, max-age=31536000, immutable",
    "content-type": "application/octet-stream",
    "x-content-type-options": "nosniff",
  };
  const metadata = object.httpMetadata;

  if (metadata?.contentType) {
    headers["content-type"] = metadata.contentType;
  }

  if (metadata?.contentLanguage) {
    headers["content-language"] = metadata.contentLanguage;
  }

  if (metadata?.contentDisposition) {
    headers["content-disposition"] = metadata.contentDisposition;
  }

  if (metadata?.contentEncoding) {
    headers["content-encoding"] = metadata.contentEncoding;
  }

  if (metadata?.cacheControl) {
    headers["cache-control"] = metadata.cacheControl;
  }

  if (metadata?.cacheExpiry) {
    headers.expires = metadata.cacheExpiry.toUTCString();
  }

  if (object.size > 0) {
    headers["content-length"] = String(object.size);
  }

  return headers;
}

export async function GET(request: Request, { params }: { params: Promise<{ key: string[] }> }) {
  const { key } = await params;
  const objectKey = key.join("/");

  if (!isValidArticleMediaKey(objectKey)) {
    notFound();
  }

  const cacheKey = mediaCacheKey(request);
  const cachedResponse = await matchMediaCache(cacheKey);
  if (cachedResponse) {
    return cachedResponse;
  }

  const bucket = await getMediaBucket().catch(() => null);
  if (!bucket) {
    return new Response("Media storage unavailable.", {
      status: 503,
      headers: {
        "cache-control": "no-store",
        "content-type": "text/plain; charset=utf-8",
        "x-content-type-options": "nosniff",
      },
    });
  }

  const object = await bucket.get(objectKey).catch(() => null);

  if (!object) {
    notFound();
  }

  const response = new Response(object.body, { headers: headersFromR2Object(object) });
  await putMediaCache(cacheKey, response);

  return response;
}
