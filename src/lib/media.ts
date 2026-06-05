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

export type MediaUploadScope = "article" | "ai-term" | "series" | "tool";

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
    // \u7edf\u4e00\u8def\u5f84\uff1a\u6240\u6709\u8bcd\u6761\u56fe\uff08\u542b\u300c\u4e00\u56fe\u770b\u61c2\u300d\u56fe\u89e3\uff0c\u6587\u4ef6\u540d\u5e26 diagram- \u524d\u7f00\uff09\u90fd\u6309 ai-terms/\u5e74/\u6708 \u5b58\u653e\u3002
    /^ai-terms\/\d{4}\/(0[1-9]|1[0-2])\/(diagram-)?[a-f0-9-]{36}\.(jpg|png|webp|gif)$/.test(key) ||
    // legacy\uff1a\u5386\u53f2\u6309 locale/slug \u5b58\u653e\u7684\u56fe\u89e3\uff0c\u4fdd\u7559\u4ee5\u517c\u5bb9\u5b58\u91cf\uff08\u53d6\u56fe + \u5220\u9664\uff09\uff1b\u65b0\u4e0a\u4f20\u4e0d\u518d\u751f\u6210\u6b64\u8def\u5f84\u3002
    /^ai-terms\/(zh|en)\/[a-z0-9\u4e00-\u9fa5][a-z0-9\u4e00-\u9fa5-]{0,119}\/diagram-[a-f0-9-]{36}\.(jpg|png|webp|gif)$/.test(key)
  );
}

export function isValidSeriesMediaKey(key: string) {
  return /^series\/\d{4}\/(0[1-9]|1[0-2])\/[a-f0-9-]{36}\.(jpg|png|webp|gif)$/.test(key);
}

export function isValidToolMediaKey(key: string) {
  return /^tools\/\d{4}\/(0[1-9]|1[0-2])\/[a-f0-9-]{36}\.(jpg|png|webp|gif)$/.test(key);
}

export function isValidMediaKey(key: string) {
  return isValidArticleMediaKey(key) || isValidAiTermMediaKey(key) || isValidSeriesMediaKey(key) || isValidToolMediaKey(key);
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

function keyForUpload(scope: MediaUploadScope, extension: string, options: UploadImageOptions = {}) {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  const directory =
    scope === "ai-term" ? "ai-terms" : scope === "series" ? "series" : scope === "tool" ? "tools" : "articles";
  // 词条「一图看懂」图解保留 diagram- 前缀便于辨认，但和其它词条图一样统一放在 ai-terms/年/月 下，
  // 不再为每个词条建 locale/slug 子目录（避免 R2 前缀膨胀）。
  const prefix = scope === "ai-term" && options.role === "diagram" ? "diagram-" : "";
  return `${directory}/${year}/${month}/${prefix}${crypto.randomUUID()}.${extension}`;
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
