import { getCloudflareContext } from "@opennextjs/cloudflare";

const maxFileSize = 5 * 1024 * 1024;
const allowedImageTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const extensionByContentType: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

export type UploadedMedia = {
  key: string;
  url: string;
  markdown: string;
  contentType: string;
  size: number;
};

export type MediaUploadScope = "article" | "ai-term";

export type UploadImageOptions = {
  locale?: string;
  slug?: string;
  role?: "diagram";
};

export function isValidArticleMediaKey(key: string) {
  return /^articles\/\d{4}\/(0[1-9]|1[0-2])\/[a-f0-9-]{36}\.(jpg|png|webp|gif)$/.test(key);
}

export function isValidAiTermMediaKey(key: string) {
  return (
    /^ai-terms\/\d{4}\/(0[1-9]|1[0-2])\/[a-f0-9-]{36}\.(jpg|png|webp|gif)$/.test(key) ||
    /^ai-terms\/(zh|en)\/[a-z0-9\u4e00-\u9fa5][a-z0-9\u4e00-\u9fa5-]{0,119}\/diagram-[a-f0-9-]{36}\.(jpg|png|webp|gif)$/.test(key)
  );
}

export function isValidMediaKey(key: string) {
  return isValidArticleMediaKey(key) || isValidAiTermMediaKey(key);
}

export async function getMediaBucket() {
  const { env } = await getCloudflareContext({ async: true });

  if (!env.MEDIA_BUCKET) {
    throw new Error("Cloudflare R2 binding MEDIA_BUCKET is not available. Run with Cloudflare preview or configure R2 first.");
  }

  return env.MEDIA_BUCKET;
}

function safeFileName(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "") || "image";
}

function extensionFor(file: File) {
  return extensionByContentType[file.type] ?? "bin";
}

function normalizeMediaSlug(value: string | undefined) {
  const normalized = value
    ?.toLowerCase()
    .trim()
    .replace(/[^a-z0-9\u4e00-\u9fa5-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized || null;
}

function keyForUpload(scope: MediaUploadScope, extension: string, options: UploadImageOptions = {}) {
  if (scope === "ai-term" && options.role === "diagram") {
    const locale = options.locale === "en" ? "en" : options.locale === "zh" ? "zh" : null;
    const slug = normalizeMediaSlug(options.slug);

    if (locale && slug) {
      return `ai-terms/${locale}/${slug}/diagram-${crypto.randomUUID()}.${extension}`;
    }
  }

  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  const directory = scope === "ai-term" ? "ai-terms" : "articles";
  return `${directory}/${year}/${month}/${crypto.randomUUID()}.${extension}`;
}

export function validateImageFile(file: File) {
  if (!allowedImageTypes.has(file.type)) {
    return "只支持 JPG、PNG、WebP、GIF 图片。";
  }

  if (file.size <= 0) {
    return "图片文件为空。";
  }

  if (file.size > maxFileSize) {
    return "图片不能超过 5MB。";
  }

  return null;
}

export async function uploadImage(file: File, scope: MediaUploadScope = "article", options: UploadImageOptions = {}): Promise<UploadedMedia> {
  const error = validateImageFile(file);
  if (error) {
    throw new Error(error);
  }

  const bucket = await getMediaBucket();
  const extension = extensionFor(file);
  const key = keyForUpload(scope, extension, options);
  const body = await file.arrayBuffer();

  await bucket.put(key, body, {
    httpMetadata: {
      contentType: file.type,
      cacheControl: "public, max-age=31536000, immutable",
      contentDisposition: "inline",
    },
    customMetadata: {
      originalName: safeFileName(file.name).slice(0, 180),
    },
  });

  const alt = safeFileName(file.name).replace(/\.[^.]+$/, "");
  const url = `/media/${key}`;

  return {
    key,
    url,
    markdown: `![${alt}](${url})`,
    contentType: file.type,
    size: file.size,
  };
}

export async function uploadArticleImage(file: File): Promise<UploadedMedia> {
  return uploadImage(file, "article");
}

export async function uploadAiTermImage(file: File): Promise<UploadedMedia> {
  return uploadImage(file, "ai-term");
}

export async function deleteMediaImage(key: string) {
  if (!isValidMediaKey(key)) {
    throw new Error("图片路径不合法，已拒绝删除。");
  }

  const bucket = await getMediaBucket();
  const existing = await bucket.head(key);

  if (!existing) {
    throw new Error("图片不存在或已经被删除。");
  }

  await bucket.delete(key);
}

export async function deleteArticleImage(key: string) {
  return deleteMediaImage(key);
}
