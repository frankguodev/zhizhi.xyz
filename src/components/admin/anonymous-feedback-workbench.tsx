"use client";

import { Archive, CheckCircle2, ExternalLink, Loader2, RotateCcw, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { handleAdminUnauthorized } from "@/components/admin/admin-api";
import { AdminConfirmDialog } from "@/components/admin/admin-confirm-dialog";
import { AdminSelect } from "@/components/admin/admin-select";
import type { AdminAnonymousFeedback, AnonymousFeedbackStatus } from "@/lib/anonymous-feedback";

type SaveState = {
  status: "idle" | "saving" | "deleting" | "saved" | "error";
  message: string;
};

const allValue = "all";
const statusOptions = [
  { value: allValue, label: "全部状态" },
  { value: "new", label: "新反馈" },
  { value: "reviewed", label: "已处理" },
  { value: "archived", label: "已归档" },
] as const;
const localeOptions = [
  { value: allValue, label: "全部语言" },
  { value: "zh", label: "中文" },
  { value: "en", label: "English" },
] as const;
const statusLabels: Record<AnonymousFeedbackStatus, string> = {
  new: "新反馈",
  reviewed: "已处理",
  archived: "已归档",
};

function formatDate(value: Date | string | number) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "未知时间" : date.toLocaleString("zh-CN");
}

function getErrorMessage(data: unknown, fallback: string) {
  if (typeof data === "object" && data !== null && "error" in data && typeof data.error === "string") {
    return data.error;
  }

  return fallback;
}

function statusClass(status: AnonymousFeedbackStatus) {
  if (status === "new") {
    return "border-accent/30 bg-accent/10 text-accent";
  }

  if (status === "reviewed") {
    return "border-line bg-surface text-foreground";
  }

  return "border-line bg-background text-muted";
}

export function AnonymousFeedbackWorkbench({ initialFeedback }: { initialFeedback: AdminAnonymousFeedback[] }) {
  const [feedback, setFeedback] = useState(initialFeedback);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>(allValue);
  const [localeFilter, setLocaleFilter] = useState<string>(allValue);
  const [pendingDelete, setPendingDelete] = useState<AdminAnonymousFeedback | null>(null);
  const [saveState, setSaveState] = useState<SaveState>({ status: "idle", message: "" });
  const busy = saveState.status === "saving" || saveState.status === "deleting";
  const filteredFeedback = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return feedback.filter((item) => {
      if (statusFilter !== allValue && item.status !== statusFilter) {
        return false;
      }

      if (localeFilter !== allValue && item.locale !== localeFilter) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      return (
        item.content.toLowerCase().includes(normalizedQuery) ||
        (item.contact ?? "").toLowerCase().includes(normalizedQuery) ||
        (item.articleSlug ?? "").toLowerCase().includes(normalizedQuery) ||
        (item.articleTitle ?? "").toLowerCase().includes(normalizedQuery) ||
        item.pageUrl.toLowerCase().includes(normalizedQuery)
      );
    });
  }, [feedback, localeFilter, query, statusFilter]);

  function clearFilters() {
    setQuery("");
    setStatusFilter(allValue);
    setLocaleFilter(allValue);
  }

  async function updateStatus(item: AdminAnonymousFeedback, status: AnonymousFeedbackStatus) {
    setSaveState({ status: "saving", message: "正在更新反馈状态..." });

    try {
      const response = await fetch(`/api/admin/feedback/${encodeURIComponent(item.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await response.json();

      if (handleAdminUnauthorized(response)) {
        throw new Error("登录已过期，正在跳转后台登录。");
      }

      if (!response.ok) {
        throw new Error(getErrorMessage(data, "更新反馈状态失败"));
      }

      setFeedback((data as { feedback: AdminAnonymousFeedback[] }).feedback ?? []);
      setSaveState({ status: "saved", message: "反馈状态已更新" });
    } catch (error) {
      setSaveState({ status: "error", message: error instanceof Error ? error.message : "更新反馈状态失败" });
    }
  }

  async function deleteFeedback(item: AdminAnonymousFeedback) {
    setSaveState({ status: "deleting", message: "正在删除反馈..." });

    try {
      const response = await fetch(`/api/admin/feedback/${encodeURIComponent(item.id)}`, {
        method: "DELETE",
      });
      const data = await response.json();

      if (handleAdminUnauthorized(response)) {
        throw new Error("登录已过期，正在跳转后台登录。");
      }

      if (!response.ok) {
        throw new Error(getErrorMessage(data, "删除反馈失败"));
      }

      setFeedback((data as { feedback: AdminAnonymousFeedback[] }).feedback ?? []);
      setPendingDelete(null);
      setSaveState({ status: "saved", message: "反馈已删除" });
    } catch (error) {
      setSaveState({ status: "error", message: error instanceof Error ? error.message : "删除反馈失败" });
    }
  }

  return (
    <>
      <AdminConfirmDialog
        open={Boolean(pendingDelete)}
        title="删除匿名反馈"
        description="确定删除这条反馈吗？删除后不可恢复。"
        confirmLabel="删除反馈"
        busy={saveState.status === "deleting"}
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          if (pendingDelete) {
            void deleteFeedback(pendingDelete);
          }
        }}
      />

      <section className="admin-surface p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-semibold text-accent">反馈列表</p>
            <h2 className="mt-1 text-2xl font-semibold text-foreground">读者匿名反馈</h2>
          </div>
          <span className="text-sm font-semibold text-muted" aria-live="polite">
            {filteredFeedback.length} / {feedback.length} 条
          </span>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto_auto]">
          <input
            className="h-11 rounded-md border border-line bg-background px-3 text-sm outline-none focus:border-accent"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索反馈内容、联系方式、文章标题或 URL"
          />
          <AdminSelect ariaLabel="筛选反馈状态" value={statusFilter} onChange={setStatusFilter} options={[...statusOptions]} />
          <AdminSelect ariaLabel="筛选反馈语言" value={localeFilter} onChange={setLocaleFilter} options={[...localeOptions]} />
        </div>

        {query || statusFilter !== allValue || localeFilter !== allValue ? (
          <div className="mt-3 flex justify-end">
            <button className="admin-btn admin-btn-secondary inline-flex h-8 items-center px-3 text-xs font-semibold" type="button" onClick={clearFilters}>
              清空筛选
            </button>
          </div>
        ) : null}

        {saveState.message ? (
          <p className={saveState.status === "error" ? "mt-3 text-sm font-medium text-red-700" : "mt-3 text-sm font-medium text-accent"} role={saveState.status === "error" ? "alert" : "status"}>
            {saveState.message}
          </p>
        ) : null}

        <div className="mt-5 grid gap-3">
          {filteredFeedback.length > 0 ? (
            filteredFeedback.map((item) => (
              <article key={item.id} className="admin-card-flat min-w-0 p-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-muted">
                      <span className={`rounded-md border px-2 py-1 text-xs ${statusClass(item.status)}`}>{statusLabels[item.status]}</span>
                      <span>{item.locale}</span>
                      <span>{item.feedbackType === "article" ? "文章反馈" : "站点反馈"}</span>
                      <span>{formatDate(item.createdAt)}</span>
                    </div>
                    {item.articleTitle ? <h3 className="mt-3 break-words text-lg font-semibold text-foreground [overflow-wrap:anywhere]">{item.articleTitle}</h3> : null}
                    <p className="mt-3 whitespace-pre-wrap break-words leading-7 text-foreground [overflow-wrap:anywhere]">{item.content}</p>
                    <div className="mt-3 grid gap-2 text-sm text-muted">
                      {item.contact ? <p className="break-words [overflow-wrap:anywhere]">联系方式：{item.contact}</p> : null}
                      {item.articleSlug ? <p className="break-words [overflow-wrap:anywhere]">文章：{item.articleSlug}</p> : null}
                      <a className="inline-flex items-center gap-2 break-all font-semibold text-accent" href={item.pageUrl} target="_blank" rel="noreferrer">
                        {item.pageUrl}
                        <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                      </a>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    {item.status !== "reviewed" ? (
                      <button className="admin-btn admin-btn-secondary inline-flex h-10 items-center gap-2 px-3 text-sm font-semibold" type="button" disabled={busy} onClick={() => void updateStatus(item, "reviewed")}>
                        {saveState.status === "saving" ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                        标记处理
                      </button>
                    ) : (
                      <button className="admin-btn admin-btn-secondary inline-flex h-10 items-center gap-2 px-3 text-sm font-semibold" type="button" disabled={busy} onClick={() => void updateStatus(item, "new")}>
                        <RotateCcw className="h-4 w-4" />
                        重新打开
                      </button>
                    )}
                    {item.status !== "archived" ? (
                      <button className="admin-btn admin-btn-secondary inline-flex h-10 items-center gap-2 px-3 text-sm font-semibold" type="button" disabled={busy} onClick={() => void updateStatus(item, "archived")}>
                        <Archive className="h-4 w-4" />
                        归档
                      </button>
                    ) : null}
                    <button className="admin-btn admin-btn-danger inline-flex h-10 items-center gap-2 px-3 text-sm font-semibold" type="button" disabled={busy} onClick={() => setPendingDelete(item)}>
                      <Trash2 className="h-4 w-4" />
                      删除
                    </button>
                  </div>
                </div>
              </article>
            ))
          ) : (
            <div className="admin-card-flat p-6 text-muted">
              {feedback.length > 0 ? "没有匹配的反馈。换个关键词或筛选条件再试。" : "还没有收到匿名反馈。文章底部提交后会出现在这里。"}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
