"use client";

import { ImageIcon, Loader2, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { AdminConfirmDialog } from "@/components/admin/admin-confirm-dialog";
import { adminApiErrorMessage, handleAdminUnauthorized } from "@/components/admin/admin-api";

type ArticleMediaManagerProps = {
  markdown: string;
  onMarkdownChange: (markdown: string) => void;
};

type ArticleMediaItem = {
  key: string;
  url: string;
  alt: string;
  count: number;
};

type DeleteMediaResponse = {
  ok?: boolean;
  error?: string;
  hint?: string;
};

const mediaUrlPattern = /\/media\/articles\/\d{4}\/(?:0[1-9]|1[0-2])\/[a-f0-9-]{36}\.(?:jpg|png|webp|gif)/gi;
const markdownImagePattern = /!\[([^\]]*)\]\((\/media\/articles\/\d{4}\/(?:0[1-9]|1[0-2])\/[a-f0-9-]{36}\.(?:jpg|png|webp|gif))\)/gi;

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function mediaKeyFromUrl(url: string) {
  return url.replace(/^\/media\//, "");
}

function extractArticleMedia(markdown: string) {
  const media = new Map<string, ArticleMediaItem>();

  for (const match of markdown.matchAll(mediaUrlPattern)) {
    const url = match[0];
    const key = mediaKeyFromUrl(url);
    const existing = media.get(url);

    media.set(url, {
      key,
      url,
      alt: existing?.alt ?? "",
      count: (existing?.count ?? 0) + 1,
    });
  }

  for (const match of markdown.matchAll(markdownImagePattern)) {
    const alt = match[1]?.trim() ?? "";
    const url = match[2];
    const existing = media.get(url);

    if (existing && alt && !existing.alt) {
      media.set(url, { ...existing, alt });
    }
  }

  return Array.from(media.values()).sort((a, b) => a.key.localeCompare(b.key));
}

function removeMediaReferences(markdown: string, url: string) {
  const escapedUrl = escapeRegExp(url);

  return markdown
    .replace(new RegExp(`!\\[[^\\]]*\\]\\(${escapedUrl}\\)\\n?`, "g"), "")
    .replace(new RegExp(`(:\\s*)["']?${escapedUrl}["']?`, "g"), '$1""')
    .replace(new RegExp(escapedUrl, "g"), "")
    .replace(/\n{4,}/g, "\n\n\n");
}

function deleteFailureMessage(response: Response, payload: DeleteMediaResponse | null) {
  if (response.status === 404) {
    return adminApiErrorMessage(payload, "图片不存在或已经被删除。");
  }

  if (response.status === 503) {
    return adminApiErrorMessage(payload, "R2 媒体存储暂时不可用。");
  }

  return adminApiErrorMessage(payload, "图片删除失败。");
}

export function ArticleMediaManager({ markdown, onMarkdownChange }: ArticleMediaManagerProps) {
  const media = useMemo(() => extractArticleMedia(markdown), [markdown]);
  const [confirmItem, setConfirmItem] = useState<ArticleMediaItem | null>(null);
  const [deletingKey, setDeletingKey] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function deleteMedia(item: ArticleMediaItem) {
    setDeletingKey(item.key);
    setMessage("");
    setError("");

    try {
      const response = await fetch("/api/admin/media", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: item.key }),
      });
      const payload = (await response.json().catch(() => null)) as DeleteMediaResponse | null;

      if (handleAdminUnauthorized(response)) {
        throw new Error("登录已过期，正在跳转后台登录。");
      }

      if (!response.ok) {
        throw new Error(deleteFailureMessage(response, payload));
      }

      onMarkdownChange(removeMediaReferences(markdown, item.url));
      setMessage("图片已从 R2 删除，并已从当前 Markdown 中移除引用。");
      setConfirmItem(null);
    } catch (exception) {
      setError(exception instanceof Error ? exception.message : "图片删除失败。");
    } finally {
      setDeletingKey("");
    }
  }

  if (media.length === 0) {
    return null;
  }

  return (
    <div className="admin-card-flat mt-4 p-4">
      <AdminConfirmDialog
        open={Boolean(confirmItem)}
        title="删除文章图片"
        description="确认后会从 R2 删除这张图片，并从当前 Markdown 中移除所有引用。请先确认这张图片确实不再需要。"
        confirmLabel="删除图片"
        busy={Boolean(deletingKey)}
        details={
          confirmItem ? (
            <div className="grid gap-3 border border-line bg-background p-3 text-sm">
              <div className="flex items-center gap-3">
                <div className="h-16 w-20 shrink-0 overflow-hidden border border-line bg-surface">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={confirmItem.url} alt="" className="h-full w-full object-cover" />
                </div>
                <div className="min-w-0">
                  <p className="break-all font-mono text-xs text-muted">{confirmItem.key}</p>
                  <p className="mt-1 text-xs text-muted">当前稿件中出现 {confirmItem.count} 次</p>
                </div>
              </div>
              <p className="text-xs leading-6 text-muted">
                如果图片已经被 Cloudflare 边缘缓存命中，删除后少数节点可能短时间还能看到旧图，但 R2 源文件会被删除。
              </p>
            </div>
          ) : null
        }
        onCancel={() => {
          if (!deletingKey) {
            setConfirmItem(null);
          }
        }}
        onConfirm={() => {
          if (confirmItem) {
            void deleteMedia(confirmItem);
          }
        }}
      />
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-accent">文章中的图片</p>
          <p className="mt-1 text-sm text-muted">识别当前 Markdown 中引用的 R2 图片。删除会同步移除正文或 Frontmatter 中的引用。</p>
        </div>
        <span className="admin-muted-pill inline-flex h-8 shrink-0 items-center px-3 text-xs font-semibold">{media.length} 张</span>
      </div>
      <div className="mt-4 grid gap-3">
        {media.map((item) => (
          <article key={item.key} className="admin-card grid min-w-0 gap-3 p-3 sm:grid-cols-[4.5rem_1fr_auto] sm:items-center">
            <div className="flex h-20 items-center justify-center overflow-hidden border border-line bg-background">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={item.url} alt="" className="h-full w-full object-cover" loading="lazy" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-xs font-semibold text-muted">
                <ImageIcon className="h-3.5 w-3.5" />
                <span>出现 {item.count} 次</span>
                {item.alt ? <span className="min-w-0 truncate">Alt：{item.alt}</span> : null}
              </div>
              <p className="mt-2 break-all font-mono text-xs text-muted">{item.key}</p>
            </div>
            <button
              type="button"
              className="admin-btn inline-flex h-9 items-center justify-center gap-1 bg-red-50 px-3 text-xs font-semibold text-red-700 transition hover:bg-red-100 disabled:opacity-60"
              disabled={Boolean(deletingKey)}
              onClick={() => setConfirmItem(item)}
            >
              {deletingKey === item.key ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
              删除
            </button>
          </article>
        ))}
      </div>
      {message ? <p className="mt-3 text-sm font-medium text-accent" role="status">{message}</p> : null}
      {error ? <p className="mt-3 whitespace-pre-line text-sm font-medium text-red-700" role="alert">{error}</p> : null}
    </div>
  );
}
