"use client";

import { Loader2, Save, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { AdminConfirmDialog } from "@/components/admin/admin-confirm-dialog";
import { AdminSelect } from "@/components/admin/admin-select";
import { adminApiErrorMessage, handleAdminUnauthorized } from "@/components/admin/admin-api";
import type { AdminAiTermTaxonomyItem, AiTermLocale, AiTermTaxonomyKind } from "@/lib/ai-terms";

type TaxonomyItem = AdminAiTermTaxonomyItem & { kind: AiTermTaxonomyKind };

type FilterState = {
  locale: "all" | AiTermLocale;
  kind: "all" | AiTermTaxonomyKind;
  q: string;
};

type SaveState = {
  status: "idle" | "saving" | "acting" | "error" | "saved";
  message: string;
};

const localeOptions = [
  { value: "all", label: "全部语言" },
  { value: "zh", label: "中文" },
  { value: "en", label: "English" },
];

const kindOptions = [
  { value: "all", label: "全部类型" },
  { value: "category", label: "分类" },
  { value: "tag", label: "标签" },
];

export function AiTermTaxonomyWorkbench({ initialTaxonomy }: { initialTaxonomy: TaxonomyItem[] }) {
  const [taxonomy, setTaxonomy] = useState(initialTaxonomy);
  const [filters, setFilters] = useState<FilterState>({ locale: "all", kind: "all", q: "" });
  const [editing, setEditing] = useState<Record<string, TaxonomyItem>>({});
  const [mergeTarget, setMergeTarget] = useState<Record<string, string>>({});
  const [confirmDelete, setConfirmDelete] = useState<TaxonomyItem | null>(null);
  const [saveState, setSaveState] = useState<SaveState>({ status: "idle", message: "" });
  const busy = saveState.status === "saving" || saveState.status === "acting";
  const filtered = useMemo(() => {
    const q = filters.q.trim().toLowerCase();
    return taxonomy.filter((item) => {
      if (filters.locale !== "all" && item.locale !== filters.locale) return false;
      if (filters.kind !== "all" && item.kind !== filters.kind) return false;
      if (!q) return true;
      return item.name.toLowerCase().includes(q) || item.slug.toLowerCase().includes(q);
    });
  }, [filters, taxonomy]);

  function updateDraft(id: string, patch: Partial<TaxonomyItem>) {
    setEditing((value) => {
      const source = value[id] ?? taxonomy.find((item) => item.id === id);
      if (!source) return value;
      return { ...value, [id]: { ...source, ...patch } };
    });
  }

  async function saveItem(item: TaxonomyItem) {
    const draft = editing[item.id] ?? item;
    setSaveState({ status: "saving", message: `正在保存 ${item.name}...` });

    try {
      const response = await fetch("/api/admin/ai-terms/taxonomy", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: item.kind,
          id: item.id,
          name: draft.name,
          description: item.kind === "category" ? draft.description ?? "" : undefined,
          sortOrder: item.kind === "category" ? draft.sortOrder : undefined,
        }),
      });
      const data = await response.json();
      if (handleAdminUnauthorized(response)) return;
      if (!response.ok) throw new Error(adminApiErrorMessage(data, "保存分类/标签失败。"));
      const payload = data as { taxonomy?: TaxonomyItem[] };
      setTaxonomy(payload.taxonomy ?? taxonomy);
      setEditing((value) => {
        const next = { ...value };
        delete next[item.id];
        return next;
      });
      setSaveState({ status: "saved", message: `已保存 ${draft.name}` });
    } catch (error) {
      setSaveState({ status: "error", message: error instanceof Error ? error.message : "保存分类/标签失败。" });
    }
  }

  async function mergeItem(item: TaxonomyItem) {
    const targetId = mergeTarget[item.id];
    if (!targetId) {
      setSaveState({ status: "error", message: "请选择要合并到的目标。" });
      return;
    }

    setSaveState({ status: "acting", message: `正在合并 ${item.name}...` });
    try {
      const response = await fetch("/api/admin/ai-terms/taxonomy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: item.kind, sourceId: item.id, targetId }),
      });
      const data = await response.json();
      if (handleAdminUnauthorized(response)) return;
      if (!response.ok) throw new Error(adminApiErrorMessage(data, "合并分类/标签失败。"));
      const payload = data as { taxonomy?: TaxonomyItem[] };
      setTaxonomy(payload.taxonomy ?? taxonomy);
      setSaveState({ status: "saved", message: `已合并 ${item.name}` });
    } catch (error) {
      setSaveState({ status: "error", message: error instanceof Error ? error.message : "合并分类/标签失败。" });
    }
  }

  async function deleteItem(item: TaxonomyItem) {
    setSaveState({ status: "acting", message: `正在删除 ${item.name}...` });
    try {
      const response = await fetch("/api/admin/ai-terms/taxonomy", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: item.kind, id: item.id }),
      });
      const data = await response.json();
      if (handleAdminUnauthorized(response)) return;
      if (!response.ok) throw new Error(adminApiErrorMessage(data, "删除分类/标签失败。"));
      const payload = data as { taxonomy?: TaxonomyItem[] };
      setTaxonomy(payload.taxonomy ?? taxonomy);
      setSaveState({ status: "saved", message: `已删除 ${item.name}` });
    } catch (error) {
      setSaveState({ status: "error", message: error instanceof Error ? error.message : "删除分类/标签失败。" });
    }
  }

  return (
    <div className="space-y-6">
      <AdminConfirmDialog
        open={Boolean(confirmDelete)}
        title="删除分类/标签"
        description="只有没有关联词条的分类或标签才能删除。有关联时请先合并。"
        confirmLabel="删除"
        busy={saveState.status === "acting"}
        details={confirmDelete ? <div className="border border-line bg-background p-3 text-sm font-semibold">{confirmDelete.name}</div> : null}
        onCancel={() => setConfirmDelete(null)}
        onConfirm={() => {
          const item = confirmDelete;
          setConfirmDelete(null);
          if (item) void deleteItem(item);
        }}
      />

      <section className="grid gap-3 border border-line bg-surface p-4 md:grid-cols-[140px_140px_minmax(220px,1fr)]">
        <label className="grid gap-1">
          <span className="text-xs font-semibold text-muted">语言</span>
          <AdminSelect ariaLabel="筛选分类标签语言" value={filters.locale} onChange={(next) => setFilters((value) => ({ ...value, locale: next as FilterState["locale"] }))} options={localeOptions} />
        </label>
        <label className="grid gap-1">
          <span className="text-xs font-semibold text-muted">类型</span>
          <AdminSelect ariaLabel="筛选分类标签类型" value={filters.kind} onChange={(next) => setFilters((value) => ({ ...value, kind: next as FilterState["kind"] }))} options={kindOptions} />
        </label>
        <label className="grid gap-1">
          <span className="text-xs font-semibold text-muted">搜索</span>
          <input value={filters.q} onChange={(event) => setFilters((value) => ({ ...value, q: event.target.value }))} placeholder="搜索名称或 slug" className="h-11 border border-line bg-background px-3 text-sm outline-none focus:border-accent" />
        </label>
      </section>

      {saveState.message ? (
        <p
          role={saveState.status === "error" ? "alert" : "status"}
          className={saveState.status === "error" ? "border border-red-200 bg-red-50 p-3 text-sm text-red-700" : "border border-line bg-surface p-3 text-sm text-muted"}
        >
          {saveState.message}
        </p>
      ) : null}

      <section className="hidden overflow-x-auto border border-line bg-surface xl:block">
        <table className="min-w-[1040px] w-full border-collapse text-left text-sm">
          <thead className="border-b border-line bg-background text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-4 py-3">名称</th>
              <th className="px-4 py-3">类型</th>
              <th className="px-4 py-3">描述/排序</th>
              <th className="px-4 py-3">关联</th>
              <th className="px-4 py-3">合并到</th>
              <th className="px-4 py-3">操作</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((item) => {
              const draft = editing[item.id] ?? item;
              const candidates = taxonomy.filter((candidate) => candidate.kind === item.kind && candidate.locale === item.locale && candidate.id !== item.id);
              return (
                <tr key={item.id} className="border-b border-line align-top last:border-b-0">
                  <td className="px-4 py-4">
                    <input value={draft.name} onChange={(event) => updateDraft(item.id, { name: event.target.value })} className="h-9 w-full border border-line bg-background px-2 text-sm" />
                    <div className="mt-1 text-xs text-muted">{item.locale}/{item.slug}</div>
                  </td>
                  <td className="px-4 py-4">{item.kind === "category" ? "分类" : "标签"}</td>
                  <td className="px-4 py-4">
                    {item.kind === "category" ? (
                      <div className="grid gap-2">
                        <input value={draft.description ?? ""} onChange={(event) => updateDraft(item.id, { description: event.target.value })} placeholder="分类描述" className="h-9 border border-line bg-background px-2 text-sm" />
                        <input value={draft.sortOrder} onChange={(event) => updateDraft(item.id, { sortOrder: Number.parseInt(event.target.value, 10) || 0 })} className="h-9 w-24 border border-line bg-background px-2 text-sm" inputMode="numeric" />
                      </div>
                    ) : (
                      <span className="text-muted">标签暂无描述字段</span>
                    )}
                  </td>
                  <td className="px-4 py-4">{item.termCount}</td>
                  <td className="px-4 py-4">
                    <AdminSelect
                      ariaLabel={`选择 ${item.name} 的合并目标`}
                      value={mergeTarget[item.id] ?? ""}
                      onChange={(next) => setMergeTarget((value) => ({ ...value, [item.id]: next }))}
                      options={[{ value: "", label: "选择目标" }, ...candidates.map((candidate) => ({ value: candidate.id, label: candidate.name }))]}
                    />
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex flex-col gap-2">
                      <button type="button" onClick={() => saveItem(item)} disabled={busy} className="admin-btn admin-btn-primary inline-flex h-9 items-center justify-center gap-2 px-3 text-xs font-semibold disabled:opacity-60">
                        {saveState.status === "saving" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                        保存
                      </button>
                      <button type="button" onClick={() => mergeItem(item)} disabled={busy || !mergeTarget[item.id]} className="admin-btn admin-btn-secondary h-9 px-3 text-xs font-semibold disabled:opacity-60">合并</button>
                      <button type="button" onClick={() => setConfirmDelete(item)} disabled={busy || item.termCount > 0} className="admin-btn inline-flex h-9 items-center justify-center gap-2 bg-red-700 px-3 text-xs font-semibold text-white disabled:opacity-50">
                        <Trash2 className="h-3.5 w-3.5" />
                        删除
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      <section className="grid gap-3 xl:hidden" aria-label="分类标签移动端列表">
        {filtered.length > 0 ? (
          filtered.map((item) => {
            const draft = editing[item.id] ?? item;
            const candidates = taxonomy.filter((candidate) => candidate.kind === item.kind && candidate.locale === item.locale && candidate.id !== item.id);

            return (
              <article key={item.id} className="admin-surface p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-accent">{item.kind === "category" ? "分类" : "标签"}</p>
                    <p className="mt-1 break-all text-xs text-muted">{item.locale}/{item.slug}</p>
                  </div>
                  <span className="shrink-0 border border-line bg-background px-2 py-1 text-xs font-semibold text-muted">关联 {item.termCount}</span>
                </div>

                <div className="mt-4 grid gap-3">
                  <label className="grid gap-1 text-xs font-semibold text-muted">
                    名称
                    <input value={draft.name} onChange={(event) => updateDraft(item.id, { name: event.target.value })} className="h-10 border border-line bg-background px-2 text-sm text-foreground" />
                  </label>
                  {item.kind === "category" ? (
                    <>
                      <label className="grid gap-1 text-xs font-semibold text-muted">
                        描述
                        <input value={draft.description ?? ""} onChange={(event) => updateDraft(item.id, { description: event.target.value })} placeholder="分类描述" className="h-10 border border-line bg-background px-2 text-sm text-foreground" />
                      </label>
                      <label className="grid gap-1 text-xs font-semibold text-muted">
                        排序
                        <input value={draft.sortOrder} onChange={(event) => updateDraft(item.id, { sortOrder: Number.parseInt(event.target.value, 10) || 0 })} className="h-10 border border-line bg-background px-2 text-sm text-foreground" inputMode="numeric" />
                      </label>
                    </>
                  ) : (
                    <p className="border border-line bg-background p-3 text-sm text-muted">标签暂无描述字段</p>
                  )}
                  <label className="grid gap-1 text-xs font-semibold text-muted">
                    合并到
                    <AdminSelect
                      ariaLabel={`选择 ${item.name} 的合并目标`}
                      value={mergeTarget[item.id] ?? ""}
                      onChange={(next) => setMergeTarget((value) => ({ ...value, [item.id]: next }))}
                      options={[{ value: "", label: "选择目标" }, ...candidates.map((candidate) => ({ value: candidate.id, label: candidate.name }))]}
                    />
                  </label>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2">
                  <button type="button" onClick={() => saveItem(item)} disabled={busy} className="admin-btn admin-btn-primary inline-flex h-10 items-center justify-center gap-2 px-3 text-sm font-semibold disabled:opacity-60">
                    {saveState.status === "saving" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    保存
                  </button>
                  <button type="button" onClick={() => mergeItem(item)} disabled={busy || !mergeTarget[item.id]} className="admin-btn admin-btn-secondary h-10 px-3 text-sm font-semibold disabled:opacity-60">合并</button>
                  <button type="button" onClick={() => setConfirmDelete(item)} disabled={busy || item.termCount > 0} className="admin-btn inline-flex h-10 items-center justify-center gap-2 bg-red-700 px-3 text-sm font-semibold text-white disabled:opacity-50">
                    <Trash2 className="h-4 w-4" />
                    删除
                  </button>
                </div>
              </article>
            );
          })
        ) : (
          <div className="admin-surface p-8 text-center text-muted">没有匹配的分类或标签。</div>
        )}
      </section>
    </div>
  );
}
