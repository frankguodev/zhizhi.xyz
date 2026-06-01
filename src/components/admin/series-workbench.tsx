"use client";

import Link from "next/link";
import { ArrowUpDown, BookOpen, ExternalLink, Layers3, Loader2, Plus, Save, Trash2 } from "lucide-react";
import { useState } from "react";
import { handleAdminUnauthorized } from "@/components/admin/admin-api";
import { AdminConfirmDialog } from "@/components/admin/admin-confirm-dialog";
import { AdminSelect } from "@/components/admin/admin-select";
import type { AdminSeriesArticleChoice, AdminSeriesItem, SeriesStatus } from "@/lib/series";
import type { Locale } from "@/lib/site";

type FormState = {
  locale: Locale;
  title: string;
  slug: string;
  description: string;
  coverImage: string;
  status: SeriesStatus;
  sortOrder: number;
  articleIds: string[];
};

type SaveState = {
  status: "idle" | "saving" | "deleting" | "saved" | "error";
  message: string;
};

const emptyForm: FormState = {
  locale: "zh",
  title: "",
  slug: "",
  description: "",
  coverImage: "",
  status: "draft",
  sortOrder: 0,
  articleIds: [],
};

const statusLabels: Record<SeriesStatus, string> = {
  draft: "草稿",
  published: "已发布",
  archived: "已归档",
};
const localeOptions = [{ value: "zh", label: "中文" }] as const;

function getErrorMessage(data: unknown, fallback: string) {
  if (typeof data === "object" && data !== null && "error" in data && typeof data.error === "string") {
    return data.error;
  }

  return fallback;
}

function getHintMessage(data: unknown) {
  if (typeof data === "object" && data !== null && "hint" in data && typeof data.hint === "string") {
    return data.hint;
  }

  return "";
}

function slugify(value: string) {
  return (
    value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-")
      .replace(/^-+|-+$/g, "") || "untitled"
  );
}

function toPayload(form: FormState) {
  return {
    locale: form.locale,
    title: form.title.trim(),
    slug: slugify(form.slug || form.title),
    description: form.description.trim(),
    coverImage: form.coverImage.trim() || null,
    status: form.status,
    sortOrder: Number.isFinite(form.sortOrder) ? form.sortOrder : 0,
    articleIds: form.articleIds,
  };
}

function validateForm(form: FormState) {
  const title = form.title.trim();
  const slug = slugify(form.slug || form.title);
  const description = form.description.trim();

  if (!title) {
    return "请先填写专题标题。";
  }

  if (!/^[a-z0-9\u4e00-\u9fa5-]+$/.test(slug)) {
    return "Slug 仅支持小写字母、数字、中文和连字符。";
  }

  if (!description) {
    return "请先填写专题描述。";
  }

  if (description.length > 800) {
    return "专题描述最多 800 个字符。";
  }

  if (form.coverImage.trim().length > 500) {
    return "封面图 URL 最多 500 个字符。";
  }

  if (form.sortOrder < 0 || form.sortOrder > 9999) {
    return "排序值需要在 0 到 9999 之间。";
  }

  if (form.articleIds.length > 100) {
    return "一个专题最多加入 100 篇文章。";
  }

  return "";
}

function articleTitle(articleChoices: AdminSeriesArticleChoice[], id: string) {
  return articleChoices.find((article) => article.id === id)?.title ?? id;
}

function articleMeta(articleChoices: AdminSeriesArticleChoice[], id: string) {
  return articleChoices.find((article) => article.id === id) ?? null;
}

function formatDate(value: Date | string | number | null) {
  if (!value) {
    return "未设置时间";
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "未知时间" : date.toLocaleDateString("zh-CN");
}

function publicSeriesPath(item: Pick<AdminSeriesItem, "slug">) {
  return `/series/${item.slug}`;
}

export function SeriesWorkbench({
  initialSeries,
  articleChoices,
}: {
  initialSeries: AdminSeriesItem[];
  articleChoices: AdminSeriesArticleChoice[];
}) {
  const [seriesList, setSeriesList] = useState(initialSeries);
  const [articles, setArticles] = useState(articleChoices);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<AdminSeriesItem | null>(null);
  const [confirmEmptyPublished, setConfirmEmptyPublished] = useState(false);
  const [articleQuery, setArticleQuery] = useState("");
  const [saveState, setSaveState] = useState<SaveState>({ status: "idle", message: "" });
  const busy = saveState.status === "saving" || saveState.status === "deleting";
  const formError = validateForm(form);
  const statusOptions = Object.entries(statusLabels).map(([value, label]) => ({ value, label }));
  const filteredArticles = articles.filter((article) => {
    const normalizedQuery = articleQuery.trim().toLowerCase();
    if (article.locale !== form.locale) {
      return false;
    }

    if (!normalizedQuery) {
      return true;
    }

    return (
      article.title.toLowerCase().includes(normalizedQuery) ||
      article.slug.toLowerCase().includes(normalizedQuery) ||
      article.locale.toLowerCase().includes(normalizedQuery) ||
      (article.category ?? "未分类").toLowerCase().includes(normalizedQuery) ||
      formatDate(article.publishedAt).includes(normalizedQuery) ||
      `${article.readingMinutes}`.includes(normalizedQuery)
    );
  });

  function applyPayload(data: { seriesList?: AdminSeriesItem[]; articleChoices?: AdminSeriesArticleChoice[] }) {
    setSeriesList(data.seriesList ?? []);
    setArticles(data.articleChoices ?? []);
  }

  function editSeries(item: AdminSeriesItem) {
    setEditingId(item.id);
    setForm({
      locale: item.locale,
      title: item.title,
      slug: item.slug,
      description: item.description,
      coverImage: item.coverImage ?? "",
      status: item.status,
      sortOrder: item.sortOrder,
      articleIds: item.articleIds,
    });
    setSaveState({ status: "idle", message: "" });
  }

  function resetForm() {
    setEditingId(null);
    setForm(emptyForm);
    setSaveState({ status: "idle", message: "" });
  }

  function toggleArticle(articleId: string) {
    setForm((value) => {
      if (value.articleIds.includes(articleId)) {
        return { ...value, articleIds: value.articleIds.filter((id) => id !== articleId) };
      }

      return { ...value, articleIds: [...value.articleIds, articleId] };
    });
  }

  function moveArticle(articleId: string, direction: -1 | 1) {
    setForm((value) => {
      const index = value.articleIds.indexOf(articleId);
      const nextIndex = index + direction;

      if (index < 0 || nextIndex < 0 || nextIndex >= value.articleIds.length) {
        return value;
      }

      const next = [...value.articleIds];
      [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
      return { ...value, articleIds: next };
    });
  }

  async function submitSeries() {
    if (formError) {
      setConfirmEmptyPublished(false);
      setSaveState({ status: "error", message: formError });
      return;
    }

    setConfirmEmptyPublished(false);
    setSaveState({ status: "saving", message: editingId ? "正在保存专题..." : "正在创建专题..." });

    try {
      const response = await fetch(editingId ? `/api/admin/series/${encodeURIComponent(editingId)}` : "/api/admin/series", {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toPayload(form)),
      });
      const data = await response.json();

      if (handleAdminUnauthorized(response)) {
        throw new Error("登录已过期，正在跳转后台登录。");
      }

      if (!response.ok) {
        const hint = getHintMessage(data);
        const message = getErrorMessage(data, "保存专题失败");
        throw new Error(hint ? `${message}\n${hint}` : message);
      }

      applyPayload(data as { seriesList: AdminSeriesItem[]; articleChoices: AdminSeriesArticleChoice[] });
      setEditingId(null);
      setForm(emptyForm);
      setSaveState({ status: "saved", message: "专题已保存" });
    } catch (error) {
      setSaveState({ status: "error", message: error instanceof Error ? error.message : "保存专题失败" });
    }
  }

  async function deleteCurrentSeries(id: string) {
    setSaveState({ status: "deleting", message: "正在删除专题..." });

    try {
      const response = await fetch(`/api/admin/series/${encodeURIComponent(id)}`, { method: "DELETE" });
      const data = await response.json();

      if (handleAdminUnauthorized(response)) {
        throw new Error("登录已过期，正在跳转后台登录。");
      }

      if (!response.ok) {
        const hint = getHintMessage(data);
        const message = getErrorMessage(data, "删除专题失败");
        throw new Error(hint ? `${message}\n${hint}` : message);
      }

      applyPayload(data as { seriesList: AdminSeriesItem[]; articleChoices: AdminSeriesArticleChoice[] });
      if (editingId === id) {
        resetForm();
      }
      setPendingDelete(null);
      setSaveState({ status: "saved", message: "专题已删除" });
    } catch (error) {
      setSaveState({ status: "error", message: error instanceof Error ? error.message : "删除专题失败" });
    }
  }

  function requestSubmitSeries() {
    if (formError) {
      setSaveState({ status: "error", message: formError });
      return;
    }

    if (form.status === "published" && form.articleIds.length === 0) {
      setConfirmEmptyPublished(true);
      return;
    }

    void submitSeries();
  }

  return (
    <>
      <AdminConfirmDialog
        open={Boolean(pendingDelete)}
        title="删除专题"
        description={`确定删除「${pendingDelete?.title ?? ""}」吗？删除后，前台专题页和对应详情页都会失去这条路线。`}
        confirmLabel="删除专题"
        busy={saveState.status === "deleting"}
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          if (pendingDelete) {
            void deleteCurrentSeries(pendingDelete.id);
          }
        }}
      />
      <AdminConfirmDialog
        open={confirmEmptyPublished}
        title="发布空专题？"
        description="当前专题还没有加入文章。公开列表会尽量过滤空专题，但这条记录仍会保存为已发布状态。仍然继续保存吗？"
        confirmLabel="继续保存"
        tone="primary"
        busy={saveState.status === "saving"}
        onCancel={() => setConfirmEmptyPublished(false)}
        onConfirm={() => void submitSeries()}
      />

      <div className="grid gap-8 xl:grid-cols-[0.9fr_1.1fr]">
      <section className="space-y-5">
        <div className="admin-surface min-w-0 p-5">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-accent">{editingId ? "编辑模式" : "新建专题"}</p>
              <h2 className="mt-1 break-words text-2xl font-semibold text-foreground">{editingId ? "编辑专题" : "新增专题"}</h2>
            </div>
            <Layers3 className="h-6 w-6 text-muted" />
          </div>

          <div className="mt-5 grid gap-4">
            <label className="grid gap-2">
              <span className="text-sm font-semibold text-foreground">标题</span>
              <input
                className="h-11 border border-line bg-background px-3 text-sm outline-none focus:border-accent"
                value={form.title}
                onChange={(event) => setForm((value) => ({ ...value, title: event.target.value }))}
                maxLength={120}
                placeholder="例如：AI 辅助写作路线"
              />
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-semibold text-foreground">Slug</span>
              <input
                className="h-11 border border-line bg-background px-3 text-sm outline-none focus:border-accent"
                value={form.slug}
                onChange={(event) => setForm((value) => ({ ...value, slug: event.target.value }))}
                maxLength={120}
                placeholder="ai-writing-path"
              />
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-semibold text-foreground">描述</span>
              <textarea
                className="min-h-28 resize-y border border-line bg-background p-3 text-sm leading-6 outline-none focus:border-accent"
                value={form.description}
                onChange={(event) => setForm((value) => ({ ...value, description: event.target.value }))}
                maxLength={800}
                placeholder="说明这个专题解决什么问题，适合谁阅读。"
              />
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-semibold text-foreground">封面图 URL</span>
              <input
                className="h-11 border border-line bg-background px-3 text-sm outline-none focus:border-accent"
                value={form.coverImage}
                onChange={(event) => setForm((value) => ({ ...value, coverImage: event.target.value }))}
                maxLength={500}
                placeholder="/media/articles/..."
              />
            </label>

            <div className="grid gap-4 sm:grid-cols-3">
              <label className="grid gap-2">
                <span className="text-sm font-semibold text-foreground">状态</span>
                <AdminSelect
                  ariaLabel="选择专题状态"
                  value={form.status}
                  onChange={(nextValue) => setForm((value) => ({ ...value, status: nextValue as SeriesStatus }))}
                  options={statusOptions}
                />
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-semibold text-foreground">语言</span>
                <AdminSelect
                  ariaLabel="选择专题语言"
                  value={form.locale}
                  onChange={(nextValue) => setForm((value) => ({ ...value, locale: nextValue as Locale }))}
                  options={[...localeOptions]}
                />
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-semibold text-foreground">排序</span>
                <input
                  className="h-11 border border-line bg-background px-3 text-sm outline-none focus:border-accent"
                  max={9999}
                  min={0}
                  type="number"
                  value={form.sortOrder}
                  onChange={(event) => setForm((value) => ({ ...value, sortOrder: Number(event.target.value || 0) }))}
                />
              </label>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              className="admin-btn admin-btn-primary inline-flex h-11 items-center justify-center gap-2 px-5 font-semibold disabled:opacity-60"
              type="button"
              onClick={requestSubmitSeries}
              disabled={busy}
              aria-busy={saveState.status === "saving"}
            >
              {saveState.status === "saving" ? <Loader2 className="h-4 w-4 animate-spin" /> : editingId ? <Save className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              {editingId ? "保存修改" : "新增专题"}
            </button>
            {editingId ? (
              <button className="admin-btn admin-btn-secondary inline-flex h-11 items-center justify-center px-5 font-semibold text-muted" type="button" onClick={resetForm}>
                取消编辑
              </button>
            ) : null}
          </div>

          {saveState.message ? (
            <p
              className={saveState.status === "error" ? "mt-3 whitespace-pre-line text-sm font-medium text-red-700" : "mt-3 text-sm font-medium text-accent"}
              role={saveState.status === "error" ? "alert" : "status"}
            >
              {saveState.message}
            </p>
          ) : null}
        </div>

        <div className="admin-surface min-w-0 p-5">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-accent">已选文章</p>
              <h2 className="mt-1 text-2xl font-semibold text-foreground">专题文章</h2>
            </div>
            <span className="shrink-0 text-sm font-semibold text-muted" aria-live="polite">{form.articleIds.length} 篇</span>
          </div>

          <div className="mt-5 grid gap-3">
            {form.articleIds.length > 0 ? (
              form.articleIds.map((articleId, index) => {
                const article = articleMeta(articles, articleId);

                return (
                <div key={articleId} className="admin-card-flat flex min-w-0 flex-col gap-3 p-3 sm:flex-row sm:items-center">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center bg-surface text-sm font-semibold text-accent">{index + 1}</span>
                  <div className="min-w-0 flex-1">
                    <p className="break-words text-sm font-semibold text-foreground [overflow-wrap:anywhere]">{article?.title ?? articleTitle(articles, articleId)}</p>
                    <p className="mt-1 break-words text-xs text-muted [overflow-wrap:anywhere]">
                      {article ? `${article.category ?? "未分类"} · ${article.locale} · ${formatDate(article.publishedAt)} · ${article.readingMinutes} 分钟` : "文章元信息缺失，建议重新选择"}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    <button className="admin-btn admin-btn-secondary h-8 px-2 text-sm disabled:opacity-40" type="button" onClick={() => moveArticle(articleId, -1)} disabled={index === 0}>
                      上移
                    </button>
                    <button className="admin-btn admin-btn-secondary h-8 px-2 text-sm disabled:opacity-40" type="button" onClick={() => moveArticle(articleId, 1)} disabled={index === form.articleIds.length - 1}>
                      下移
                    </button>
                    <button className="admin-btn h-8 px-2 text-sm font-semibold text-red-700" type="button" onClick={() => toggleArticle(articleId)}>
                      移除
                    </button>
                  </div>
                </div>
                );
              })
            ) : (
              <p className="admin-card-flat p-4 text-sm text-muted">还没有选择文章。发布专题前，建议至少加入一篇已发布文章。</p>
            )}
          </div>
        </div>
      </section>

      <section className="space-y-5">
        <div className="admin-surface min-w-0 p-5">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-accent">已发布文章</p>
              <h2 className="mt-1 text-2xl font-semibold text-foreground">可加入文章</h2>
              <p className="mt-2 text-sm text-muted">当前只显示与专题语言一致的已发布文章。</p>
            </div>
            <BookOpen className="h-6 w-6 text-muted" />
          </div>

          <input
            className="mt-5 h-11 w-full border border-line bg-background px-3 text-sm outline-none focus:border-accent"
            value={articleQuery}
            onChange={(event) => setArticleQuery(event.target.value)}
            placeholder="搜索标题、slug、分类、发布时间或阅读时间"
          />
          {articleQuery ? (
            <div className="mt-3 flex items-center justify-between gap-3 text-sm text-muted">
              <span aria-live="polite">匹配 {filteredArticles.length} 篇文章</span>
              <button className="admin-btn admin-btn-secondary inline-flex h-8 items-center px-3 text-xs font-semibold" type="button" onClick={() => setArticleQuery("")}>
                清空搜索
              </button>
            </div>
          ) : null}

          <div className="mt-5 grid max-h-[480px] gap-3 overflow-y-auto pr-1">
            {filteredArticles.length > 0 ? (
              filteredArticles.map((article) => {
                const selected = form.articleIds.includes(article.id);

                return (
                  <button
                    key={article.id}
                    className={selected ? "admin-card-flat border-accent p-4 text-left" : "admin-card-flat p-4 text-left transition hover:border-accent/50"}
                    type="button"
                    onClick={() => toggleArticle(article.id)}
                    aria-pressed={selected}
                  >
                    <span className="flex items-center justify-between gap-4">
                      <span className="min-w-0 break-words font-semibold text-foreground [overflow-wrap:anywhere]">{article.title}</span>
                      <span className="shrink-0 text-sm font-semibold text-accent">{selected ? "已加入" : "加入"}</span>
                    </span>
                    <span className="mt-2 block break-all font-mono text-xs text-muted">{article.slug}</span>
                    <span className="mt-2 block break-words text-xs text-muted [overflow-wrap:anywhere]">
                      {article.category ?? "未分类"} · {article.locale} · {formatDate(article.publishedAt)} · {article.readingMinutes} 分钟
                    </span>
                  </button>
                );
              })
            ) : (
              <p className="admin-card-flat p-4 text-sm text-muted">
                {articles.length > 0 ? "没有匹配的已发布文章。换个关键词再试。" : "当前没有可加入的已发布文章。先发布文章，再来创建专题路线。"}
              </p>
            )}
          </div>
        </div>

        <div className="admin-surface min-w-0 p-5">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-accent">专题列表</p>
              <h2 className="mt-1 text-2xl font-semibold text-foreground">专题列表</h2>
            </div>
            <ArrowUpDown className="h-6 w-6 text-muted" />
          </div>

          <div className="mt-5 grid gap-3">
            {seriesList.length > 0 ? (
              seriesList.map((item) => (
                <article key={item.id} className="admin-card-flat min-w-0 p-4">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2 text-sm text-muted">
                        <span className="font-semibold text-accent">{statusLabels[item.status]}</span>
                        <span>{item.locale}</span>
                        <span>{item.articleIds.length} 篇文章</span>
                        <span>排序 {item.sortOrder}</span>
                      </div>
                      <h3 className="mt-2 break-words text-xl font-semibold text-foreground [overflow-wrap:anywhere]">{item.title}</h3>
                      <p className="mt-2 break-words leading-7 text-muted [overflow-wrap:anywhere]">{item.description}</p>
                      {item.status === "published" ? (
                        <Link className="mt-3 inline-flex max-w-full items-center gap-2 break-all text-sm font-semibold text-accent" href={publicSeriesPath(item)}>
                          {publicSeriesPath(item)}
                          <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                        </Link>
                      ) : (
                        <p className="mt-3 break-all font-mono text-sm text-muted">{publicSeriesPath(item)}</p>
                      )}
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <button className="admin-btn admin-btn-secondary inline-flex h-10 items-center justify-center px-4 text-sm font-semibold" type="button" onClick={() => editSeries(item)}>
                        编辑
                      </button>
                      <button
                        className="admin-btn admin-btn-danger inline-flex h-10 items-center justify-center gap-2 px-4 text-sm font-semibold disabled:opacity-60"
                        type="button"
                        onClick={() => setPendingDelete(item)}
                        disabled={busy}
                        aria-busy={saveState.status === "deleting" && pendingDelete?.id === item.id}
                      >
                        <Trash2 className="h-4 w-4" />
                        删除
                      </button>
                    </div>
                  </div>
                </article>
              ))
            ) : (
              <p className="admin-card-flat p-6 text-muted">还没有专题。创建并发布专题后，前台 `/series` 会自动展示。</p>
            )}
          </div>
        </div>
      </section>
      </div>
    </>
  );
}
