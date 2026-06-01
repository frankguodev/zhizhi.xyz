"use client";

import { ExternalLink, Loader2, Plus, Save, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { handleAdminUnauthorized } from "@/components/admin/admin-api";
import { AdminConfirmDialog } from "@/components/admin/admin-confirm-dialog";
import { AdminSelect } from "@/components/admin/admin-select";
import type { AdminExternalLink, ExternalLinkPosition } from "@/lib/external-links";
import type { Locale } from "@/lib/site";

type FormState = {
  locale: Locale;
  title: string;
  description: string;
  url: string;
  position: ExternalLinkPosition;
  isActive: boolean;
  sortOrder: number;
};

type SaveState = {
  status: "idle" | "saving" | "deleting" | "saved" | "error";
  message: string;
};

const emptyForm: FormState = {
  locale: "zh",
  title: "",
  description: "",
  url: "",
  position: "donate",
  isActive: true,
  sortOrder: 0,
};

const positionLabels: Record<ExternalLinkPosition, string> = {
  home: "首页",
  article_footer: "文章底部",
  profile: "个人资料",
  donate: "捐赠页",
  site_footer: "站点底部",
};
const allValue = "all";
const localeOptions = [{ value: "zh", label: "中文" }] as const;
const statusFilterOptions = [
  { value: allValue, label: "全部状态" },
  { value: "active", label: "已启用" },
  { value: "inactive", label: "已停用" },
] as const;

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

function getHintMessage(data: unknown) {
  if (typeof data === "object" && data !== null && "hint" in data && typeof data.hint === "string") {
    return data.hint;
  }

  return "";
}

function toPayload(form: FormState) {
  return {
    locale: form.locale,
    title: form.title.trim(),
    description: form.description.trim() || null,
    url: form.url.trim(),
    position: form.position,
    isActive: form.isActive,
    sortOrder: Number.isFinite(form.sortOrder) ? form.sortOrder : 0,
  };
}

function isValidHttpUrl(value: string) {
  try {
    const url = new URL(value.trim());
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function formFromLink(link: AdminExternalLink): FormState {
  return {
    locale: link.locale,
    title: link.title,
    description: link.description ?? "",
    url: link.url,
    position: link.position,
    isActive: link.isActive,
    sortOrder: link.sortOrder,
  };
}

export function ExternalLinksWorkbench({ initialLinks }: { initialLinks: AdminExternalLink[] }) {
  const [links, setLinks] = useState(initialLinks);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<AdminExternalLink | null>(null);
  const [query, setQuery] = useState("");
  const [positionFilter, setPositionFilter] = useState<string>(allValue);
  const [localeFilter, setLocaleFilter] = useState<string>(allValue);
  const [statusFilter, setStatusFilter] = useState<string>(allValue);
  const [saveState, setSaveState] = useState<SaveState>({ status: "idle", message: "" });
  const busy = saveState.status === "saving" || saveState.status === "deleting";
  const trimmedTitle = form.title.trim();
  const trimmedUrl = form.url.trim();
  const formError =
    !trimmedTitle
      ? "请先填写标题。"
      : !trimmedUrl
        ? "请先填写链接地址。"
        : !isValidHttpUrl(trimmedUrl)
          ? "链接地址仅支持 http:// 或 https://。"
          : form.description.trim().length > 300
            ? "说明最多 300 个字符。"
            : form.sortOrder < 0 || form.sortOrder > 9999
              ? "排序值需要在 0 到 9999 之间。"
              : "";
  const linkLocaleOptions = useMemo(() => Array.from(new Set(links.map((link) => link.locale))).sort(), [links]);
  const positionOptions = useMemo(() => Object.entries(positionLabels).map(([value, label]) => ({ value, label })), []);
  const positionFilterOptions = useMemo(() => [{ value: allValue, label: "全部位置" }, ...positionOptions], [positionOptions]);
  const localeFilterOptions = useMemo(
    () => [{ value: allValue, label: "全部语言" }, ...linkLocaleOptions.map((linkLocale) => ({ value: linkLocale, label: linkLocale }))],
    [linkLocaleOptions],
  );
  const filteredLinks = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return links.filter((link) => {
      if (positionFilter !== allValue && link.position !== positionFilter) {
        return false;
      }

      if (localeFilter !== allValue && link.locale !== localeFilter) {
        return false;
      }

      if (statusFilter === "active" && !link.isActive) {
        return false;
      }

      if (statusFilter === "inactive" && link.isActive) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      return (
        link.title.toLowerCase().includes(normalizedQuery) ||
        (link.description ?? "").toLowerCase().includes(normalizedQuery) ||
        link.url.toLowerCase().includes(normalizedQuery) ||
        link.locale.toLowerCase().includes(normalizedQuery) ||
        positionLabels[link.position].toLowerCase().includes(normalizedQuery)
      );
    });
  }, [links, localeFilter, positionFilter, query, statusFilter]);

  function editLink(link: AdminExternalLink) {
    setEditingId(link.id);
    setForm(formFromLink(link));
    setSaveState({ status: "idle", message: "" });
  }

  function resetForm() {
    setEditingId(null);
    setForm(emptyForm);
    setSaveState({ status: "idle", message: "" });
  }

  function clearFilters() {
    setQuery("");
    setPositionFilter(allValue);
    setLocaleFilter(allValue);
    setStatusFilter(allValue);
  }

  async function submitLink() {
    if (formError) {
      setSaveState({ status: "error", message: formError });
      return;
    }

    setSaveState({ status: "saving", message: editingId ? "正在保存链接..." : "正在创建链接..." });

    try {
      const response = await fetch(editingId ? `/api/admin/links/${encodeURIComponent(editingId)}` : "/api/admin/links", {
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
        const message = getErrorMessage(data, "保存链接失败");
        throw new Error(hint ? `${message}\n${hint}` : message);
      }

      const nextLinks = (data as { links: AdminExternalLink[] }).links ?? [];
      setLinks(nextLinks);
      if (editingId) {
        const updated = nextLinks.find((link) => link.id === editingId);
        if (updated) {
          setForm(formFromLink(updated));
        }
      } else {
        setEditingId(null);
        setForm(emptyForm);
      }
      setSaveState({ status: "saved", message: "链接已保存" });
    } catch (error) {
      setSaveState({ status: "error", message: error instanceof Error ? error.message : "保存链接失败" });
    }
  }

  async function deleteLink(id: string) {
    setSaveState({ status: "deleting", message: "正在删除链接..." });

    try {
      const response = await fetch(`/api/admin/links/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      const data = await response.json();

      if (handleAdminUnauthorized(response)) {
        throw new Error("登录已过期，正在跳转后台登录。");
      }

      if (!response.ok) {
        const hint = getHintMessage(data);
        const message = getErrorMessage(data, "删除链接失败");
        throw new Error(hint ? `${message}\n${hint}` : message);
      }

      setLinks((data as { links: AdminExternalLink[] }).links ?? []);
      if (editingId === id) {
        resetForm();
      }
      setPendingDelete(null);
      setSaveState({ status: "saved", message: "链接已删除" });
    } catch (error) {
      setSaveState({ status: "error", message: error instanceof Error ? error.message : "删除链接失败" });
    }
  }

  return (
    <>
      <AdminConfirmDialog
        open={Boolean(pendingDelete)}
        title="删除外部链接"
        description={`确定删除「${pendingDelete?.title ?? ""}」吗？删除后，前台相关位置会立即不再展示这个链接。`}
        confirmLabel="删除链接"
        busy={saveState.status === "deleting"}
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          if (pendingDelete) {
            void deleteLink(pendingDelete.id);
          }
        }}
      />

      <div className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr]">
      <section className="admin-surface min-w-0 p-5">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-accent">{editingId ? "编辑模式" : "新建链接"}</p>
            <h2 className="mt-1 break-words text-2xl font-semibold text-foreground">{editingId ? "编辑外部链接" : "新增外部链接"}</h2>
          </div>
          <ExternalLink className="h-6 w-6 text-muted" />
        </div>

        <div className="mt-5 grid gap-4">
          <label className="grid gap-2">
            <span className="text-sm font-semibold text-foreground">标题</span>
            <input
              className="h-11 border border-line bg-background px-3 text-sm outline-none focus:border-accent"
              value={form.title}
              onChange={(event) => setForm((value) => ({ ...value, title: event.target.value }))}
              maxLength={120}
              placeholder="例如：爱发电、Buy Me a Coffee"
            />
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-semibold text-foreground">链接地址</span>
            <input
              className="h-11 border border-line bg-background px-3 text-sm outline-none focus:border-accent"
              value={form.url}
              onChange={(event) => setForm((value) => ({ ...value, url: event.target.value }))}
              maxLength={500}
              placeholder="https://..."
              type="url"
            />
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-semibold text-foreground">说明</span>
            <textarea
              className="min-h-24 resize-y border border-line bg-background p-3 text-sm leading-6 outline-none focus:border-accent"
              value={form.description}
              onChange={(event) => setForm((value) => ({ ...value, description: event.target.value }))}
              maxLength={300}
              placeholder="可选，用一句话说明这个链接的用途。"
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-3">
            <label className="grid gap-2">
              <span className="text-sm font-semibold text-foreground">位置</span>
              <AdminSelect
                ariaLabel="选择链接位置"
                value={form.position}
                onChange={(nextValue) => setForm((value) => ({ ...value, position: nextValue as ExternalLinkPosition }))}
                options={positionOptions}
              />
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-semibold text-foreground">语言</span>
              <AdminSelect
                ariaLabel="选择链接语言"
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

          <label className="flex items-center gap-3 border border-line bg-background px-3 py-3 text-sm font-semibold text-foreground">
            <input
              checked={form.isActive}
              className="h-4 w-4 accent-[var(--accent)]"
              type="checkbox"
              onChange={(event) => setForm((value) => ({ ...value, isActive: event.target.checked }))}
            />
            启用这个链接
          </label>
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <button
            className="admin-btn admin-btn-primary inline-flex h-11 items-center justify-center gap-2 px-5 font-semibold disabled:opacity-60"
            type="button"
            onClick={submitLink}
            disabled={busy}
            aria-busy={saveState.status === "saving"}
          >
            {saveState.status === "saving" ? <Loader2 className="h-4 w-4 animate-spin" /> : editingId ? <Save className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {editingId ? "保存修改" : "新增链接"}
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
      </section>

      <section className="admin-surface min-w-0 p-5">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-accent">链接列表</p>
            <h2 className="mt-1 text-2xl font-semibold text-foreground">外部链接</h2>
          </div>
          <span className="shrink-0 text-sm font-semibold text-muted" aria-live="polite">{filteredLinks.length} / {links.length} 条</span>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto_auto_auto]">
          <input
            className="h-11 border border-line bg-background px-3 text-sm outline-none focus:border-accent"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索标题、说明或 URL"
          />
          <AdminSelect ariaLabel="筛选链接位置" value={positionFilter} onChange={setPositionFilter} options={positionFilterOptions} />
          <AdminSelect ariaLabel="筛选链接语言" value={localeFilter} onChange={setLocaleFilter} options={localeFilterOptions} />
          <AdminSelect ariaLabel="筛选链接状态" value={statusFilter} onChange={setStatusFilter} options={[...statusFilterOptions]} />
        </div>
        {query || positionFilter !== allValue || localeFilter !== allValue || statusFilter !== allValue ? (
          <div className="mt-3 flex justify-end">
            <button className="admin-btn admin-btn-secondary inline-flex h-8 items-center px-3 text-xs font-semibold" type="button" onClick={clearFilters}>
              清空筛选
            </button>
          </div>
        ) : null}

        <div className="mt-5 grid gap-3">
          {filteredLinks.length > 0 ? (
            filteredLinks.map((link) => (
              <article key={link.id} className="admin-card-flat min-w-0 p-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 text-sm text-muted">
                      <span className="font-semibold text-accent">{positionLabels[link.position]}</span>
                      <span>{link.locale}</span>
                      <span>{link.isActive ? "已启用" : "已停用"}</span>
                      <span>排序 {link.sortOrder}</span>
                      <span>更新 {formatDate(link.updatedAt)}</span>
                    </div>
                    <h3 className="mt-2 break-words text-xl font-semibold text-foreground [overflow-wrap:anywhere]">{link.title}</h3>
                    {link.description ? <p className="mt-2 break-words leading-7 text-muted [overflow-wrap:anywhere]">{link.description}</p> : null}
                    <a className="mt-3 inline-flex items-center gap-2 break-all text-sm font-semibold text-accent" href={link.url} rel="noreferrer" target="_blank">
                      {link.url}
                      <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                    </a>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <a className="admin-btn admin-btn-secondary inline-flex h-10 items-center justify-center gap-2 px-4 text-sm font-semibold" href={link.url} rel="noreferrer" target="_blank">
                      测试
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                    <button className="admin-btn admin-btn-secondary inline-flex h-10 items-center justify-center px-4 text-sm font-semibold" type="button" onClick={() => editLink(link)}>
                      编辑
                    </button>
                    <button
                      className="admin-btn admin-btn-danger inline-flex h-10 items-center justify-center gap-2 px-4 text-sm font-semibold disabled:opacity-60"
                      type="button"
                      onClick={() => setPendingDelete(link)}
                      disabled={busy}
                      aria-busy={saveState.status === "deleting" && pendingDelete?.id === link.id}
                    >
                      <Trash2 className="h-4 w-4" />
                      删除
                    </button>
                  </div>
                </div>
              </article>
            ))
          ) : (
            <div className="admin-card-flat p-6 text-muted">
              {links.length > 0 ? "没有匹配的外部链接。换个关键词或筛选条件再试。" : "还没有配置外部链接。先新增一个捐赠页链接，前台 `/donate` 会自动读取。"}
            </div>
          )}
        </div>
      </section>
      </div>
    </>
  );
}
