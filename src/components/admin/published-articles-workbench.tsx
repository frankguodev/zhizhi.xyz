"use client";

import Link from "next/link";
import { Archive, ExternalLink, Loader2, PenLine, RotateCcw, Search, SlidersHorizontal, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { AdminConfirmDialog } from "@/components/admin/admin-confirm-dialog";
import { AdminSelect } from "@/components/admin/admin-select";
import { handleAdminUnauthorized } from "@/components/admin/admin-api";
import { cn } from "@/lib/utils";

export type PublishedArticleListItem = {
  id: string;
  title: string;
  slug: string;
  locale: string;
  summary: string;
  status: string;
  workflowStatus: string;
  visibility: string;
  readingMinutes: number;
  viewCount: number;
  publishedAt: string | number;
  updatedAt: string | number;
};

type PendingAction =
  | { type: "archive"; article: PublishedArticleListItem }
  | { type: "restore"; article: PublishedArticleListItem }
  | { type: "delete"; article: PublishedArticleListItem };

type ArticleActionPayload = {
  article?: {
    id?: string;
    status?: string;
    visibility?: string;
    updatedAt?: string | number;
  };
  error?: unknown;
};

const allValue = "all";
const statusOptions = [
  { value: allValue, label: "全部状态" },
  { value: "published", label: "已发布" },
  { value: "archived", label: "已下架" },
] as const;

function formatDate(value: string | number) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "未知时间" : date.toLocaleString("zh-CN");
}

function publicArticleUrl(article: PublishedArticleListItem) {
  return article.locale === "en" ? `/en/articles/${article.slug}` : `/articles/${article.slug}`;
}

function includesText(value: string, query: string) {
  return value.toLowerCase().includes(query);
}

function statusLabel(status: string) {
  if (status === "archived") {
    return "已下架";
  }

  if (status === "published") {
    return "已发布";
  }

  return status;
}

function actionCopy(action: PendingAction | null) {
  if (action?.type === "delete") {
    return {
      title: "物理删除文章",
      description: "物理删除会从数据库移除文章，并解除专题挂载关系。这个操作不可在后台直接恢复。",
      confirmLabel: "确认物理删除",
      tone: "danger" as const,
    };
  }

  if (action?.type === "restore") {
    return {
      title: "重新上架文章",
      description: "重新上架会把文章状态改回 published，并把 visibility 改为 public。文章会重新进入公开列表。",
      confirmLabel: "确认上架",
      tone: "primary" as const,
    };
  }

  return {
    title: "逻辑下架文章",
    description: "逻辑下架会把文章状态改为 archived，并把 visibility 改为 hidden；文章不再出现在公开列表。",
    confirmLabel: "确认下架",
    tone: "primary" as const,
  };
}

export function PublishedArticlesWorkbench({ articles }: { articles: PublishedArticleListItem[] }) {
  const [items, setItems] = useState(articles);
  const [query, setQuery] = useState("");
  const [locale, setLocale] = useState(allValue);
  const [status, setStatus] = useState(allValue);
  const [busyKey, setBusyKey] = useState("");
  const [message, setMessage] = useState("");
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);

  const localeOptions = useMemo(() => Array.from(new Set(items.map((article) => article.locale))).sort(), [items]);
  const filteredArticles = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return items.filter((article) => {
      if (locale !== allValue && article.locale !== locale) {
        return false;
      }

      if (status !== allValue && article.status !== status) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      return (
        includesText(article.title, normalizedQuery) ||
        includesText(article.slug, normalizedQuery) ||
        includesText(article.summary, normalizedQuery)
      );
    });
  }, [items, locale, query, status]);

  async function runAction(action: PendingAction) {
    const key = `${action.type}:${action.article.locale}:${action.article.slug}`;
    setBusyKey(key);
    setMessage("");

    try {
      const response = await fetch(`/api/admin/articles/published/${action.article.locale}/${action.article.slug}`, {
        method: action.type === "delete" ? "DELETE" : "PATCH",
        headers: action.type === "delete" ? undefined : { "Content-Type": "application/json" },
        body: action.type === "delete" ? undefined : JSON.stringify({ action: action.type }),
      });
      const payload = (await response.json().catch(() => ({}))) as ArticleActionPayload;

      if (handleAdminUnauthorized(response)) {
        throw new Error("登录已过期，正在跳转后台登录。");
      }

      if (!response.ok) {
        throw new Error(typeof payload.error === "string" ? payload.error : "操作失败");
      }

      if (action.type === "delete") {
        setItems((current) => current.filter((item) => item.id !== action.article.id));
        setMessage("已物理删除文章，并记录操作。");
      } else {
        const nextStatus = payload.article?.status ?? (action.type === "archive" ? "archived" : "published");
        const nextVisibility = payload.article?.visibility ?? (action.type === "archive" ? "hidden" : "public");
        const nextUpdatedAt = payload.article?.updatedAt ?? new Date().toISOString();

        setItems((current) =>
          current.map((item) =>
            item.id === action.article.id
              ? {
                  ...item,
                  status: nextStatus,
                  visibility: nextVisibility,
                  updatedAt: nextUpdatedAt,
                }
              : item,
          ),
        );
        setMessage(action.type === "archive" ? "已逻辑下架文章，并记录操作。" : "已重新上架文章，并记录操作。");
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "操作失败");
    } finally {
      setPendingAction(null);
      setBusyKey("");
    }
  }

  const confirmCopy = actionCopy(pendingAction);
  const localeSelectOptions = [
    { value: allValue, label: "全部语言" },
    ...localeOptions.map((option) => ({ value: option, label: option })),
  ];

  return (
    <>
      <AdminConfirmDialog
        open={Boolean(pendingAction)}
        title={confirmCopy.title}
        description={confirmCopy.description}
        confirmLabel={confirmCopy.confirmLabel}
        tone={confirmCopy.tone}
        busy={Boolean(pendingAction && busyKey === `${pendingAction.type}:${pendingAction.article.locale}:${pendingAction.article.slug}`)}
        details={
          pendingAction ? (
            <div className="grid gap-2 border border-line bg-background p-3 text-sm">
              <p className="font-semibold text-foreground">{pendingAction.article.title}</p>
              <p className="font-mono text-muted">{pendingAction.article.locale}/{pendingAction.article.slug}</p>
            </div>
          ) : null
        }
        onCancel={() => setPendingAction(null)}
        onConfirm={() => {
          if (pendingAction) {
            void runAction(pendingAction);
          }
        }}
      />

      <section className="admin-surface p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
          <label className="min-w-0 flex-1">
            <span className="mb-1.5 block text-xs font-semibold text-muted">搜索文章</span>
            <span className="relative block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <input
                className="h-11 w-full border border-line bg-background pl-10 pr-3 text-sm outline-none focus:border-accent"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="搜索标题、slug 或摘要"
              />
            </span>
          </label>

          <div className="grid gap-3 sm:grid-cols-2 lg:w-[24rem]">
            <label>
              <span className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-muted">
                <SlidersHorizontal className="h-3.5 w-3.5" />
                语言
              </span>
              <AdminSelect ariaLabel="筛选语言" value={locale} onChange={setLocale} options={localeSelectOptions} />
            </label>
            <label>
              <span className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-muted">
                <SlidersHorizontal className="h-3.5 w-3.5" />
                状态
              </span>
              <AdminSelect ariaLabel="筛选状态" value={status} onChange={setStatus} options={[...statusOptions]} />
            </label>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3 text-sm text-muted">
          <span aria-live="polite">
            当前显示 <strong className="text-foreground">{filteredArticles.length}</strong> / {items.length} 篇文章
          </span>
          {query || locale !== allValue || status !== allValue ? (
            <button
              className="admin-btn admin-btn-secondary inline-flex h-8 items-center px-3 text-xs font-semibold"
              type="button"
              onClick={() => {
                setQuery("");
                setLocale(allValue);
                setStatus(allValue);
              }}
            >
              清空筛选
            </button>
          ) : null}
          {message ? (
            <span className={message.includes("失败") ? "font-semibold text-red-700" : "font-semibold text-accent"} role={message.includes("失败") ? "alert" : "status"}>
              {message}
            </span>
          ) : null}
        </div>
      </section>

      {filteredArticles.length === 0 ? (
        <div className="admin-surface mt-4 p-8 text-muted">
          <h2 className="text-xl font-semibold text-foreground">没有匹配的文章</h2>
          <p className="mt-2 leading-7">换一个关键词，或者清空语言和状态筛选后再试。</p>
        </div>
      ) : (
        <div className="mt-4 grid gap-4">
          {filteredArticles.map((article) => {
          const isArchived = article.status === "archived";

          return (
            <article key={article.id} className={cn("admin-card min-w-0 p-5", isArchived ? "border-amber-200 bg-amber-50/35" : undefined)}>
              <div className="flex flex-wrap items-center gap-3 text-sm text-muted">
                <span className={cn("admin-muted-pill inline-flex h-7 items-center px-2.5 text-xs font-semibold", isArchived ? "border-amber-300 bg-amber-50 text-amber-900" : "text-accent")}>
                  {statusLabel(article.status)}
                </span>
                <span className="font-semibold text-accent">{article.locale}</span>
                <span>{article.visibility}</span>
                <span>{article.readingMinutes} 分钟</span>
                <span>{article.viewCount.toLocaleString("zh-CN")} 次阅读</span>
                <span>发布于 {formatDate(article.publishedAt)}</span>
                <span>更新于 {formatDate(article.updatedAt)}</span>
              </div>
              <h2 className="mt-3 break-words text-2xl font-semibold text-foreground [overflow-wrap:anywhere]">{article.title}</h2>
              <p className="mt-2 break-words leading-7 text-muted [overflow-wrap:anywhere]">{article.summary || "暂无摘要"}</p>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <p className="break-all font-mono text-sm text-muted">{article.slug}</p>
                {!isArchived ? (
                  <>
                    <Link className="admin-btn admin-btn-secondary inline-flex h-9 items-center gap-2 px-3 text-sm font-semibold" href={`/admin/articles/published/${article.locale}/${article.slug}`}>
                      <PenLine className="h-4 w-4" />
                      编辑
                    </Link>
                    <Link className="admin-btn admin-btn-secondary inline-flex h-9 items-center gap-2 px-3 text-sm font-semibold" href={publicArticleUrl(article)} rel="noreferrer" target="_blank">
                      <ExternalLink className="h-4 w-4" />
                      前台查看
                    </Link>
                    <button className="admin-btn admin-btn-secondary inline-flex h-9 items-center gap-2 px-3 text-sm font-semibold" type="button" onClick={() => setPendingAction({ type: "archive", article })} disabled={Boolean(busyKey)}>
                      {busyKey === `archive:${article.locale}:${article.slug}` ? <Loader2 className="h-4 w-4 animate-spin" /> : <Archive className="h-4 w-4" />}
                      逻辑下架
                    </button>
                  </>
                ) : (
                  <button className="admin-btn admin-btn-primary inline-flex h-9 items-center gap-2 px-3 text-sm font-semibold" type="button" onClick={() => setPendingAction({ type: "restore", article })} disabled={Boolean(busyKey)}>
                    {busyKey === `restore:${article.locale}:${article.slug}` ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
                    重新上架
                  </button>
                )}
                <button className="admin-btn admin-btn-danger inline-flex h-9 items-center gap-2 px-3 text-sm font-semibold" type="button" onClick={() => setPendingAction({ type: "delete", article })} disabled={Boolean(busyKey)}>
                  {busyKey === `delete:${article.locale}:${article.slug}` ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  物理删除
                </button>
              </div>
            </article>
          );
          })}
        </div>
      )}
    </>
  );
}
