"use client";

import Link from "next/link";
import { Archive, CheckCircle2, Edit, ExternalLink, Loader2, RefreshCw, RotateCcw, Save, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { AdminConfirmDialog } from "@/components/admin/admin-confirm-dialog";
import { adminApiErrorMessage, handleAdminUnauthorized } from "@/components/admin/admin-api";
import type { AdminAiTermItem, AiTermStatus, AiTermVisibility } from "@/lib/ai-terms";

type FilterState = {
  q: string;
  locale: "all" | "zh" | "en";
  status: "all" | AiTermStatus;
  visibility: "all" | AiTermVisibility;
};

type SaveState = {
  status: "idle" | "loading" | "saving" | "acting" | "error" | "saved";
  message: string;
};

type RowAction = "publish" | "archive" | "restore" | "delete";
type BulkAction = RowAction | "markReviewed" | "unmarkReviewed" | "setTrending" | "unsetTrending";

type PendingAction = {
  action: RowAction;
  term: AdminAiTermItem;
};

const statusLabels: Record<AiTermStatus, string> = {
  draft: "草稿",
  published: "已发布",
  archived: "已归档",
};

const visibilityLabels: Record<AiTermVisibility, string> = {
  public: "公开",
  login: "登录可见",
  hidden: "隐藏",
};

function dateText(value: Date | string | number | null | undefined) {
  if (!value) {
    return "未设置";
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "未知时间" : date.toLocaleString("zh-CN");
}

function publicPath(term: Pick<AdminAiTermItem, "locale" | "slug">) {
  return term.locale === "en" ? `/en/ai-terms/${term.slug}` : `/ai-terms/${term.slug}`;
}

function editPath(term: Pick<AdminAiTermItem, "locale" | "slug">) {
  return `/admin/ai-terms/${term.locale}/${term.slug}`;
}

function numberValue(value: string) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

type AiTermsWorkbenchProps = {
  initialAiTerms: AdminAiTermItem[];
  initialFilters?: Partial<FilterState>;
  emptyMessage?: string;
};

export function AiTermsWorkbench({ initialAiTerms, initialFilters, emptyMessage = "暂无 AI 词条。可以先从右上角导入一份发布稿。" }: AiTermsWorkbenchProps) {
  const [aiTerms, setAiTerms] = useState(initialAiTerms);
  const [filters, setFilters] = useState<FilterState>({ q: "", locale: "all", status: "all", visibility: "all", ...initialFilters });
  const [editing, setEditing] = useState<Record<string, AdminAiTermItem>>({});
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkAction, setBulkAction] = useState<BulkAction>("markReviewed");
  const [saveState, setSaveState] = useState<SaveState>({ status: "idle", message: "" });
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const busy = saveState.status === "loading" || saveState.status === "saving" || saveState.status === "acting";
  const filteredTerms = useMemo(() => {
    const q = filters.q.trim().toLowerCase();

    return aiTerms.filter((term) => {
      if (filters.locale !== "all" && term.locale !== filters.locale) return false;
      if (filters.status !== "all" && term.status !== filters.status) return false;
      if (filters.visibility !== "all" && term.visibility !== filters.visibility) return false;
      if (!q) return true;

      return (
        term.term.toLowerCase().includes(q) ||
        term.slug.toLowerCase().includes(q) ||
        (term.termZh ?? "").toLowerCase().includes(q) ||
        (term.fullName ?? "").toLowerCase().includes(q)
      );
    });
  }, [aiTerms, filters]);

  async function refresh() {
    setSaveState({ status: "loading", message: "正在刷新 AI 词条..." });

    const query = new URLSearchParams();
    if (filters.q.trim()) query.set("q", filters.q.trim());
    if (filters.locale !== "all") query.set("locale", filters.locale);
    if (filters.status !== "all") query.set("status", filters.status);
    if (filters.visibility !== "all") query.set("visibility", filters.visibility);

    try {
      const response = await fetch(`/api/admin/ai-terms?${query.toString()}`);
      const data: unknown = await response.json();

      if (handleAdminUnauthorized(response)) {
        return;
      }

      if (!response.ok) {
        throw new Error(adminApiErrorMessage(data, "刷新 AI 词条失败。"));
      }

      const payload = data as { aiTerms?: AdminAiTermItem[] };
      setAiTerms(payload.aiTerms ?? []);
      setEditing({});
      setSaveState({ status: "idle", message: "" });
    } catch (error) {
      setSaveState({ status: "error", message: error instanceof Error ? error.message : "刷新 AI 词条失败。" });
    }
  }

  function updateDraft(id: string, patch: Partial<AdminAiTermItem>) {
    setEditing((value) => {
      const source = value[id] ?? aiTerms.find((term) => term.id === id);
      if (!source) return value;
      return {
        ...value,
        [id]: {
          ...source,
          ...patch,
        },
      };
    });
  }

  async function saveTerm(id: string) {
    const draft = editing[id] ?? aiTerms.find((term) => term.id === id);
    if (!draft) return;

    setSaveState({ status: "saving", message: `正在保存 ${draft.term}...` });

    try {
      const response = await fetch("/api/admin/ai-terms", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          status: draft.status,
          visibility: draft.visibility,
          heatScore: draft.heatScore,
          qualityScore: draft.qualityScore,
          trending: draft.trending,
          sortOrder: draft.sortOrder,
          humanReviewed: draft.humanReviewed,
          listLocale: filters.locale,
          listStatus: filters.status,
          listVisibility: filters.visibility,
          listQ: filters.q.trim(),
        }),
      });
      const data: unknown = await response.json();

      if (handleAdminUnauthorized(response)) {
        return;
      }

      if (!response.ok) {
        throw new Error(adminApiErrorMessage(data, "保存 AI 词条失败。"));
      }

      const payload = data as { aiTerms?: AdminAiTermItem[] };
      setAiTerms(payload.aiTerms ?? aiTerms);
      setEditing((value) => {
        const next = { ...value };
        delete next[id];
        return next;
      });
      setSaveState({ status: "saved", message: `已保存 ${draft.term}` });
    } catch (error) {
      setSaveState({ status: "error", message: error instanceof Error ? error.message : "保存 AI 词条失败。" });
    }
  }

  async function runRowAction(pending: PendingAction) {
    setSaveState({ status: "acting", message: `正在处理 ${pending.term.term}...` });

    try {
      const url =
        pending.action === "publish"
          ? `/api/admin/ai-terms/${pending.term.locale}/${pending.term.slug}/publish`
          : `/api/admin/ai-terms/${pending.term.locale}/${pending.term.slug}`;
      const response = await fetch(url, {
        method: pending.action === "delete" ? "DELETE" : pending.action === "publish" ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: pending.action === "archive" || pending.action === "restore" ? JSON.stringify({ action: pending.action }) : undefined,
      });
      const data: unknown = await response.json();

      if (handleAdminUnauthorized(response)) {
        return;
      }

      if (!response.ok) {
        throw new Error(adminApiErrorMessage(data, "AI 词条操作失败。"));
      }

      if (pending.action === "delete") {
        setAiTerms((value) => value.filter((term) => term.id !== pending.term.id));
      } else {
        await refresh();
      }

      setEditing((value) => {
        const next = { ...value };
        delete next[pending.term.id];
        return next;
      });
      setSaveState({ status: "saved", message: `已完成 ${pending.term.term}` });
    } catch (error) {
      setSaveState({ status: "error", message: error instanceof Error ? error.message : "AI 词条操作失败。" });
    }
  }

  function toggleSelected(id: string, checked: boolean) {
    setSelectedIds((value) => (checked ? [...new Set([...value, id])] : value.filter((item) => item !== id)));
  }

  function toggleAllVisible(checked: boolean) {
    setSelectedIds(checked ? filteredTerms.map((term) => term.id) : []);
  }

  async function runBulkAction() {
    if (selectedIds.length === 0) {
      setSaveState({ status: "error", message: "请先选择要批量操作的 AI 词条。" });
      return;
    }

    setSaveState({ status: "acting", message: `正在批量处理 ${selectedIds.length} 条 AI 词条...` });

    try {
      const response = await fetch("/api/admin/ai-terms/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedIds, action: bulkAction }),
      });
      const data: unknown = await response.json();
      if (handleAdminUnauthorized(response)) return;
      if (!response.ok) throw new Error(adminApiErrorMessage(data, "批量操作失败。"));
      const payload = data as { aiTerms?: AdminAiTermItem[]; results?: Array<{ ok: boolean }> };
      setAiTerms(payload.aiTerms ?? aiTerms);
      setSelectedIds([]);
      const failed = payload.results?.filter((item) => !item.ok).length ?? 0;
      setSaveState({ status: "saved", message: failed > 0 ? `批量操作完成，${failed} 条失败。` : "批量操作完成。" });
    } catch (error) {
      setSaveState({ status: "error", message: error instanceof Error ? error.message : "批量操作失败。" });
    }
  }

  const actionMeta = pendingAction
    ? {
        publish: { title: "发布 AI 词条", description: "发布前会执行后台质量检查，存在错误时会阻止发布。", label: "发布", tone: "primary" as const },
        archive: { title: "归档 AI 词条", description: "归档后词条会被隐藏，不再进入公开内容范围。", label: "归档", tone: "danger" as const },
        restore: { title: "恢复 AI 词条", description: "恢复后词条会重新变为已发布公开状态。", label: "恢复", tone: "primary" as const },
        delete: { title: "删除 AI 词条", description: "这会物理删除词条和关联关系，操作不可撤销。", label: "确认删除", tone: "danger" as const },
      }[pendingAction.action]
    : null;

  return (
    <div className="space-y-6">
      <AdminConfirmDialog
        open={Boolean(pendingAction && actionMeta)}
        title={actionMeta?.title ?? ""}
        description={actionMeta?.description ?? ""}
        confirmLabel={actionMeta?.label ?? "确认"}
        tone={actionMeta?.tone ?? "danger"}
        busy={saveState.status === "acting"}
        details={
          pendingAction ? (
            <div className="grid gap-2 border border-line bg-background p-3 text-sm">
              <div className="font-semibold text-foreground">{pendingAction.term.term}</div>
              <div className="text-muted">{`${pendingAction.term.locale}/${pendingAction.term.slug}`}</div>
            </div>
          ) : null
        }
        onCancel={() => setPendingAction(null)}
        onConfirm={() => {
          const pending = pendingAction;
          setPendingAction(null);
          if (pending) void runRowAction(pending);
        }}
      />
      <section className="grid gap-3 border border-line bg-surface p-4 md:grid-cols-[minmax(220px,1fr)_140px_140px_140px_auto]">
        <input
          value={filters.q}
          onChange={(event) => setFilters((value) => ({ ...value, q: event.target.value }))}
          placeholder="搜索词条、slug、中文名或全称"
          className="h-11 border border-line bg-background px-3 text-sm outline-none focus:border-accent"
        />
        <select
          value={filters.locale}
          onChange={(event) => setFilters((value) => ({ ...value, locale: event.target.value as FilterState["locale"] }))}
          className="h-11 border border-line bg-background px-3 text-sm outline-none focus:border-accent"
        >
          <option value="all">全部语言</option>
          <option value="zh">中文</option>
          <option value="en">English</option>
        </select>
        <select
          value={filters.status}
          onChange={(event) => setFilters((value) => ({ ...value, status: event.target.value as FilterState["status"] }))}
          className="h-11 border border-line bg-background px-3 text-sm outline-none focus:border-accent"
        >
          <option value="all">全部状态</option>
          <option value="draft">草稿</option>
          <option value="published">已发布</option>
          <option value="archived">已归档</option>
        </select>
        <select
          value={filters.visibility}
          onChange={(event) => setFilters((value) => ({ ...value, visibility: event.target.value as FilterState["visibility"] }))}
          className="h-11 border border-line bg-background px-3 text-sm outline-none focus:border-accent"
        >
          <option value="all">全部可见性</option>
          <option value="public">公开</option>
          <option value="login">登录可见</option>
          <option value="hidden">隐藏</option>
        </select>
        <button
          type="button"
          onClick={refresh}
          disabled={busy}
          className="admin-btn admin-btn-secondary inline-flex h-11 items-center justify-center gap-2 px-4 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saveState.status === "loading" ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          刷新
        </button>
      </section>

      <section className="flex flex-col gap-3 border border-line bg-surface p-4 md:flex-row md:items-center md:justify-between">
        <div className="text-sm text-muted">已选择 {selectedIds.length} 条词条</div>
        <div className="flex flex-wrap gap-2">
          <select value={bulkAction} onChange={(event) => setBulkAction(event.target.value as BulkAction)} className="h-10 border border-line bg-background px-3 text-sm">
            <option value="markReviewed">标记人审</option>
            <option value="unmarkReviewed">取消人审</option>
            <option value="setTrending">设为热门</option>
            <option value="unsetTrending">取消热门</option>
            <option value="publish">发布</option>
            <option value="archive">归档</option>
            <option value="restore">恢复</option>
            <option value="delete">物理删除已归档</option>
          </select>
          <button type="button" onClick={runBulkAction} disabled={busy || selectedIds.length === 0} className="admin-btn admin-btn-primary h-10 px-4 text-sm font-semibold disabled:opacity-60">
            批量执行
          </button>
        </div>
      </section>

      {saveState.message ? (
        <p
          className={`whitespace-pre-line border px-4 py-3 text-sm ${
            saveState.status === "error" ? "border-red-200 bg-red-50 text-red-700" : "border-line bg-surface text-muted"
          }`}
        >
          {saveState.message}
        </p>
      ) : null}

      <section className="overflow-x-auto border border-line bg-surface">
        <table className="min-w-[1120px] w-full border-collapse text-left text-sm">
          <thead className="border-b border-line bg-background text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-4 py-3">
                <input
                  type="checkbox"
                  checked={filteredTerms.length > 0 && filteredTerms.every((term) => selectedIds.includes(term.id))}
                  onChange={(event) => toggleAllVisible(event.target.checked)}
                  aria-label="选择当前列表全部词条"
                />
              </th>
              <th className="px-4 py-3">词条</th>
              <th className="px-4 py-3">状态</th>
              <th className="px-4 py-3">可见性</th>
              <th className="px-4 py-3">分数</th>
              <th className="px-4 py-3">排序</th>
              <th className="px-4 py-3">审核</th>
              <th className="px-4 py-3">更新时间</th>
              <th className="px-4 py-3">操作</th>
            </tr>
          </thead>
          <tbody>
            {filteredTerms.length > 0 ? (
              filteredTerms.map((term) => {
                const draft = editing[term.id] ?? term;
                const dirty = Boolean(editing[term.id]);

                return (
                  <tr key={term.id} className="border-b border-line align-top last:border-b-0">
                    <td className="px-4 py-4">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(term.id)}
                        onChange={(event) => toggleSelected(term.id, event.target.checked)}
                        aria-label={`选择 ${term.term}`}
                      />
                    </td>
                    <td className="max-w-sm px-4 py-4">
                      <div className="font-semibold text-foreground">{term.term}</div>
                      <div className="mt-1 text-xs text-muted">{term.termZh || term.fullName || term.slug}</div>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {term.categories.map((category) => (
                          <span key={category.slug} className="border border-line bg-background px-2 py-0.5 text-xs text-muted">
                            {category.name}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <select
                        value={draft.status}
                        onChange={(event) => updateDraft(term.id, { status: event.target.value as AiTermStatus })}
                        className="h-9 border border-line bg-background px-2 text-sm"
                      >
                        {Object.entries(statusLabels).map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-4">
                      <select
                        value={draft.visibility}
                        onChange={(event) => updateDraft(term.id, { visibility: event.target.value as AiTermVisibility })}
                        className="h-9 border border-line bg-background px-2 text-sm"
                      >
                        {Object.entries(visibilityLabels).map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex gap-2">
                        <label className="text-xs text-muted">
                          热度
                          <input
                            value={draft.heatScore}
                            onChange={(event) => updateDraft(term.id, { heatScore: numberValue(event.target.value) })}
                            className="mt-1 h-9 w-16 border border-line bg-background px-2 text-sm text-foreground"
                            inputMode="numeric"
                          />
                        </label>
                        <label className="text-xs text-muted">
                          质量
                          <input
                            value={draft.qualityScore}
                            onChange={(event) => updateDraft(term.id, { qualityScore: numberValue(event.target.value) })}
                            className="mt-1 h-9 w-16 border border-line bg-background px-2 text-sm text-foreground"
                            inputMode="numeric"
                          />
                        </label>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <input
                        value={draft.sortOrder}
                        onChange={(event) => updateDraft(term.id, { sortOrder: numberValue(event.target.value) })}
                        className="h-9 w-20 border border-line bg-background px-2 text-sm text-foreground"
                        inputMode="numeric"
                      />
                    </td>
                    <td className="px-4 py-4">
                      <label className="flex items-center gap-2 text-sm text-muted">
                        <input
                          type="checkbox"
                          checked={draft.trending}
                          onChange={(event) => updateDraft(term.id, { trending: event.target.checked })}
                        />
                        热门
                      </label>
                      <label className="mt-2 flex items-center gap-2 text-sm text-muted">
                        <input
                          type="checkbox"
                          checked={draft.humanReviewed}
                          onChange={(event) => updateDraft(term.id, { humanReviewed: event.target.checked })}
                        />
                        人审
                      </label>
                    </td>
                    <td className="px-4 py-4 text-xs text-muted">{dateText(term.updatedAt)}</td>
                    <td className="px-4 py-4">
                      <div className="flex flex-col gap-2">
                        <Link href={editPath(term)} className="admin-btn admin-btn-secondary inline-flex h-9 items-center justify-center gap-2 px-3 text-xs font-semibold">
                          <Edit className="h-3.5 w-3.5" />
                          编辑
                        </Link>
                        <button
                          type="button"
                          onClick={() => saveTerm(term.id)}
                          disabled={!dirty || saveState.status === "saving"}
                          className="admin-btn admin-btn-primary inline-flex h-9 items-center justify-center gap-2 px-3 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {saveState.status === "saving" && dirty ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                          保存
                        </button>
                        {term.status === "archived" ? (
                          <button
                            type="button"
                            onClick={() => setPendingAction({ action: "restore", term })}
                            disabled={busy}
                            className="admin-btn admin-btn-secondary inline-flex h-9 items-center justify-center gap-2 px-3 text-xs font-semibold disabled:opacity-60"
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                            恢复
                          </button>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => setPendingAction({ action: "publish", term })}
                              disabled={busy}
                              className="admin-btn admin-btn-secondary inline-flex h-9 items-center justify-center gap-2 px-3 text-xs font-semibold disabled:opacity-60"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              发布
                            </button>
                            <button
                              type="button"
                              onClick={() => setPendingAction({ action: "archive", term })}
                              disabled={busy}
                              className="admin-btn admin-btn-secondary inline-flex h-9 items-center justify-center gap-2 px-3 text-xs font-semibold disabled:opacity-60"
                            >
                              <Archive className="h-3.5 w-3.5" />
                              归档
                            </button>
                          </>
                        )}
                        <Link href={publicPath(term)} className="admin-btn admin-btn-secondary inline-flex h-9 items-center justify-center gap-2 px-3 text-xs font-semibold">
                          <ExternalLink className="h-3.5 w-3.5" />
                          前台
                        </Link>
                        {term.status === "archived" ? (
                          <button
                            type="button"
                            onClick={() => setPendingAction({ action: "delete", term })}
                            disabled={busy}
                            className="admin-btn inline-flex h-9 items-center justify-center gap-2 bg-red-700 px-3 text-xs font-semibold text-white disabled:opacity-60"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            物理删除
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={9} className="px-4 py-12 text-center text-muted">
                  {emptyMessage}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
