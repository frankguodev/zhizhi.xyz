"use client";

import { ChevronDown, ChevronRight, Copy, ImagePlus, ImageUp, Link2, Loader2, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import { adminApiErrorMessage, handleAdminUnauthorized } from "@/components/admin/admin-api";

type MediaUploadPanelProps = {
  altPlaceholder?: string;
  applyLabel?: string;
  description?: string;
  insertOnUpload?: boolean;
  onInsertMarkdown?: (markdown: string) => void;
  onUpload?: (media: UploadedMediaItem) => void;
  scope?: "article" | "ai-term";
  targetLocale?: string;
  targetRole?: "diagram";
  targetSlug?: string;
  title?: string;
};

type UploadResponse = {
  media?: UploadedMediaItem;
  ok?: boolean;
  error?: string;
  hint?: string;
};

type UploadedMediaItem = {
  key: string;
  url: string;
  markdown: string;
  contentType: string;
  size: number;
  alt?: string;
};

const maxRecentMedia = 6;
const maxFileSize = 5 * 1024 * 1024;
const allowedImageTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

type MessageTone = "idle" | "success" | "error";

function formatSize(size: number) {
  if (size < 1024) {
    return `${size} B`;
  }

  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }

  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

function markdownWithAlt(media: UploadedMediaItem, altText: string, dimensions: { height: number; width: number } | null) {
  const fallbackAlt = media.markdown.match(/^!\[([^\]]*)\]/)?.[1] ?? "";
  const alt = (altText.trim() || fallbackAlt).replaceAll("]", "\\]");
  const title = dimensions ? ` "${dimensions.width}x${dimensions.height}"` : "";
  return `![${alt}](${media.url}${title})`;
}

async function readImageDimensions(file: File): Promise<{ height: number; width: number } | null> {
  if (typeof createImageBitmap !== "function") {
    return null;
  }

  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const dimensions = { height: bitmap.height, width: bitmap.width };
    bitmap.close();
    return dimensions;
  } catch {
    return null;
  }
}

function uploadFailureMessage(response: Response, payload: UploadResponse | null) {
  if (response.status === 413) {
    return adminApiErrorMessage(payload, "图片文件过大，单张不能超过 5MB。");
  }

  if (response.status === 415) {
    return adminApiErrorMessage(payload, "图片格式不支持，请换成 JPG、PNG、WebP 或 GIF。");
  }

  if (response.status === 503) {
    return adminApiErrorMessage(payload, "R2 媒体存储暂时不可用。");
  }

  return adminApiErrorMessage(payload, "图片上传失败。");
}

export function MediaUploadPanel({
  altPlaceholder = "用于 Markdown alt",
  applyLabel = "插入",
  description = "支持 JPG、PNG、WebP、GIF，单张不超过 5MB。",
  insertOnUpload = true,
  onInsertMarkdown,
  onUpload,
  scope = "article",
  targetLocale,
  targetRole,
  targetSlug,
  title = "图片上传",
}: MediaUploadPanelProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState<MessageTone>("idle");
  const [markdown, setMarkdown] = useState("");
  const [recentMedia, setRecentMedia] = useState<UploadedMediaItem[]>([]);
  const [recentOpen, setRecentOpen] = useState(false);
  const [altText, setAltText] = useState("");
  const [confirmDeleteKey, setConfirmDeleteKey] = useState<string | null>(null);
  const [deletingMediaKey, setDeletingMediaKey] = useState("");

  async function upload(file: File) {
    if (!allowedImageTypes.has(file.type)) {
      setMessage("图片格式不支持，请换成 JPG、PNG、WebP 或 GIF。");
      setMessageTone("error");
      return;
    }

    if (file.size <= 0) {
      setMessage("图片文件为空，请重新选择。");
      setMessageTone("error");
      return;
    }

    if (file.size > maxFileSize) {
      setMessage("图片文件过大，单张不能超过 5MB。");
      setMessageTone("error");
      return;
    }

    setLoading(true);
    setMessage("");
    setMessageTone("idle");
    setMarkdown("");

    const body = new FormData();
    body.append("file", file);
    body.append("scope", scope);
    if (targetLocale) {
      body.append("locale", targetLocale);
    }
    if (targetSlug) {
      body.append("slug", targetSlug);
    }
    if (targetRole) {
      body.append("role", targetRole);
    }

    try {
      const response = await fetch("/api/admin/media", {
        method: "POST",
        body,
      });
      const payload = (await response.json().catch(() => null)) as UploadResponse | null;

      if (handleAdminUnauthorized(response)) {
        throw new Error("登录已过期，正在跳转后台登录。");
      }

      if (!response.ok || !payload?.media) {
        throw new Error(uploadFailureMessage(response, payload));
      }

      const dimensions = await readImageDimensions(file);
      const media = {
        ...payload.media,
        alt: altText.trim(),
        markdown: markdownWithAlt(payload.media, altText, dimensions),
      };
      setMarkdown(media.markdown);
      setMessage(insertOnUpload ? `已上传 ${formatSize(payload.media.size)}，可插入 Markdown。` : `已上传 ${formatSize(payload.media.size)}，可使用“${applyLabel}”。`);
      setMessageTone("success");
      setRecentMedia((current) => {
        const next = [media, ...current.filter((item) => item.key !== media.key)];
        return next.slice(0, maxRecentMedia);
      });
      setRecentOpen(true);
      onUpload?.(media);
      if (insertOnUpload) {
        onInsertMarkdown?.(media.markdown);
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "图片上传失败。");
      setMessageTone("error");
    } finally {
      setLoading(false);
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
  }

  async function copyMarkdown() {
    if (!markdown) {
      return;
    }

    await navigator.clipboard?.writeText(markdown).catch(() => null);
    setMessage("已复制图片 Markdown。");
    setMessageTone("success");
  }

  async function copyText(value: string, successMessage: string) {
    await navigator.clipboard?.writeText(value).catch(() => null);
    setMessage(successMessage);
    setMessageTone("success");
  }

  async function deleteRecentItem(item: UploadedMediaItem) {
    setDeletingMediaKey(item.key);
    setMessage("");
    setMessageTone("idle");

    try {
      const response = await fetch("/api/admin/media", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: item.key }),
      });
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;

      if (handleAdminUnauthorized(response)) {
        throw new Error("登录已过期，正在跳转后台登录。");
      }

      if (!response.ok) {
        throw new Error(adminApiErrorMessage(payload, "图片删除失败。"));
      }

      setRecentMedia((current) => current.filter((m) => m.key !== item.key));
      setConfirmDeleteKey(null);
      setMessage("图片已从 R2 删除。");
      setMessageTone("success");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "图片删除失败。");
      setMessageTone("error");
      setConfirmDeleteKey(null);
    } finally {
      setDeletingMediaKey("");
    }
  }

  return (
    <div className="admin-card-flat min-w-0 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-accent">{title}</p>
          <p className="mt-1 text-sm text-muted">{description}</p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <label className="grid gap-1">
            <span className="text-xs font-semibold text-muted">图片说明</span>
            <input
              className="h-10 w-52 max-w-full border border-line bg-surface px-3 text-sm outline-none focus:border-accent"
              value={altText}
              onChange={(event) => setAltText(event.target.value)}
              maxLength={160}
              placeholder={altPlaceholder}
            />
          </label>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) {
                void upload(file);
              }
              event.currentTarget.value = "";
            }}
          />
          <button
            type="button"
            className="admin-btn admin-btn-secondary inline-flex h-10 items-center justify-center gap-2 px-4 text-sm font-semibold disabled:opacity-60"
            onClick={() => inputRef.current?.click()}
            disabled={loading}
            aria-busy={loading}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageUp className="h-4 w-4" />}
            上传图片
          </button>
          <button
            type="button"
            className="admin-btn admin-btn-secondary inline-flex h-10 items-center justify-center px-4 text-sm font-semibold text-muted disabled:opacity-60"
            onClick={copyMarkdown}
            disabled={!markdown}
          >
            复制语法
          </button>
        </div>
      </div>
      {markdown && insertOnUpload ? <code className="mt-3 block break-all bg-surface p-3 text-xs text-muted">{markdown}</code> : null}
      {recentMedia.length > 0 ? (
        <div className="mt-4 border-t border-line pt-4">
          <button
            type="button"
            className="flex w-full cursor-pointer items-center justify-between gap-3 rounded-md border border-line bg-surface px-3 py-2 text-left transition hover:border-accent/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/20"
            onClick={() => setRecentOpen((value) => !value)}
            aria-expanded={recentOpen}
          >
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-foreground">最近上传</span>
              <span className="mt-0.5 block text-xs text-muted">仅显示本次编辑上传的最近 {recentMedia.length} 张图片</span>
            </span>
            <span className="inline-flex shrink-0 items-center gap-2 text-xs font-semibold text-muted">
              {recentMedia.length} 张
              {recentOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </span>
          </button>
          {recentOpen ? (
            <div className="mt-3 grid max-h-[28rem] gap-3 overflow-y-auto pr-1">
              {recentMedia.map((item) => (
                <article key={item.key} className="admin-card grid min-w-0 gap-3 p-3 sm:grid-cols-[4.5rem_1fr]">
                  <div className="flex h-20 items-center justify-center overflow-hidden border border-line bg-background">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={item.url} alt="" className="h-full w-full object-cover" loading="lazy" />
                  </div>
                  <div className="min-w-0">
                    <p className="break-all font-mono text-xs text-muted">{item.key}</p>
                    <p className="mt-1 text-xs text-muted">{formatSize(item.size)} · {item.contentType}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        className="admin-btn admin-btn-secondary inline-flex h-9 items-center justify-center gap-1 px-3 text-xs font-semibold"
                        type="button"
                        onClick={() => {
                          onUpload?.(item);
                          if (insertOnUpload) {
                            onInsertMarkdown?.(item.markdown);
                          }
                        }}
                      >
                        <ImagePlus className="h-3.5 w-3.5" />
                        {applyLabel}
                      </button>
                      <button
                        className="admin-btn admin-btn-secondary inline-flex h-9 items-center justify-center gap-1 px-3 text-xs font-semibold text-muted"
                        type="button"
                        onClick={() => void copyText(item.markdown, "已复制图片 Markdown。")}
                      >
                        <Copy className="h-3.5 w-3.5" />
                        Markdown
                      </button>
                      <button
                        className="admin-btn admin-btn-secondary inline-flex h-9 items-center justify-center gap-1 px-3 text-xs font-semibold text-muted"
                        type="button"
                        onClick={() => void copyText(item.url, "已复制图片 URL。")}
                      >
                        <Link2 className="h-3.5 w-3.5" />
                        URL
                      </button>
                      {confirmDeleteKey === item.key ? (
                        <>
                          <button
                            className="admin-btn admin-btn-secondary inline-flex h-9 items-center justify-center gap-1 px-3 text-xs font-semibold text-red-700 disabled:opacity-60"
                            type="button"
                            disabled={deletingMediaKey === item.key}
                            onClick={() => void deleteRecentItem(item)}
                          >
                            {deletingMediaKey === item.key ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                            确认删除
                          </button>
                          <button
                            className="admin-btn admin-btn-secondary inline-flex h-9 items-center justify-center px-3 text-xs font-semibold text-muted disabled:opacity-60"
                            type="button"
                            disabled={deletingMediaKey === item.key}
                            onClick={() => setConfirmDeleteKey(null)}
                          >
                            取消
                          </button>
                        </>
                      ) : (
                        <button
                          className="admin-btn admin-btn-secondary inline-flex h-9 items-center justify-center gap-1 px-3 text-xs font-semibold text-muted disabled:opacity-60"
                          type="button"
                          disabled={Boolean(deletingMediaKey)}
                          onClick={() => setConfirmDeleteKey(item.key)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          删除
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
      {message ? (
        <p
          className={messageTone === "error" ? "mt-3 whitespace-pre-line text-sm font-medium text-red-700" : "mt-3 text-sm text-muted"}
          role={messageTone === "error" ? "alert" : "status"}
        >
          {message}
        </p>
      ) : null}
    </div>
  );
}
